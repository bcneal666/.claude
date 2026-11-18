---
name: review-fix
description: Functionally test the current project's change set on its local dev server, then review, fix what the review finds, and re-review until it converges. Works in any project (auto-detects dev command and port). Use when the user asks to test and review-fix the current changes.
argument-hint: "[effort]"
---

Functionally test current change set (cwd project), then run through review until it converges.
Stay in main conversation, do not fork—you hold intent behind change; fresh subagent does not, fixes need that context.

## Steps

1. `git diff --stat` and `git status --short`. No changes → say so, stop.

2. **Functional test (round 1 only — before any review).** Skip when diff touches only docs, `.claude/`, or config with no runtime effect; say so.
   Helpers: `${CLAUDE_SKILL_DIR}/scripts/lib.mjs` (fallback `~/.claude/skills/review-fix/scripts/lib.mjs`).
   Run scripts from project root; `BASE` overrides detected URL.
   1. **Detect.** Read project `CLAUDE.md` first (wins over everything below).
      Package manager from lockfile (`pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn, `bun.lock*`→bun, else npm).
      Dev command from `package.json` scripts (`dev`, else `start`). Port from script
      (`--port`/`-p`/`PORT`), framework config, or default (Next/Nuxt/Astro-less 3000, Vite 5173, Astro 4321, SvelteKit 5173).
      No dev server concept (library/CLI) → run project's own test/build commands instead and report them.
   2. **Server.** `BASE` (default detected URL) already responds → use it, never stop it.
      Otherwise start dev command in background, wait until it responds, stop it
      by port or PID at end (never `pkill -f` with pattern matching your own shell).
      Migrations, seed data, env or typegen steps: follow CLAUDE.md; local resources only.
   3. **Project checks.** `.claude/review-fix/` exists in project → run its scripts
      (`status.mjs` first — exit 2 = server or local data not ready; fix per CLAUDE.md —
      then `smoke.mjs`). Otherwise write throwaway script in scratchpad importing
      `check`, `get`, `html`, `meta`, `report` from `lib.mjs`.
   4. **Test what diff changed:** home page and every route/API diff touches
      (find from changed files): happy path, invalid-input case, auth gates
      if present. UI changes → add browser check (`agent-browser` skill) at 375 and 1440 width.
      Never touch production databases, storage or deploys from here.
   5. Report each check OK/BAD. Every BAD is a **real problem**: fix it
      before step 3, re-run failing check.

3. Run `/code-review $1`. `$1` empty → always use `high`.
   Do not pass `--fix` — read findings yourself first.

4. Sort every finding into one of three piles:
   - **Real problem** → fix yourself. You know why code was written this way; `--fix` does not.
   - **Can't verify / looks like false positive** → list it, ask user. Never silently comply with a finding you don't believe.
   - **Real but trivial** → note in summary, move on.

5. Changed anything in step 4 → re-run functional checks those fixes touch (at least project smoke/status checks when server code changed), then back to step 3.
   Cap 3 rounds. Blockers remain after third round → stop, report what is unresolved. Do not guess at a fix.

6. Print summary, hand control back:
   - functional checks run (OK/BAD), whether test data was seeded
   - rounds taken
   - what was fixed
   - findings deliberately skipped, and why

## Rules

- Never `git commit` or `git push`. Skill ends by handing control back.
- Never weaken a test or delete an assertion to make a finding go away.
- Local only: never run remote database/storage writes or deploy commands. Test data goes only into local resources.
- Same finding survives two rounds of fixes → stop looping, escalate to user — you are misreading the problem.
