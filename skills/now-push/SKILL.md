---
name: now-push
description: 自動以固定格式的英文 commit message 執行 git add + commit + push，並一併推送目前分支上所有未推送的本機 commit；--lng 設定語言，--pr 開 PR，--merge 開 PR、等待 required checks、squash merge、刪除分支並回到預設分支；同時檢查並更新 GitHub repo description
argument-hint: "[--lng <zh|ja|...>] [--pr] [--merge]"
disable-model-invocation: true
---

一次完成目前 repo（cwd）的 commit 與 push，不需確認。使用者是刻意輸入此指令，故直接執行；下方 guards 在執行不安全時會中止。

## 參數（從 `$ARGUMENTS` 解析，順序不拘）

- `--lng <code>` 或 `--lng=<code>`：commit subject/body、repo description、PR 標題/內文的語言。接受 BCP-47 code（`zh`、`ja`、`de`，不分大小寫）或自然語言名稱（`繁中`、`日文`、`Japanese`）
  - 未提供 → **English**
  - 無法辨識或缺值 → 一行提示，**fallback 為 English**，繼續；勿中止
  - `zh` → 繁體中文（`zh-cn`/`簡中` → 簡體中文）
- `--pr`：push 後開 PR；未提供 → **不建分支、不開 PR**
- `--merge`：隱含 `--pr`；開 PR 後，等待 required checks 通過，squash merge 進預設分支，刪除分支（本機 + 遠端），切回預設分支並同步；未提供 → PR 保持開啟
- 其他未知 token → 一行提示，忽略；勿中止
- 不論語言：`type`、`scope`、`Co-Authored-By` trailer、分支名稱**一律 English**

## 檔案

`<skill-dir>` = 本 SKILL.md 所在目錄。於指名它的步驟再讀對應 reference。

| 檔案                             | 讀取時機                              | 用途                                              |
| -------------------------------- | ------------------------------------- | ------------------------------------------------- |
| `references/commit-format.md`    | Step 4，及 step 9 的 PR 標題          | 固定 commit 格式：結構、type 清單、欄位規則、範例 |
| `references/pr-merge.md`         | Steps 5、9、10，僅限 `--pr`/`--merge` | 建分支、建立 PR、等待 checks、squash merge        |
| `references/repo-description.md` | Step 11                               | 何時及如何更新 GitHub repo description            |

## 流程

1. `git status` + 收集目前分支上的 **unpushed commits**（probe 指令不受下方停止規則約束）：
   - 有進行中的操作 → 先於一切動作前停止：`git rev-parse -q --verify MERGE_HEAD`、`CHERRY_PICK_HEAD`、`REVERT_HEAD`（操作進行中時各自印出 ref，否則 exit 1）、`git diff --name-only --diff-filter=U`（unmerged paths），以及 `git status` 文字 "rebase in progress" / "You are in the middle of an am session"。任一命中 → 回報該操作與 unmerged paths，告知使用者先完成或中止，不 commit、不 push。step 6 的 `git add -A` 會把含衝突標記的檔案標為已解決並推出去
   - upstream = `git for-each-ref --format='%(upstream:short)' "$(git symbolic-ref -q HEAD)"`（exit 0；輸出為空 = 無 upstream）
   - 有 upstream → unpushed = `git log --oneline <upstream>..HEAD`
   - 無 upstream → unpushed = `git log --oneline HEAD --not --remotes`
   - 工作樹乾淨**且**無 unpushed commits → 回報 「無變更可推送」 並停止
   - 工作樹乾淨但有 unpushed commits → 跳過 working-tree diff、commit message 生成、`git add`、`git commit`（step 2 的 working diff、4、6、7）；進入 step 5（既有 commit 原樣推送）
2. `git diff` + `git diff --staged`；完整閱讀變更。另列出 untracked 檔案（`git ls-files --others --exclude-standard`）並閱讀——step 6 的 `git add -A` 會 commit 它們，`git diff` 不會顯示。有 unpushed commits → 另讀 `git diff <base>..HEAD`（base = upstream，否則 `origin/<default branch>`），供 secret 檢查與 PR 內容使用
3. `git log -5 --oneline` 看近期 commit 風格。另於存在時讀取 repo 的 commit 規則：commitlint 設定（`commitlint.config.*`、`.commitlintrc*`、`package.json` 的 `commitlint` key）與 `CONTRIBUTING.md`。其允許的 type、scope 或 header 長度覆蓋固定格式的對應欄位，因為 commit-msg hook 會拒絕該 commit 並使執行中止；其餘維持固定格式
4. 以**固定格式**（`references/commit-format.md`）生成 commit message（在建分支之前；分支名稱需要它）
5. **`--pr`/`--merge`**：依 `references/pr-merge.md` § Step 5 建立 feature branch
6. `git add -A`
7. `git commit -m "<header>" -m "<body>" -m "Co-Authored-By: <當前模型全名> <noreply@anthropic.com>"`（恰好三個 `-m`；trailer 依 footer）
8. `git push`（一律推整個目前分支，絕不用單一 sha 或 refspec）；目前分支無 upstream → `git push -u origin HEAD`。回報已推送的 commits（short sha + header；標示本次建立的那個）
9. **`--pr`/`--merge`**：依 `references/pr-merge.md` § Step 9 開啟或重用 PR；回報 PR URL
10. **僅 `--merge`**（既有 PR 也會 merge）：依 `references/pr-merge.md` § Step 10 等待 required checks、squash merge、清理並回報
11. Repo description 檢查（`references/repo-description.md`）

Steps 1–10（step 1 probes、step 5 `--is-ancestor` guard、step 9 `gh pr view` probe（exit 1 = 無 PR）、step 10.1 "no checks reported" 重試除外——其非零 exit 只用來選擇分支）：任何非零 exit → 立即停止，回報完整 stderr，**勿嘗試修復**。commit hook 失敗也算：回報並停止，絕不以 `--no-verify` 重試。Step 10 在 checks 通過後 merge 被擋（review / conflict / 其他 policy）→ 回報 stderr + PR URL，停留在 feature branch，不重試，不用 `--admin`/`--auto`。Step 11 失敗（非 GitHub、`gh` 未登入、無權限）→ 僅提示，**不算整體失敗**——commit/push 已完成。

## 禁止

- commit message 或 repo description 不得含 emoji（PR body trailer `🤖 Generated with …` 必須有，不在此限）
- English subject：不得用過去式或第三人稱單數（`added`/`adds` → 一律 `add`）
- subject 不得含檔名（放 body，或以 scope 表達）
- 禁止 force push
- `--merge`：不得用 `--admin` 繞過 branch protection
- 既有 unpushed commits：原樣推送；絕不 amend、squash、reword，或改寫成固定格式
- Diff（工作樹**或**任何 unpushed commit）含 secret、API key、密碼或類似敏感資料 → **立即停止並警告使用者**；不 commit，不 push
- 禁止 `--no-verify`、`--amend`（任何 commit，含本次執行的）、`git reset --hard`、`git rebase`、`git config` 指令：hooks 與歷史屬於 repo，本次執行只在其上新增一個 commit
- 禁止 commit-message 檔案（`-F`）：維持三個 `-m` 的形式
