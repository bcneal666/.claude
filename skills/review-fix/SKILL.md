---
name: review-fix
description: 在本機 dev server 上對目前專案未提交的變更集做功能測試，再執行 /code-review、修正其發現，並重複審查直到收斂（最多 3 輪）。適用於任何專案（自動偵測 dev 指令、port 與 URL）。可選擇 /code-review 的 effort 等級（預設 high）。
argument-hint: "[low|medium|high|xhigh|max]"
disable-model-invocation: true
---

對目前變更集（cwd 專案）做功能測試，再進入審查直到收斂。
留在主對話，勿 fork——你持有變更背後的意圖，全新 subagent 沒有，修正需要該脈絡。

## 參數

收到：`$ARGUMENTS`（空白 = 無）。據此決定審查等級：

- `low` / `medium` / `high` / `xhigh` / `max` → 該等級；無 → `high`。一律明確傳入等級：未帶等級的 `/code-review` 會沿用上次輸入的等級。
- `ultra` → 勿啟動：雲端審查由使用者觸發且計費，你無法啟動。請使用者自行輸入 `/code-review ultra`，然後停止。
- 其他 token → 一行提示，忽略。

## 步驟

1. `git status --short` + `git diff --stat`。無任何修改、暫存或未追蹤檔案 → 告知後停止。有 unmerged paths 或 merge/rebase 進行中 → 告知後停止。

2. **功能測試（僅第 1 輪——在任何審查之前）。** diff 僅涉及文件、`.claude/`，或無 runtime 影響的設定 → 跳過，並說明。
   輔助：`${CLAUDE_SKILL_DIR}/scripts/lib.mjs`。
   1. **偵測。** 先讀專案 `CLAUDE.md`（優先於以下一切）。
      套件管理器依 lockfile；dev 指令取自 `package.json` scripts（`dev`，否則 `start`）；預期 port 取自該 script、framework 設定，否則用 framework 預設值。
      無 dev server 概念（library/CLI）→ 跳到 sub-step 5。
   2. **Server。** 預期 URL 已有回應 → 僅當它服務的是本專案（頁面標題，或 diff 觸及的 route 相符）才重用；
      絕不停止被重用的 server。否則在背景啟動 dev 指令並等待最多 90s；URL = 它印出的那個
      （`Local: http://…`），因 port 被占用時會移動。時限內無回應 → BAD 並附 log 尾段，跳到 sub-step 5。
      跨輪保持執行；在 step 6 摘要之前停止它（background task stop 或其 PID，然後確認 URL 不再回應），提早停止時亦同。
      絕不使用 pattern 會比對到自己 shell 的 `pkill -f`。
      Migration、seed data、env 或 typegen 步驟：依 CLAUDE.md；僅限本機資源。
   3. **專案檢查。** 每個 script 都以 `BASE=<url>` 執行；否則 `lib.mjs` fallback 為 `:3000`。
      專案內存在 `.claude/review-fix/` → 先 `status.mjs`（exit 2 = server 或本機資料未就緒；依 CLAUDE.md 修正），
      再 `smoke.mjs`。否則在 scratchpad 寫一次性 script，把 `lib.mjs` 複製到旁邊，
      `import { check, get, json, html, meta, report } from "./lib.mjs"`（絕對路徑 import 在 Windows 會壞）。
   4. **測 diff 改動的部分：** 首頁及 diff 觸及的每個 route/API
      （從變更檔案找出）：happy path、無效輸入案例、auth gate
      （若存在）。UI 變更 → 加瀏覽器檢查（`agent-browser` CLI；先 `agent-browser skills get core` 查用法），寬度 375 與 1440。
      絕不從這裡動 production 資料庫、storage 或 deploy。
   5. **靜態檢查。** 執行存在的 `typecheck` / `lint` / `test` package scripts（無 dev server 時另加 `build`），non-watch（如 `vitest run`）。
   6. 各檢查回報 OK/BAD。step 3 之前先分流每個 BAD：先手動重現（curl 或瀏覽器）。
      檢查本身有誤 → 修檢查。由 diff 造成 → **真問題**，修正並重跑該檢查。
      僅在 diff 未觸及的程式碼失敗 → pre-existing，僅回報。

3. 以 `code-review` skill 執行，args = 僅等級。勿加 `--fix`（先自己讀 findings），勿加 `--max-findings`（會沿用到之後的執行）。

4. 每個 finding 歸入一類：
   - **真問題**（`important`；verdict `PLAUSIBLE` → 先讀程式碼確認）→ 自行修正。你知道程式碼為何如此寫；`--fix` 不知道。
   - **既存問題**（`pre_existing`）→ 在變更集之外：回報，不修。
   - **真但瑣碎**（`nit`）→ 記入摘要，繼續。
   - **無法驗證／疑似誤報** → 不修，不阻擋迴圈；收集到 step 6。絕不默默順從你不相信的 finding。

5. step 4 有任何改動 → 重跑這些修正所觸及的檢查（server 程式碼有改時至少專案 status/smoke 檢查，觸及檔案的靜態檢查），然後回到 step 3。
   收斂 = 一輪內無新的真問題。上限 3 輪。第三輪後仍有 blocker → 停止，回報未解決項目。勿猜測修法。

6. step 4 中有爭議的 finding → 先以一個問題詢問使用者；核准的修正在上限內再跑一輪。
   然後停止你啟動的 server，印出摘要，交還控制權：
   - 審查等級；server URL，是自行啟動或重用
   - 執行的功能與靜態檢查（OK/BAD），是否植入 test data
   - 所花輪數
   - 修正了什麼
   - 刻意略過的 findings（pre-existing、瑣碎、有爭議）及原因

## 規則

- 絕不 `git commit` 或 `git push`。skill 以交還控制權結束。
- 絕不為了讓 finding 消失而弱化測試或刪除 assertion。
- 僅限本機：絕不執行遠端資料庫/storage 寫入或 deploy 指令。Test data 只進本機資源。
- 同一 finding 撐過兩輪修正 → 停止迴圈，升級給使用者——你誤讀了問題。
