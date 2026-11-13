#!/usr/bin/env node
// PreToolUse hook（Bash / PowerShell）：git commit / git push 之前掃描
// 即將進入歷史的內容，命中常見秘密格式就 deny。
//
// 為什麼需要：settings.json 把 git add / commit / push 放進 allow，
// /now-push 也不經確認直接推，原本只靠模型自己看 diff。這裡補一道機械式防線。
//
// 掃描範圍（PreToolUse 時 `git add` 可能還沒跑，所以不能只看 --cached）：
//   - 與 upstream（沒有就與 HEAD）的差異，只看新增行
//   - 未追蹤且未被 ignore 的檔案（`git add .` 會納入）
//
// 誤判逃生口：該行任意位置含 `secret-scan:allow` 即略過。
//
// 硬性規則：fail open——任何錯誤都 exit 0、不寫 stderr。
// 命中時只在 stdout 輸出 deny JSON，且不印完整秘密（僅前 4 字元）。

import { readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, basename } from "node:path";

const ALLOW_MARKER = "secret-scan:allow";
const MAX_FILE_BYTES = 1024 * 1024;
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

const RULES = [
  ["私鑰", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ["Anthropic key", /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ["OpenAI key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/],
  ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Stripe live key", /\b[sr]k_live_[0-9A-Za-z]{16,}/],
  [
    "疑似寫死的憑證",
    /\b(?:api_?key|secret|passw(?:or)?d|token)\b["']?\s*[:=]\s*["'][^"'\s]{16,}["']/i,
  ],
];

const ENV_FILE = /^\.env(?:\..+)?$/i;
const ENV_SAFE = /\.(?:example|sample|template|dist)$/i;

function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

function git(dir, args, opts = {}) {
  return spawnSync("git", args, {
    cwd: dir,
    encoding: "utf8",
    timeout: 6000,
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
}

function expandHome(p) {
  return p === "~" || p.startsWith("~/") ? join(homedir(), p.slice(1)) : p;
}

function stripQuotes(s) {
  return s.replace(/^(["'])(.*)\1$/, "$2");
}

function resolveDir(command, cwd) {
  const m =
    command.match(/\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/) ||
    command.match(/^\s*cd\s+("[^"]+"|'[^']+'|\S+)\s*(?:&&|;)/);
  return m ? expandHome(stripQuotes(m[1])) : cwd;
}

function redact(s) {
  return `${s.slice(0, 4)}****`;
}

function scanLine(file, lineNo, text, hits) {
  if (text.includes(ALLOW_MARKER)) return;
  for (const [name, re] of RULES) {
    const m = text.match(re);
    if (m) {
      hits.push(`${file}:${lineNo} ${name} (${redact(m[0])})`);
      return;
    }
  }
}

function scanDiff(diff, hits, files) {
  let file = null;
  let lineNo = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      file = line.startsWith("+++ b/") ? line.slice(6) : null;
      if (file) files.add(file);
    } else if (line.startsWith("@@")) {
      const m = line.match(/\+(\d+)/);
      lineNo = m ? Number(m[1]) : 0;
    } else if (line.startsWith("+") && file) {
      scanLine(file, lineNo, line.slice(1), hits);
      lineNo++;
    } else if (!line.startsWith("-") && !line.startsWith("\\")) {
      lineNo++;
    }
  }
}

function scanUntracked(root, hits, files) {
  const r = git(root, ["ls-files", "--others", "--exclude-standard", "-z"]);
  if (r.status !== 0) return;
  for (const rel of r.stdout.split("\0").filter(Boolean)) {
    files.add(rel);
    try {
      const abs = join(root, rel);
      if (statSync(abs).size > MAX_FILE_BYTES) continue;
      const buf = readFileSync(abs);
      if (buf.subarray(0, 8000).includes(0)) continue;
      buf
        .toString("utf8")
        .split("\n")
        .forEach((text, i) => scanLine(rel, i + 1, text, hits));
    } catch {
      // 讀不到就略過
    }
  }
}

function main() {
  const input = readInput();
  const command = input.tool_input?.command;
  if (typeof command !== "string") return;
  if (!/\bgit\b[^|;&\n]*\b(?:commit|push)\b/.test(command)) return;

  const dir = resolveDir(command, input.cwd || process.cwd());
  const top = git(dir, ["rev-parse", "--show-toplevel"]);
  if (top.status !== 0) return;
  const root = top.stdout.trim();

  const up = git(root, ["rev-parse", "--verify", "--quiet", "@{u}"]);
  const head = git(root, ["rev-parse", "--verify", "--quiet", "HEAD"]);
  const base = up.status === 0 ? "@{u}" : head.status === 0 ? "HEAD" : EMPTY_TREE;

  const hits = [];
  const files = new Set();

  const diff = git(root, ["diff", "--no-color", "-U0", base]);
  if (diff.status === 0) scanDiff(diff.stdout, hits, files);
  scanUntracked(root, hits, files);

  for (const f of files) {
    const name = basename(f);
    if (ENV_FILE.test(name) && !ENV_SAFE.test(name)) hits.push(`${f} 環境變數檔`);
  }
  if (hits.length === 0) return;

  const shown = hits.slice(0, 10).join("\n");
  const more = hits.length > 10 ? `\n…另有 ${hits.length - 10} 筆` : "";
  const reason =
    `git-secret-guard：偵測到疑似秘密，已阻擋 commit/push。\n${shown}${more}\n` +
    `確認是誤判時，在該行加上 ${ALLOW_MARKER} 註解後重試。`;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
}

try {
  main();
} catch {
  // fail open
}
process.exit(0);
