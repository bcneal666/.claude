# Commit Message Fixed Format

Used at step 4 (and step 9 for a summarizing PR title). A repo's own commitlint / CONTRIBUTING rules override the matching field (SKILL.md step 3).

## Structure

```
<type>(<scope>): <subject>

- <變更點 1>
- <變更點 2>
- <變更點 3>

[Refs: #issue 或 BREAKING CHANGE: 說明]（選填）
```

## Field rules

**type (required, lowercase English, pick one)**

Allowed: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert` (conventional-commit meanings; `chore` = misc not touching src or tests, `style` = formatting only).

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
