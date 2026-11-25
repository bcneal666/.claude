# Target files

Read at step 1. Which files this skill compresses, translates, writes or syncs.

### Compression targets (terse style, keep only AI-parseable semantics)

- `CLAUDE.md` (project root)
- `./.claude/CLAUDE.md`
- `CLAUDE.local.md` (project root) and `./.claude/CLAUDE.local.md`—personal, machine-local, usually gitignored; same treatment as CLAUDE.md (fact check, compression, no-loss verification); never add to README or commit
- `./.claude/rules/**/*.md` (recursive, incl. subdirectories; project root is itself `.claude` directory (e.g. this repo) → `./rules/**/*.md`)
- `./.claude/commands/**/*.md` (incl. namespaced subdirectories; project root is itself `.claude` directory (e.g. this repo) → `./commands/**/*.md`)

Process only if exists; skip missing (`CLAUDE.local.md` absent on most machines—normal, no notice). Other `@path` import files not compressed proactively unless listed above.

⚠️ `./.claude/rules/**/*.md` (or this repo's `./rules/**/*.md`) are **user-level rules**, apply to all projects on machine, not only this project; before creating or modifying, confirm scope is not unique to this repo.

⚠️ Never glob bare `commands/**/*.md` in arbitrary projects—ordinary project `commands/` may be source code (e.g. CQRS command pattern); only paths clearly mapping to Claude Code `.claude/commands/` count as targets.

### Self-made skills (compression targets, terse style)

- List file: `./.claude/skills/.up-skills-ignore` (project root is itself `.claude` directory (e.g. this repo) → `./skills/.up-skills-ignore`). Parse like `/up-skills`: strip `#`-leading comments and trailing `# ...` comments, trim, drop empty lines → name set.
- List file missing → project has no self-made skills; skip all of this silently, no notice.
- Each name → every `<skills dir>/<name>/**/*.md` is a compression target (`SKILL.md` plus attachments such as `CRITERIA.md`), except `evals/**` (test fixtures: prompts are user words, graders match exact strings; never touch); non-`.md` files (scripts etc.) untouched. Name without a real directory under skills dir → one-line notice, skip.
- Skill not in list → never touch (upstream-managed, `/up-skills` overwrites it).
- ⚠️ `skills/` in this repo is user-level, applies to all projects on machine; before modifying, confirm scope is not unique to this repo.

### up-design artifacts (compression targets, terse style)

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
- Language already equals `--lng` → no change; do not touch for change's sake. Not in step 3 audit scope, no terse compression, no fact edits

### Lint configs (write target, step 5 only)

- The project's existing linter config files found by `rule-routing.md` § Detection (e.g. `eslint.config.*`, `.stylelintrc*`, `biome.json`, `ruff.toml` / `pyproject.toml` `[tool.ruff]`)
- Edited only to add rules routed in step 5; keep existing format, comment style and other rules untouched
- Never create a linter config where the project has no linter, never touch `package.json` dependencies or lockfiles
- Not compressed, not translated (except `message` strings this skill writes, which follow `--lng`)

### Sync target (human-readable first, not compressed)

- `./README.md` (project root)—see "Step 8"

Process only paths above (incl. lint configs); **do not** extend to `settings.json`, or to `skills/` beyond the self-made skills and up-design artifacts above. Exception: read-only inventory in "Inventory sync" (step 8)—never compress or modify those files.
