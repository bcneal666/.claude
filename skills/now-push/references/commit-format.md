# Commit Message 固定格式

用於 step 4（及 step 9 的彙總式 PR 標題）。repo 自有的 commitlint / CONTRIBUTING 規則覆蓋對應欄位（SKILL.md step 3）。

## 結構

```
<type>(<scope>): <subject>

- <變更點 1>
- <變更點 2>
- <變更點 3>

[Refs: #issue 或 BREAKING CHANGE: 說明]（選填）
```

## 欄位規則

**type（必填，小寫 English，擇一）**

允許：`feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`（沿用 conventional-commit 語意；`chore` = 不動 src 或測試的雜項，`style` = 僅格式調整）。

**scope（選填，小寫 English）**

受影響的模組/檔案區域/功能，如 `auth`、`api`、`ui`、`db`、`config`。
跨多個模組且無共同 scope → 省略 scope；header 變為 `<type>: <subject>`。

**subject（必填，預設 English；給 `--lng` 時用其他語言）**

- 以動詞開頭；具體說明改了什麼——log 讀者看不到 diff，每個字都要有資訊量
- English：祈使語氣（`add`，不是 `adds`/`added`），首字母小寫，≤50 chars
- 非 English（CJK 等）：≤50 字元
- **結尾不加句號**
- 不重複 type 語意（type 為 `fix` → subject 不寫 `fix`）

✅ 正確：`feat(auth): add automatic JWT token refresh`
✅ 正確：`fix(api): handle null user.email crash`
❌ 錯誤：`feat: update some stuff.`（無資訊量、結尾有句號）
❌ 錯誤：`fix(api): fix API bug`（重複 type 語意）

**body（必填，預設 English；給 `--lng` 時用其他語言；bullets）**

- header 與 body 之間**必須空一行**
- 每點以 `- ` 開頭
- 每點一項具體變更：做了什麼，必要時補上原因
- 每行 ≤72 chars（CJK：72 字元）；較長則換行
- 變更很多 → 依模組合併同類項，讓 body 一眼可掃；此時變更已執行完畢 → 如實撰寫，**事後不得拆分 commit**

**footer**

- **必要 trailer**：`Co-Authored-By: <當前模型全名> <noreply@anthropic.com>`（每個 commit；以第三個 `-m` 傳入；絕不省略；完整模型名稱取自本 session 的系統資訊）
- 相關 issue（選填）：`Refs: #123` 或 `Closes: #123`
- Breaking change（選填）：`BREAKING CHANGE: <說明影響與遷移方式>`

## 範例

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
