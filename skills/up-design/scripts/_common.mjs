// Shared helpers for up-design scripts. Node.js 18+, built-in modules only.
// Works on Windows and Linux: git output uses "/", file paths are normalized to "/".

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const STATE_DIR = "up-design";
export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Taiwan has no DST, so a fixed +08:00 offset is exact and avoids needing tz data.
const OFFSET_MS = 8 * 60 * 60 * 1000;

/** Current Asia/Taipei time as parts. */
export function nowParts() {
  const d = new Date(Date.now() + OFFSET_MS);
  const pad = (n) => String(n).padStart(2, "0");
  const Y = d.getUTCFullYear();
  const M = pad(d.getUTCMonth() + 1);
  const D = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const m = pad(d.getUTCMinutes());
  const s = pad(d.getUTCSeconds());
  return {
    iso: `${Y}-${M}-${D}T${h}:${m}:${s}+08:00`,
    display: `${Y}-${M}-${D} ${h}:${m}`,
    fileStamp: `${Y}-${M}-${D}-${h}${m}`,
  };
}

/** Run a git command; return stdout, or null on failure. */
export function git(args, cwd, input) {
  try {
    return execFileSync("git", args, {
      cwd,
      input,
      encoding: "utf8",
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

/** Git repo root if inside one, else cwd. */
export function projectRoot() {
  const top = git(["rev-parse", "--show-toplevel"]);
  if (top && top.trim()) return { root: path.resolve(top.trim()), isGit: true };
  return { root: process.cwd(), isGit: false };
}

export function head(root) {
  const out = git(["rev-parse", "--verify", "-q", "HEAD"], root);
  return out && out.trim() ? out.trim() : null;
}

export function readLastRun(root) {
  const file = path.join(root, STATE_DIR, "last-run.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function toPosix(p) {
  return p.split(path.sep).join("/");
}

export function nonEmptyLines(text) {
  return (text ?? "").split(/\r?\n/).filter((l) => l.trim());
}

/** True if any of the given spellings is present, e.g. hasFlag("--m", "m"). */
export function hasFlag(...names) {
  const args = process.argv.slice(2);
  return names.some((n) => args.includes(n));
}

export function flagValue(name) {
  const args = process.argv.slice(2);
  const i = args.indexOf(name);
  if (i !== -1) return args[i + 1];
  const eq = args.find((a) => a.startsWith(`${name}=`));
  return eq ? eq.slice(name.length + 1) : undefined;
}

export function printJson(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + "\n");
}
