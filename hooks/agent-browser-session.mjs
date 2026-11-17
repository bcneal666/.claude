#!/usr/bin/env node
// SessionStart / SessionEnd hook: give each Claude session its own
// agent-browser session (cc-<session_id>) and close it when the session ends,
// so a browser the AI left open does not leave a daemon and Chrome behind
// holding memory.
//
// - SessionStart: write AGENT_BROWSER_SESSION into CLAUDE_ENV_FILE so every
//   later Bash tool command carries this variable (agent-browser treats it
//   like --session). Without CLAUDE_ENV_FILE (e.g. Windows without Git Bash)
//   skip it; the default session is used and AGENT_BROWSER_IDLE_TIMEOUT_MS is
//   the fallback.
// - SessionEnd: close only this session's browser, leaving other concurrent
//   Claude sessions untouched. SessionEnd's default timeout is 1.5 seconds,
//   so settings.json must set a longer timeout.
//
// Hard rule: always exit 0, never write to stderr, never print anything.
// Does not use bash; on Windows it runs through a shell so agent-browser.cmd
// can be found.

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
  // accept plain ids only, to prevent injecting an export line or shell command
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
  /* swallow every error; the hook must never affect the session */
}
process.exit(0);
