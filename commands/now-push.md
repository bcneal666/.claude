---
description: 自動執行 git add + commit + push，commit message 固定格式英文；--lng 指定語言、--pr 開 PR、--merge 開 PR 後等必要檢查通過再 squash merge 並刪分支回 main，並檢查更新 GitHub repo description
argument-hint: "[--lng <zh|ja|...>] [--pr] [--merge]"
disable-model-invocation: true
---

## 參數（從 `$ARGUMENTS` 解析，順序不拘）

- `--lng <code>` 或 `--lng=<code>`：commit subject/body、repo description、PR title/body 的語言。接受 BCP-47 代碼（`zh`、`ja`、`de`，不分大小寫）或自然語言名稱（`繁中`、`日文`、`Japanese`）
  - 未給 → **英文**
  - 無法辨識或缺值 → 一行提示，**退回英文**，繼續；不中止
  - `zh` → 繁體中文（`zh-cn`/`簡中` → 簡體中文）
- `--pr`：push 後開 PR；未給 → **不建分支、不開 PR**
- `--merge`：隱含 `--pr`；PR 建立後，等必要檢查通過，squash merge 進預設分支，刪分支（本地 + 遠端），切回預設分支並同步；未給 → PR 保持開啟
- 其他未知 token → 一行提示，忽略；不中止
- 不論語言：`type`、`scope`、`Co-Authored-By` trailer、分支名**一律英文**

立即依序執行，不需確認：

## 流程

1. `git status`；工作樹乾淨 → 回報 「無變更可推送」 並停止
2. `git diff` + `git diff --staged`；讀完整變更
3. `git log -5 --oneline` 看近期 commit 風格
4. 依下方**固定格式**產生 commit message（先於建分支；分支名需要它）
5. **`--pr`/`--merge`**：以 `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` 取得預設分支；目前分支 == 預設分支 → `git switch -c <type>/<slug>`（slug = scope + 英文 subject 關鍵字，kebab-case，≤40 字元；`--lng` 非英文時仍用英文）
6. `git add .`
7. `git commit -m "<header>" -m "<body>" -m "Co-Authored-By: <當前模型全名> <noreply@anthropic.com>"`（恰三個 `-m`；trailer 必加；`<當前模型全名>` 來源見 footer）
8. `git push`；目前分支無 upstream → `git push -u origin HEAD`
9. **`--pr`/`--merge`**：對目前分支執行 `gh pr view`；PR 已存在 → 回報既有 URL，不重建；不存在 → `gh pr create --base <default branch> --title "<commit header>" --body "<body>"`；body = commit body 條列 + 空行 + `🤖 Generated with [Claude Code](https://claude.com/claude-code)`，語言依 `--lng`；回報 PR URL
10. **僅 `--merge`**（既有 PR 也一併 merge）：
    1. 等必要檢查：`gh pr checks <PR number> --required --watch --fail-fast`（Bash timeout 600000 ms）。檢查尚未註冊（"no checks reported"）→ 等約 10 秒重試，總計 ≤60 秒；仍無 → repo 無必要檢查，繼續。任一檢查失敗 → 停止，回報失敗檢查名稱 + URL + PR URL，留在 feature 分支。逾時仍 pending → 回報 PR URL，留在 feature 分支
    2. `gh pr merge <PR number> --squash --delete-branch --subject "<commit header>"`
    3. `git switch <default branch>`（`gh` 已切換則略過）+ `git pull --ff-only`
    4. `git fetch --prune`；本地分支仍在 → `git branch -D <branch>`
    5. 回報已 merge 的 PR URL、已刪分支名、目前分支 `<default>` + HEAD short sha
    6. `gh run list --commit <HEAD sha> --json name,status,url` → 回報 merge 觸發的 workflow run（部署等）；run 可能數秒後才出現，不等其完成
11. Repo description 檢查（下一節）

步驟 1–10：任何非零 exit → 立即停止，回報完整 stderr，**不嘗試修復**。步驟 10 檢查通過後 merge 被擋（review / 衝突 / 其他政策）→ 回報 stderr + PR URL，留在 feature 分支，不重試，不用 `--admin`/`--auto`。步驟 11 失敗（非 GitHub、`gh` 未登入、無權限）→ 僅提示，**不算整體失敗**——commit/push 已完成。

## Repo Description 維護

- 前提：`gh repo view --json description,url` 成功；否則一行提示 「略過 description 檢查：<原因>」
- 符合任一條即需更新：
  - description 為空
  - 語言 ≠ 目標語言（`--lng`，預設英文）
  - 內容明顯不符 repo 實際用途（先以 README.md 第一段、本次 diff、頂層 `git ls-files` 判斷；僅當本次變更改變專案定位或新增重大功能才算）
- 無需更新 → 回報 「description 已同步，未改動」；不為改而改
- 需更新 → 產生新 description：一句話，≤350 字元，無 emoji，英文結尾不加句號，說明專案是什麼/做什麼；`gh repo edit --description "<new>"`；回報舊 → 新

## Commit Message 固定格式

### 結構

```
<type>(<scope>): <subject>

- <變更點 1>
- <變更點 2>
- <變更點 3>

[Refs: #issue 或 BREAKING CHANGE: 說明]（選填）
```

### 欄位規則

**type（必填，小寫英文，從表中擇一）**

| type       | 使用時機                                                         |
| ---------- | ---------------------------------------------------------------- |
| `feat`     | 新功能                                                           |
| `fix`      | 修 bug                                                           |
| `docs`     | 僅文件變更（README、註解、JSDoc 等）                             |
| `style`    | 僅格式、不改邏輯（空白、分號、排版）                             |
| `refactor` | 重構，外部行為不變                                               |
| `perf`     | 效能優化                                                         |
| `test`     | 新增或修改測試                                                   |
| `build`    | 建置系統、依賴變更（package.json、Dockerfile 等）                |
| `ci`       | CI/CD 設定（GitHub Actions、GitLab CI 等）                       |
| `chore`    | 雜項，不動 src 或測試                                            |
| `revert`   | 回復先前 commit                                                  |

**scope（選填，小寫英文）**

受影響的模組/檔案區域/功能，如 `auth`、`api`、`ui`、`db`、`config`。
跨多模組且無共同 scope → 省略 scope；header 變 `<type>: <subject>`。

**subject（必填，預設英文；給 `--lng` 時用該語言）**

- 動詞開頭；具體說明改了什麼——讀 log 的人看不到 diff，每個字都要帶資訊
- 英文：祈使句（`add`，不用 `adds`/`added`），首字母小寫，≤50 字元
- 非英文（CJK 等）：≤50 字
- **結尾不加句號**
- 不重複 type 語意（type 是 `fix` → subject 不寫 `fix`）

✅ 正確：`feat(auth): add automatic JWT token refresh`
✅ 正確：`fix(api): handle null user.email crash`
❌ 錯誤：`feat: update some stuff.`（無資訊量、結尾有句號）
❌ 錯誤：`fix(api): fix API bug`（重複 type 語意）

**body（必填，預設英文；給 `--lng` 時用該語言；條列）**

- header 與 body 之間**必須空一行**
- 每點以 `- ` 開頭
- 每點一個具體變更：做了什麼，必要時補原因
- 每行 ≤72 字元（CJK：72 字）；較長則換行
- 變更多 → 依模組合併同類項，body 一眼可掃；此時已執行完畢 → 如實撰寫，**事後不拆 commit**

**footer**

- **必加 trailer**：`Co-Authored-By: <當前模型全名> <noreply@anthropic.com>`（每個 commit；作為第三個 `-m` 傳入；不得省略；完整模型名取自本 session 的系統資訊）
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

## 禁止事項

- commit message 與 repo description 不用 emoji（PR body 的 `🤖 Generated with …` trailer 為必要，例外）
- 英文 subject：不用過去式或第三人稱單數（`added`/`adds` → 一律 `add`）
- subject 不放檔名（放 body，或以 scope 表達）
- 不 force push
- `--merge`：不用 `--admin` 繞過 branch protection
- diff 含 secret、API key、密碼或類似敏感資料 → **立即停止並警告使用者**；不 commit
