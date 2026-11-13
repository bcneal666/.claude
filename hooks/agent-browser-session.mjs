#!/usr/bin/env node
// SessionStart / SessionEnd hook：讓每個 Claude session 使用專屬的
// agent-browser session（cc-<session_id>），並在 session 結束時關閉它，
// 避免 AI 用完瀏覽器沒關而殘留 daemon 與 Chrome 佔用記憶體。
//
// - SessionStart：把 AGENT_BROWSER_SESSION 寫進 CLAUDE_ENV_FILE，之後
//   Bash 工具的指令都會帶上這個變數（agent-browser 等同 --session）。
//   沒有 CLAUDE_ENV_FILE（例如 Windows 無 Git Bash）就略過，改用
//   default session，由 AGENT_BROWSER_IDLE_TIMEOUT_MS 兜底。
// - SessionEnd：只關自己的 session，不影響其他同時開著的 Claude session。
//   SessionEnd 預設逾時 1.5 秒，settings.json 內須設較長的 timeout。
//
// 硬性規則：任何情況都 exit 0、不寫 stderr、不輸出任何內容。
// 不用 bash；Windows 上以 shell 執行才找得到 agent-browser.cmd。

import { appendFileSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

function main() {
  const input = readInput();
  const id = input.session_id;
  // 只接受單純的 id，避免注入 export 行或 shell 指令
  if (typeof id !== "string" || !/^[A-Za-z0-9-]+$/.test(id)) return;
  const name = `cc-${id}`;

  if (input.hook_event_name === "SessionStart") {
    const envFile = process.env.CLAUDE_ENV_FILE;
    if (envFile) appendFileSync(envFile, `export AGENT_BROWSER_SESSION=${name}\n`);
  } else if (input.hook_event_name === "SessionEnd") {
    spawnSync("agent-browser", ["close", "--session", name], {
      stdio: "ignore",
      timeout: 8000,
      shell: process.platform === "win32",
    });
  }
}

try {
  main();
} catch {
  /* 任何錯誤都吞掉，hook 不可影響 session */
}
process.exit(0);
