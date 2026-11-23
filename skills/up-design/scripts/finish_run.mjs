#!/usr/bin/env node
// Record the end of an up-design run in ./up-design/last-run.json.
//
// Usage:
//   node finish_run.mjs --mode quick|full
//
// Writes the current HEAD hash (null outside git or before the first commit),
// the completion time, the mode, and last_full_at (carried over unless this run
// was full). See references/scope-and-state.md.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { STATE_DIR, flagValue, head, nowParts, printJson, projectRoot, readLastRun, toPosix } from "./_common.mjs";

const mode = flagValue("--mode");
if (mode !== "quick" && mode !== "full") {
  process.stderr.write("用法：node finish_run.mjs --mode quick|full\n");
  process.exit(2);
}

const { root, isGit } = projectRoot();
const previous = readLastRun(root) ?? {};
const finished = nowParts().iso;

const data = {
  head: isGit ? head(root) : null,
  run_at: finished,
  mode,
  last_full_at: mode === "full" ? finished : (previous.last_full_at ?? null),
};

const file = path.join(root, STATE_DIR, "last-run.json");
mkdirSync(path.dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
printJson({ written: toPosix(path.relative(root, file)), ...data });
