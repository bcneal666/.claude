# Repo Description 維護（step 11）

- 前提：`gh repo view --json description,url` 成功；否則一行提示 「略過 description 檢查：<原因>」
- 符合任一條件即需更新：
  - description 為空
  - 語言 ≠ 目標語言（`--lng`，預設 English）
  - 內容明顯與 repo 實際用途不符（先依 README.md 第一段、本次 diff、頂層 `git ls-files` 判斷；僅當本次變更改變專案定位或新增主要功能時才算）
- 無需更新 → 回報 「description 已同步，未改動」；勿為改而改
- 需更新 → 生成新 description：一句話，≤350 chars，無 emoji，English 結尾不加句號，說明專案是什麼/做什麼；`gh repo edit --description "<new>"`；回報 舊 → 新
