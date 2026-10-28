# ~/.claude

Personal global Claude Code configuration repo, shared across projects: custom skills, slash commands, statusline and settings.

## Directory structure

```
.
├── CLAUDE.md                   # Global instructions (shared by all projects, version-controlled)
├── README.md                   # This file
├── settings.json               # Global Claude Code settings (permissions, env, hooks, statusLine…)
├── settings.local.json         # Machine-local overrides (gitignored; NOT auto-loaded here, passed via `claude --settings`, e.g. disabling a plugin on one OS)
├── statusline-command.mjs      # Statusline script (single-process Node version)
├── hooks/                      # Hook scripts (time injection, cross-platform Node)
├── commands/                   # Custom slash commands
├── skills/                     # Custom / third-party skills (`skills/synced/` is cloud-sync output, see below)
└── notes/                      # Personal notes (not configuration, scratch only)
```

The rest — `sessions/`, `session-env/`, `shell-snapshots/`, `projects/`, `file-history/`, `cache/`, `paste-cache/`, `plugins/`, `backups/`, `daemon/`, `jobs/`, `tasks/`, `plans/`, `feedback/`, `state/`, `telemetry/`, `ide/`, `chrome/`, etc. — is runtime output, listed in `.gitignore`, not version-controlled.

`skills/synced/` holds skills synced down from the Claude account cloud (currently 14). The platform manages its content, so do not edit it by hand; it is listed in `.gitignore` and not version-controlled.

## Commands

| Command | Description |
|---|---|
| `/now-push [--lng <code>] [--pr] [--merge]` | Runs `git add` + `commit` (**English** commit message by default, with `Co-Authored-By` trailer) + `push` in the fixed format, without asking for confirmation; `--lng` (e.g. `zh-tw`, `ja`) switches to that language; `--pr` also opens a PR (auto-creates a new branch when on the default branch); `--merge` implies `--pr`, then squash-merges the PR, deletes the branch locally and remotely, and returns to the default branch; every run checks the GitHub repo description and updates it to match the language |
| `/up-rules [--audit] [--lng <code>]` | `--lng` (e.g. `zh-tw`, `ja`; absent = English) sets the language of everything written, including `CLAUDE.md`, `rules/`, `commands/` prose and this README; existing content in a different language is translated. In order: fact-check `CLAUDE.md` → (with `--audit`) audit for stale instructions via `claude-api` prompt-audit and list findings to choose from → check whether content should be chunked into `rules/<topic>.md` (loaded on demand via `paths` frontmatter) → compress `CLAUDE.md` / `.claude/rules/**/*.md` / `.claude/commands/**/*.md` at caveman full strength (drops filler only, never semantics, except hunks applied via `--audit`) → check and sync this README |
| `/up-skills [global\|project]` | Batch-update skills: managed ones (global reads `~/.agents/.skill-lock.json`; project reads `<project root>/skills-lock.json`) are updated one by one with `npx skills update`; unmanaged ones have their upstream inferred and are reinstalled after confirmation; self-made skills listed in `skills/.up-skills-ignore` are skipped entirely, and skills with uncommitted changes are skipped automatically; global mode also reports plugin, cloud-synced skills and CLI version status |

## Skills

| Skill | Description |
|---|---|
| `agent-browser` | Browser automation CLI: operate web pages, fill forms, take screenshots, scrape data |
| `ai-seo` | Optimizes content to be cited by AI search engines and LLMs (AEO / GEO, `llms.txt`) |
| `caveman` | Ultra-terse communication mode that cuts token use while keeping technical accuracy |
| `design-md` | Analyzes a Stitch project and distills it into a `DESIGN.md` design-system document |
| `find-skills` | Helps discover and install skills from the open skills ecosystem (tracked as a symlink to `~/.agents/skills/find-skills`, installed by the skills CLI) |
| `git-commit` | Conventional commit message analysis and smart batched staging |
| `programmatic-seo` | Plans SEO pages generated at scale from templates and data |
| `seo-audit` | Site SEO audits and diagnosis of ranking, indexing and traffic problems |
| `skill-creator` | Create, modify and optimize skills, and run evals to test performance |

Plugins:

- `watch@claude-video` (from marketplace `bradautomates/claude-video`) provides the `/watch` video analysis command.
- `mindful-claude@mindful-claude` (from marketplace `halluton/Mindful-Claude`) shows a guided breathing animation above the prompt while Claude works, controlled with `/breathe`. It is a function-hooks plugin, so it needs `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` (already set under `env` in `settings.json`) and Claude Code 2.1.269 or later.
- `image-view@claude-image-view` (from marketplace `jarrodwatts/claude-image-view`) shows thumbnails of pasted images above the prompt instead of bare `[Image #n]` tags. Only kitty and Ghostty draw real pictures; in other terminals, including Windows Terminal and PowerShell, it falls back to low-resolution colored half blocks (`▀`), which look like mosaics. This is expected, not a bug. It stays enabled in the synced `settings.json`; on Windows machines, disable it in the gitignored `settings.local.json` with `"enabledPlugins": { "image-view@claude-image-view": false }`. `~/.claude/settings.local.json` is not a user-scope file and Claude Code does not read it on its own, so the PowerShell profile defines a `claude` function that launches `claude.exe --settings ~/.claude/settings.local.json` (`--settings` outranks user scope). It only applies to `claude` started from PowerShell, not IDE or desktop launches, and only to shells opened after the profile change (run `. $PROFILE` or open a new tab; an already-open pwsh keeps resolving `claude` to `claude.exe`).
- `cc-plugin-you-should-know@builtin` is a plugin from Claude Code's built-in marketplace, enabled under `enabledPlugins` in `settings.json`; it has no entry under `extraKnownMarketplaces` because the marketplace ships with the CLI.
- `stripe@claude-plugins-official` adds Stripe integration skills (such as `stripe-best-practices`, `test-cards` and `explain-error`) and a Stripe MCP server. It is enabled under `enabledPlugins` in `settings.json` and, like the built-in plugin, has no entry under `extraKnownMarketplaces`.

## Key settings

- `model`: `opus`
- `outputStyle`: `Concise` (terse output); `language`: `traditional chinese`
- `permissions.defaultMode`: `plan` (starts in plan mode: plan first, then execute)
- `permissions.allow` whitelists common low-risk commands (`git add`, `git commit -m`, `git push`, `WebSearch`, `Edit(~/.claude/hooks/**)`, `Edit(~/.claude/commands/**)`, `Skill(update-config)`); `git add`/`commit`/`push` are listed with both `Bash(...)` and `PowerShell(...)` prefixes—on Windows PowerShell is a separate permission namespace and does not inherit `Bash(...)` rules
- Statusline uses only the Node version (`statusline-command.mjs`), with no shell fallback; the three lines show "model / effort / vim mode", "directory / branch", and "context usage and size / rate limits (5h / overage usage) / cost"; `hideVimModeIndicator:true` turns off the built-in `-- INSERT --` indicator in favor of a custom one
- agent-browser cleanup is handled through `env` rather than hooks: `AGENT_BROWSER_IDLE_TIMEOUT_MS=900000` shuts the browser and daemon down after 15 minutes of inactivity, and `AGENT_BROWSER_SCREENSHOT_DIR` / `AGENT_BROWSER_DOWNLOAD_PATH` send screenshots and downloads to `/tmp/agent-browser/`, where the system's tmp cleanup removes them. An idle shutdown discards cookies, logins and open tabs, so `CLAUDE.md` tells Claude to use `--session <name> --restore` for login or multi-turn authenticated flows
- The UserPromptSubmit hook (`hooks/inject-datetime.mjs`) injects the full current timestamp (`Asia/Taipei`, with time of day and weekday) into every prompt, making up for the built-in system prompt giving only a snapshot of the date at session start

## Maintenance conventions

- Put globally shared settings in `settings.json`; put machine- or OS-specific overrides (e.g. disabling `image-view` on Windows) in the gitignored `settings.local.json` (loaded via `claude --settings`, see the `image-view` note), since `settings.json` cannot branch by platform
- After changing rule files (`CLAUDE.md`, `commands/*.md`), run `/up-rules` to fact-check, chunk into `rules/` when needed, compress filler and sync this README; if you suspect accumulated stale wording (such as emphatic tone aimed at older models), add `--audit` to audit first
- Once changes are done and confirmed, push with `/now-push`
