---
name: up-rules
description: Fact-check CLAUDE.md, route each rule to the cheapest place that still enforces it (lint config first, then on-demand .claude/rules/, CLAUDE.md last), compress rule files (CLAUDE.md / .claude/rules / .claude/commands, plus self-made skills listed in skills/.up-skills-ignore, plus up-design artifacts when ./up-design/ exists) to terse style keeping only AI-parseable semantics; check and maintain the project-root README.md for humans; with `--audit` first audit stale instructions; `--lng` sets the language of all file content (default English)
argument-hint: "[--audit] [--lng <zh|ja|...>]"
disable-model-invocation: true
---

Rule files read by AI only, loaded in full when active (`CLAUDE.md` each session, `rules/` per `paths`, commands on invocation), humans rarely read. Compress to **terse style** (`references/compression.md`), **no loss of instruction semantics**.

Compress filler, repetition, decorative explanation. Leave concrete rules, constraints, reasons attached to rules ("——因為…" clauses), disambiguating examples untouched—reasons let model judge situations rule does not cover; semantics, not decoration.

Every rule lives in the cheapest place that still enforces it: **lint** (checked by machine on every run, zero context) → **`.claude/rules/`** with `paths` (loaded only when matching files are read) → **`CLAUDE.md`** (loaded every session). A sentence in a long file gets skipped when context is full; a lint error does not.

## Arguments (parse from `$ARGUMENTS`, any order)

- `--audit`: see step 3
- `--lng <code>` or `--lng=<code>`: language of **all file content** this skill writes—compression targets (`CLAUDE.md`, `rules/`, `commands/` prose), lint rule `message` text, language-only targets (`agents/` prose, `hooks/` comments, command `description`) and `README.md` all follow it; accept BCP-47 code (`zh`, `ja`, `de`, case-insensitive) or natural-language name (`繁中`, `日文`, `Japanese`)
  - absent → **English**
  - unrecognized or missing value → one-line notice, **fall back to English**, continue; do not abort
  - `zh` → Traditional Chinese (`zh-cn`/`簡中` → Simplified)
  - existing file language ≠ target → needs rewrite; translate to target, semantics equivalent
- other unknown tokens → one-line notice, ignore; do not abort
- `--lng` governs file content only; conversation and report always Traditional Chinese

## Files

`<skill-dir>` = directory of this SKILL.md. Everything the run needs ships here; read each file at the step that names it.

| File                         | Read at       | Purpose                                                                       |
| ---------------------------- | ------------- | ----------------------------------------------------------------------------- |
| `references/targets.md`      | Step 1        | Which files are compressed, translated, synced or written (lint configs)      |
| `references/stale-audit.md`  | Step 3        | Stale-instruction audit: patterns, keep list, report and hunk format          |
| `references/rule-routing.md` | Step 5        | Lint → `rules/` → `CLAUDE.md` routing; linter detection, writing and checking |
| `references/compression.md`  | Steps 6 and 7 | Terse style rules, language, verbatim list, do-not-compress, readback checks  |
| `references/readme.md`       | Step 8        | README sync, inventory sync, style guide                                      |

## Flow

### 1. Gather context

- Read `references/targets.md`. Glob compression targets that actually exist (incl. `.claude/rules/**/*.md`, `.claude/commands/**/*.md`, self-made skill `.md` files per "Self-made skills", up-design artifacts per "up-design artifacts"), read all; check whether `./README.md` exists.
- Detect the project's linters and their run command (`references/rule-routing.md` § Detection); note whether CLAUDE.md, a hook or CI already runs lint.
- `git log --oneline -15` + `git diff` for recent direction. Find new rules **overlapping, duplicating or contradicting** existing content—first to merge or delete. Feed overlaps into later steps, not merely view them.

### 2. Update CLAUDE.md (fact correction)

Fix facts only; add no behavior rules.

- Check every path, command/skill name, setting value, hook filename mentioned in CLAUDE.md (incl. `./.claude/CLAUDE.md`, `CLAUDE.local.md`, existing `rules/**/*.md`); verify still exists.
- Self-made skill files: verify every sub-skill name, file path (incl. `${CLAUDE_SKILL_DIR}/…` and fallback paths) and command still exists; fix facts only.
- up-design artifacts: `DESIGN.md` and `design-*` skill files get same fact check (paths, tokens, filenames, commands); `up-design/**` (reports, baseline) skipped—history and measurements.
- `CLAUDE.local.md` overlaps or contradicts CLAUDE.md → report only, do not merge across files (local file is personal override; user decides).
- Per step 1 git log/diff fix renamed, deleted, changed-value items; merge overlapping or contradicting rules found in step 1.
- No correction needed → state 「CLAUDE.md 事實已同步，未改動」; do not change for change's sake.
- Record each correction (before→after, basis) for step 9 report.

### 3. Stale-instruction audit (when `--audit`)

`$ARGUMENTS` lacks `--audit` → skip this step, do not mention it, flow as if step absent.

Has `--audit` →

- Read `references/stale-audit.md` and run it, scope limited to compression-target files gathered in step 1, incl. self-made skill files, `DESIGN.md` and `design-*` skill files (excl. `up-design/**`—history and measurements, not instructions; README.md, other `skills/`, `agents/`, `settings.json`).
- After getting audit report and proposed hunks, **pause**; list findings, ask user to pick hunks to apply one by one; this skill is interactive.
- Selected hunks → apply to files; unselected stay in report only, not applied.
- Low-confidence/`flag` items report only, not offered as selectable hunks.
- Applied result folds into step 4 instruction-list baseline—deleted semantics **not** listed, so step 7 verification does not misjudge loss.

### 4. Build instruction list (before compression)

Based on content after step 2 corrections and step 3 applied hunks (if run), list **explicit instruction list** per file—rules, constraints, prohibitions, format requirements each own item; attached reason listed with it. List is baseline for later no-loss verification; must build before editing. Higher compression strength, higher loss risk.

For items in `CLAUDE.md`, `./.claude/CLAUDE.md` and `rules/**/*.md`, also note a candidate destination (lint / `rules/<topic>.md` / `CLAUDE.md`) per `references/rule-routing.md`; step 5 confirms it.

### 5. Route rules (lint → rules/ → CLAUDE.md)

Read `references/rule-routing.md` and route every item from step 4 to the first tier that fits:

1. **Lint**: whole instruction mechanically checkable, an installed linter can express it with its why in a `message` (or a config comment), and lint still runs with a valid config afterwards → write the lint rule, delete the sentence.
2. **`rules/<topic>.md`**: path-specific per the chunking criteria there → move with `paths` frontmatter.
3. **`CLAUDE.md`**: everything else stays.

No item routes anywhere → state reason (e.g. "no linter, all global rules") in the report.

### 6. Refine per file (terse style)

Read `references/compression.md` and rewrite every compression target (incl. rules files created/modified in step 5) by its terse style rules, language rules, verbatim list and do-not-compress list. Rewrite together: merge overlapping/duplicate rules found in step 1; keep structure that helps AI scan fast (headings, bullets, tables, code blocks).

### 7. Verify no loss (after compression)

Compare item by item with step 4 instruction list: confirm **every** item still exists after rewrite (semantic equivalence enough, wording need not match) in its file's verification set:

- `CLAUDE.md`, `rules/**/*.md` and lint rules written in step 5: union of all three (chunked items must land in a rule file whose `paths` covers original scope; lint items must land in a rule whose file scope covers original scope, with the reason in its `message` or comment)
- `CLAUDE.local.md`: itself (stays separate file)
- self-made skill: union of its own directory's `.md` files (merging between them allowed); never against CLAUDE.md ∪ rules
- `design-*` skill: same as self-made skill
- `DESIGN.md`, each `up-design/**/*.md`: itself

Skill anchors (step numbers, referenced headings, cross-referenced filenames) unchanged.

⚠️ Casual "feels like nothing missing" is not verification—check list item by item, else edge rules get deleted silently while success is reported.

Then run the readback and language checks in `references/compression.md` § Checks, and re-run lint once more if step 5 wrote any lint rule.

### 8. README.md sync

Read `references/readme.md` and follow it. Check project-root `./README.md` every run; inventory sync runs every time.

### 9. Write and report

Write files directly with Edit/Write, **no** automatic git commit; leave to `/now-push` or user. Report:

- Fact correction list (step 2): each before→after and basis
- Stale-instruction audit (step 3, when `--audit`): findings count/confidence distribution, applied hunk list, unapplied (incl. low-confidence/`flag`) items; not run → write 「未加 `--audit`，略過」
- Rule routing (step 5):
  - Lint: rule → config file, lint rule name, severity, violations in existing code (count), lint run result; suggested configs not written (marked 「未驗證」) with reason; lint-command line added to CLAUDE.md or not
  - Chunking: source section → target file, `paths`, glob match count; or 「無分塊需求」 + reason; skill/command conversion suggestions
- Per-file instruction list, each item marked 「保留 ✓」 (or 「→ lint」 / 「→ rules/<file>」 with destination)
- Per-file lines/chars before→after and compression ratio (**observation, not goal**)
- Self-made skills (only when `.up-skills-ignore` exists): skills and files processed, lines/chars before→after per file, listed names without a directory
- up-design artifacts (only when `./up-design/` exists): files processed, lines/chars before→after per file
- Main edits (what merged, what filler removed)
- README.md outcome (created / updated / restyled or trimmed / synced unchanged), lines before→after
- Inventory sync (step 8): per category added/removed items, or 「清單已同步」
- Language outcome: language actually used (incl. notice when unrecognized `--lng` fell back to English), whether each file translated (source→target language), incl. language-only targets (agents, hooks comments, command descriptions) per file

## Self-compression reminder

`commands/up-skills.md` and self-made skills `skills/up-rules/` and `skills/now-push/` themselves are in compression scope:

- `skills/now-push/references/commit-format.md` nearly whole file verbatim (commit format template, type table, ✅/❌ good/bad examples, `Co-Authored-By` trailer)—touch only prose around template, little room; do not force template changes for ratio.
- `skills/up-rules/references/stale-audit.md` Before/After tables and signal regexes are quoted examples—verbatim.
- When compressing itself, rewrite must still pass "Step 7: verify no loss" item by item.

## Prohibited

- Do not add rules or features not already present—applies to compression-target files only; README is supplementary, exempt. Fact correction (step 2), chunk moving and lint moving (step 5) not additions, only fix and move, semantics unchanged; the one lint-command line step 5 adds to CLAUDE.md is exempt; hunks user selected under `--audit` (step 3) exempt, user-authorized semantic change.
- Do not delete a rule because it is "too long"—drop filler only, never semantics; a sentence deleted because a verified lint rule now carries it is a move, not a deletion; hunks user selected under `--audit` exempt.
- Do not over-cut for ratio; prefer conservative over losing instructions. Terse style is style ceiling, not compression-rate metric.
- Compression (step 6) must not reintroduce stale patterns `--audit` removed (all-caps emphasis MUST/CRITICAL, pressure tone, decorative step scripts).
- Do not converse or report in terse style—skill changes file content only; conversation and report stay normal Traditional Chinese, not following `--lng`.
- Translation must not change semantics: no rules added or removed, no negation or qualifier weakened; ambiguous spot → keep original and flag warning in report, do not guess.
- Do not compress so hard it needs rereading twice—AI comprehension cost is cost.
- Do not install lint tools, plugins or any dependency, and do not edit source code to fix lint violations: this skill changes rule files and lint configs only.
