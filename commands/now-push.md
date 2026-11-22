---
description: Run git add + commit + push automatically with a fixed-format English commit message, pushing every unpushed local commit on the current branch together; --lng sets the language, --pr opens a PR, --merge opens a PR, waits for required checks, squash merges, deletes the branch and returns to the default branch; also checks and updates the GitHub repo description
argument-hint: "[--lng <zh|ja|...>] [--pr] [--merge]"
disable-model-invocation: true
---

## Arguments (parse from `$ARGUMENTS`, any order)

- `--lng <code>` or `--lng=<code>`: language for commit subject/body, repo description, PR title/body. Accept BCP-47 code (`zh`, `ja`, `de`, case-insensitive) or natural-language name (`繁中`, `日文`, `Japanese`)
  - absent → **English**
  - unrecognized or missing value → one-line notice, **fall back to English**, continue; do not abort
  - `zh` → Traditional Chinese (`zh-cn`/`簡中` → Simplified)
- `--pr`: open PR after push; absent → **no branch, no PR**
- `--merge`: implies `--pr`; after PR, wait for required checks to pass, squash merge into default branch, delete branch (local + remote), switch back to default branch and sync; absent → PR stays open
- other unknown tokens → one-line notice, ignore; do not abort
- Regardless of language: `type`, `scope`, `Co-Authored-By` trailer, branch name **always English**

Execute in order immediately, no confirmation:

## Flow

1. `git status` + collect **unpushed commits** on current branch (probe commands exempt from the stop rule below):
   - upstream = `git for-each-ref --format='%(upstream:short)' "$(git symbolic-ref -q HEAD)"` (exits 0; empty output = no upstream)
   - has upstream → unpushed = `git log --oneline <upstream>..HEAD`
   - no upstream → unpushed = `git log --oneline HEAD --not --remotes`
   - clean tree **and** no unpushed commits → report 「無變更可推送」 and stop
   - clean tree but unpushed commits exist → skip working-tree diff, commit message generation, `git add`, `git commit` (steps 2 working diff, 4, 6, 7); go to step 5 (existing commits are pushed as-is)
2. `git diff` + `git diff --staged`; read full changes. Unpushed commits exist → also read `git diff <base>..HEAD` (base = upstream, else `origin/<default branch>`) for the secret check and PR content
3. `git log -5 --oneline` for recent commit style
4. Generate commit message in the **fixed format** below (before branching; branch name needs it)
5. **`--pr`/`--merge`**: get default branch via `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`; current branch == default → `git switch -c <type>/<slug>` (slug = scope + English subject keywords, kebab-case, ≤40 chars; English even when `--lng` is not English; no new commit this run → use newest unpushed commit's header, or one summarizing header if several). After switching, if default branch had unpushed commits, `origin/<default>` exists and `git merge-base --is-ancestor origin/<default> <default>` succeeds → `git branch -f <default> origin/<default>` (commits stay on the new branch; without this the later `git pull --ff-only` diverges); otherwise skip
6. `git add .`
7. `git commit -m "<header>" -m "<body>" -m "Co-Authored-By: <當前模型全名> <noreply@anthropic.com>"` (exactly three `-m`; trailer mandatory; `<當前模型全名>` source: see footer)
8. `git push` (always whole current branch, never a single sha or refspec); current branch has no upstream → `git push -u origin HEAD`. Report pushed commits (short sha + header; mark the one created this run)
9. **`--pr`/`--merge`**: `gh pr view` on current branch; PR exists → report existing URL, do not recreate; none → `gh pr create --base <default branch> --title "<title>" --body "<body>"`; single commit → title/body = that commit's header/body; several commits → title = one summarizing fixed-format header, body = list of each commit header + merged key bullets; body ends with blank line + `🤖 Generated with [Claude Code](https://claude.com/claude-code)`, language per `--lng`; report PR URL
10. **`--merge` only** (existing PR also merged):
    1. Wait for required checks: `gh pr checks <PR number> --required --watch --fail-fast` (Bash timeout 600000 ms). Checks not registered yet ("no checks reported") → wait ~10s, retry, ≤60s total; still none → repo has no required checks, continue. Any check fails → stop, report failing check name + URL + PR URL, stay on feature branch. Still pending at timeout → report PR URL, stay on feature branch
    2. `gh pr merge <PR number> --squash --delete-branch --subject "<PR title>"`
    3. `git switch <default branch>` (skip if `gh` already switched) + `git pull --ff-only`
    4. `git fetch --prune`; local branch still present → `git branch -D <branch>`
    5. report merged PR URL, deleted branch name, current branch `<default>` + HEAD short sha
    6. `gh run list --commit <HEAD sha> --json name,status,url` → report workflow runs the merge triggered (deploys etc.); runs may take a few seconds to appear, do not wait for them to finish
11. Repo description check (next section)

Steps 1–10 (except the step 1 probes and the step 5 `--is-ancestor` guard, whose non-zero exit just selects a branch): any non-zero exit → stop immediately, report full stderr, **do not attempt repair**. Step 10 merge blocked after checks passed (review / conflict / other policy) → report stderr + PR URL, stay on feature branch, no retry, no `--admin`/`--auto`. Step 11 failure (not GitHub, `gh` not logged in, no permission) → notice only, **not an overall failure**—commit/push already done.

## Repo Description Maintenance

- Precondition: `gh repo view --json description,url` succeeds; else one-line notice 「略過 description 檢查：<原因>」
- Update needed if any holds:
  - description empty
  - language ≠ target language (`--lng`, default English)
  - content clearly mismatches actual repo purpose (judge from README.md first paragraph, this diff, top-level `git ls-files`; counts only when this change shifts project positioning or adds a major feature)
- No update needed → report 「description 已同步，未改動」; do not change for change's sake
- Update needed → generate new description: one sentence, ≤350 chars, no emoji, no trailing period in English, state what the project is/does; `gh repo edit --description "<new>"`; report old → new

## Commit Message Fixed Format

### Structure

```
<type>(<scope>): <subject>

- <變更點 1>
- <變更點 2>
- <變更點 3>

[Refs: #issue 或 BREAKING CHANGE: 說明]（選填）
```

### Field rules

**type (required, lowercase English, pick one from table)**

| type       | when to use                                                       |
| ---------- | ----------------------------------------------------------------- |
| `feat`     | new feature                                                       |
| `fix`      | bug fix                                                           |
| `docs`     | docs-only change (README, comments, JSDoc, etc.)                  |
| `style`    | formatting, no logic change (whitespace, semicolons, layout)      |
| `refactor` | restructure, external behavior unchanged                          |
| `perf`     | performance optimization                                          |
| `test`     | add or modify tests                                               |
| `build`    | build system, dependency changes (package.json, Dockerfile, etc.) |
| `ci`       | CI/CD config (GitHub Actions, GitLab CI, etc.)                    |
| `chore`    | misc chores not touching src or tests                             |
| `revert`   | revert earlier commit                                             |

**scope (optional, lowercase English)**

Module/file area/feature affected, e.g. `auth`, `api`, `ui`, `db`, `config`.
Spans several modules with no common scope → omit scope; header becomes `<type>: <subject>`.

**subject (required, default English; other language when `--lng` given)**

- Start with verb; say concretely what changed—log readers cannot see the diff, every word must carry information
- English: imperative mood (`add`, not `adds`/`added`), lowercase first letter, ≤50 chars
- Non-English (CJK etc.): ≤50 characters
- **No trailing period**
- Do not repeat type meaning (type is `fix` → subject does not say `fix`)

✅ 正確：`feat(auth): add automatic JWT token refresh`
✅ 正確：`fix(api): handle null user.email crash`
❌ 錯誤：`feat: update some stuff.`（無資訊量、結尾有句號）
❌ 錯誤：`fix(api): fix API bug`（重複 type 語意）

**body (required, default English; other language when `--lng` given; bullets)**

- **Blank line required** between header and body
- Each point starts with `- `
- One concrete change per point: what was done, add why when needed
- ≤72 chars per line (CJK: 72 characters); wrap longer lines
- Many changes → merge like items per module so body scans at a glance; already executed at this point → write truthfully, **do not split the commit afterwards**

**footer**

- **Required trailer**: `Co-Authored-By: <當前模型全名> <noreply@anthropic.com>` (every commit; passed as third `-m`; never omit; full model name from this session's system info)
- Related issue (optional): `Refs: #123` or `Closes: #123`
- Breaking change (optional): `BREAKING CHANGE: <說明影響與遷移方式>`

## Examples

```
feat(auth): add automatic JWT token refresh

- Add RefreshTokenService to renew tokens in the background
- Intercept 401 in axios interceptor to avoid forced logout
- Store refresh token in an httpOnly cookie for safety
- Add useAuth hook as the single source of login state

Refs: #142

Co-Authored-By: <當前模型全名> <noreply@anthropic.com>
```

```
refactor(db): preload user relations via Prisma include

- Drop the manual N+1 queries scattered across services
- Define include rules in UserRepository for consistency
- Expect roughly 40% fewer queries

Co-Authored-By: <當前模型全名> <noreply@anthropic.com>
```

```
fix(ui): raise error text contrast in dark mode

- Change error text from #ff0000 to #ff6b6b
- Add dark: variants so both modes meet WCAG AA

Co-Authored-By: <當前模型全名> <noreply@anthropic.com>
```

## Prohibited

- No emoji in commit message or repo description (PR body trailer `🤖 Generated with …` required, exempt)
- English subject: no past tense or third-person singular (`added`/`adds` → always `add`)
- No filenames in subject (put in body or express via scope)
- No force push
- `--merge`: no `--admin` to bypass branch protection
- Existing unpushed commits: push as-is; never amend, squash, reword or rewrite to fixed format
- Diff (working tree **or** any unpushed commit) contains secret, API key, password or similar sensitive data → **stop immediately and warn user**; do not commit, do not push
