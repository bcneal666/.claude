#!/usr/bin/env node
// Decide this run's mode (quick/full) and list the UI files in scope.
// Read-only: never writes files. Run from anywhere inside the project.
//
// Usage:
//   node scope.mjs [--full|full] [--m|m]
//
// Prints JSON to stdout: project_root, is_git, head, mode, reason, mobile, uses_sonner, last_run, file_count, files.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  STATE_DIR, git, hasFlag, head, nonEmptyLines, printJson, projectRoot, readLastRun, toPosix,
} from "./_common.mjs";

const FULL_INTERVAL_DAYS = 30;

const UI_EXTENSIONS = new Set([
  ".tsx", ".jsx", ".ts", ".js", ".mjs",
  ".vue", ".svelte", ".astro", ".html", ".mdx",
  ".css", ".scss", ".sass", ".less", ".styl",
]);

const EXCLUDED_DIRS = new Set([
  "node_modules", "dist", "build", ".next", ".nuxt", ".svelte-kit",
  ".output", ".vercel", ".turbo", ".cache", "coverage", ".git",
  STATE_DIR, "vendor", "out",
]);

function isUiFile(rel) {
  const parts = rel.split("/");
  if (parts.slice(0, -1).some((p) => EXCLUDED_DIRS.has(p))) return false;
  const name = parts[parts.length - 1];
  if (/\.(d\.ts|min\.js|min\.css)$/.test(name)) return false;
  return UI_EXTENSIONS.has(path.extname(name).toLowerCase());
}

function walkFiles(root) {
  const found = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!EXCLUDED_DIRS.has(e.name)) stack.push(full);
      } else if (e.isFile()) {
        found.push(toPosix(path.relative(root, full)));
      }
    }
  }
  return found;
}

function decideMode(root, isGit, lastRun, forceFull) {
  if (forceFull) return ["full", "使用者指定 full"];
  if (!isGit) return ["full", "專案不是 git repo，無法判斷增量"];
  if (!lastRun) return ["full", "第一次執行（沒有 last-run.json）"];
  if (!lastRun.head) return ["full", "上次執行沒有記錄 commit hash"];
  if (git(["cat-file", "-e", `${lastRun.head}^{commit}`], root) === null) {
    return ["full", "上次記錄的 commit 已不存在（可能經過 rebase）"];
  }
  const lastFull = lastRun.last_full_at ? new Date(lastRun.last_full_at) : null;
  if (!lastFull || Number.isNaN(lastFull.getTime())) return ["full", "沒有 full 執行紀錄"];
  const days = Math.floor((Date.now() - lastFull.getTime()) / 86_400_000);
  if (days > FULL_INTERVAL_DAYS) return ["full", `距上次 full 已 ${days} 天（超過 ${FULL_INTERVAL_DAYS} 天）`];
  return ["quick", "增量檢查上次執行後的變更"];
}

function collectFiles(root, isGit, mode, lastRun) {
  let candidates;
  const untracked = () => nonEmptyLines(git(["ls-files", "--others", "--exclude-standard"], root));
  if (!isGit) {
    candidates = walkFiles(root);
  } else if (mode === "full") {
    candidates = [...nonEmptyLines(git(["ls-files"], root)), ...untracked()];
  } else {
    candidates = [
      ...nonEmptyLines(git(["diff", "--name-only", "--diff-filter=d", lastRun.head], root)),
      ...untracked(),
    ];
  }
  const files = new Set(
    candidates.filter((f) => {
      if (!isUiFile(f)) return false;
      const full = path.join(root, f);
      return existsSync(full) && statSync(full).isFile();
    }),
  );
  return [...files].sort();
}

const SONNER_IMPORT = /(?:from\s+|require\(\s*|import\(\s*)["']sonner["']/;

/** True if package.json depends on sonner, or any in-scope file imports it. */
function detectSonner(root, files) {
  const pkg = path.join(root, "package.json");
  if (existsSync(pkg)) {
    try {
      const json = JSON.parse(readFileSync(pkg, "utf8"));
      for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
        if (json[key] && Object.hasOwn(json[key], "sonner")) return true;
      }
    } catch {
      // unreadable package.json: fall through to scanning files
    }
  }
  return files.some((f) => {
    try {
      return SONNER_IMPORT.test(readFileSync(path.join(root, f), "utf8"));
    } catch {
      return false;
    }
  });
}

export function computeScope({ full = false, mobile = false } = {}) {
  const { root, isGit } = projectRoot();
  const lastRun = readLastRun(root);
  let [mode, reason] = decideMode(root, isGit, lastRun, full);
  const files = collectFiles(root, isGit, mode, lastRun);
  if (mode === "quick") reason = `${reason}：${files.length} 個 UI 檔案有變更`;
  return {
    project_root: root,
    is_git: isGit,
    head: isGit ? head(root) : null,
    mode,
    reason,
    mobile,
    uses_sonner: detectSonner(root, files),
    last_run: lastRun,
    file_count: files.length,
    files,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  printJson(computeScope({ full: hasFlag("--full", "full"), mobile: hasFlag("--m", "m") }));
}
