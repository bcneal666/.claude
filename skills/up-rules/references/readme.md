# README.md sync (step 8)

Check project-root `./README.md` every run.

**Exists** → read, compare refined rule files and actual directory structure, decide whether update needed: rule-file sections added/removed (incl. step-5 new `rules/*.md`) should reflect in README; command / skill / path / setting mentioned in README no longer exists or renamed. README language ≠ `--lng` language also counts as needs update; translate whole file to target (code blocks, paths, commands, proper nouns not translated). README violating any "Style guide" rule below also counts as needs update (paragraph length, table-vs-list choice, table alignment, emoji, bare URLs, history wording, length and depth budget, figures). Inventory mismatch (below) also counts. Restyle and trim to essentials; never add or alter facts—trimming detail is not a fact change. No update needed → state 「README 已同步，未改動」; do not change for change's sake.

**Missing** → create, same judgment for content, structured per Style guide; project-specific sections: directory tree (runtime artifacts noted as gitignored), inventory sections from "Inventory sync", key settings, maintenance conventions.

## Inventory sync

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

README is exempt from all terse style rules in step 6 (incl. fragment sentences and emoji ban)—readers are humans: full sentences, natural tone, lively but concise. New or updated content always in `--lng` language (default English), incl. directory-tree comments and table description columns.

## Style guide

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
