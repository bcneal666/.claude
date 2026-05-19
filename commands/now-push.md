---
description: 自動執行 git add + commit + push，commit message 用固定格式繁體中文
---

立即依序執行以下動作，全程不詢問確認：

## 執行流程

1. `git status` 檢查有無變更，若工作區乾淨直接回報「無變更可推送」並停止
2. `git diff` 和 `git diff --staged` 讀取完整變更內容
3. `git log -5 --oneline` 看近期 commit 風格作為參考
4. `git add .`
5. 依下列**固定格式**生成 commit message
6. `git commit -m "<header>" -m "<body>"`（多行用兩個 -m 傳）
7. `git push`

任一步驟指令非零退出立即停止，回報 stderr 完整內容，**不嘗試修復**。

## Commit Message 固定格式

### 結構

​```
<type>(<scope>): <subject>

- <變更點 1>
- <變更點 2>
- <變更點 3>

[Refs: #issue 或 BREAKING CHANGE: 說明]（選填）
​```

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

標示變更影響的模組、檔案區域或功能名稱。例：`auth`、`api`、`ui`、`db`、`config`。
若變更橫跨多個無共同 scope 的模組則省略 scope，header 寫成 `<type>: <subject>`。

**subject（必填，繁體中文）**

- 動詞開頭，描述「做了什麼」
- 上限 50 個中文字
- 結尾**不加句號**
- 不重複 type 的語意（例如 type 已是 `fix`，subject 就不要再寫「修復」）

✅ 正確：`feat(auth): 加入 JWT token 過期自動續期機制`
✅ 正確：`fix(api): 處理 user.email 為 null 時的崩潰`
❌ 錯誤：`feat: 修改了一些東西。`（無資訊量、結尾有句號）
❌ 錯誤：`fix(api): 修復 API 的 bug`（重複 type 語意）

**body（必填，繁體中文，條列）**

- header 與 body 之間**必須空一行**
- 每點用 `- ` 開頭
- 每點描述一項具體變更，說明「做了什麼」與必要時「為何這樣做」
- 每行上限 72 個中文字，過長就換行續寫
- 條列點數量：1 到 6 點之間，過多代表 commit 太雜應拆分（若已執行至此就照實寫，**不要事後拆 commit**）

**footer（選填）**

- 關聯 issue：`Refs: #123` 或 `Closes: #123`
- 破壞性變更：`BREAKING CHANGE: <說明影響與遷移方式>`

## 範例

​```
feat(auth): 加入 JWT token 過期自動續期機制

- 新增 RefreshTokenService 處理 token 即將過期時的背景更新
- 在 axios interceptor 攔截 401 並觸發續期，避免使用者被登出
- 將 refresh token 儲存於 httpOnly cookie 提升安全性
- 加入 useAuth hook 提供前端統一的登入狀態

Refs: #142
​```

​```
refactor(db): 將 user 查詢統一改用 Prisma include 預載關聯

- 移除散落各 service 的手動 N+1 查詢
- 在 UserRepository 集中定義 include 規則確保一致性
- 預期可減少 40% 的查詢次數
  ​```

​```
fix(ui): 修正深色模式下表單錯誤訊息對比度不足

- 將 error text 從 #ff0000 改為 #ff6b6b
- 加入 dark: 變體確保兩種模式都符合 WCAG AA
  ​```

## 禁止事項

- 不使用 emoji
- 不使用「Updated」「Modified」「Changed」這類無資訊量的英文動詞
- 不在 subject 寫檔名（檔名應寫在 body 或用 scope 表達）
- 不寫「依照需求」「按要求」這類無意義填充字
- 若 diff 中包含 secret、API key、密碼等敏感資訊，**立即停止並警告使用者**，不要 commit
