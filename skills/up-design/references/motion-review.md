# Motion review

本檔用於 VERIFICATION（step 4.1）：驗證本輪新增或更動的動畫；不用於診斷或建構動效。
每個更動的動畫判定為 pass、blocked 或 note；blocked 回 step 3。

會執行但感覺遲滯、從錯誤原點出發、觸發過於頻繁或掉幀的 transition，屬於退步（regression）。

## 1. Scope

- 只審 step 3 的編輯。列出本輪「移除」「效能」「動畫」條目中的檔案，讀 `git diff -U0 -- <those files>`，保留你寫的 hunk。單純的 `git diff HEAD` 或與 last-run head 的 diff 會把使用者自己的工作也帶進來。
- 未追蹤的新檔案不在 diff 中：整份讀。
- 動效 hunk 涉及：CSS `transition*`、`animation*`、`@keyframes`、`@starting-style`、`transform*`、`clip-path`、`filter: blur`、由狀態驅動的 `opacity`、`prefers-reduced-motion`、`(hover: hover)`；Tailwind `transition-*`、`duration-*`、`ease-*`、`delay-*`、`animate-*`、`motion-safe:`/`motion-reduce:`；Motion `initial`/`animate`/`exit`/`transition`、`AnimatePresence`、`layout`/`layoutId`、`useSpring`；WAAPI `element.animate()`。
- 讀周邊程式碼以掌握脈絡（觸發、頻率）；只對更動的行下判定。同檔案中未更動的動畫已在診斷時處理。
- 純刪除視為 pass，除非留下殘缺的動畫（有進場無退場、孤立的 `@keyframes`、為已不存在的動效而留的 reduced-motion 區塊）；那就把剩下的部分算作更動。
- 範圍內沒有任何項目 → 寫「本輪無動畫變更，略過」並跳過 4.1。
- 只判斷程式碼：幀時間屬 4.2，版面退步屬 4.3。

## 2. Precedence

專案規則（lint、DESIGN.md、tokens、CLAUDE.md）> ux-rules > 本檔。更動的值若遵循已寫下的專案規則或 token 即 pass；引用該規則並把衝突列入報告。只有寫下的規則能移動門檻；「感覺還好」、你自己提供的理由、或重試次數用盡，都不行。

## 3. Checklist

### 3.1 Purpose and frequency

- 目的必須是下列之一：空間一致性、狀態指示、回饋、說明、避免突兀的變化。常見事物上的「看起來很酷」→ blocked；修法：刪除。
- 頻率與頁面轉場：見 ux-rules §12。此外：鍵盤觸發或每天 100 次以上的動作不加動畫（重複使它們感覺慢）；一天看數十次的 hover 保持極簡；罕見或首次的時刻（onboarding、慶祝）可加入愉悅感。

### 3.2 Easing

先用專案的 easing tokens。否則：

- 進場 / 退場（預設）：`cubic-bezier(0.23, 1, 0.32, 1)`
- 螢幕上移動 / morph：`cubic-bezier(0.77, 0, 0.175, 1)`
- Drawer / sheet：`cubic-bezier(0.32, 0.72, 0, 1)`
- Hover、顏色：`ease`。等速動效（跑馬燈、進度）：`linear`。Sonner 風格 toast：`400ms ease`。

Blocked：

- 任何 UI 上的 `ease-in`：它延遲了使用者注視的那一刻；200ms 的 ease-out 感覺比 200ms 的 ease-in 快。
- 刻意設計的進場、退場或移動使用裸關鍵字 `ease-out` / `ease-in-out`：內建曲線太弱（專案 token 豁免）。
- Spring bounce > 0.3。參考 spring：`{ type: "spring", duration: 0.5, bounce: 0.2 }`；bounce 0.1–0.3 屬於拖曳關閉或玩味的 UI，所以俐落的 UI（dashboard、表單）上的 bounce → note。

### 3.3 Duration

按壓回饋 100–160ms · tooltip、小 popover 125–200ms · dropdown、select 150–250ms · modal、drawer、sheet 200–500ms · toast ≤ 400ms · 行銷 / 說明性可更長。

- 超過其上限 → blocked（更短沒問題）。其他 UI 超過 300ms 而無書面理由 → blocked；180ms 的 dropdown 比 400ms 的感覺更靈敏。
- Stagger：項目間 30–80ms、不均勻（例：0 / 50 / 90ms）、每個容器一次進場、絕不阻擋互動。本輪新增的群組進場若所有項目同時動畫，或 stagger 超出這些範圍 → blocked。ux-rules §12 禁止該進場之處（列表列、分頁切換內容），修法是刪除它。

### 3.4 Origin and physicality

- `scale(0)` → blocked；沒有東西從無到有。從 `scale(0.9–0.97)` + `opacity: 0` 開始（預設 0.95）。
- 沒有初始 transform 的純淡入進場 → blocked，例外：reduced-motion 變體、backdrop/scrim，以及依 ux-rules §12 的純淡入頁面轉場。
- Popover、dropdown、tooltip 使用 `transform-origin: center` → blocked；要從觸發器縮放：`var(--transform-origin)`（Base UI）、`var(--radix-<component>-content-transform-origin)`（Radix/shadcn）。Modal 保持置中。
- 按壓回饋：`:active { transform: scale(0.97) }`（0.95–0.98）、`transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1)`。
- 退場方向：見 ux-rules §7。

### 3.5 Interruptibility

- 快速連續觸發（toast、toggle、反覆新增項目）使用 `transition` 或 spring，它們會從當前狀態重新定向。此處用 `@keyframes` → blocked：它們會從零重來。
- 無 JS 的進場：`@starting-style`。
- 拖曳、滑動、sheet、手勢程式碼：見 ux-rules §7。

### 3.6 Asymmetric timing

刻意的階段（按壓、長按、破壞性確認）放慢，系統回應則快速到位：長按 `clip-path 2s linear`，放開 `200ms cubic-bezier(0.23, 1, 0.32, 1)`。按壓/放開或長按時序對稱 → blocked。長按確認的行為：見 ux-rules §7。

### 3.7 Performance (code level)

- 動畫用 `transform` 與 `opacity`；`clip-path` 與量測高度的 accordion 為例外。`width`/`height`/`margin`/`padding`/`top`/`left` → blocked（每幀 layout + paint + composite）；以 `transform` 修正（`translateY(100%)` 依元素自身高度移動）。
- `transition: all` → blocked；要寫明屬性。
- `motion` < 14.2 的 Motion `x`/`y`/`scale`，且頁面繁忙時 → blocked；用完整字串修正，`animate={{ transform: "translateX(100px)" }}`。
- `layout`/`layoutId` 在所有版本都跑在主執行緒：頁面繁忙時 → blocked，否則 note。
- 以父層 CSS variable 驅動子層 transform（`setProperty('--swipe-amount', …)`）→ blocked：它會重算每個子層。直接設 `element.style.transform`。
- `filter: blur` ≥ 20px → blocked：昂貴，在 Safari 最糟。
- 預先決定的動效用 JS/rAF 而非 CSS → note：負載下會卡頓。

### 3.8 Accessibility

- 位移類動效需要 `prefers-reduced-motion: reduce` 變體（`motion-reduce:`、`useReducedMotion()`），保留 opacity/color、去掉 transform（僅淡入，ux-rules §12）。缺少 → blocked。移除有助理解的 transition → note：reduced 的意思是更溫和，不是零。
- Hover 動效置於 `@media (hover: hover) and (pointer: fine)` 內；未設閘 → blocked，因為觸控點擊時會觸發 hover。

### 3.9 Cohesion

- 動效符合元件與產品個性：玩味的可以彈跳，dashboard 保持俐落。不符 → note；與專案 token 或規則衝突 → blocked。
- Crossfade 顯示兩個重疊狀態 → note：轉場期間加 `filter: blur(2px)`。
- 對手感不確定 → note，建議在 DevTools Animations 面板放慢 2–5 倍。手勢手感需要真機 → 「未驗證（需實機）」，絕不 pass。

## 4. Severity

- **blocked**：上面每一項標為 blocked 者。把其中任何一項降為 note 都是降低標準。
- **note**：僅限沒有門檻的項目（cohesion、blur 遮罩、spring 偏好、除錯建議）。note 寫進報告，絕不回圈。
- 不確定？若規則有數字而更動的值超出該數字，就是 blocked。

## 5. Fixes

- 數值取自 section 3 或專案 tokens；絕不近似。
- 依序優先：刪除 → 縮減（更短、更小、更少屬性）→ 修 easing → 修原點 → 做成可中斷 → 移到 transform/opacity → 非對稱時序 → 修飾 → reduced-motion、hover 設閘、cohesion。刪除本輪自己新增的內容是有效的修法。
- 修法需要函式庫、新依賴或新元件的不算重試：立刻列入「未解決」。

## 6. Output

通過的每個更動動畫一列；否則每條違反的規則一列。

| file:line       | Changed value                         | Verdict | Rule                      | Fix                                                          |
| --------------- | ------------------------------------- | ------- | ------------------------- | ------------------------------------------------------------ |
| `Menu.tsx:58`   | `transition: transform 300ms ease-in` | blocked | 3.2 ease-in; 3.3 dropdown | `transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1)` |
| `Toast.css:12`  | `animation: slideIn 400ms`            | blocked | 3.5 keyframes on toast    | `transition: transform 400ms ease` + `@starting-style`       |
| `Dialog.tsx:31` | `zoom-in-95 duration-200`             | pass    | 3.3 modal; 3.4 centered   | —                                                            |

- blocked 判定要引用 diff 中實際更動的 token（CSS 值、utility class、Motion prop），並給出確切的替代內容。若是遺漏（例：沒有 reduced-motion 防護），引用缺少它的那段新增宣告。「Easing 感覺不對」讓 step 3 無從更動、讓重試無從檢查。無法點名任何更動的值 → 問題早於本輪：超出範圍（section 1）。
- Rule 欄寫明決定該判定的 checklist 項目、「ux-rules §7/§12 …」或專案規則。

## 7. Retry loop

- Blocked → step 3 照寫好的修法套用；重審那些列，加上修法新增的任何動效。總共最多 2 輪重試；修法引入的動效與其項目共用次數。
- 仍 blocked → 列入「未解決」，附 file:line、目前值、規則、修法，以及為何沒成功。blocked 的原因可列入「建議規則（未寫入）」，絕不寫進規則（step 5）。
- 以下不算 pass：降為 note、放寬門檻、為 > 300ms 編造理由、刪掉該列。誠實的「未解決」勝過假通過；使用者讀報告來決定 commit 什麼。
