---
description: 校正 CLAUDE.md 事實、按需分塊到 rules/、以 caveman full 極限壓縮規則文件（CLAUDE.md / .claude/rules / .claude/commands），只保 AI 可解析語意；同步檢查並維護專案根 README.md 供人類閱讀；`--audit` 時先以 prompt-audit 審查過時指令；`--lng` 指定所有檔案內容語言（預設英文）
argument-hint: "[--audit] [--lng <zh-tw|zh|ja|...>]"
---

Rule files read by AI only, loaded in full when active (`CLAUDE.md` each session, `rules/` per `paths`, commands on invocation), humans rarely read. Compress to `caveman` **full**, **no loss of instruction semantics**.

Compress filler, repetition, decorative explanation. Leave concrete rules, constraints, reasons attached to rules ("——因為…" clauses), disambiguating examples untouched—reasons let model judge situations rule does not cover; semantics, not decoration.

## Arguments (parse from `$ARGUMENTS`, any order)

- `--audit`: see step 3
- `--lng <code>` or `--lng=<code>`: language of **all file content** this command writes—compression targets (`CLAUDE.md`, `rules/`, `commands/` prose) and `README.md` all follow it; accept BCP-47 code (`zh-TW`, `zh`, `ja`, `de`, case-insensitive) or natural-language name (`繁中`, `日文`, `Japanese`)
  - absent → **English**
  - unrecognized or missing value → one-line notice, **fall back to English**, continue; do not abort
  - `zh` without script → Traditional Chinese (`zh-cn`/`簡中` only → Simplified)
  - existing file language ≠ target → needs rewrite; translate to target, semantics equivalent
- other unknown tokens → one-line notice, ignore; do not abort
- `--lng` governs file content only; conversation and report always Traditional Chinese

## Target files

### Compression targets (caveman full, keep only AI-parseable semantics)

- `CLAUDE.md` (project root)
- `./.claude/CLAUDE.md`
- `CLAUDE.local.md` (project root) and `./.claude/CLAUDE.local.md`—personal, machine-local, usually gitignored; same treatment as CLAUDE.md (fact check, compression, no-loss verification); never add to README or commit
- `./.claude/rules/**/*.md` (recursive, incl. subdirectories; project root is itself `.claude` directory (e.g. this repo) → `./rules/**/*.md`)
- `./.claude/commands/**/*.md` (incl. namespaced subdirectories; project root is itself `.claude` directory (e.g. this repo) → `./commands/**/*.md`)

Process only if exists; skip missing (`CLAUDE.local.md` absent on most machines—normal, no notice). Other `@path` import files not compressed proactively unless listed above.

⚠️ `./.claude/rules/**/*.md` (or this repo's `./rules/**/*.md`) are **user-level rules**, apply to all projects on machine, not only this project; before creating or modifying, confirm scope is not unique to this repo.

⚠️ Never glob bare `commands/**/*.md` in arbitrary projects—ordinary project `commands/` may be source code (e.g. CQRS command pattern); only paths clearly mapping to Claude Code `.claude/commands/` count as targets.

### Sync target (human-readable first, not compressed)

- `./README.md` (project root)—see "Step 8"

Process only paths above; **do not** extend to `skills/`, `settings.json`.

## Flow

### 1. Gather context

- Glob compression targets that actually exist (incl. `.claude/rules/**/*.md`, `.claude/commands/**/*.md`), read all; check whether `./README.md` exists.
- `git log --oneline -15` + `git diff` for recent direction. Find new rules **overlapping, duplicating or contradicting** existing content—first to merge or delete. Feed overlaps into later steps, not merely view them.

### 2. Update CLAUDE.md (fact correction)

Fix facts only; add no behavior rules.

- Check every path, command/skill name, setting value, hook filename mentioned in CLAUDE.md (incl. `./.claude/CLAUDE.md`, `CLAUDE.local.md`, existing `rules/**/*.md`); verify still exists.
- `CLAUDE.local.md` overlaps or contradicts CLAUDE.md → report only, do not merge across files (local file is personal override; user decides).
- Per step 1 git log/diff fix renamed, deleted, changed-value items; merge overlapping or contradicting rules found in step 1.
- No correction needed → state 「CLAUDE.md 事實已同步，未改動」; do not change for change's sake.
- Record each correction (before→after, basis) for step 9 report.

### 3. Stale-instruction audit (when `--audit`)

`$ARGUMENTS` lacks `--audit` → skip this step, do not mention it, flow as if step absent.

Has `--audit` →

- Call `Skill(skill: "claude-api", args: "prompt-audit")`, scope limited to compression-target files gathered in step 1 (excl. README.md, `skills/`, `settings.json`); target model per prompt-audit's own Step 0 rule.
- After getting audit report and proposed diff, **pause**; list findings, ask user to pick hunks to apply one by one—do not use prompt-audit default "no asking, diff only"; this command is interactive.
- Selected hunks → apply to files; unselected stay in report only, not applied.
- Low-confidence/`flag` items report only, not offered as selectable hunks.
- Applied result folds into step 4 instruction-list baseline—deleted semantics **not** listed, so step 6 verification does not misjudge loss.

### 4. Build instruction list (before compression)

Based on content after step 2 corrections and step 3 applied hunks (if run), list **explicit instruction list** per file—rules, constraints, prohibitions, format requirements each own item; attached reason listed with it. List is baseline for later no-loss verification; must build before editing. Higher compression strength, higher loss risk.

### 5. Check and chunk

Criteria—move content to `rules/<topic>.md` only if **both** hold:

- Content applies only when handling specific files/directories/extensions, expressible as explicit glob.
- Rule need not take effect in "new file created without reading similar existing file first" situation—`paths` rules load only when Claude **Reads** a matching file, not on every tool use; new-file situation misses; critical rules not chunked.

**Do not chunk**:

- Global behavior rules (language, timezone, commit/report conventions, etc.).
- Topic not mappable to glob—rule without `paths` still loads at start like CLAUDE.md, saves no context; do not.
- Multi-step flows/task-style workflows—rules unsuited; **suggest** in report rewriting as skill or command; do not convert automatically.

**Execute**:

- Create `rules/<topic>.md` (kebab-case topic filename, subdirectories allowed for grouping), frontmatter only `paths`:
  ```markdown
  ---
  paths:
    - "src/api/**/*.ts"
  ---
  ```
  Always double-quote globs—unquoted strings starting with `*` or `{` are misparsed by YAML, breaking frontmatter and degrading rule to full-load without `paths`.
- Verify each glob matches ≥1 existing file; 0 matches → still write, flag warning in report.
- **Fully remove** moved content from CLAUDE.md; leave no `@path` import (loads at start, same as no context saved), no duplicate copy.
- Existing `rules/**/*.md`: path-specific content lacking `paths` → add; overlaps CLAUDE.md or other rule → merge.
- No chunking need → state reason (e.g. "all global rules, no file-specific content"); CLAUDE.md over 200 lines with nothing chunkable → note line count in report.

### 6. Refine per file (caveman full)

Rewrite file content by **caveman full rules** below (incl. rules files created/modified in step 5). Do not Read caveman skill—it governs conversation style, persists whole session, and requires normal prose in files, opposite of this command.

Rewrite together: merge overlapping/duplicate rules found in step 1; keep structure that helps AI scan fast (headings, bullets, tables, code blocks).

**caveman full rules**:

- Drop: articles, filler (just/really/basically), pleasantries, vague hedging, decorative openers and closers
- Keep: negations and qualifiers (not/never/no/only/except, 不/勿/僅/除非), numbers and units—dropping flips meaning
- Allow: fragment sentences, short synonyms (fix, not implement a solution for)
- Forbid: invented abbreviations, decorative tables, emoji
- Standard technical abbreviations allowed: DB / API / HTTP
- Pattern: `[thing] [action] [reason]. [next step].`

**Language**: prose after rewrite always in `--lng` language (default English); source language differs → translate, semantics equivalent. Caveman full spirit (drop filler, pleasantries, redundancy; keep negations/qualifiers and numbers) applies to any target language. Always **keep original**, never translate:

- Proper nouns and project codenames (e.g. `COSS`, hostnames, service names)
- Paths, commands, environment variables, filenames
- Rules **about language** themselves (e.g. 「以繁中回應」)—rule prose follows `--lng`, but target language named inside quotes must not change
- Everything in "verbatim" list below—incl. whole command frontmatter block, so command `description`/`argument-hint` do not follow `--lng`
- User-facing output strings quoted in Chinese (e.g. 「CLAUDE.md 事實已同步，未改動」)—report language stays Traditional Chinese

**Verbatim (byte-for-byte)**:

- All content inside code blocks and fenced blocks
- Exact command strings (e.g. `git commit -m ...`)
- Format templates (e.g. commit message structure, trailer like `Co-Authored-By: ...`)
- Disambiguating good/bad examples (✅ 正確 / ❌ 錯誤)
- `@path` import syntax (e.g. `@CLAUDE.local.md`)—functional syntax, rewrite breaks it
- Frontmatter key names and values (`description:`, `name:`, `paths:`, etc.)
- Command file frontmatter **whole block** verbatim (`description`, `argument-hint`, `allowed-tools`, `model`, `disable-model-invocation`)—`description` drives slash command triggering and list display, compressing lowers accuracy
- Command argument placeholders `$ARGUMENTS`, `$1`–`$9`
- Command `!`-prefixed bash execution syntax—functional syntax, rewrite breaks it

Compress only **prose around** these blocks; blocks themselves untouched.

**Do not compress** (per caveman Auto-Clarity)—keep full sentences:

- Multi-step flows where **order matters** (dropping connectives makes order easy to misread)
- Conditional/exception branches (if / unless / 除非 / 僅當)
- Destructive or irreversible operation warnings
- Compression creates technical ambiguity

Test: **if compressed text has a second reasonable reading, do not compress.**

### 7. Verify no loss (after compression)

Compare item by item with step 4 instruction list: confirm **every** item still exists after rewrite in union of CLAUDE.md ∪ `rules/**/*.md` (`CLAUDE.local.md` verified against itself, not in union—stays separate file) (semantic equivalence enough, wording need not match). Chunked items must land in a rule file whose `paths` covers original scope.

⚠️ Casual "feels like nothing missing" is not verification—check list item by item, else edge rules get deleted silently while success is reported.

Caveman readback check: order/conditions not misread after fragmenting; technical terms, code, error strings, `@path` imports untouched verbatim; no invented abbreviations.

Language check: target-file prose all in `--lng` language (excl. verbatim blocks and proper nouns); translation changed no negation, qualifier, number, conditional branch; target language inside quotes of language rules untouched.

### 8. README.md sync

Check project-root `./README.md` every run.

**Exists** → read, compare refined rule files and actual directory structure, decide whether update needed: rule-file sections added/removed (incl. step-5 new `rules/*.md`) should reflect in README; command / skill / path / setting mentioned in README no longer exists or renamed. README language ≠ `--lng` language also counts as needs update; translate whole file to target (code blocks, paths, commands, proper nouns not translated). No update needed → state 「README 已同步，未改動」; do not change for change's sake.

**Missing** → create, same judgment for content; skeleton: one-sentence project positioning; directory tree (runtime artifacts noted as gitignored); available commands / skills tables; key settings; maintenance conventions.

README **not caveman**—readers are humans: full sentences, normal punctuation, needed tables and directory tree. New or updated content always in `--lng` language (default English), incl. directory-tree comments and table description columns.

### 9. Write and report

Write files directly with Edit/Write, **no** automatic git commit; leave to `/now-push` or user. Report:

- Fact correction list (step 2): each before→after and basis
- Stale-instruction audit (step 3, when `--audit`): findings count/confidence distribution, applied hunk list, unapplied (incl. low-confidence/`flag`) items; not run → write 「未加 `--audit`，略過」
- Chunking result (step 5): source section → target file, `paths`, glob match count; or 「無分塊需求」 + reason; skill/command conversion suggestions
- Per-file instruction list, each item marked 「保留 ✓」
- Per-file lines/chars before→after and compression ratio (**observation, not goal**)
- Main edits (what merged, what filler removed)
- README.md outcome (created / updated / synced unchanged)
- Language outcome: language actually used (incl. notice when unrecognized `--lng` fell back to English), whether each file translated (source→target language)

## Self-compression reminder

`commands/up-rules.md`, `commands/now-push.md`, `commands/up-skills.md` themselves are in compression scope:

- `now-push.md` nearly whole file verbatim (commit format template, type table, ✅/❌ good/bad examples, `Co-Authored-By` trailer)—touch only prose around template, little room; do not force template changes for ratio.
- When compressing itself, rewrite must still pass "Step 7: verify no loss" item by item.

## Prohibited

- Do not add rules or features not already present—applies to compression-target files only; README is supplementary, exempt. Fact correction (step 2) and chunk moving (step 5) not additions, only fix and move, semantics unchanged; hunks user selected under `--audit` (step 3) exempt, user-authorized semantic change.
- Do not delete a rule because it is "too long"—drop filler only, never semantics; hunks user selected under `--audit` exempt.
- Do not over-cut for ratio; prefer conservative over losing instructions. caveman full is style ceiling, not compression-rate metric.
- Compression (step 6) must not reintroduce stale patterns `--audit` removed (all-caps emphasis MUST/CRITICAL, pressure tone, decorative step scripts).
- Do not replace chunking with `@path` import—import loads at start, misses on-demand loading goal.
- Do not converse or report in caveman style—command changes file content only; conversation and report stay normal Traditional Chinese, not following `--lng`.
- Translation must not change semantics: no rules added or removed, no negation or qualifier weakened; ambiguous spot → keep original and flag warning in report, do not guess.
- Do not compress so hard it needs rereading twice—AI comprehension cost is cost.
