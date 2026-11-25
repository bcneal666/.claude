# 🗂️ ~/.claude

Personal global Claude Code configuration shared across projects: skills, slash commands, statusline and settings.

| Highlight   | Details                                                                       |
| ----------- | ----------------------------------------------------------------------------- |
| 🧩 Skills   | Custom and third-party **skills**, including self-contained `/up-*` workflows |
| ⚡ Commands | A manual-only **slash command** for skill updates                             |
| ⚙️ Settings | Version-controlled **settings**, hooks and a single-process Node statusline   |

## 🚀 Quick start

```text
/up-rules --audit            # route rules to lint/rules/CLAUDE.md, compress, sync this README
/up-skills                   # batch-update skills
/now-push --pr --merge       # commit, push, open a PR and squash merge
```

## 📁 Structure

```text
~/.claude
├── CLAUDE.md                 # global rules
├── README.md                 # this file
├── settings.json             # global settings
├── settings.local.json       # local overrides
├── statusline-command.mjs    # statusline
├── hooks/                    # hook scripts
├── commands/                 # slash commands
├── agents/                   # subagents
├── skills/                   # skills
└── notes/                    # scratch notes
```

- `skills/synced/` holds skills synced down from the Claude account cloud; the set differs per account and device. The platform manages it, so do not edit it by hand; it is gitignored.
- `settings.local.json` is **not** auto-loaded. Pass it with `claude --settings`, for example to disable a plugin on one OS.

<details>
<summary>Runtime directories (gitignored, not version-controlled)</summary>

`sessions/`, `session-env/`, `shell-snapshots/`, `projects/`, `file-history/`, `cache/`, `paste-cache/`, `plugins/`, `backups/`, `daemon/`, `jobs/`, `tasks/`, `plans/`, `uploads/`, `feedback/`, `state/`, `telemetry/`, `ide/`, `chrome/`, and similar.

</details>

## ⚡ Commands

| Name                           | Purpose             |
| ------------------------------ | ------------------- |
| `/up-skills [global\|project]` | Batch-update skills |

> [!NOTE]
> It sets `disable-model-invocation: true` because reinstalling skills is a side effect. Claude cannot call it on its own; it runs only when you type it. The `now-push` and `up-rules` skills do the same (see Skills).

<details>
<summary><code>/up-skills</code> details</summary>

- Managed skills (global reads `~/.agents/.skill-lock.json`; project reads `<project root>/skills-lock.json`) are updated one by one with `npx skills update`
- Unmanaged skills have their upstream inferred and are reinstalled after confirmation
- Self-made skills listed in `skills/.up-skills-ignore` are skipped, and so are skills whose own directory has uncommitted changes (legacy symlinked skills are not checked, since their content lives outside git)
- Global mode also reports plugin, cloud-synced skills and CLI version status

</details>

## 🧩 Skills

| Name                  | Purpose                                                                           |
| --------------------- | --------------------------------------------------------------------------------- |
| `agent-browser`       | Browser automation CLI: operate pages, fill forms, screenshot, scrape             |
| `design-md`           | Distill a Stitch project into a `DESIGN.md` design-system document                |
| `find-skills`         | Discover and install skills from the open skills ecosystem                        |
| `humanizer`           | Rewrite AI-sounding English so it reads like the writer                           |
| `humanizer-zh`        | Chinese counterpart: trim filler and template phrasing                            |
| `migrate-to-vinext`   | Migrate a Next.js project to vinext (Vite), with Cloudflare Workers deploy        |
| `modern-web-guidance` | Search modern web best practices first for HTML/CSS and client-side JS tasks      |
| `now-push`            | Commit and push in a fixed format, no confirmation; manual-only (usage below)     |
| `review-fix`          | Functional test + review loop for the current project, max 3 rounds               |
| `up-design`           | Incremental UI diagnose-and-fix pass with state and rules (usage under Pipelines) |
| `up-rules`            | Route rules to lint, `rules/` or `CLAUDE.md`, compress them, sync this README     |
| `up-seo`              | SEO pipeline with shared context (usage under Pipelines)                          |
| `vitest-test-writer`  | Write, review and fix Vitest unit tests, including test-first red-green flow      |

**Pipelines**

- `/up-design [--full] [--m]`: diagnose (screenshots at 375/768/1024/1440, UX rules check over 13 sections, static design criteria, shadscan on shadcn projects, worst-case data, motion audits) → fix directly with no prompts (structural changes and new dependencies go to the report as unresolved) → verify (motion review, final screenshots, performance baseline, lint) → write the user's preferences into `DESIGN.md`/lint; quick mode (changed files since the last run) by default, `--full` forces the whole project; state lives in `./up-design/`; no git writes; self-contained, so the design, motion and rule-writing guidance ships in `skills/up-design/references/`; details: `skills/up-design/SKILL.md`
- `/up-seo [url] [@path ...]`: AI-search visibility → technical and on-page audit → programmatic opportunities, with one shared context and you pick fixes after each stage; self-contained, the guidance ships in `skills/up-seo/references/`; details: `skills/up-seo/SKILL.md`

<details>
<summary><code>/now-push</code> details</summary>

- Runs `git add` + `commit` + `push` without asking for confirmation; `disable-model-invocation: true`, so it runs only when you type `/now-push [--lng <code>] [--pr] [--merge]`
- Stops without committing when a merge, rebase, cherry-pick or revert is in progress or files are unmerged, and when the diff contains a secret
- Pushes every unpushed local commit on the current branch as-is, not just this run's; a clean tree with unpushed commits still pushes
- Commit message is **English** by default and carries a `Co-Authored-By` trailer
- `--lng <code>` switches the message language (`zh` = Traditional Chinese, `ja`, …)
- `--pr` also opens a PR, auto-creating a new branch when on the default branch
- `--merge` implies `--pr`, waits for required checks, squash-merges, deletes the branch locally and remotely, then returns to the default branch
- Every run checks the GitHub repo description and updates it to match the language
- Self-contained: the commit format and the PR/merge steps ship in `skills/now-push/references/`

</details>

<details>
<summary><code>/up-rules</code> details</summary>

- Runs only when you type `/up-rules [--audit] [--lng <code>]` (`disable-model-invocation: true`)
- `--lng <code>` sets the language of everything written, including `agents/` prose, `hooks/` comments, command descriptions and lint messages (`zh` = Traditional Chinese, `ja`; absent = English); content in a different language is translated
- Flow, in order:
  1. Fact-check `CLAUDE.md`
  2. With `--audit`: audit for stale instructions, then pick findings to apply
  3. Route each rule to the cheapest place that still enforces it: a lint rule in the project's existing linter (the reason goes in the lint message), then `rules/<topic>.md` loaded on demand via `paths`, then `CLAUDE.md`
  4. Compress `CLAUDE.md`, `.claude/rules/**/*.md`, `.claude/commands/**/*.md` and the `.md` files of self-made skills listed in `skills/.up-skills-ignore` (plus, when `./up-design/` exists, its `.md` files, `DESIGN.md` and `.claude/skills/design-*/`; never translated) in terse style (drops filler only, never semantics, except hunks applied via `--audit`)
  5. Check and sync this README
- Never installs a linter or edits source code; a new lint rule stays an error, and only files that already break it are downgraded to warn and counted in the report
- The README is written for humans, so it is exempt from terse compression and follows a style guide (structure, emoji, callouts, folding)

</details>

**Notes**

- Third-party skills are installed with `npx skills add --copy`, so each is a real directory in `skills/` that syncs across devices via git; `/up-skills` still updates them in place from upstream
- The update source list lives in `~/.agents/.skill-lock.json`, outside this repo; on a new device, run `npx skills add <owner/repo> -s <skill> -g -y -a claude-code --copy` once per skill to register it
- `up-design` writes the user's design corrections into `DESIGN.md` / lint itself (rule-writing guidance: `skills/up-design/references/rule-routing.md`)
- `review-fix` auto-detects the dev command and port, runs the project's own `.claude/review-fix/` checks or throwaway scripts built on `scripts/lib.mjs`, then `/code-review` and fixes until it converges

## 🤖 Subagents

| Name               | Purpose                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `code-reviewer`    | Read-only review of a diff in fresh context for correctness bugs and regressions |
| `researcher`       | Look up docs, APIs and error messages; return a short cited answer               |
| `security-auditor` | Read-only scan for leaked secrets, injection, auth flaws and unsafe dependencies |
| `ui-ux-tester`     | Test a running web app with agent-browser; report flow, visual and UX defects    |

> [!NOTE]
> All four subagents are read-only (no `Edit` / `Write` granted) and have "Use proactively" in their description, so the main agent delegates to them automatically. Each pins its own model: `code-reviewer` and `security-auditor` use opus; `researcher` and `ui-ux-tester` use sonnet. `ui-ux-tester` also preloads the `agent-browser` skill.

## 🪝 Hooks

| Script                            | Event              | Purpose                                                                     |
| --------------------------------- | ------------------ | --------------------------------------------------------------------------- |
| `hooks/inject-datetime.mjs`       | `UserPromptSubmit` | Add an `Asia/Taipei` timestamp with time of day and weekday to every prompt |
| `hooks/agent-browser-session.mjs` | `SessionStart`     | Give each Claude session its own `agent-browser` session name               |
| `hooks/agent-browser-session.mjs` | `SessionEnd`       | Close that session's browser so no Chrome process is left behind            |
| `hooks/git-secret-guard.mjs`      | `PreToolUse`       | Block `git commit` / `git push` when the change contains secrets            |
| `settings.json` (inline command)  | `PostToolUse`      | Run `prettier --write` on every file Claude writes or edits                 |

The built-in system prompt gives only a date snapshot at session start, so `inject-datetime` supplies the full time. Cleanup details are under Settings.

`git-secret-guard` scans added lines and untracked files for private keys, common API tokens, hard-coded credentials and `.env` files (`.env.example` is allowed). Add `secret-scan:allow` to a line to skip a false positive. It fails open: any internal error lets the command through.

## 🔌 Plugins

| Name                                | Purpose                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `watch@claude-video`                | Add the `/watch` video analysis command                                 |
| `mindful-claude@mindful-claude`     | Show a breathing animation while Claude works; toggle with `/breathe`   |
| `image-view@claude-image-view`      | Show pasted-image thumbnails instead of bare `[Image #n]` tags          |
| `cc-plugin-you-should-know@builtin` | From Claude Code's built-in marketplace, enabled under `enabledPlugins` |

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
| Model          | `model` is `opusplan` (Opus in plan mode, Sonnet when executing)                                                 |
| Effort         | `modelSettings`: Opus `xhigh`, Sonnet `high`; `opusplan` uses Sonnet entry for both phases (plan runs `high`)    |
| Subagent model | `env` sets `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` as a fallback; custom agents pin their own `model`, which wins    |
| Output         | `outputStyle` is `Concise`; `language` is `Traditional Chinese (Taiwan)`                                         |
| Start mode     | `permissions.defaultMode` is `plan`                                                                              |
| Permissions    | `permissions.allow` whitelists low-risk commands (list below the table)                                          |
| Deny           | `permissions.deny` blocks force pushes and reads of `~/.ssh`                                                     |
| Time zone      | `timeZone` is `Asia/Taipei`                                                                                      |
| Statusline     | Node only (`statusline-command.mjs`), no shell fallback; three lines (model, location, usage)                    |
| Vim indicator  | `statusLine.hideVimModeIndicator: true` turns off the built-in `-- INSERT --` indicator in favor of a custom one |

Allowed: `git add`, `git commit -m`, `git push`, `WebSearch`, `agent-browser snapshot` / `wait`, `Edit(~/.claude/commands/**)`, `Skill(update-config)`.

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
| After editing rules   | Run `/up-rules` after changing `CLAUDE.md`, `commands/*.md` or a self-made skill                 |
| Suspect stale wording | Add `--audit` to audit first (for example emphatic tone aimed at older models)                   |
| Ship it               | Push with `/now-push` once changes are done and confirmed                                        |
