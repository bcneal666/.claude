#!/usr/bin/env node
// Start an up-design run.
//   1. Create ./up-design/ and ./up-design/reports/ if missing
//   2. Make sure ./up-design/ is not ignored by git (it must be versioned)
//   3. Decide scope (same logic as scope.mjs)
//   4. Create this run's report from assets/report-template.md
//
// Usage:
//   node start_run.mjs [--full|full] [--m|m]
//
// Prints JSON: everything scope.mjs prints, plus report_path, created_state_dir
// and gitignore (what was done about .gitignore).

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SKILL_DIR, STATE_DIR, git, hasFlag, nowParts, printJson, toPosix } from "./_common.mjs";
import { computeScope } from "./scope.mjs";

const EXACT_PATTERNS = new Set([
  "up-design", "up-design/", "/up-design", "/up-design/",
  "up-design/**", "/up-design/**", "up-design/*", "/up-design/*",
]);
const NEGATIONS = ["!/up-design/", "!/up-design/**"];
const PROBES = [`${STATE_DIR}/last-run.json`, `${STATE_DIR}/perf-baseline.md`, `${STATE_DIR}/reports/probe.md`];

/** Rules that ignore a probe path, as {source, line, pattern}. Uses -z so Windows drive letters parse safely. */
function ignoredBy(root) {
  const out = git(["check-ignore", "-v", "-z", "--stdin", "--no-index"], root, PROBES.join("\0") + "\0");
  if (!out) return [];
  const fields = out.split("\0");
  const hits = [];
  for (let i = 0; i + 3 < fields.length; i += 4) {
    const [source, line, pattern] = fields.slice(i, i + 3);
    if (!source || pattern.startsWith("!")) continue; // negation matched => not ignored
    if (!hits.some((h) => h.source === source && h.line === line)) hits.push({ source, line, pattern });
  }
  return hits;
}

function describe(hits) {
  return hits.map((h) => `${h.source}:${h.line} ${h.pattern}`).join(", ");
}

function fixGitignore(root) {
  const report = { status: "ok", actions: [], warnings: [] };
  const gitignore = path.join(root, ".gitignore");
  const isRootGitignore = (src) => path.resolve(root, src) === path.resolve(gitignore);

  for (let attempt = 0; attempt < 3; attempt++) {
    const hits = ignoredBy(root);
    if (!hits.length) return report;

    const removable = hits.filter((h) => isRootGitignore(h.source) && EXACT_PATTERNS.has(h.pattern.trim()));
    if (removable.length) {
      // Split keeping each line's own ending, so CRLF files stay CRLF.
      const lines = readFileSync(gitignore, "utf8").split(/(?<=\n)/);
      const drop = new Set(removable.map((h) => Number(h.line)));
      writeFileSync(gitignore, lines.filter((_, i) => !drop.has(i + 1)).join(""), "utf8");
      report.actions.push(`從 .gitignore 移除：${[...new Set(removable.map((h) => h.pattern))].join(", ")}`);
      continue;
    }

    const existing = existsSync(gitignore) ? readFileSync(gitignore, "utf8") : "";
    const existingLines = existing.split(/\r?\n/).map((l) => l.trim());
    if (NEGATIONS.every((n) => existingLines.includes(n))) break;
    const eol = existing.includes("\r\n") ? "\r\n" : "\n";
    const prefix = existing && !existing.endsWith("\n") ? eol : "";
    appendFileSync(
      gitignore,
      `${prefix}${eol}# up-design 狀態目錄需納入版控${eol}${NEGATIONS.join(eol)}${eol}`,
      "utf8",
    );
    report.actions.push(`被較廣的規則忽略（${describe(hits)}），已在 .gitignore 加入 ${NEGATIONS.join(" ")}`);
  }

  const hits = ignoredBy(root);
  if (hits.length) {
    report.status = "still_ignored";
    report.warnings.push(`up-design/ 仍被忽略（${describe(hits)}），需手動處理並記入報告`);
  }
  return report;
}

function createReport(root, scope) {
  const t = nowParts();
  const dir = path.join(root, STATE_DIR, "reports");
  let file = path.join(dir, `${t.fileStamp}.md`);
  for (let n = 2; existsSync(file); n++) file = path.join(dir, `${t.fileStamp}-${n}.md`);

  const template = readFileSync(path.join(SKILL_DIR, "assets", "report-template.md"), "utf8");
  const content = template
    .replaceAll("{{DATETIME}}", t.display)
    .replaceAll("{{MODE}}", scope.mode)
    .replaceAll("{{FILE_COUNT}}", String(scope.file_count))
    .replaceAll("{{MOBILE}}", scope.mobile ? "是（m）" : "否")
    .replaceAll("{{SONNER}}", scope.uses_sonner ? "有使用" : "未使用");
  writeFileSync(file, content, "utf8");
  return toPosix(path.relative(root, file));
}

const scope = computeScope({ full: hasFlag("--full", "full"), mobile: hasFlag("--m", "m") });
const root = scope.project_root;
const stateDir = path.join(root, STATE_DIR);
const created = !existsSync(stateDir);
mkdirSync(path.join(stateDir, "reports"), { recursive: true });

const gitignore = scope.is_git ? fixGitignore(root) : { status: "not_git", actions: [], warnings: [] };
const reportPath = createReport(root, scope);

printJson({ ...scope, created_state_dir: created, gitignore, report_path: reportPath });
