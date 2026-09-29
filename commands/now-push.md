---
description: 自動執行 git add + commit + push，commit message 固定格式英文；--lng 指定語言、--pr 開 PR，並檢查更新 GitHub repo description
argument-hint: "[--lng <zh-tw|zh|ja|...>] [--pr]"
---

## 參數（從 `$ARGUMENTS` 解析，順序不拘）

- `--lng <code>` 或 `--lng=<code>`：commit subject／body、repo description、PR title／body 改用該語言；接受 BCP-47 代碼（`zh-TW`、`zh`、`ja`、`de`，大小寫不拘）或自然語言名稱（`繁中`、`日文`、`Japanese`）
  - 未帶 → **英文**
  - 無法辨識或缺值 → 一行提示後**退回英文**繼續執行，不中止
  - `zh` 未指明繁簡 → 繁體中文（`zh-cn`／`簡中` 才用簡體）
- `--pr`：push 後開 PR；未帶則**不建分支、不開 PR**
- 其他未知 token → 一行提示後忽略，不中止
- 不論語言，`type`、`scope`、`Co-Authored-By` trailer、分支名**恆為英文**

立即依序執行，不詢問確認：

## 執行流程

1. `git status` 檢查有無變更；工作區乾淨則回報「無變更可推送」並停止
2. `git diff` + `git diff --staged` 讀完整變更
3. `git log -5 --oneline` 參考近期 commit 風格
4. 依下列**固定格式**生成 commit message（先生成，分支名需用）
5. **僅 `--pr`**：`gh repo view --json defaultBranchRef -q .defaultBranchRef.name` 取預設分支；目前分支等於預設分支時 `git switch -c <type>/<slug>`（slug 由 scope + subject 英文關鍵字組成，kebab-case，≤40 字元；`--lng` 非英文仍用英文 slug）
6. `git add .`
7. `git commit -m "<header>" -m "<body>" -m "Co-Authored-By: <當前模型全名> <noreply@anthropic.com>"`（固定三個 -m，trailer 不可省略；`<當前模型全名>` 取法見 footer）
8. `git push`；目前分支無 upstream 時用 `git push -u origin HEAD`
9. **僅 `--pr`**：`gh pr view` 檢查目前分支已有 PR → 回報既有 URL，不重開；無 → `gh pr create --base <預設分支> --title "<commit header>" --body "<body>"`；body = commit body 條列 + 空行 + `🤖 Generated with [Claude Code](https://claude.com/claude-code)`，語言依 `--lng`；回報 PR URL
10. repo description 檢查（見下節）

步驟 1–9 任一指令非零退出立即停止，回報 stderr 完整內容，**不嘗試修復**。步驟 10 失敗（非 GitHub、`gh` 未登入、無權限）只提示，**不算整體失敗**——commit／push 已完成。

## Repo Description 維護

- 前置：`gh repo view --json description,url` 成功才進行；否則一行提示「略過 description 檢查：<原因>」
- 任一成立即需更新：
  - description 為空
  - 語言與目標語言（`--lng`，預設英文）不符
  - 內容與 repo 實際用途明顯不符（依 README.md 首段、本次 diff、`git ls-files` 頂層結構判斷；本次變更改變專案定位或新增主要功能才算）
- 不需更新 → 回報「description 已同步，未改動」，不為改而改
- 需更新 → 生成新 description：一句、≤350 字元、不含 emoji、英文不加結尾句號、說明專案是什麼／做什麼；`gh repo edit --description "<new>"`；回報舊 → 新

## Commit Message 固定格式

### 結構

```
<type>(<scope>): <subject>

- <變更點 1>
- <變更點 2>
- <變更點 3>

[Refs: #issue 或 BREAKING CHANGE: 說明]（選填）
```

### 各欄位規則

**type（必填，英文小寫，從下表選一個）**

| type       | 使用時機                                              |
| ---------- | ----------------------------------------------------- |
| `feat`     | 新功能                                                |
| `fix`      | 修復 bug                                              |
| `docs`     | 僅文件變更（README、註解、JSDoc 等）                  |
| `style`    | 格式調整不影響邏輯（空白、分號、排版）                |
| `refactor` | 重構不改變外部行為                                    |
| `perf`     | 效能優化                                              |
| `test`     | 新增或修改測試                                        |
| `build`    | 建置系統、套件依賴變更（package.json、Dockerfile 等） |
| `ci`       | CI/CD 設定（GitHub Actions、GitLab CI 等）            |
| `chore`    | 雜項（不動 src 與 test 的瑣事）                       |
| `revert`   | 還原先前 commit                                       |

**scope（選填，英文小寫）**

標示變更影響的模組／檔案區域／功能，例 `auth`、`api`、`ui`、`db`、`config`。
跨多個無共同 scope 模組時省略 scope，header 寫成 `<type>: <subject>`。

**subject（必填，預設英文，`--lng` 指定時改用該語言）**

- 動詞開頭，具體說出改了什麼——讀 log 的人看不到 diff，每個詞都要帶資訊
- 英文：imperative mood（寫 `add`，不寫 `adds`／`added`）、首字小寫、上限 50 字元
- 非英文（CJK 等）：上限 50 字
- 結尾**不加句號**
- 不重複 type 語意（type 已是 `fix`，subject 就不再寫 `fix`）

✅ 正確：`feat(auth): add automatic JWT token refresh`
✅ 正確：`fix(api): handle null user.email crash`
❌ 錯誤：`feat: update some stuff.`（無資訊量、結尾有句號）
❌ 錯誤：`fix(api): fix API bug`（重複 type 語意）

**body（必填，預設英文，`--lng` 指定時改用該語言，條列）**

- header 與 body 之間**必須空一行**
- 每點用 `- ` 開頭
- 每點一項具體變更，說明做了什麼，必要時加原因
- 每行上限 72 字元（CJK 為 72 字），過長換行續寫
- 變更點多時按模組合併同類項，讓 body 一眼可掃完；已執行至此就照實寫，**不要事後拆 commit**

**footer**

- **必填 trailer**：`Co-Authored-By: <當前模型全名> <noreply@anthropic.com>`（每次 commit 必須有，透過第三個 `-m` 傳入，不可省略；模型全名取自本次 session 系統資訊）
- 關聯 issue（選填）：`Refs: #123` 或 `Closes: #123`
- 破壞性變更（選填）：`BREAKING CHANGE: <說明影響與遷移方式>`

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

## 禁止事項

- 不使用 emoji
- 英文 subject 不用過去式或第三人稱單數（`added`／`adds` 一律寫 `add`）
- 不在 subject 寫檔名（檔名寫 body 或用 scope 表達）
- 不 force push
- 若 diff 中包含 secret、API key、密碼等敏感資訊，**立即停止並警告使用者**，不要 commit
