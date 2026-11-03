# 🗂️ ~/.claude

Personal global Claude Code configuration, shared across projects: skills, slash commands, statusline and settings.

- 🧩 Custom and third-party **skills**, plus `/up-*` workflows that chain them
- ⚡ Manual-only **slash commands** for committing, rule maintenance and skill updates
- ⚙️ Version-controlled **settings**, hooks and a single-process Node statusline

## 📁 Structure

```
.
├── CLAUDE.md                   # Global instructions (shared by all projects, version-controlled)
├── README.md                   # This file
├── settings.json               # Global Claude Code settings (permissions, env, hooks, statusLine…)
├── settings.local.json         # Machine-local overrides (gitignored, passed via `claude --settings`)
├── statusline-command.mjs      # Statusline script (single-process Node version)
├── hooks/                      # Hook scripts (time injection, cross-platform Node)
├── commands/                   # Custom slash commands
├── skills/                     # Custom / third-party skills (`skills/synced/` is cloud-sync output)
└── notes/                      # Personal notes (not configuration, scratch only)
```

- `skills/synced/` holds skills synced down from the Claude account cloud (currently 16). The platform manages it, so do not edit it by hand; it is gitignored.
- `settings.local.json` is **not** auto-loaded. Pass it with `claude --settings`, for example to disable a plugin on one OS.

<details>
<summary>Runtime directories (gitignored, not version-controlled)</summary>

`sessions/`, `session-env/`, `shell-snapshots/`, `projects/`, `file-history/`, `cache/`, `paste-cache/`, `plugins/`, `backups/`, `daemon/`, `jobs/`, `tasks/`, `plans/`, `uploads/`, `feedback/`, `state/`, `telemetry/`, `ide/`, `chrome/`, and similar.

</details>

## ⚡ Commands

| Command | What it does |
|---|---|
| `/now-push [--lng <code>] [--pr] [--merge]` | Commit and push in a fixed format, no confirmation |
| `/up-rules [--audit] [--lng <code>]` | Fact-check, chunk and compress rule files, then sync this README |
| `/up-skills [global\|project]` | Batch-update skills |

> [!NOTE]
> All three set `disable-model-invocation: true` because each has side effects (pushing, rewriting rule files, reinstalling skills). Claude cannot call them on its own; they run only when you type them.

<details>
<summary><code>/now-push</code> details</summary>

- Runs `git add` + `commit` + `push` without asking for confirmation
- Commit message is **English** by default and carries a `Co-Authored-By` trailer
- `--lng <code>` switches the message language (`zh` = Traditional Chinese, `ja`, …)
- `--pr` also opens a PR, auto-creating a new branch when on the default branch
- `--merge` implies `--pr`, squash-merges it, deletes the branch locally and remotely, then returns to the default branch
- Every run checks the GitHub repo description and updates it to match the language

</details>

<details>
<summary><code>/up-rules</code> details</summary>

- `--lng <code>` sets the language of everything written (`zh` = Traditional Chinese, `ja`; absent = English); content in a different language is translated
- Flow, in order:
  1. Fact-check `CLAUDE.md`
  2. With `--audit`: audit for stale instructions via `claude-api` prompt-audit, then pick findings to apply
  3. Chunk path-specific content into `rules/<topic>.md` (loaded on demand via `paths` frontmatter)
  4. Compress `CLAUDE.md`, `.claude/rules/**/*.md` and `.claude/commands/**/*.md` at caveman full strength (drops filler only, never semantics, except hunks applied via `--audit`)
  5. Check and sync this README
- The README is written for humans, so it is exempt from caveman compression and follows a style guide (structure, emoji, callouts, folding)

</details>

<details>
<summary><code>/up-skills</code> details</summary>

- Managed skills (global reads `~/.agents/.skill-lock.json`; project reads `<project root>/skills-lock.json`) are updated one by one with `npx skills update`
- Unmanaged skills have their upstream inferred and are reinstalled after confirmation
- Self-made skills listed in `skills/.up-skills-ignore` are skipped, and so are skills with uncommitted changes
- Global mode also reports plugin, cloud-synced skills and CLI version status

</details>

## 🧩 Skills

| Skill | What it does |
|---|---|
| `agent-browser` | Browser automation CLI: operate pages, fill forms, screenshot, scrape |
| `ai-seo` | Get content cited by AI search engines and LLMs (AEO / GEO, `llms.txt`) |
| `animate` | Build an animation from scratch, deciding purpose, tool, curve and exit in order |
| `caveman` | Ultra-terse mode that cuts tokens while keeping technical accuracy |
| `design-md` | Distill a Stitch project into a `DESIGN.md` design-system document |
| `emil-design-eng` | Emil Kowalski's UI polish, component and animation philosophy |
| `find-animation-opportunities` | Read-only search for places that should animate, with exact values |
| `find-skills` | Discover and install skills from the open skills ecosystem |
| `git-commit` | Conventional commit analysis and smart batched staging |
| `humanizer` | Rewrite AI-sounding English so it reads like the writer |
| `humanizer-zh` | Chinese counterpart: trim filler and template phrasing |
| `improve-animations` | Read-only motion audit with prioritized, self-contained plans |
| `mobile-native` | CSS and meta-tag fixes that make a web app feel native on a phone |
| `programmatic-seo` | Plan SEO pages generated at scale from templates and data |
| `review-animations` | Review animation code against a high craft bar (manual only) |
| `review-fix` | Functional test + review loop for the current project, max 3 rounds |
| `seo-audit` | Diagnose ranking, indexing and traffic problems |
| `skill-creator` | Create, modify and optimize skills, and run evals |
| `up-animate` | `/up-animate [--m] [@path ...]`: animation pipeline on the project's UI |
| `up-seo` | `/up-seo [url] [@path ...]`: SEO pipeline with shared context |

**Pipelines**

- `up-animate`: `find-animation-opportunities` → `animate` → `improve-animations` (audit, then applies the selected plans) → (`--m`: `mobile-native`) → `review-animations`
- `up-seo`: `ai-seo` → `seo-audit` → `programmatic-seo`, and you pick fixes after each stage

**Notes**

- `find-skills` is a symlink to `~/.agents/skills/find-skills`, installed by the skills CLI
- `animate`, `emil-design-eng`, `find-animation-opportunities`, `humanizer`, `humanizer-zh`, `improve-animations`, `mobile-native` and `review-animations` are symlinks to `~/.agents/skills/` as well
- `review-animations` is manual-only; `up-animate` reads it directly
- `review-fix` auto-detects the dev command and port, runs the project's own `.claude/review-fix/` checks or throwaway scripts built on `scripts/lib.mjs`, then `/code-review` and fixes until it converges

## 🔌 Plugins

- **`watch@claude-video`** (marketplace `bradautomates/claude-video`) — adds the `/watch` video analysis command
- **`mindful-claude@mindful-claude`** (marketplace `halluton/Mindful-Claude`) — shows a breathing animation above the prompt while Claude works; toggle with `/breathe`
- **`image-view@claude-image-view`** (marketplace `jarrodwatts/claude-image-view`) — shows pasted-image thumbnails instead of bare `[Image #n]` tags
- **`cc-plugin-you-should-know@builtin`** — from Claude Code's built-in marketplace, enabled under `enabledPlugins`
- **`frontend-design@anthropic-plugin-directory`** — provides the `frontend-design` skill for distinctive, intentional UI design
- **`stripe@claude-plugins-official`** — Stripe skills (`stripe-best-practices`, `test-cards`, `explain-error`) and a Stripe MCP server

`cc-plugin-you-should-know` and `stripe` have no `extraKnownMarketplaces` entry because their marketplaces ship with the CLI.

> [!IMPORTANT]
> `mindful-claude` is a function-hooks plugin. It needs `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` (already set under `env` in `settings.json`) and Claude Code 2.1.269 or later.

<details>
<summary><code>image-view</code> on terminals and Windows</summary>

- Only kitty and Ghostty draw real pictures. Other terminals, including Windows Terminal and PowerShell, fall back to low-resolution colored half blocks (`▀`) that look like mosaics. This is expected, not a bug.
- It stays enabled in the synced `settings.json`. On Windows, disable it in the gitignored `settings.local.json`:

  ```json
  "enabledPlugins": { "image-view@claude-image-view": false }
  ```

- Claude Code does not read `~/.claude/settings.local.json` on its own. The PowerShell profile defines a `claude` function that launches `claude.exe --settings ~/.claude/settings.local.json` (`--settings` outranks user scope).
- That function only applies to `claude` started from PowerShell, not IDE or desktop launches.
- It only applies to shells opened after the profile change: run `. $PROFILE` or open a new tab, because an already-open pwsh keeps resolving `claude` to `claude.exe`.

</details>

## ⚙️ Settings

- **Model** — `model` is `opusplan` (Opus in plan mode, Sonnet when executing)
- **Output** — `outputStyle` is `Concise`; `language` is `traditional chinese`
- **Start mode** — `permissions.defaultMode` is `plan`: plan first, then execute
- **Permissions** — `permissions.allow` whitelists low-risk commands: `git add`, `git commit -m`, `git push`, `WebSearch`, `Edit(~/.claude/hooks/**)`, `Edit(~/.claude/commands/**)`, `Skill(update-config)`
- **Statusline** — Node only (`statusline-command.mjs`), no shell fallback; three lines:
  - model / effort / vim mode
  - directory / branch
  - context usage and size / rate limits (5h / overage usage) / cost
- **Time injection** — the UserPromptSubmit hook (`hooks/inject-datetime.mjs`) adds the full `Asia/Taipei` timestamp (time of day and weekday) to every prompt, because the built-in system prompt only gives a date snapshot at session start

> [!TIP]
> `git add` / `commit` / `push` are listed with both `Bash(...)` and `PowerShell(...)` prefixes. On Windows, PowerShell is a separate permission namespace and does not inherit `Bash(...)` rules.

<details>
<summary>agent-browser cleanup via <code>env</code></summary>

- `AGENT_BROWSER_IDLE_TIMEOUT_MS=900000` shuts the browser and daemon down after 15 minutes of inactivity
- `AGENT_BROWSER_SCREENSHOT_DIR` / `AGENT_BROWSER_DOWNLOAD_PATH` send screenshots and downloads to `/tmp/agent-browser/`, where the system's tmp cleanup removes them
- An idle shutdown discards cookies, logins and open tabs, so `CLAUDE.md` tells Claude to use `--session <name> --restore` for login or multi-turn authenticated flows
- `hideVimModeIndicator: true` turns off the built-in `-- INSERT --` indicator in favor of a custom one

</details>

## 🛠️ Maintenance

- **Settings placement** — put shared settings in `settings.json`; put machine- or OS-specific overrides (e.g. disabling `image-view` on Windows) in the gitignored `settings.local.json`, because `settings.json` cannot branch by platform
- **After editing rules** — run `/up-rules` after changing `CLAUDE.md` or `commands/*.md` to fact-check, chunk into `rules/`, compress filler and sync this README
- **Suspect stale wording** — add `--audit` (for example emphatic tone aimed at older models) to audit first
- **Ship it** — push with `/now-push` once changes are done and confirmed
