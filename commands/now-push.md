---
description: 自動執行 git add + commit + push，commit message 用固定格式英文（可用 <lng> 參數指定其他語言）
argument-hint: "[<lng>]"
---

## 語言參數 `<lng>`（位置參數 `$1`，選填）

- `$1` 為空 → subject 與 body 用**英文**
- `$1` 有值 → subject 與 body 改用該語言；接受 BCP-47 代碼（`zh-TW`、`ja`、`de`）或自然語言名稱（`繁中`、`繁體中文`、`日文`、`Japanese`）
- 無法辨識 → 一行提示後**退回英文**繼續執行，不中止
- 不論 `<lng>` 為何，`type`、`scope`、`Co-Authored-By` trailer **恆為英文**

立即依序執行，不詢問確認：

## 執行流程

1. `git status` 檢查有無變更；工作區乾淨則回報「無變更可推送」並停止
2. `git diff` + `git diff --staged` 讀完整變更
3. `git log -5 --oneline` 參考近期 commit 風格
4. `git add .`
5. 依下列**固定格式**生成 commit message
6. `git commit -m "<header>" -m "<body>" -m "Co-Authored-By: <當前模型全名> <noreply@anthropic.com>"`（固定三個 -m，trailer 不可省略；`<當前模型全名>` 取法見 footer）
7. `git push`

任一步驟指令非零退出立即停止，回報 stderr 完整內容，**不嘗試修復**。

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

**subject（必填，預設英文，`<lng>` 指定時改用該語言）**

- 動詞開頭，描述「做了什麼」
- 英文：imperative mood（寫 `add`，不寫 `adds`／`added`）、首字小寫、上限 50 字元
- 非英文（CJK 等）：上限 50 字
- 結尾**不加句號**
- 不重複 type 語意（type 已是 `fix`，subject 就不再寫 `fix`）

✅ 正確：`feat(auth): add automatic JWT token refresh`
✅ 正確：`fix(api): handle null user.email crash`
❌ 錯誤：`feat: update some stuff.`（無資訊量、結尾有句號）
❌ 錯誤：`fix(api): fix API bug`（重複 type 語意）

**body（必填，預設英文，`<lng>` 指定時改用該語言，條列）**

- header 與 body 之間**必須空一行**
- 每點用 `- ` 開頭
- 每點一項具體變更，說明做了什麼，必要時加原因
- 每行上限 72 字元（CJK 為 72 字），過長換行續寫
- 條列 1–6 點；過多代表 commit 太雜應拆分（已執行至此就照實寫，**不要事後拆 commit**）

**footer**

- **必填 trailer**：`Co-Authored-By: <當前模型全名> <noreply@anthropic.com>`（每次 commit 必須有，透過第三個 `-m` 傳入，不可省略；模型全名取自本次 session 系統資訊，例 `Claude Sonnet 4.6`、`Claude Opus 4.7`、`Claude Haiku 4.5`）
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
- 不用「Updated」「Modified」「Changed」這類無資訊量動詞
- 英文 subject 不用過去式或第三人稱單數（`added`／`adds` 一律寫 `add`）
- 不在 subject 寫檔名（檔名寫 body 或用 scope 表達）
- 不寫「依照需求」「按要求」這類無意義填充字
- 若 diff 中包含 secret、API key、密碼等敏感資訊，**立即停止並警告使用者**，不要 commit
