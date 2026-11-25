# PR and merge steps (`--pr` / `--merge`)

Read only with `--pr`/`--merge`. Step numbers match Flow in `SKILL.md`; its stop rule applies here too.

## Step 5 — branch

Get default branch via `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`; current branch == default → `git switch -c <type>/<slug>` (slug = scope + English subject keywords, kebab-case, ≤40 chars; English even when `--lng` is not English; no new commit this run → use newest unpushed commit's header, or one summarizing header if several). After switching, if default branch had unpushed commits, `origin/<default>` exists and `git merge-base --is-ancestor origin/<default> <default>` succeeds → `git branch -f <default> origin/<default>` (commits stay on the new branch; without this the later `git pull --ff-only` diverges); otherwise skip

## Step 9 — PR

`gh pr view` on current branch; PR exists → report existing URL, do not recreate; none → `gh pr create --base <default branch> --title "<title>" --body "<body>"`; single commit → title/body = that commit's header/body; several commits → title = one summarizing fixed-format header, body = list of each commit header + merged key bullets; body ends with blank line + `🤖 Generated with [Claude Code](https://claude.com/claude-code)`, language per `--lng`; report PR URL

## Step 10 — merge (`--merge` only, existing PR also merged)

1. Wait for required checks: `gh pr checks <PR number> --required --watch --fail-fast` (Bash timeout 600000 ms). Checks not registered yet ("no checks reported") → wait ~10s, retry, ≤60s total; still none → repo has no required checks, continue. Any check fails → stop, report failing check name + URL + PR URL, stay on feature branch (so /steward can watch it); end report with 「可輸入 /steward 讓 Claude 接手修」. Still pending at timeout → report PR URL, stay on feature branch
2. `gh pr merge <PR number> --squash --delete-branch --subject "<PR title>"`
3. `git switch <default branch>` (skip if `gh` already switched) + `git pull --ff-only`
4. `git fetch --prune`; local branch still present → `git branch -D <branch>`
5. report merged PR URL, deleted branch name, current branch `<default>` + HEAD short sha
6. `gh run list --commit <HEAD sha> --json name,status,url` → report workflow runs the merge triggered (deploys etc.); runs may take a few seconds to appear, do not wait for them to finish
