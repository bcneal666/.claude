# PR 與 merge 步驟（`--pr` / `--merge`）

僅在 `--pr`/`--merge` 時讀取。Step 編號對應 `SKILL.md` 的 Flow；其停止規則在此同樣適用。

## Step 5 — 分支

以 `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` 取得預設分支；目前分支 == 預設分支 → `git switch -c <type>/<slug>`（slug = scope + English subject 關鍵字，kebab-case，≤40 chars；即使 `--lng` 不是 English 也用 English；本次未建立新 commit → 用最新 unpushed commit 的 header，有多個則用一個彙總 header）。切換後，若預設分支有 unpushed commits、`origin/<default>` 存在，且 `git merge-base --is-ancestor origin/<default> <default>` 成功 → `git branch -f <default> origin/<default>`（commits 留在新分支；少了這步，之後的 `git pull --ff-only` 會 diverge）；否則跳過

## Step 9 — PR

對目前分支執行 `gh pr view`；PR 已存在 → 回報既有 URL，不重建；不存在 → `gh pr create --base <default branch> --title "<title>" --body "<body>"`；單一 commit → 標題/內文 = 該 commit 的 header/body；多個 commits → 標題 = 一個彙總的固定格式 header，內文 = 各 commit header 清單 + 合併後的重點 bullets；內文以空行 + `🤖 Generated with [Claude Code](https://claude.com/claude-code)` 結尾，語言依 `--lng`；回報 PR URL

## Step 10 — merge（僅 `--merge`，既有 PR 也會 merge）

1. 等待 required checks：`gh pr checks <PR number> --required --watch --fail-fast`（Bash timeout 600000 ms）。checks 尚未註冊（"no checks reported"）→ 等約 10s 後重試，累計 ≤60s；仍無 → repo 沒有 required checks，繼續。任一 check 失敗 → 停止，回報失敗 check 名稱 + URL + PR URL，停留在 feature branch（讓 /steward 能監看）；報告結尾加「可輸入 /steward 讓 Claude 接手修」。逾時仍 pending → 回報 PR URL，停留在 feature branch
2. `gh pr merge <PR number> --squash --delete-branch --subject "<PR title>"`
3. `git switch <default branch>`（`gh` 已切換則跳過）+ `git pull --ff-only`
4. `git fetch --prune`；本機分支仍在 → `git branch -D <branch>`
5. 回報已 merge 的 PR URL、已刪除的分支名稱、目前分支 `<default>` + HEAD short sha
6. `gh run list --commit <HEAD sha> --json name,status,url` → 回報此次 merge 觸發的 workflow runs（deploy 等）；runs 可能數秒後才出現，不必等它們結束
