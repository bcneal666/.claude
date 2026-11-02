---
name: review-fix
description: Functionally test the current project's change set on its local dev server, then review, fix what the review finds, and re-review until it converges. Works in any project (auto-detects dev command and port). Use when the user asks to test and review-fix the current changes.
argument-hint: "[effort]"
---

Functionally test the current change set (cwd project), then run it through review until it converges.
Stay in the main conversation — do not fork. You hold the intent behind
this change; a fresh subagent does not, and the fixes need that context.

## Steps

1. Run `git diff --stat` and `git status --short`. If there are no changes,
   say so and stop.

2. **Functional test (round 1 only — before any review).** Skip when the diff
   touches only docs, `.claude/`, or config with no runtime effect; say so.
   Helpers: `${CLAUDE_SKILL_DIR}/scripts/lib.mjs` (fallback `~/.claude/skills/review-fix/scripts/lib.mjs`).
   Run scripts from the project root; `BASE` overrides the detected URL.
   1. **Detect.** Read project `CLAUDE.md` first (it wins over everything below).
      Package manager from lockfile (`pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn, `bun.lock*`→bun, else npm).
      Dev command from `package.json` scripts (`dev`, else `start`). Port from the script
      (`--port`/`-p`/`PORT`), framework config, or default (Next/Nuxt/Astro-less 3000, Vite 5173, Astro 4321, SvelteKit 5173).
      No dev server concept (library/CLI) → run the project's own test/build commands instead and report them.
   2. **Server.** If `BASE` (default detected URL) already responds, use it and never stop it.
      Otherwise start the dev command in the background, wait until it responds, and stop it
      by port or PID at the end (never `pkill -f` with a pattern that matches your own shell).
      Migrations, seed data, env or typegen steps: follow CLAUDE.md; local resources only.
   3. **Project checks.** If `.claude/review-fix/` exists in the project, run its scripts
      (`status.mjs` first — exit 2 means the server or local data is not ready; fix per CLAUDE.md —
      then `smoke.mjs`). Otherwise write a throwaway script in the scratchpad that imports
      `check`, `get`, `html`, `meta` and `report` from `lib.mjs`.
   4. **Test what the diff changed:** the home page and every route/API the diff touches
      (find them from the changed files): happy path, an invalid-input case, auth gates
      if present. For UI changes, add a browser check (`agent-browser` skill) at 375 and 1440 width.
      Never touch production databases, storage or deploys from here.
   5. Report each check as OK/BAD. Every BAD is a **real problem**: fix it
      before step 3 and re-run the failing check.

3. Run `/code-review $1`. When `$1` is empty, always use `high`.
   Do not pass `--fix` — read the findings yourself first.

4. Sort every finding into one of three piles:
   - **Real problem** → fix it yourself. You know why the code was written
     this way; `--fix` does not.
   - **Can't verify / looks like a false positive** → list it and ask the
     user. Never silently comply with a finding you don't believe.
   - **Real but trivial** → note it in the summary and move on.

5. If you changed anything in step 4, re-run the functional checks those
   fixes touch (at least the project smoke/status checks when server code changed), then go back
   to step 3.
   Cap at 3 rounds. If blockers remain after the third round, stop and
   report what's unresolved. Do not guess at a fix.

6. Print a summary and hand control back:
   - functional checks run (OK/BAD), and whether test data was seeded
   - rounds taken
   - what was fixed
   - findings deliberately skipped, and why

## Rules

- Never `git commit` or `git push`. This skill ends by handing control back.
- Never weaken a test or delete an assertion to make a finding go away.
- Local only: never run remote database/storage writes or deploy commands.
  Test data goes only into local resources.
- If the same finding survives two rounds of fixes, stop looping and
  escalate it to the user — it means you're misreading the problem.
