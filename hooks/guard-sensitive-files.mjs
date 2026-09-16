#!/usr/bin/env node
// PreToolUse hook：擋 Read/Edit/Write/Bash 碰到 .env、~/.ssh/*、*.pem。
//
// Read 一律 deny：讀取會把密鑰實際內容永久帶進 context，不可逆，故硬擋。
// Edit/Write 一律 ask：寫入本身不洩漏內容，留確認提示以便批准合法編輯
// （例如 ~/.config/watch/.env 這類需要手動維護的設定檔）。
// Bash 一律 ask：命令字串比對是啟發式的（`grep -r pem .` 這種也會命中），
// deny 會誤擋太多，ask 只是多跳一次確認。
//
// 這是舊版 hook（808fcf3 移除前）的修正重寫：舊版用
// `echo '{"decision":"block"}'`，但 decision 對 PreToolUse 早已淘汰
// （正解是 hookSpecificOutput.permissionDecision），等於沒擋；且依賴
// jq + POSIX quoting、matcher 漏了 Read、grep 樣式無錨點會誤殺。
//
// 硬性規則：任何情況都要 exit 0、不寫 stderr。非 0 exit 或 stderr 噪音
// 會讓每次 Read/Edit/Write/Bash 都跳一次 hook error，比漏擋更糟。
// 解析失敗一律 fail-open：拿不到路徑就無從判斷，fail-closed 遇到腳本
// 自身的 bug 會直接癱瘓所有檔案操作。

import { readFileSync } from "node:fs";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// basename 為 .env 或 .env.*，但排除常見的範例／範本變體
function isEnvFile(basename) {
  if (basename === ".env") return true;
  if (!basename.startsWith(".env.")) return false;
  const suffix = basename.slice(".env.".length);
  const allowedSuffixes = ["example", "sample", "template", "dist"];
  return !allowedSuffixes.includes(suffix);
}

function isSshPath(normalized) {
  return normalized.includes("/.ssh/");
}

function isPemFile(basename) {
  return basename.endsWith(".pem");
}

// 正規化單一路徑字串：反斜線轉正斜線、轉小寫（Windows 路徑大小寫不敏感）
function normalizePath(p) {
  return p.replace(/\\/g, "/").toLowerCase();
}

function basenameOf(normalized) {
  const idx = normalized.lastIndexOf("/");
  return idx === -1 ? normalized : normalized.slice(idx + 1);
}

function matchesSensitive(normalized) {
  const base = basenameOf(normalized);
  return isEnvFile(base) || isSshPath(normalized) || isPemFile(base);
}

// Bash：從指令字串裡抓出看起來像路徑的 token 逐一檢查
function bashCommandHitsSensitive(command) {
  const tokens = command.split(/[\s'"|&;()<>]+/).filter(Boolean);
  for (const token of tokens) {
    const normalized = normalizePath(token);
    if (matchesSensitive(normalized)) return true;
  }
  return false;
}

function emit(permissionDecision, reason) {
  const out = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision,
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(out) + "\n");
}

function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    return; // 解析失敗：fail-open，直接放行
  }

  const toolName = input?.tool_name;
  if (!toolName) return;

  try {
    if (toolName === "Read" || toolName === "Edit" || toolName === "Write") {
      const filePath = input?.tool_input?.file_path;
      if (typeof filePath !== "string" || filePath === "") return;
      const normalized = normalizePath(filePath);
      if (!matchesSensitive(normalized)) return;

      if (toolName === "Read") {
        emit("deny", "敏感檔案（.env / ~/.ssh / *.pem）— 讀取會將密鑰內容帶進 context，一律拒絕");
      } else {
        emit("ask", "敏感檔案（.env / ~/.ssh / *.pem）— 寫入前請確認這是你要做的操作");
      }
      return;
    }

    if (toolName === "Bash") {
      const command = input?.tool_input?.command;
      if (typeof command !== "string" || command === "") return;
      if (bashCommandHitsSensitive(command)) {
        emit("ask", "指令疑似涉及敏感檔案（.env / ~/.ssh / *.pem）— 請確認");
      }
      return;
    }
  } catch {
    return; // 任何非預期錯誤：fail-open
  }
}

main();
