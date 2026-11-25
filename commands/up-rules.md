---
description: Fact-check CLAUDE.md, chunk on-demand content into rules/, compress rule files (CLAUDE.md / .claude/rules / .claude/commands, plus self-made skills listed in skills/.up-skills-ignore, plus up-design artifacts when ./up-design/ exists) at caveman full keeping only AI-parseable semantics; check and maintain the project-root README.md for humans; with `--audit` first audit stale instructions via prompt-audit; `--lng` sets the language of all file content (default English)
argument-hint: "[--audit] [--lng <zh|ja|...>]"
disable-model-invocation: true
---

Rule files read by AI only, loaded in full when active (`CLAUDE.md` each session, `rules/` per `paths`, commands on invocation), humans rarely read. Compress to `caveman` **full**, **no loss of instruction semantics**.

Compress filler, repetition, decorative explanation. Leave concrete rules, constraints, reasons attached to rules ("——因為…" clauses), disambiguating examples untouched—reasons let model judge situations rule does not cover; semantics, not decoration.

## Arguments (parse from `$ARGUMENTS`, any order)

- `--audit`: see step 3
- `--lng <code>` or `--lng=<code>`: language of **all file content** this command writes—compression targets (`CLAUDE.md`, `rules/`, `commands/` prose), language-only targets (`agents/` prose, `hooks/` comments, command `description`) and `README.md` all follow it; accept BCP-47 code (`zh`, `ja`, `de`, case-insensitive) or natural-language name (`繁中`, `日文`, `Japanese`)
  - absent → **English**
  - unrecognized or missing value → one-line notice, **fall back to English**, continue; do not abort
  - `zh` → Traditional Chinese (`zh-cn`/`簡中` → Simplified)
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

### Self-made skills (compression targets, caveman full)

- List file: `./.claude/skills/.up-skills-ignore` (project root is itself `.claude` directory (e.g. this repo) → `./skills/.up-skills-ignore`). Parse like `/up-skills`: strip `#`-leading comments and trailing `# ...` comments, trim, drop empty lines → name set.
- List file missing → project has no self-made skills; skip all of this silently, no notice.
- Each name → every `<skills dir>/<name>/**/*.md` is a compression target (`SKILL.md` plus attachments such as `CRITERIA.md`), except `evals/**` (test fixtures: prompts are user words, graders match exact strings; never touch); non-`.md` files (scripts etc.) untouched. Name without a real directory under skills dir → one-line notice, skip.
- Skill not in list → never touch (upstream-managed, `/up-skills` overwrites it).
- ⚠️ `skills/` in this repo is user-level, applies to all projects on machine; before modifying, confirm scope is not unique to this repo.

### up-design artifacts (compression targets, caveman full)

Only when project root has `./up-design/` directory; absent → skip all of this silently, no notice.

- `./up-design/**/*.md` (`perf-baseline.md`, `reports/*.md`)
- `DESIGN.md` (project root)
- `./.claude/skills/design-*/**/*.md` (project root is itself `.claude` directory → `./skills/design-*/**/*.md`); treated like self-made skills (SKILL.md frontmatter verbatim except `description`, anchors unchanged), but listing in `.up-skills-ignore` not needed
- Never touch `up-design/last-run.json` or any non-`.md` file—script-written, hand edit breaks quick/full mode decision.
- **No translation, compression only**—`--lng` does not apply (incl. `description`): `/up-design` locates sections by fixed headings (report `診斷` / `修正結果` / `未解決` / `規則變更`, DESIGN.md `Surfaces` … `Copy`) and writes later reports in template language; translating breaks lookup and mixes languages.
- Verbatim in addition to step 6 list: all headings, tables (headers, cells, `file:line`, numbers, verdicts pass/gap/N/A/未驗證), `<!-- date：「user words」 -->` comments, `Updated:` / `Source report:` lines. `Why:` lines: drop filler only, keep reason.
- `reports/*.md` are history: no step 2 fact correction, no deleting, no merging reports; compress prose only.
- Never chunk into `rules/` (step 5).

### Language-only targets (translate to `--lng`, never compress, never audit)

- `./.claude/agents/**/*.md` (this repo → `./agents/**/*.md`): body prose and frontmatter `description` follow `--lng`; other frontmatter keys (`name`, `tools`, `model`, `skills`, …) verbatim. `description` drives auto-delegation → keep meaning of trigger phrases (e.g. "Use proactively …"); tool, skill, agent names verbatim
- `./.claude/hooks/**` (this repo → `./hooks/**`): translate comments only; code, string literals, identifiers, log/output strings untouched
- Command `description` (frontmatter of compression-target commands): follows `--lng`; flags (`--lng`, `--pr`, …), paths, command/skill names inside it verbatim. Translate only, never compress—`description` drives slash command triggering and list display
- Language already equals `--lng` → no change; do not touch for change's sake. Not in step 3 audit scope, no caveman, no fact edits

### Sync target (human-readable first, not compressed)

- `./README.md` (project root)—see "Step 8"

Process only paths above; **do not** extend to `settings.json`, or to `skills/` beyond the self-made skills and up-design artifacts above. Exception: read-only inventory in "Inventory sync" (step 8)—never compress or modify those files.

## Flow

### 1. Gather context

- Glob compression targets that actually exist (incl. `.claude/rules/**/*.md`, `.claude/commands/**/*.md`, self-made skill `.md` files per "Self-made skills", up-design artifacts per "up-design artifacts"), read all; check whether `./README.md` exists.
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

- Call `Skill(skill: "claude-api", args: "prompt-audit")`, scope limited to compression-target files gathered in step 1, incl. self-made skill files, `DESIGN.md` and `design-*` skill files (excl. `up-design/**`—history and measurements, not instructions; README.md, other `skills/`, `agents/`, `settings.json`); target model per prompt-audit's own Step 0 rule.
- After getting audit report and proposed diff, **pause**; list findings, ask user to pick hunks to apply one by one—do not use prompt-audit default "no asking, diff only"; this command is interactive.
- Selected hunks → apply to files; unselected stay in report only, not applied.
- Low-confidence/`flag` items report only, not offered as selectable hunks.
- Applied result folds into step 4 instruction-list baseline—deleted semantics **not** listed, so step 7 verification does not misjudge loss.

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
- Self-made skill content—skills already load on demand; never move into `rules/`.
- up-design artifacts (`up-design/**`, `DESIGN.md`, `design-*` skills)—`/up-design` reads them by fixed location; never move into `rules/`.

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

**caveman full rules** (compression targets only; README never follows them, see step 8):

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
- Everything in "verbatim" list below
- User-facing output strings quoted in Chinese (e.g. 「CLAUDE.md 事實已同步，未改動」)—report language stays Traditional Chinese

**Verbatim (byte-for-byte)**:

- All content inside code blocks and fenced blocks
- Exact command strings (e.g. `git commit -m ...`)
- Format templates (e.g. commit message structure, trailer like `Co-Authored-By: ...`)
- Disambiguating good/bad examples (✅ 正確 / ❌ 錯誤)
- `@path` import syntax (e.g. `@CLAUDE.local.md`)—functional syntax, rewrite breaks it
- Frontmatter key names and values (`description:`, `name:`, `paths:`, etc.)
- Command file frontmatter block verbatim (`argument-hint`, `allowed-tools`, `model`, `disable-model-invocation`) except `description` (translate-only per "Language-only targets")
- Command argument placeholders `$ARGUMENTS`, `$1`–`$9`
- Command `!`-prefixed bash execution syntax—functional syntax, rewrite breaks it
- Skill `SKILL.md` frontmatter verbatim (`name`, `argument-hint`, `disable-model-invocation`, `allowed-tools`, `model`, …) except `description` (translate-only like command `description`)
- Skill placeholders `$ARGUMENTS`, `${CLAUDE_SKILL_DIR}`
- Skill anchors: step numbers, headings other text or files refer to (e.g. "Modern web guidance"), filenames skill files reference each other by—renaming breaks cross-references
- Quoted example strings (e.g. UI copy「確定」「建立工單」, sub-skill `args` task prompts in quotes)—they are content or prompts, not prose
- Tokens other files or scripts match exactly: verdict values (`pass` / `gap` / `N/A` / `未驗證`), report section names, `{{PLACEHOLDER}}` template tokens—translating or rewording breaks matching

Compress only **prose around** these blocks; blocks themselves untouched.

**Do not compress** (per caveman Auto-Clarity)—keep full sentences:

- Multi-step flows where **order matters** (dropping connectives makes order easy to misread)
- Conditional/exception branches (if / unless / 除非 / 僅當)
- Destructive or irreversible operation warnings
- Compression creates technical ambiguity

Test: **if compressed text has a second reasonable reading, do not compress.**

### 7. Verify no loss (after compression)

Compare item by item with step 4 instruction list: confirm **every** item still exists after rewrite (semantic equivalence enough, wording need not match) in its file's verification set:

- `CLAUDE.md` and `rules/**/*.md`: union of both (chunked items must land in a rule file whose `paths` covers original scope)
- `CLAUDE.local.md`: itself (stays separate file)
- self-made skill: union of its own directory's `.md` files (merging between them allowed); never against CLAUDE.md ∪ rules
- `design-*` skill: same as self-made skill
- `DESIGN.md`, each `up-design/**/*.md`: itself

Skill anchors (step numbers, referenced headings, cross-referenced filenames) unchanged.

⚠️ Casual "feels like nothing missing" is not verification—check list item by item, else edge rules get deleted silently while success is reported.

Caveman readback check: order/conditions not misread after fragmenting; technical terms, code, error strings, `@path` imports untouched verbatim; no invented abbreviations.

Language check: target-file prose all in `--lng` language (excl. verbatim blocks and proper nouns); translation changed no negation, qualifier, number, conditional branch; target language inside quotes of language rules untouched. up-design artifacts excluded from language check (never translated); headings, tables, `last-run.json` unchanged (`git diff`). Language-only targets: agents prose + `description`, hook comments, command `description` all in `--lng`; `git diff hooks/` shows only comment lines changed, `node --check` passes; frontmatter keys other than `description` untouched.

### 8. README.md sync

Check project-root `./README.md` every run.

**Exists** → read, compare refined rule files and actual directory structure, decide whether update needed: rule-file sections added/removed (incl. step-5 new `rules/*.md`) should reflect in README; command / skill / path / setting mentioned in README no longer exists or renamed. README language ≠ `--lng` language also counts as needs update; translate whole file to target (code blocks, paths, commands, proper nouns not translated). README violating any "Style guide" rule below also counts as needs update (paragraph length, table-vs-list choice, table alignment, emoji, bare URLs, history wording, length and depth budget, figures). Inventory mismatch (below) also counts. Restyle and trim to essentials; never add or alter facts—trimming detail is not a fact change. No update needed → state 「README 已同步，未改動」; do not change for change's sake.

**Missing** → create, same judgment for content, structured per Style guide; project-specific sections: directory tree (runtime artifacts noted as gitignored), inventory sections from "Inventory sync", key settings, maintenance conventions.

#### Inventory sync

Run every time, whether README exists or not. Compare what actually exists with what README lists; add missing, delete gone, order rows as actual.

| Category  | Actual source                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Rules     | `./.claude/rules/**/*.md` (this repo: `./rules/**/*.md`)                                                                        |
| Skills    | `./.claude/skills/*/SKILL.md` (incl. symlinks into `.agents/skills/`; name = directory name) (this repo: `./skills/*/SKILL.md`) |
| Commands  | `./.claude/commands/**/*.md` (this repo: `./commands/**/*.md`)                                                                  |
| Subagents | `./.claude/agents/**/*.md` (this repo: `./agents/**/*.md`); name = frontmatter `name`, else filename without `.md`              |
| Hooks     | `hooks` events in `./.claude/settings.json` and the script files they call (this repo: `./settings.json`)                       |
| MCP       | `mcpServers` in `./.mcp.json`                                                                                                   |
| Plugins   | `enabledPlugins` entries set `true` in `./.claude/settings.json` (this repo: `./settings.json`)                                 |

- List only items that exist in this project. Items from global `~/.claude/` not listed (exception: project root is itself `~/.claude`, e.g. this repo); never write "now provided globally" or similar.
- Category has items but README lacks its section → add section. Category empty → no section.
- Output one table per category, per "Tables": columns `Name | Purpose` (Rules, Skills, Commands, Subagents, MCP, Plugins) or `Script | Event | Purpose` (Hooks); same headers and column order across runs. Purpose one line (≤ ~80 display width), taken from SKILL.md / rule / subagent `description` or first paragraph; never guess.
- Report per category what was added or removed; all matched → 「清單已同步」.

README is exempt from all caveman rules in step 6 (incl. fragment sentences and emoji ban)—readers are humans: full sentences, natural tone, lively but concise. New or updated content always in `--lng` language (default English), incl. directory-tree comments and table description columns.

#### Style guide

**Structure** (top to bottom, skip what does not apply):

1. `# <emoji> <name>` + one-line tagline (≤120 chars). Badges only when they carry real signal (CI, version, license); config repos usually none
2. Intro: ≤2 sentences, or 3–6 highlights (table or bullets per "Writing")
3. Table of contents only when README exceeds 100 lines
4. `🚀 Quick start`: copy-pasteable code block
5. Project-specific sections (structure, commands, skills, subagents, settings, maintenance…)
6. Contributing / License only when repo has them

**Writing**:

- Paragraph ≤3 sentences. 3+ parallel items never one comma-chained paragraph
- 3+ parallel items sharing a key (name, command, path, role…) → **table first**: key in first column, description in last. See "Tables"
- Use a list instead only when:
  - any item's description exceeds 2 lines (~120 display width; CJK/full-width chars count 2, ≈60 CJK chars)—first trim per "Depth"; still too long → whole group as list, never mix table and list in one group
  - items have no natural key (plain sentences; table would be one column)
  - items are ordered steps → numbered list
- List item: one concept per bullet, `- **Name** — description` or ``- `code` — description``
- Table cell ≤ one short sentence (≤ ~120 display width); move detail to bullets under the table or `<details>`
- Active voice, concrete verbs; say what it does, not how impressive it is
- Bold only key terms, ≤2 per paragraph
- Code blocks carry a language tag; link repo files with relative links
- URLs never bare: `[text](url)` preferred, `<url>` when URL itself is the text—GFM autolink runs until whitespace or `<`, so adjacent CJK chars, full-width punctuation (`。，）：`) or other text get swallowed into link, breaking click. Inside `[text](url)` URL has no spaces (encode `%20`). URLs inside code blocks / inline code untouched
- Lively, not salesy: tagline says what the user gets, not the tech stack; features as highlight table (`Name | one sentence`), bullets `- **Name** — one sentence` only when a row would be too long, optional fitting emoji; verbs concrete ("customers file tickets, PMs reply live", not "provides ticketing")

**Current state only**:

- README describes what is true now. No history: migration, removal, relocation, rename, "formerly / no longer / now provided by / moved to / 原本 / 不再 / 改由 / 已移除 / 新增了". Deleted things simply disappear.
- History belongs in git log or CHANGELOG, not README.

**Depth** (README is a guide, not a spec):

- Test: would a newcomer need this on day one? No → leave out.
- Per feature: one-line summary plus ≤3 user-visible highlights; more → `<details>` or delete.
- Leave out: cache durations, DB columns and SQL, algorithms and formulas, file-level implementation maps, edge cases, UI micro-interactions (animation, skeleton timing). They live in `rules/` or code; link with one line (`details: .claude/rules/xxx.md`) when needed.
- Length budget: ≤300 lines for a typical project README (incl. `<details>` content). Over budget → cut detail first, fold second.

**Emoji**: one semantically fitting emoji at start of H1 and each H2, no repeats within a README; allowed on highlight rows / bullets and ✅ / ❌ in status columns; none inside body prose, code, or paths. Default picks for consistency across runs:

```
🚀 Quick start   ✨ Features    📁 Structure    ⚡ Commands     🧩 Skills
🤖 Subagents     🔌 Plugins     ⚙️ Settings     🛠️ Maintenance  📝 Notes
🤝 Contributing  📄 License
```

**Tables**:

- **Aligned source**: one space padding each side of cell; pad with spaces to column width so every row's `|` lines up vertically; width = display width (CJK/full-width chars and emoji count 2); separator row dashes fill column width. Result should match `prettier --write` when project uses prettier (run it to verify). Literal `|` inside cell → `\|`
- **Consistent structure**: same-kind tables (e.g. inventory categories) share header names and column order; headers short, in `--lng` language; one format per column (all code or all plain text, never mixed); left-aligned by default, numeric columns `---:`; ≤4 columns, more → split table or move detail to bullets under it
- **Lean cells**: one short sentence per cell; no line breaks, no `<br>`, no lists inside; descriptions in same column similar length; too long → trim text, never widen column

**Markdown features**:

- Callouts: `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`; ≤1 per section, never nested
- Long reference (full lists, platform workarounds) → `<details><summary>…</summary>` with a blank line after `</summary>`, else inner Markdown does not render
- Directory tree → plain `text` code block with `├──` / `└──` (allowed exception to no-ASCII-figure rule); `# comment` ≤3 words, line ≤80 cols; longer detail → bullets under tree
- Flows of 3+ steps → numbered list; checklist → `- [ ]` task list
- No figures: no Mermaid, SVG or framed ASCII
- Not translated under `--lng`: callout keywords, emoji, paths in directory tree

**Self-check before writing**: skim headings + first line of each section; reader must learn what it is, how to start, where things live within 30 seconds. Then mechanical checks: every table's `|` aligned (full-width = 2) with consistent same-kind headers; line count within budget; zero history-wording hits (grep the words in "Current state only"); zero `mermaid` / framed-figure hits; zero bare URLs outside code (every `http(s)://` preceded by `(` or `<`); inventory categories match actual files.

### 9. Write and report

Write files directly with Edit/Write, **no** automatic git commit; leave to `/now-push` or user. Report:

- Fact correction list (step 2): each before→after and basis
- Stale-instruction audit (step 3, when `--audit`): findings count/confidence distribution, applied hunk list, unapplied (incl. low-confidence/`flag`) items; not run → write 「未加 `--audit`，略過」
- Chunking result (step 5): source section → target file, `paths`, glob match count; or 「無分塊需求」 + reason; skill/command conversion suggestions
- Per-file instruction list, each item marked 「保留 ✓」
- Per-file lines/chars before→after and compression ratio (**observation, not goal**)
- Self-made skills (only when `.up-skills-ignore` exists): skills and files processed, lines/chars before→after per file, listed names without a directory
- up-design artifacts (only when `./up-design/` exists): files processed, lines/chars before→after per file
- Main edits (what merged, what filler removed)
- README.md outcome (created / updated / restyled or trimmed / synced unchanged), lines before→after
- Inventory sync (step 8): per category added/removed items, or 「清單已同步」
- Language outcome: language actually used (incl. notice when unrecognized `--lng` fell back to English), whether each file translated (source→target language), incl. language-only targets (agents, hooks comments, command descriptions) per file

## Self-compression reminder

`commands/up-rules.md`, `commands/now-push.md`, `commands/up-skills.md` themselves are in compression scope:

- `now-push.md` nearly whole file verbatim (commit format template, type table, ✅/❌ good/bad examples, `Co-Authored-By` trailer)—touch only prose around template, little room; do not force template changes for ratio.
- When compressing itself, rewrite must still pass "Step 7: verify no loss" item by item.

## Prohibited

- Do not add rules or features not already present—applies to compression-target files only; README is supplementary, exempt. Fact correction (step 2) and chunk moving (step 5) not additions, only fix and move, semantics unchanged; hunks user selected under `--audit` (step 3) exempt, user-authorized semantic change.
- Do not delete a rule because it is "too long"—drop filler only, never semantics; hunks user selected under `--audit` exempt.
- Do not over-cut for ratio; prefer conservative over losing instructions. caveman full is style ceiling, not compression-rate metric.
- Compression (step 6) must not reintroduce stale patterns `--audit` removed (all-caps emphasis MUST/CRITICAL, pressure tone, decorative step scripts).
- Do not converse or report in caveman style—command changes file content only; conversation and report stay normal Traditional Chinese, not following `--lng`.
- Translation must not change semantics: no rules added or removed, no negation or qualifier weakened; ambiguous spot → keep original and flag warning in report, do not guess.
- Do not compress so hard it needs rereading twice—AI comprehension cost is cost.
