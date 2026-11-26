#!/usr/bin/env node
// PreToolUse hook (Bash / PowerShell): before git commit / git push, scan
// the content about to enter history and deny on common secret formats.
//
// Why it exists: settings.json puts git add / commit / push in allow, and
// /now-push pushes without confirmation, so the only guard was the model
// reading the diff itself. This adds a mechanical safeguard.
//
// Scan scope (`git add` may not have run yet at PreToolUse, so --cached alone
// is not enough):
//   - added lines in the diff against upstream (HEAD if there is none)
//   - untracked, non-ignored files (`git add .` would include them)
//
// False-positive escape hatch: a line containing `secret-scan:allow`
// anywhere is skipped.
//
// Vendored skills: files under .claude/skills/<name>/ and .agents/skills/<name>/
// are skipped when <name> is a key of `skills` in the repo's skills-lock.json.
// Skills not listed there (hand-written ones) are still scanned.
//
// Hard rule: fail open — on any error exit 0 and never write to stderr.
// On a hit, print only the deny JSON to stdout, and never print the full
// secret (first 4 characters only).

import { readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, basename, resolve } from "node:path";

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

// Directory the commit/push will run in. `git -C X` wins; otherwise apply every
// `cd X` that precedes the git commit/push (anywhere in the command, not only
// at the start), resolving relative paths in order.
function resolveDir(command, cwd, gitIndex) {
  const c = command.match(/\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/);
  if (c) return resolve(cwd, expandHome(stripQuotes(c[1])));
  const cdRe = /(?:^|[;&|(])\s*cd\s+("[^"]+"|'[^']+'|\S+?)\s*(?=&&|;|\|\||\n|$)/g;
  let dir = cwd;
  for (const m of command.slice(0, gitIndex).matchAll(cdRe)) {
    dir = resolve(dir, expandHome(stripQuotes(m[1])));
  }
  return dir;
}

function redact(s) {
  return `${s.slice(0, 4)}****`;
}

function vendoredPrefixes(root) {
  try {
    const lock = JSON.parse(readFileSync(join(root, "skills-lock.json"), "utf8"));
    const skills = lock?.skills && typeof lock.skills === "object" ? lock.skills : {};
    return Object.keys(skills)
      .filter((name) => !name.includes("/") && !name.includes(".."))
      .flatMap((name) => [`.claude/skills/${name}/`, `.agents/skills/${name}/`]);
  } catch {
    return [];
  }
}

function isVendored(file, prefixes) {
  return prefixes.some((prefix) => file.startsWith(prefix));
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

function scanDiff(diff, hits, files, prefixes) {
  let file = null;
  let skipped = false;
  let lineNo = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ ")) {
      file = line.startsWith("+++ b/") ? line.slice(6) : null;
      if (file) files.add(file);
      skipped = file !== null && isVendored(file, prefixes);
    } else if (line.startsWith("@@")) {
      const m = line.match(/\+(\d+)/);
      lineNo = m ? Number(m[1]) : 0;
    } else if (line.startsWith("+") && file) {
      if (!skipped) scanLine(file, lineNo, line.slice(1), hits);
      lineNo++;
    } else if (!line.startsWith("-") && !line.startsWith("\\")) {
      lineNo++;
    }
  }
}

function scanUntracked(root, hits, files, prefixes) {
  const r = git(root, ["ls-files", "--others", "--exclude-standard", "-z"]);
  if (r.status !== 0) return;
  for (const rel of r.stdout.split("\0").filter(Boolean)) {
    files.add(rel);
    if (isVendored(rel, prefixes)) continue;
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
      // unreadable: skip
    }
  }
}

function main() {
  const input = readInput();
  const command = input.tool_input?.command;
  if (typeof command !== "string") return;
  const gm = command.match(/\bgit\b[^|;&\n]*\b(?:commit|push)\b/);
  if (!gm) return;

  const dir = resolveDir(command, input.cwd || process.cwd(), gm.index);
  const top = git(dir, ["rev-parse", "--show-toplevel"]);
  if (top.status !== 0) return;
  const root = top.stdout.trim();

  const up = git(root, ["rev-parse", "--verify", "--quiet", "@{u}"]);
  const head = git(root, ["rev-parse", "--verify", "--quiet", "HEAD"]);
  const base = up.status === 0 ? "@{u}" : head.status === 0 ? "HEAD" : EMPTY_TREE;

  const hits = [];
  const files = new Set();
  const prefixes = vendoredPrefixes(root);

  const diff = git(root, ["diff", "--no-color", "-U0", base]);
  if (diff.status === 0) scanDiff(diff.stdout, hits, files, prefixes);
  scanUntracked(root, hits, files, prefixes);

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
