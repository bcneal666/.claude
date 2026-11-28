#!/usr/bin/env node
// SessionStart / SessionEnd hook：讓每個 Claude session 擁有自己的
// agent-browser session（cc-<session_id>），並在 session 結束時關閉它，
// 避免 AI 留下的瀏覽器在背景留下 daemon 與 Chrome 而佔用記憶體。
//
// - SessionStart：把 AGENT_BROWSER_SESSION 寫進 CLAUDE_ENV_FILE，讓之後
//   每個 Bash 工具指令都帶有這個變數（agent-browser 視同 --session）。
//   沒有 CLAUDE_ENV_FILE 時（例如沒有 Git Bash 的 Windows）就略過；
//   此時使用預設 session，並以 AGENT_BROWSER_IDLE_TIMEOUT_MS 作為後備。
// - SessionEnd：只關閉這個 session 的瀏覽器，不影響其他同時執行的
//   Claude session。SessionEnd 的預設逾時是 1.5 秒，
//   所以 settings.json 必須設定更長的 timeout。
//
// 硬性規則：一律 exit 0，絕不寫入 stderr，絕不印出任何內容。
// 不使用 bash；在 Windows 上透過 shell 執行，
// 才找得到 agent-browser.cmd。

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
  // 只接受單純的 id，避免被注入 export 行或 shell 指令
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
  /* 吞掉所有錯誤；hook 絕不能影響 session */
}
process.exit(0);
