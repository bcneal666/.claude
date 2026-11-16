# 🗂️ ~/.claude

Personal global Claude Code configuration shared across projects: skills, slash commands, statusline and settings.

| Highlight   | Details                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| 🧩 Skills   | Custom and third-party **skills**, plus `/up-*` workflows that chain them         |
| ⚡ Commands | Manual-only **slash commands** for committing, rule maintenance and skill updates |
| ⚙️ Settings | Version-controlled **settings**, hooks and a single-process Node statusline       |

## 🚀 Quick start

```text
/up-rules --audit            # fact-check and compress rule files, sync this README
/up-skills                   # batch-update skills
/now-push --pr --merge       # commit, push, open a PR and squash merge
```

## 📁 Structure

```
+------------------- [ LAYOUT ] -------------------+
|                                                  |
| ~/.claude                                        |
| ├─ CLAUDE.md               global rules          |
| ├─ README.md               this file             |
| ├─ settings.json           global settings       |
| ├─ settings.local.json     local overrides       |
| ├─ statusline-command.mjs  statusline            |
| ├─ hooks/                  hook scripts          |
| ├─ commands/               slash commands        |
| ├─ agents/                 subagents             |
| ├─ skills/                 skills                |
| └─ notes/                  scratch notes         |
|                                                  |
+--------------------------------------------------+
```

- `skills/synced/` holds skills synced down from the Claude account cloud (currently 16). The platform manages it, so do not edit it by hand; it is gitignored.
- `settings.local.json` is **not** auto-loaded. Pass it with `claude --settings`, for example to disable a plugin on one OS.

<details>
<summary>Runtime directories (gitignored, not version-controlled)</summary>

`sessions/`, `session-env/`, `shell-snapshots/`, `projects/`, `file-history/`, `cache/`, `paste-cache/`, `plugins/`, `backups/`, `daemon/`, `jobs/`, `tasks/`, `plans/`, `uploads/`, `feedback/`, `state/`, `telemetry/`, `ide/`, `chrome/`, and similar.

</details>

## ⚡ Commands

| Name                                        | Purpose                                                          |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `/now-push [--lng <code>] [--pr] [--merge]` | Commit and push in a fixed format, no confirmation               |
| `/up-rules [--audit] [--lng <code>]`        | Fact-check, chunk and compress rule files, then sync this README |
| `/up-skills [global\|project]`              | Batch-update skills                                              |

> [!NOTE]
> All three set `disable-model-invocation: true` because each has side effects (pushing, rewriting rule files, reinstalling skills). Claude cannot call them on its own; they run only when you type them.

<details>
<summary><code>/now-push</code> details</summary>

- Runs `git add` + `commit` + `push` without asking for confirmation
- Commit message is **English** by default and carries a `Co-Authored-By` trailer
- `--lng <code>` switches the message language (`zh` = Traditional Chinese, `ja`, …)
- `--pr` also opens a PR, auto-creating a new branch when on the default branch
- `--merge` implies `--pr`, waits for required checks, squash-merges, deletes the branch locally and remotely, then returns to the default branch
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
  5. Check and sync this README; figures come from `mdxcn`'s official fences
- The README is written for humans, so it is exempt from caveman compression and follows a style guide (structure, emoji, callouts, folding)

</details>

<details>
<summary><code>/up-skills</code> details</summary>

- Managed skills (global reads `~/.agents/.skill-lock.json`; project reads `<project root>/skills-lock.json`) are updated one by one with `npx skills update`
- Unmanaged skills have their upstream inferred and are reinstalled after confirmation
- Self-made skills listed in `skills/.up-skills-ignore` are skipped, and so are skills whose own directory has uncommitted changes (legacy symlinked skills are not checked, since their content lives outside git)
- Global mode also reports plugin, cloud-synced skills and CLI version status

</details>

## 🧩 Skills

| Name                           | Purpose                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `agent-browser`                | Browser automation CLI: operate pages, fill forms, screenshot, scrape            |
| `ai-seo`                       | Get content cited by AI search engines and LLMs (AEO / GEO, `llms.txt`)          |
| `animate`                      | Build an animation from scratch, deciding purpose, tool, curve and exit in order |
| `animation-performance`        | Fix dropped frames: composite-only properties, `will-change`, main-thread cost   |
| `caveman`                      | Ultra-terse mode that cuts tokens while keeping technical accuracy               |
| `design-md`                    | Distill a Stitch project into a `DESIGN.md` design-system document               |
| `emil-design-eng`              | Emil Kowalski's UI polish, component and animation philosophy                    |
| `find-animation-opportunities` | Read-only search for places that should animate, with exact values               |
| `find-skills`                  | Discover and install skills from the open skills ecosystem                       |
| `git-commit`                   | Conventional commit analysis and smart batched staging                           |
| `humanizer`                    | Rewrite AI-sounding English so it reads like the writer                          |
| `humanizer-zh`                 | Chinese counterpart: trim filler and template phrasing                           |
| `improve-animations`           | Read-only motion audit with prioritized, self-contained plans                    |
| `learn-taste`                  | Turn a session's design corrections into `DESIGN.md` rules (manual only)         |
| `mdxcn`                        | Paste official framed ASCII figures next to prose in READMEs, PRs and docs       |
| `mobile-native`                | CSS and meta-tag fixes that make a web app feel native on a phone                |
| `modern-web-guidance`          | Search modern web best practices first for HTML/CSS and client-side JS tasks     |
| `programmatic-seo`             | Plan SEO pages generated at scale from templates and data                        |
| `remove-animations`            | Remove motion the UI doesn't need; subtract-only, never adds or retunes          |
| `review-animations`            | Review animation code against a high craft bar (manual only)                     |
| `review-fix`                   | Functional test + review loop for the current project, max 3 rounds              |
| `seo-audit`                    | Diagnose ranking, indexing and traffic problems                                  |
| `up-design`                    | Static design plus motion pipeline (usage under Pipelines)                       |
| `up-seo`                       | SEO pipeline with shared context (usage under Pipelines)                         |

**Pipelines**

- `/up-design [--only design|motion] [--m] [@path ... | url]`: `emil-design-eng` rules once → **A static**: baseline screenshots (375/768/1440, reduced-motion) → (shadcn: `npx -y @shadscan/cli --json`) → score 6 dimensions against `CRITERIA.md` → you pick fixes → patch (platform-feature fixes consult `modern-web-guidance` first) → (`--m`: `mobile-native`) → re-screenshot, max 3 rounds → **B motion**: `remove-animations` → `find-animation-opportunities` → `animate` → `improve-animations` (audit, then applies the selected plans) → `animation-performance` → **C verify**: `review-animations` on motion changes → final screenshots vs baseline. `--only design` / `--only motion` runs one half
- `/up-seo [url] [@path ...]`: `ai-seo` → `seo-audit` → `programmatic-seo`, and you pick fixes after each stage

**Notes**

- Third-party skills are installed with `npx skills add --copy`, so each is a real directory in `skills/` that syncs across devices via git; `/up-skills` still updates them in place from upstream
- The update source list lives in `~/.agents/.skill-lock.json`, outside this repo; on a new device, run `npx skills add <owner/repo> -s <skill> -g -y -a claude-code --copy` once per skill to register it
- `review-animations` is manual-only; `up-design` reads it directly
- `learn-taste` is manual-only; run it at the end of a session where you corrected the agent. `up-design` reads the resulting `DESIGN.md` and suggests `/learn-taste` when a run shows correction signals
- `review-fix` auto-detects the dev command and port, runs the project's own `.claude/review-fix/` checks or throwaway scripts built on `scripts/lib.mjs`, then `/code-review` and fixes until it converges

## 🤖 Subagents

| Name               | Purpose                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `code-reviewer`    | Read-only review of a diff in fresh context for correctness bugs and regressions |
| `debugger`         | Reproduce the problem, trace the root cause, propose a minimal fix (no edits)    |
| `researcher`       | Look up docs, APIs and error messages; return a short cited answer               |
| `security-auditor` | Read-only scan for leaked secrets, injection, auth flaws and unsafe dependencies |
| `test-runner`      | Run tests, lint, typecheck and build; report only a failure summary              |
| `ui-ux-tester`     | Drive documented UI flows like a frustrated user; report visual and UX defects   |

> [!NOTE]
> All six subagents are read-only (no `Edit` / `Write` granted). Every one except `ui-ux-tester` has "Use proactively" in its description, so the main agent delegates to them automatically; `ui-ux-tester` runs when you ask for it. All six run on haiku: each file sets `model: haiku`, and `settings.json` forces it for every subagent.

## 🪝 Hooks

| Script                            | Event              | Purpose                                                                     |
| --------------------------------- | ------------------ | --------------------------------------------------------------------------- |
| `hooks/inject-datetime.mjs`       | `UserPromptSubmit` | Add an `Asia/Taipei` timestamp with time of day and weekday to every prompt |
| `hooks/agent-browser-session.mjs` | `SessionStart`     | Give each Claude session its own `agent-browser` session name               |
| `hooks/agent-browser-session.mjs` | `SessionEnd`       | Close that session's browser so no Chrome process is left behind            |
| `hooks/git-secret-guard.mjs`      | `PreToolUse`       | Block `git commit` / `git push` when the change contains secrets            |

The built-in system prompt gives only a date snapshot at session start, so `inject-datetime` supplies the full time. Cleanup details are under Settings.

`git-secret-guard` scans added lines (diff against upstream or `HEAD`) plus untracked files for private keys, common API tokens, hard-coded credentials and `.env` files (`.env.example` is allowed). It prints only the first 4 characters of a match. Add `secret-scan:allow` to a line to skip a false positive. It fails open: any internal error lets the command through.

## 🔌 Plugins

| Name                                | Purpose                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `watch@claude-video`                | Add the `/watch` video analysis command (marketplace `bradautomates/claude-video`)                            |
| `mindful-claude@mindful-claude`     | Show a breathing animation while Claude works; toggle with `/breathe` (marketplace `halluton/Mindful-Claude`) |
| `image-view@claude-image-view`      | Show pasted-image thumbnails instead of bare `[Image #n]` tags (marketplace `jarrodwatts/claude-image-view`)  |
| `cc-plugin-you-should-know@builtin` | From Claude Code's built-in marketplace, enabled under `enabledPlugins`                                       |

`cc-plugin-you-should-know` has no `extraKnownMarketplaces` entry because its marketplace ships with the CLI.

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

| Item           | Details                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Model          | `model` is `opusplan[1m]` (Opus in plan mode, Sonnet when executing, both with 1M context)                       |
| Subagent model | `env` forces `CLAUDE_CODE_SUBAGENT_MODEL=haiku`, so every subagent runs on haiku                                 |
| Output         | `outputStyle` is `Concise`; `language` is `traditional chinese`                                                  |
| Start mode     | `permissions.defaultMode` is `plan`                                                                              |
| Permissions    | `permissions.allow` whitelists low-risk commands (list below the table)                                          |
| Statusline     | Node only (`statusline-command.mjs`), no shell fallback; three lines (model, location, usage)                    |
| Vim indicator  | `statusLine.hideVimModeIndicator: true` turns off the built-in `-- INSERT --` indicator in favor of a custom one |

Allowed: `git add`, `git commit -m`, `git push`, `WebSearch`, `Edit(~/.claude/hooks/**)`, `Edit(~/.claude/commands/**)`, `Skill(update-config)`.

> [!TIP]
> `git add` / `commit` / `push` are listed with both `Bash(...)` and `PowerShell(...)` prefixes. On Windows, PowerShell is a separate permission namespace and does not inherit `Bash(...)` rules.

<details>
<summary>agent-browser cleanup via <code>env</code></summary>

- `AGENT_BROWSER_IDLE_TIMEOUT_MS=900000` shuts the browser and daemon down after 15 minutes of inactivity
- `AGENT_BROWSER_SCREENSHOT_DIR` / `AGENT_BROWSER_DOWNLOAD_PATH` send screenshots and downloads to `/tmp/agent-browser/`, where the system's tmp cleanup removes them
- `hooks/agent-browser-session.mjs` runs on `SessionStart` / `SessionEnd`: start writes `AGENT_BROWSER_SESSION=cc-<session_id>` into `CLAUDE_ENV_FILE` so each Claude session gets its own browser; end runs `agent-browser close --session cc-<session_id>` (other concurrent sessions are untouched). `SessionEnd` has `timeout: 10` because the default is 1.5s
- On Windows, `CLAUDE_ENV_FILE` is only available to hooks run through Git Bash; without it the session variable is not set and cleanup falls back to the idle timeout
- An idle shutdown discards cookies, logins and open tabs, so `CLAUDE.md` tells Claude to add `--restore` for login or multi-turn authenticated flows

</details>

## 🛠️ Maintenance

| Situation             | What to do                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| Settings placement    | Shared in `settings.json`; machine- or OS-specific overrides in gitignored `settings.local.json` |
| After editing rules   | Run `/up-rules` after changing `CLAUDE.md` or `commands/*.md`                                    |
| Suspect stale wording | Add `--audit` to audit first (for example emphatic tone aimed at older models)                   |
| Ship it               | Push with `/now-push` once changes are done and confirmed                                        |
