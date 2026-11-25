---
name: review-fix
description: Functionally test the current project's uncommitted change set on its local dev server, then run /code-review, fix what it finds, and re-review until it converges (max 3 rounds). Works in any project (auto-detects dev command, port and URL). Optional effort level for /code-review (default high).
argument-hint: "[low|medium|high|xhigh|max]"
disable-model-invocation: true
---

Functionally test current change set (cwd project), then run through review until it converges.
Stay in main conversation, do not fork—you hold intent behind change; fresh subagent does not, fixes need that context.

## Arguments

Given: `$ARGUMENTS` (blank = none). Pick review level from it:

- `low` / `medium` / `high` / `xhigh` / `max` → that level; none → `high`. Always pass level explicitly: `/code-review` without one reuses whatever level was typed last.
- `ultra` → do not launch: cloud review is user-triggered and billed, you cannot start it. Tell user to type `/code-review ultra` themselves, stop.
- Other tokens → one-line notice, ignore.

## Steps

1. `git status --short` + `git diff --stat`. Nothing modified, staged or untracked → say so, stop. Unmerged paths or merge/rebase in progress → say so, stop.

2. **Functional test (round 1 only — before any review).** Skip when diff touches only docs, `.claude/`, or config with no runtime effect; say so.
   Helpers: `${CLAUDE_SKILL_DIR}/scripts/lib.mjs`.
   1. **Detect.** Read project `CLAUDE.md` first (wins over everything below).
      Package manager from lockfile (`pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn, `bun.lock*`→bun, else npm).
      Dev command from `package.json` scripts (`dev`, else `start`). Expected port from script (`--port`/`-p`/`PORT`),
      framework config, else default (Next/Nuxt 3000, Vite/SvelteKit/React Router 5173, Astro 4321).
      No dev server concept (library/CLI) → skip to sub-step 5.
   2. **Server.** Expected URL already responds → reuse only if it serves this project (page title, or a route the diff touches, matches);
      never stop a reused server. Otherwise start dev command in background and wait up to 90s; URL = the one it prints
      (`Local: http://…`), since a busy port makes it move. No response in time → BAD with log tail, skip to sub-step 5.
      Keep it running across rounds; stop it (background task stop or its PID, then confirm URL no longer responds) before step 6 summary, also on early stop.
      Never `pkill -f` with pattern matching your own shell.
      Migrations, seed data, env or typegen steps: follow CLAUDE.md; local resources only.
   3. **Project checks.** Run every script with `BASE=<url>`; `lib.mjs` falls back to `:3000` otherwise.
      `.claude/review-fix/` exists in project → `status.mjs` first (exit 2 = server or local data not ready; fix per CLAUDE.md),
      then `smoke.mjs`. Otherwise write throwaway script in scratchpad, copy `lib.mjs` beside it,
      `import { check, get, json, html, meta, report } from "./lib.mjs"` (absolute-path imports break on Windows).
   4. **Test what diff changed:** home page and every route/API diff touches
      (find from changed files): happy path, invalid-input case, auth gates
      if present. UI changes → add browser check (`agent-browser` CLI; `agent-browser skills get core` first for usage) at 375 and 1440 width.
      Never touch production databases, storage or deploys from here.
   5. **Static checks.** Run the `typecheck` / `lint` / `test` package scripts that exist (plus `build` when there is no dev server), non-watch (e.g. `vitest run`).
   6. Report each check OK/BAD. Triage every BAD before step 3: reproduce by hand (curl or browser) first.
      Check itself wrong → fix check. Caused by diff → **real problem**, fix it, re-run check.
      Fails only in code diff does not touch → pre-existing, report only.

3. Invoke `code-review` skill with args = level only. No `--fix` (read findings yourself first), no `--max-findings` (sticks for later runs).

4. Sort every finding into one pile:
   - **Real problem** (`important`; verdict `PLAUSIBLE` → confirm by reading code first) → fix yourself. You know why code was written this way; `--fix` does not.
   - **Pre-existing** (`pre_existing`) → outside change set: report, don't fix.
   - **Real but trivial** (`nit`) → note in summary, move on.
   - **Can't verify / looks like false positive** → don't fix, don't block loop; collect for step 6. Never silently comply with a finding you don't believe.

5. Changed anything in step 4 → re-run checks those fixes touch (at least project status/smoke checks when server code changed, static checks for touched files), then back to step 3.
   Converged = round with no new real problem. Cap 3 rounds. Blockers remain after third round → stop, report what is unresolved. Do not guess at a fix.

6. Disputed findings from step 4 → ask user in one question first; approved fixes get one more round within cap.
   Then stop server you started, print summary, hand control back:
   - review level; server URL, started or reused
   - functional and static checks run (OK/BAD), whether test data was seeded
   - rounds taken
   - what was fixed
   - findings deliberately skipped (pre-existing, trivial, disputed), and why

## Rules

- Never `git commit` or `git push`. Skill ends by handing control back.
- Never weaken a test or delete an assertion to make a finding go away.
- Local only: never run remote database/storage writes or deploy commands. Test data goes only into local resources.
- Same finding survives two rounds of fixes → stop looping, escalate to user — you are misreading the problem.
