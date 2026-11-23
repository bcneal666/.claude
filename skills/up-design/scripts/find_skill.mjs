#!/usr/bin/env node
// Locate an installed skill's SKILL.md, for skills the agent cannot invoke
// directly (those with `disable-model-invocation: true`, e.g. review-animations,
// learn-taste). up-design reads the file and follows it instead.
//
// Usage:
//   node find_skill.mjs <skill-name> [<skill-name> ...]
//
// Prints JSON: { "<name>": "<absolute path to SKILL.md>" | null, ... }
// Searches the project first, then the user's home, in the locations used by
// `npx skills` and Claude Code, then a shallow search under ~/.claude and ~/.agents.

import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { printJson, projectRoot } from "./_common.mjs";

const names = process.argv.slice(2);
if (!names.length) {
  process.stderr.write("用法：node find_skill.mjs <skill-name> [...]\n");
  process.exit(2);
}

const { root } = projectRoot();
const home = os.homedir();
const bases = [
  path.join(root, ".claude", "skills"),
  path.join(root, ".agents", "skills"),
  path.join(home, ".claude", "skills"),
  path.join(home, ".agents", "skills"),
];

function shallowSearch(dir, name, depth) {
  if (depth < 0 || !existsSync(dir)) return null;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    if (!e.isDirectory() && !e.isSymbolicLink()) continue;
    if (e.name === "node_modules" || e.name === "projects") continue;
    const sub = path.join(dir, e.name);
    if (e.name === name && existsSync(path.join(sub, "SKILL.md"))) return path.join(sub, "SKILL.md");
  }
  for (const e of entries) {
    if (!e.isDirectory() || e.name === "node_modules" || e.name === "projects") continue;
    const hit = shallowSearch(path.join(dir, e.name), name, depth - 1);
    if (hit) return hit;
  }
  return null;
}

function find(name) {
  for (const base of bases) {
    const file = path.join(base, name, "SKILL.md");
    if (existsSync(file)) return path.resolve(file);
  }
  for (const dir of [path.join(home, ".claude"), path.join(home, ".agents")]) {
    const hit = shallowSearch(dir, name, 4);
    if (hit) return path.resolve(hit);
  }
  return null;
}

printJson(Object.fromEntries(names.map((n) => [n, find(n)])));
