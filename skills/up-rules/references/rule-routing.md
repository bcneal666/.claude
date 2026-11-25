# Rule routing (step 5)

Each instruction item from step 4 goes to the first tier that fits. Cheaper tiers cost less context and enforce more reliably: a lint rule runs on every check and costs no context, a `paths` rule loads only when matching files are read, `CLAUDE.md` loads every session.

| Tier | Destination                     | Fits when                                                                      |
| ---- | ------------------------------- | ------------------------------------------------------------------------------ |
| 1    | Lint config                     | All of § Eligibility hold                                                      |
| 2    | `rules/<topic>.md` with `paths` | Not lint, and both chunking criteria in § Tier 2 hold                          |
| 3    | `CLAUDE.md`                     | Everything else (global rules, flows, rules a fresh file needs before reading) |

Routed items: `CLAUDE.md`, `./.claude/CLAUDE.md` and existing `rules/**/*.md` (re-route a rule file's items too: a path rule that a linter can check moves to lint). Never routed: `CLAUDE.local.md` (personal; lint config is shared), self-made skills, commands, up-design artifacts.

## Contents

1. Tier 1: lint
2. Tier 2: rules/
3. Tier 3: CLAUDE.md
4. Examples

## 1. Tier 1: lint

**Skip the whole tier** when the project root is itself `~/.claude` (rules there are user-level and apply to every project; a lint config here reaches none of them), or when § Detection finds no linter.

### Eligibility (all must hold)

1. **The whole instruction is mechanically checkable**: a violation is visible by matching code (banned import, banned call or syntax, banned value or property, naming pattern). An instruction with a judgment clause ("unless the caller already validated", "prefer X when it reads better") stays prose, because lint would enforce half of it and the deleted sentence carried the other half.
2. **An installed linter can express it with a built-in rule** (§ Rules that carry a message). Never install a linter, plugin or dependency: that changes the project, beyond this skill's duty.
3. **The rule's scope fits**: the linter covers at least the files the instruction covers; narrower instructions use the linter's own file scoping (ESLint flat-config `files`, Stylelint `overrides`, Ruff `per-file-ignores`). No way to scope → not eligible.
4. **The why has a carrier**: the instruction's reason goes in the rule's `message` (or `msg`); a rule without a message option gets the reason as a comment beside the rule (JS/TS/JSONC/YAML/TOML configs). Neither possible (e.g. plain `.json` without message option) → not eligible, because reasons are semantics and step 7 checks for them. Instruction has no reason → message states the rule plainly.
5. **Lint runs with a valid config afterwards** (§ Check after writing).

Not eligible → fall through to tier 2.

### Detection

| Tool      | Config file                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| ESLint    | `eslint.config.{js,mjs,cjs,ts,mts,cts}`, `.eslintrc{,.js,.cjs,.json,.yml,.yaml}`, `eslintConfig` in `package.json` |
| Stylelint | `stylelint.config.{js,mjs,cjs}`, `.stylelintrc{,.js,.cjs,.json,.yml,.yaml}`, `stylelint` in `package.json`         |
| Biome     | `biome.json`, `biome.jsonc`                                                                                        |
| Oxlint    | `.oxlintrc.json`                                                                                                   |
| Ruff      | `ruff.toml`, `.ruff.toml`, `[tool.ruff]` in `pyproject.toml`                                                       |

A linter counts as installed only if its package is in the project's dependencies (or the Python environment) and runs. Find the run command in order: `package.json` scripts (`lint`, `lint:css`, `lint:style`, `lint:js`) → direct call (`npx eslint .`, `npx stylelint "**/*.{css,scss}"`, `npx biome lint .`, `ruff check .`). Package manager from lockfile: `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` / `bun.lock` → bun, else npm.

Formatting rules (indent, quotes, semicolons, line width) that the project's formatter config (Prettier, EditorConfig, Biome formatter, Ruff format) already enforces are redundant: delete the sentence and report it as 「已由 formatter 執行」. Never write formatter options.

### Rules that carry a message

Unsure of a rule name or option format → confirm with the tool itself (`npx eslint --print-config <file>`, `npx stylelint --print-config <file>`, `npx biome explain <rule>`, `ruff rule <code>`) or the official docs; never write from memory.

| Tool      | Rule                                                                     | Good for                                  | Why goes in                              |
| --------- | ------------------------------------------------------------------------ | ----------------------------------------- | ---------------------------------------- |
| ESLint    | `no-restricted-imports`                                                  | Banned packages or paths                  | `paths[].message` / `patterns[].message` |
| ESLint    | `no-restricted-syntax`                                                   | Banned calls or patterns via AST selector | `message`                                |
| ESLint    | `no-restricted-globals`, `no-restricted-properties`                      | Banned globals or member access           | `message`                                |
| Stylelint | `declaration-property-value-disallowed-list`, `property-disallowed-list` | Banned values or properties               | secondary option `message`               |
| Biome     | `noRestrictedImports`, `noRestrictedGlobals`                             | Banned packages or globals                | `message` (rule group varies by version) |
| Ruff      | `flake8-tidy-imports.banned-api`                                         | Banned modules or functions               | `msg`                                    |

Other built-in rules (`no-console`, `eqeqeq`, naming rules) are fine when the config format allows a comment for the why.

### Writing

- Edit the existing config, keep its format and comment style; merge into existing rule entries (e.g. append to an existing `no-restricted-imports.paths` list) instead of duplicating keys.
- `message` text follows `--lng`; keep it to the rule plus its reason, written for the agent that will read the lint error.
- Severity `error`, except § Check after writing.

### Check after writing

Run the lint command once after all tier-1 edits.

| Result                                             | Action                                                                                                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config invalid (parse failure, unknown rule)       | Revert the edit; route the item to tier 2/3; attach the attempted config in the report marked 「未驗證」                                                                   |
| Existing code violates the new rule                | Keep the rule `error`; add a per-file override that sets it to `warn` only for the files that already violate (§ Existing violations); record the count; never edit source |
| Lint cannot run (dependencies missing, no command) | Do not write lint; route the item to tier 2/3; attach the suggested config in the report marked 「未驗證」                                                                 |
| Passes                                             | Delete the instruction sentence from its file                                                                                                                              |

A wrong lint config can fail CI outright, so nothing is written that has not run.

### Existing violations

The deleted sentence stopped every new violation, so the lint rule must too: a rule left at `warn` lets lint exit 0 on a new violation, and the agent only fixes errors. Keep the rule `error` for everything and downgrade only the files that already break it, with the linter's per-file override:

| Tool      | Per-file override                                                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint    | Extra flat-config object `{ files: ["src/legacy/report.js"], rules: { "no-restricted-imports": "warn" } }` (severity only keeps the options and `message`) |
| Stylelint | `overrides: [{ files: [...], rules: { "<rule>": [<options>, { severity: "warning" }] } }]`                                                                 |
| Biome     | `overrides: [{ include: [...], linter: { rules: { ... } } }]`                                                                                              |
| Ruff      | `per-file-ignores` for those files (Ruff has no warn level)                                                                                                |

Add a comment beside the override (e.g. `// existing violations, warn until migrated`). The linter cannot scope the downgrade → the item is not eligible; route it to tier 2/3 and keep the sentence. After writing, lint a throwaway probe file that breaks the rule: it must fail with the `message`; delete the probe.

### Make sure lint gets run

A deleted sentence is enforced only if the agent runs lint. After any tier-1 move, check whether `CLAUDE.md`, a hook in `.claude/settings.json`, or a pre-commit hook already runs the lint command. None does → add one line to `CLAUDE.md`, e.g. ``After editing code, run `npm run lint` and fix every error.`` (with the project's real command). This is the only rule this skill adds.

## 2. Tier 2: rules/

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

## 3. Tier 3: CLAUDE.md

Everything not routed above stays in `CLAUDE.md` and goes through step 6 compression. Path-less rules stay here too: a rule file without `paths` loads at start like CLAUDE.md and saves no context.

## 4. Examples

**Lint, why in message.** CLAUDE.md: 「不要 import `lodash`，改用 `es-toolkit`——lodash 讓 bundle 多 70KB。」 Project has ESLint flat config and `npm run lint` passes →

```js
// eslint.config.mjs (merged into the existing config object)
rules: {
  "no-restricted-imports": ["error", {
    paths: [{ name: "lodash", message: "Use es-toolkit instead: lodash adds 70KB to the bundle." }],
  }],
},
```

Sentence deleted from CLAUDE.md; CLAUDE.md gains ``After editing code, run `npm run lint` and fix every error.`` if nothing ran lint before.

**Judgment clause, not lint.** 「API handler 不要直接呼叫 `db.query`，除非是 migration script。」 Matching code cannot tell a migration script from a handler unless migrations live in their own directory. They do (`scripts/migrations/**`) → lint with `files: ["src/api/**"]`. They do not → tier 2 (`paths: ["src/api/**"]`).

**No linter.** Same lodash rule, project has no linter → stays in CLAUDE.md (or tier 2 if path-specific); report attaches the suggested ESLint config marked 「未驗證」 and does not add ESLint.

**Existing violation.** `src/legacy/report.js` already imports lodash → `no-restricted-imports` stays `error`; an override object sets it to `warn` for `src/legacy/report.js` only; report lists 「1 處既有違規（已降為 warn）」; source untouched. A new lodash import anywhere else still fails lint.
