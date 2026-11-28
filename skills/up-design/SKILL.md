---
name: up-design
description: "對目前的前端專案執行一輪 UI 診斷與修整：找出版面、行動端、效能與動畫問題並寫入報告，直接修正，再把使用者的規則記錄到 lint、DESIGN.md 或專案 skill。"
argument-hint: "[--full] [--m]"
disable-model-invocation: true
---

# up-design

對目前專案執行一輪可重複的 UI 流程：診斷 → 寫報告 → 直接修正 → 驗證 → 沉澱規則。使用者不定時手動觸發；每輪都承接上一輪狀態，故增量作業，並累積效能基準與規則。

順序理由：版面不穩時調動畫是白工，故**先修壞掉的**；多餘動畫會干擾稽核與效能量測，故**再移除多餘的**；最後才**補真正需要的動效**。規則沉澱放最後，讓下一個 agent 一開始就知道專案偏好，不重蹈覆轍。

## Files

`<skill-dir>` = 本 SKILL.md 所在目錄。執行所需檔案皆隨本 skill 附帶；讀取時機為名稱該檔的步驟。

| 檔案                                | 讀取時機                 | 用途                                             |
| ----------------------------------- | ------------------------ | ------------------------------------------------ |
| `references/design-judgment.md`     | step 1.4                 | 整輪的判斷基準                                   |
| `references/ux-rules.md`            | step 1.6                 | 13 節 UX 檢查清單（診斷基準）                    |
| `references/criteria.md`            | step 1.6                 | 靜態設計標準                                     |
| `references/stress-mobile.md`       | step 2.5–2.7             | 最壞情況資料、行動端修正（`--m`）、Sonner 檢查   |
| `references/motion-audit.md`        | step 2.8–2.11, 4.2       | 效能、移除、既有動效稽核、缺少的動效             |
| `references/motion-build.md`        | step 3.3                 | 實作動畫                                         |
| `references/motion-review.md`       | step 4.1                 | 審查本輪動畫                                     |
| `references/rule-routing.md`        | step 5                   | 把使用者的修正轉成 lint / DESIGN.md / 專案 skill |
| `references/modern-web-guidance.md` | step 3，修正平台功能之前 | 搜尋並取得最新平台指南、報告格式                 |
| `assets/*-template.md`              | 依名稱                   | 報告、效能基準、DESIGN.md、專案 skill 骨架       |

腳本僅用 Node.js 18+ 內建模組；Windows 與 Linux 皆可，專案內任何目錄皆可執行。`scripts/scope.mjs` 只預覽範圍、不建立檔案（`start_run.mjs` 已含其邏輯）。

## Arguments

順序不拘、以空格分隔，例：`/up-design m`、`/up-design --full --m`。依使用者所給原樣傳給腳本；腳本接受這些形式。

| 參數     | 意義                                                                                     | 別名   |
| -------- | ---------------------------------------------------------------------------------------- | ------ |
| `--full` | 強制全專案檢查，不做增量                                                                 | `full` |
| `--m`    | 專案有行動端需求：套用 `stress-mobile.md` 的行動端章節，其餘每個步驟也要顧及觸控與小螢幕 | `m`    |

自然語言等價者視同參數：「全面檢查」 = `--full`，「要顧手機版」 = `--m`。未帶 `--m`/`m` 時，假設無行動端需求；不要猜：猜錯會在桌面專案白做工，或悄悄漏掉行動端問題。

## Flow

### 1. Prepare

1. 在專案內執行（腳本會找 git root；非 git → 目前目錄），並帶入使用者的參數：

   ```bash
   node <skill-dir>/scripts/start_run.mjs [--full|full] [--m|m]
   ```

   它會建立 `./up-design/`（首次執行或目錄不存在時），確保該目錄未被 `.gitignore` 忽略，決定本輪的模式與範圍，並用模板建立本輪報告。輸出 JSON：`project_root`, `is_git`, `head`, `mode`, `reason`, `mobile`, `uses_sonner`, `last_run`, `file_count`, `files`, `created_state_dir`, `gitignore`（`status`, `actions`, `warnings`）, `report_path`。之後的工作都在 `project_root` 下進行。明顯與 UI 無關的 `.ts` / `.js` 檔：略過。

2. `gitignore.status` 為 `still_ignored` → 依 `warnings` 手動修正 `.gitignore`，並記入報告。
3. 用一句話告知使用者模式、原因與檔案數，然後直接開始，不等確認：手動觸發即代表同意。
4. 讀 `references/design-judgment.md`，作為整輪的判斷基準。
5. 讀專案既有規則：lint 設定、`DESIGN.md`、`.claude/skills/design-*/`、`CLAUDE.md` / `AGENTS.md`、`.claude/rules/*.md`、design tokens（CSS variables、tailwind config）。整輪遵守；與 references 的預設衝突時，專案規則優先，因為那是使用者對本專案的明確偏好。
6. 讀 `references/ux-rules.md` 與 `references/criteria.md`。它們是診斷基準，不是專案規則（見 Boundaries）。優先順序：專案規則 > ux-rules > modern-web-guidance > criteria 與其他 references；衝突列入報告。

**Screen verification**（step 2 為基準、step 4 為最終；用同一方法才能比較）：用 `agent-browser` CLI；先執行一次 `agent-browser skills get core` 取得其最新用法。偵測 dev 指令與 port（`package.json` scripts），背景啟動並開啟。在 375 / 768 / 1024 / 1440px 擷取整頁，並模擬 `prefers-reduced-motion: reduce`（或等動畫停止），避免拍到動畫中途。另檢查 320px 無水平捲動（僅失敗時截圖）。在 375px 開啟專案有的每種 overlay（Select、DropdownMenu、Dialog/AlertDialog、日期、Popover、篩選、通知、側邊欄），各擷取一張。截圖存到 scratchpad。無法啟動或 overlay 打不開 → 退回只看程式碼，並將受影響項目標為「未驗證（無畫面）」。沒有截圖的「看起來更好」不算已驗證的修正。

**modern-web-guidance**：修正涉及撰寫使用平台功能的 HTML / CSS / client JS → 先依 `references/modern-web-guidance.md` 查指南（範圍、略過情形、報告區段都在該檔）；把重點帶進 step 3 的動畫工作。

`file_count` 為 0 → 略過 step 2–4，進 step 5 規則檢查，再收尾。

### 2. Diagnose

只找問題；不編輯任何檔案。先通盤盤點再動手，修正順序才合理，也不會在證明可刪之前就先改它。下列 references 僅供診斷：只列出發現與修法，絕不套用。

1. 畫面基準：依「Screen verification」擷取，作為 step 4 的基準。
2. **UX rules check**：依 `references/ux-rules.md` 的 13 節，**僅檢查範圍內檔案**；每節一個判定：
   - `pass` — 一行證據
   - `gap` — `file:line` 或截圖區域、違反的規則、含數值的修法、影響高/中/低（high/medium/low）
   - `N/A` — 無此情境，或超出範圍
   - `未驗證` — 需真機或線上流量（軟鍵盤遮擋、sticky hover、tap delay、CWV p75）；絕不可宣稱 pass

   方法：grep/讀程式碼（`100vh` / `h-screen`、`user-scalable=no`、無 `isComposing` 防護的 Enter 送出、用 `onClick` + `router.push` 而非 `<a>`、可點擊的 `div`、無 `aria-label` 的圖示按鈕、缺少 `inputmode` / `autocomplete`、浮動 Select / Menu / Popover 無行動端 Drawer 分支、對可復原的操作用確認 dialog、「確定」「OK」按鈕文字、`target="_blank"` 無 `rel`、動作只在 hover 時顯示、缺少 `viewport-fit=cover` / safe-area），加上 screen-verification 的截圖。範圍外的問題只寫進報告。
   - §7（手勢）與 §12（動效）的 gap 併入動畫修正；其餘併入「穩定性」。與 `stress-mobile.md` 行動端章節重疊的項目只列一次。
   - **結構性修正**（新路由、Dialog/Drawer 包裝、新元件、新依賴）不套用；列入「未解決」並附建議做法。

3. **Static design**：依 `references/criteria.md` 評分。「Auto-fix」項併入「穩定性」；「report-only」項（原創性、視覺層級、色彩比例、版面）寫進報告的「設計建議（未套用）」。與專案規則衝突的標準不算 gap；在報告中列為衝突。
4. **shadcn audit**（有條件）：僅當專案根目錄有 `components.json` 且 `package.json` 的 dependencies 含 `react` 才執行；否則註記「非 shadcn 專案，略過」。在專案根目錄執行 `npx -y @shadscan/cli --json`（勿 `cd`），輸出存到 scratchpad，不論 exit code 都解析 JSON；指令失敗（離線、結構不支援）→ 記錄原因後繼續。類別：foundation, interaction, states, accessibility, forms, production-polish。不得使用 `--apply`、`setup`、`mcp`，也不得安裝其 hook、skill 或 MCP：本步驟唯讀。每項 = 一個 gap，含規則 id 與 `file:line`；critical/high → 高優先，medium → 中，low → 低；與其他診斷重複者只列一次；動畫項併入動畫修正。
5. **Worst-case data**（`stress-mobile.md` §1）：溢出、截斷、空狀態、極端資料。範圍內沒有渲染資料的元件時略過。
6. **Mobile**（`stress-mobile.md` §2）：僅當 `mobile` 為 true。
7. **Sonner**（`stress-mobile.md` §3）：僅當 `uses_sonner` 為 true。shadcn/ui 的 toast 元件包裝 Sonner，故 shadcn 專案通常符合。
8. **Performance**（`motion-audit.md` §A）：量測並與 `up-design/perf-baseline.md` 比較。
9. **Removal proposals**（`motion-audit.md` §B）：列出要移除的動畫；僅提案。「保留但做得不好」的項目交給下一步。範圍內無動畫時略過。
10. **Audit of existing motion**（`motion-audit.md` §C；範圍內無動畫時略過）：輸入 =「保留但做得不好」的項目、目前已排入的動畫 gap，以及 ux-rules §7 與 §12。
11. **Missing motion**（`motion-audit.md` §D）：僅 full 模式，因為找出缺少的動效需要整個 app。輸入 = 已排入的「缺少動效」項目（含 shadscan 的 interaction / states）與 ux-rules §7 與 §12。
12. 把診斷結果填入報告區段「UX 規則」「診斷」「設計建議（未套用）」，依優先順序排成修正清單。

### 3. Fix and optimize

診斷區段寫完後立刻執行；不詢問使用者：他們要的是一次到位的流程，報告是供事後檢視的紀錄，不是請求核准。

1. 依清單順序執行：穩定性（UX 規則 gap、靜態設計 auto-fix 項、非動畫的 shadscan 項）→ 移除動畫 → 效能 → 調整並新增動畫。只編輯範圍內檔案；使用專案既有 tokens（專案用 tokens → 不寫死顏色）。涉及平台功能的修正先查「modern-web-guidance」。
2. 穩定性修正不碰動畫或 transition 程式碼；移除只做減法，不新增或重調動效，讓每個階段都能單獨檢視。需要動畫函式庫、新依賴、新路由或新元件的項目不做；列入「未解決」。廣告版位遵守 AdSense 政策：不得移動廣告區塊，或把它偽裝成內容、誘導點擊。
3. 依 `references/motion-build.md` 實作動畫。彈簧與物理感動效只用在真正需要處，避免整個 UI 過度彈跳。Toast 修正依 `stress-mobile.md` §3。CSS 不足而需要函式庫時，不安裝；列入「未解決」。
4. 獨立的清單項目很多 → 可平行委派給 sub-agent。

### 4. Verify

1. 依 `references/motion-review.md` 審查本輪動畫（本輪未新增或更動動畫則略過）：只審本輪新增或更動的動畫，對照 ux-rules §7 與 §12。被擋下 → 回 step 3，最多重試 2 次；仍不過 → 列為未解決。不得為過關而降低標準：報告裡誠實的「未解決」勝過假通過。
2. 依 `motion-audit.md` §A 重新量測效能。退步 → 列入報告；整體無退步 → 依 `assets/perf-baseline-template.md` 更新 `up-design/perf-baseline.md`（首次寫入由模板建立），讓下一輪的基準只會進步。
3. 畫面驗收：依「Screen verification」重新擷取，與 step 2 基準比較本輪造成的版面退步。退步 → 修一次並重新擷取；仍退步 → 列為未解決，不再繼續迴圈。shadscan 項已修 → 重跑同一指令，比較分數與剩餘項目。沒有截圖能力 → 標為「未驗證（無畫面）」。
4. 專案有 lint 或 typecheck 指令 → 各執行一次。修正本輪造成的錯誤；既有錯誤不處理，只記入報告。

### 5. Distill rules

每輪都可能暴露專案尚未寫下的偏好。把它們寫成規則，讓下一輪與日常 agent 自動遵守。

1. 依 `references/rule-routing.md` 蒐集、過濾、泛化並選定位置。直接寫入、不停下來等核准：使用者要的是一次到位的流程，每項規則變更都列在報告中供事後檢視與還原。
2. 規則來源僅限使用者：本輪的修正、編輯、確認過的選擇，以及附在觸發上的偏好。`motion-review` 擋下的原因與反覆出現的問題是 agent 的判斷；不得寫入，只列在「建議規則（未寫入）」。使用者未表達偏好而沒寫任何規則的一輪是正常的。
3. 位置：違規可由比對程式碼抓到的 → **lint**，並在 **DESIGN.md** 加一行記錄原因；其餘 → 對應的 **DESIGN.md** 區段；區段太長且只與部分任務相關 → 移到**專案 skill**。lint 優先，因為機器檢查每次都會跑，不靠 agent 記得。
4. 僅當本輪寫入了 DESIGN.md：確保 `CLAUDE.md` 或 `AGENTS.md` 指向它（見 `references/rule-routing.md` section 6）；缺少就補上指標，否則沒有 agent 會讀這些規則。沒寫任何規則 → 不建立 DESIGN.md、CLAUDE.md 或 AGENTS.md。
5. 規則必須具體可執行。「動畫要自然」不會改變下一個 agent 的行為；「modal 進場用 ease-out、duration ≤200ms」才會。

### 6. Wrap up

1. 完成報告其餘區段。
2. 執行：

   ```bash
   node <skill-dir>/scripts/finish_run.mjs --mode <quick|full>
   ```

   它會把目前 HEAD hash 與時間寫入 `up-design/last-run.json`。

3. 回覆使用者：報告路徑、修正數量、未解決項目、新增或修正了哪些規則及位置。

## Boundaries

每項邊界都是為了讓使用者能檢視並信任一次到位的流程做了什麼。

- **不做 git 寫入操作**（commit、branch、stash、merge、push）：使用者自行檢視 working tree 並 commit；報告依階段列出變更檔案，方便拆分 commit。
- **只編輯範圍內檔案。** 例外為本 skill 維護的檔案：lint 設定、`DESIGN.md`、`.claude/skills/design-*/`、`CLAUDE.md` / `AGENTS.md`（僅指向 DESIGN.md 的那一行指標）、`.gitignore`、`./up-design/`。範圍外的問題只寫進報告 — quick 模式下動到使用者沒預期的檔案，會讓本輪變更難以檢視。
- **`./up-design/` 保持納入版控**，規則與基準才能跨機器、跨成員共享；不得加進 `.gitignore`。`last-run.json` 只由 `finish_run.mjs` 寫入，不得手改，因為手改會破壞 quick/full 的判斷；舊報告是歷史，不得刪除。
- **不新增依賴**：不加動畫函式庫、lint 工具、bottom-sheet 或手勢套件；shadscan 以 `npx -y @shadscan/cli` 唯讀執行。需要這些的項目列入「未解決」。
- **ux-rules 與 criteria 是診斷基準，不是使用者偏好**：不得寫入 DESIGN.md 或 lint；只有使用者表達過的偏好才走 step 5。
- **畫面驗證不是通過的前提**：沒有 dev server 或截圖能力 → 退回只看程式碼並標為「未驗證（無畫面）」；不得宣稱已驗證。
- 時間一律 Asia/Taipei (UTC+8)。
