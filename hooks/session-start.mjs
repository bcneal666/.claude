#!/usr/bin/env node
// SessionStart hook：把 git status --short 前 20 行注入開場 context。
//
// 為什麼用 Node 而非 shell 一行流：舊版用 echo + jq 字串拼接組 JSON，jq -Rs .
// 本身已帶引號、模板又補一對，產出 `"additionalContext":""""` 這種非法 JSON，
// harness 直接整包丟掉並報 hook error。JSON.stringify 從根本消滅這類跳脫問題，
// 同時擺脫對 jq / head / POSIX quoting 的依賴，Windows / macOS / Linux 共用。
//
// 硬性規則：任何情況都要 exit 0。非 0 exit code 或 stderr 噪音會讓 harness 在
// 每次開場噴錯誤訊息，比少注入一段 context 更糟。

import { execFileSync } from "node:child_process";

const MAX_LINES = 20;

// 回傳 git status --short 的原始輸出；非 git 目錄、git 未安裝、逾時皆回 null。
// 用 execFileSync 直接帶 argv、不經 shell：跨平台免去引號跳脫，Windows 上
// Node 會自行從 PATH 解析 git.exe。
function readGitStatus() {
  try {
    return execFileSync("git", ["status", "--short"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
      windowsHide: true,
    });
  } catch {
    return null;
  }
}

function buildContext() {
  const raw = readGitStatus();
  if (raw === null) return null; // 非 git 目錄：不注入任何東西

  const lines = raw.split("\n").map((l) => l.replace(/\r$/, "")).filter((l) => l !== "");
  if (lines.length === 0) return "Git 工作區乾淨（無未提交變更）。";

  const shown = lines.slice(0, MAX_LINES);
  const omitted = lines.length - shown.length;
  return (
    `Git 工作區狀態（git status --short${omitted > 0 ? `，僅列前 ${MAX_LINES} 行` : ""}）：\n` +
    shown.join("\n") +
    (omitted > 0 ? `\n…（另有 ${omitted} 行未列出）` : "")
  );
}

function main() {
  const hookSpecificOutput = { hookEventName: "SessionStart" };
  try {
    const context = buildContext();
    if (context !== null) hookSpecificOutput.additionalContext = context;
  } catch {
    /* 取不到就不注入，仍要輸出合法 JSON */
  }
  // reloadSkills 必須放在 hookSpecificOutput 內層（見 CLI schema），放外層會被忽略
  hookSpecificOutput.reloadSkills = true;

  process.stdout.write(JSON.stringify({ hookSpecificOutput }) + "\n");
}

main();
