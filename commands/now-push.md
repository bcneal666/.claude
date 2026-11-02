---
description: 自動執行 git add + commit + push，commit message 固定格式英文；--lng 指定語言、--pr 開 PR、--merge 開 PR 後 squash merge 並刪分支回 main，並檢查更新 GitHub repo description
argument-hint: "[--lng <zh|ja|...>] [--pr] [--merge]"
---

## Arguments (parse from `$ARGUMENTS`, any order)

- `--lng <code>` or `--lng=<code>`: language for commit subject/body, repo description, PR title/body. Accept BCP-47 code (`zh`, `ja`, `de`, case-insensitive) or natural-language name (`繁中`, `日文`, `Japanese`)
  - absent → **English**
  - unrecognized or missing value → one-line notice, **fall back to English**, continue; do not abort
  - `zh` → Traditional Chinese (`zh-cn`/`簡中` → Simplified)
- `--pr`: open PR after push; absent → **no branch, no PR**
- `--merge`: implies `--pr`; after PR, squash merge into default branch, delete branch (local + remote), switch back to default branch and sync; absent → PR stays open
- other unknown tokens → one-line notice, ignore; do not abort
- Regardless of language: `type`, `scope`, `Co-Authored-By` trailer, branch name **always English**

Execute in order immediately, no confirmation:

## Flow

1. `git status`; clean tree → report 「無變更可推送」 and stop
2. `git diff` + `git diff --staged`; read full changes
3. `git log -5 --oneline` for recent commit style
4. Generate commit message in the **fixed format** below (before branching; branch name needs it)
5. **`--pr`/`--merge`**: get default branch via `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`; current branch == default → `git switch -c <type>/<slug>` (slug = scope + English subject keywords, kebab-case, ≤40 chars; English even when `--lng` is not English)
6. `git add .`
7. `git commit -m "<header>" -m "<body>" -m "Co-Authored-By: <當前模型全名> <noreply@anthropic.com>"` (exactly three `-m`; trailer mandatory; `<當前模型全名>` source: see footer)
8. `git push`; current branch has no upstream → `git push -u origin HEAD`
9. **`--pr`/`--merge`**: `gh pr view` on current branch; PR exists → report existing URL, do not recreate; none → `gh pr create --base <default branch> --title "<commit header>" --body "<body>"`; body = commit body bullets + blank line + `🤖 Generated with [Claude Code](https://claude.com/claude-code)`, language per `--lng`; report PR URL
10. **`--merge` only** (existing PR also merged):
    1. `gh pr merge <PR number> --squash --delete-branch --subject "<commit header>"`
    2. `git switch <default branch>` (skip if `gh` already switched) + `git pull --ff-only`
    3. `git fetch --prune`; local branch still present → `git branch -D <branch>`
    4. report merged PR URL, deleted branch name, current branch `<default>` + HEAD short sha
11. Repo description check (next section)

Steps 1–10: any non-zero exit → stop immediately, report full stderr, **do not attempt repair**. Step 10 blocked (required checks / review / conflict) → report stderr + PR URL, stay on feature branch, no retry, no `--admin`/`--auto`. Step 11 failure (not GitHub, `gh` not logged in, no permission) → notice only, **not an overall failure**—commit/push already done.

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

| type       | when to use                                                      |
| ---------- | ---------------------------------------------------------------- |
| `feat`     | new feature                                                      |
| `fix`      | bug fix                                                          |
| `docs`     | docs-only change (README, comments, JSDoc, etc.)                 |
| `style`    | formatting, no logic change (whitespace, semicolons, layout)     |
| `refactor` | restructure, external behavior unchanged                         |
| `perf`     | performance optimization                                         |
| `test`     | add or modify tests                                              |
| `build`    | build system, dependency changes (package.json, Dockerfile, etc.) |
| `ci`       | CI/CD config (GitHub Actions, GitLab CI, etc.)                   |
| `chore`    | misc chores not touching src or tests                            |
| `revert`   | revert earlier commit                                            |

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
- Diff contains secret, API key, password or similar sensitive data → **stop immediately and warn user**; do not commit
