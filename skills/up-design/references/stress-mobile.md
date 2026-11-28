# Stress, mobile and toast checks

本檔僅用於 DIAGNOSIS：列出每項發現的 `file:line` 與修法；不編輯任何東西。
診斷中途修正會打亂 up-design 依賴的修正順序（穩定性 → 移除 → 效能 → 動效）；修正在 step 3 套用。

服務 Diagnose step 2.5–2.7。被略過的區段在報告中以一行說明原因。與 step 2.2 ux-rules gap 重複的發現只列一次，放在該節下。

## 1. Worst-case data stress (step 2.5)

範圍內沒有元件渲染資料（列表、表格、卡片、個人檔案、計數、badge）時略過。

Demo 資料是為了讓設計好看而挑的：剛好放得下的名字、沒有千分位的數字、每個選填欄位都填滿。要用真實使用者可能產生的值或真實的 schema 上限；`aaaa…` × 5,000 會被當成「不會發生」而被忽略。不要只停在長文字：真正上線出問題的是短名字、缺少的頭像、"1 members"、空列表。

1. **Map the surface.** 每個元件列出每個渲染的值，附來源、型別、上限、是否選填。包含標題計數、相對時間、badge 文字、來自資料的標籤、tooltip、頭像與列表長度。
2. 在 Zod/Yup/Valibot schema、migration、API 型別、`maxLength` 中 **Find limits**。沒有上限，或前端上限比後端欄位短（較長的值會經由匯入或 API 進來）→ Fragile。
3. **Try each case below that applies**，像真實資料一樣在各列間混用。參考值：`bartholomew.fitzgerald@northwind-industries-holdings.example.com`、`Aleksandra Wiśniewska-Kowalczyk`、`Christopher Alexander Montgomery III`、`Benachrichtigungseinstellungen`、`Invitation expired 12 days ago`。
4. **Check at** 真實的容器寬度（側邊欄列表不等於整頁列表）、320px、最寬的版面與 200% 縮放，另加 dark mode 與 `dir="rtl"`（若有支援）。截圖有呈現該情況時用 step 2.1 的截圖，否則從 markup 與 CSS 推論；每項發現標為 verified 或 inferred。為了試某個案例而新增 fixture 或 mock 屬於編輯，所以不要。

此表中的 `§N` 指 ux-rules §N。

| Case                                  | What breaks                                  | Fix                                             |
| ------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| 長名稱、標題或職稱                    | 溢出而非換行                                 | 文字加 `min-width: 0`；grid 用 `minmax(0, 1fr)` |
| 頭像或 ••• 旁的長文字                 | 頭像被擠扁；動作被推出去                     | 頭像、圖示、動作加 `flex-shrink: 0`             |
| 名稱換成三行                          | 置中的頭像看起來飄著                         | `align-items: flex-start`                       |
| Email、URL、檔名（無空格）            | 超出邊緣、推擠同層元素                       | `overflow-wrap: anywhere`，不用 `break-all`     |
| 結尾不同的值                          | 結尾截斷讓它們看起來一樣                     | 中間截斷（§4）                                  |
| 長狀態 badge；每個 enum 值            | Badge 換行或擠壓名稱                         | `white-space: nowrap; flex-shrink: 0`           |
| 翻譯後的標籤（約長 30%）              | 固定寬度的按鈕或 tab 溢出                    | 內容寬度 + `min-width`；不用固定 `width`        |
| 12 個 tag；一個很長的 tag             | Tag 成牆；tag 比容器寬                       | 顯示幾個，再 `+8`；限制寬度、加 `title`         |
| `… Montgomery III`、`de la Cruz`      | 縮寫成 `CI`、`Md`                            | 取第一個與最後一個字，略過 Jr/Sr/II/III         |
| `dana`；前導或重複空格                | 小寫或空字的縮寫                             | Trim、依連續空白切分、轉大寫                    |
| `🦊 Fox`、`👩🏽‍💻 Priya`、`王秀英`        | `charAt(0)` → `�`；emoji 被拆開；只有 1 個字 | 用 `Intl.Segmenter` 取 grapheme；fallback 圖示  |
| `Đặng Thị Ngọc Hân`、泰文             | 變音符號被裁切                               | 放寬 `line-height`，不用 `overflow: hidden`     |
| 阿拉伯文或希伯來文名稱                | 標點、圖示出現在錯誤的一側                   | 使用者文字加 `dir="auto"`                       |
| `Jo`、`J`、`a@b.test`                 | 欄位看起來空空的；連結很小                   | 點擊區域放在整列，不放在文字上                  |
| 缺少名稱或欄位；空白標題              | 孤立的 `—`、空白或零高度的列                 | Fallback（名稱 → email）；省略或預留該行        |
| `<script>`、`&amp;`、`**bold**`       | 顯示原始 markup 或重複跳脫                   | 只跳脫一次；不用 `dangerouslySetInnerHTML`      |
| 單行欄位中的換行；2k 字元             | 列高加倍或文字消失；卡片變大                 | 逐欄位決定；`line-clamp-2` + 完整檢視           |
| `0`、`1`                              | "0 members"、÷ 0；"1 members"                | 零狀態、安全除法、`Intl.PluralRules`            |
| `1284`、`12345678.9` 金額、`de-DE`    | 缺少或寫死的分隔符號                         | `Intl.NumberFormat`（§4）；絕不截斷             |
| count badge 中的 `1000000`            | Badge 寬度爆開                               | 精簡 `1M`；未讀 `99+`（§9）                     |
| `-42.5`、`0.1 + 0.2`、`null`、`NaN`   | 正負號/顏色邏輯；`0.30000000000000004`       | 測負數；一律格式化；防 null                     |
| `142%`、`-3%`                         | 進度條或量表超出範圍                         | 將條限制在 0–100%，顯示真實數字                 |
| 即時 `99 → 100`                       | 寬度跳動、欄位抖動                           | `font-variant-numeric: tabular-nums`            |
| 0、1、page size、page size + 1 個項目 | 沒有空狀態；單獨一張卡；第 2 頁是空的        | §4；檢視只有一張卡片的 grid                     |
| 1,000+ 列、未分頁                     | 捲動卡頓、渲染慢                             | 分頁或虛擬化；新依賴 → 「未解決」               |
| 某一項是其他的 10 倍；名稱相同        | 列被拉長；項目無法區分                       | 限制內容；顯示第二個欄位                        |
| 現在、12 天前、未來日期               | "0 seconds ago"；"-3 days ago"               | `Intl.RelativeTimeFormat`、"just now"（§4）     |
| `1970-01-01`、`-08:00`、`1,284 hours` | 把 epoch 當日期；日期錯一天；未換算單位      | 把 0 視為缺失；專案時區（§11）；換算成較大單位  |
| 頭像 404；沒有頭像                    | 破圖圖示；fallback 尺寸怪異                  | `onError` → 以真實頭像尺寸顯示縮寫              |
| 4000×200 圖片；慢速圖片；深色 logo    | 變形；layout shift；logo 看不見              | `object-fit: cover`、`aspect-ratio`；logo 底板  |
| API 錯誤；部分資料                    | 原始 `TypeError`；列沒對齊                   | 附重試的錯誤（§9）；同一種列結構                |
| 沒有權限；目前使用者在列表中          | Layout 位移；提供了對自己的動作              | 同一種 layout；"You" 標籤、隱藏對自己的動作     |

逐欄位決定換行、截斷或 clamp：ux-rules §4。

**Report.** **Broken**（無法閱讀、動作無法觸及、資料錯誤）= high，**Ugly**（可讀、明顯有誤）= medium，**Fragile**（沒有上限、沒有 fallback）= low。每項發現：欄位、值、影響、修法、`file:line`、verified 或 inferred。有多個正確答案時（換行或截斷、分頁或虛擬化），選一個並用一行說明理由，因為 up-design 不會停下來詢問。把撐住的案例列為 pass 的證據，讓 step 3 知道哪些不要碰。

## 2. Mobile (step 2.6, only when `mobile` is true)

ux-rules §1、§5、§7 與 §8 已涵蓋目標尺寸、鍵盤、`dvh`/`svh`、safe-area padding 與內層 `overscroll-behavior: contain`；那些 gap 記在那裡。以下：每種症狀的 grep，加上只有 ux-rules 沒有的部分。只有在其理由成立時才套用修法：`user-select: none` 在按鈕上是對的，在內文上是缺陷。

- **點擊後 hover 殘留。** Grep `@media (hover` 之外的 `:hover`，以及沒有 `future.hoverOnlyWhenSupported` 的 Tailwind v3 設定（v4 的 `hover:` 已設閘）。用 `@media (hover: hover) and (pointer: fine)` 設閘；`pointer: fine` 也會排除宣稱有 hover 但 pointer 為 coarse 的觸控螢幕（部分 Android）。
- **點擊閃爍。** `tap-highlight` 沒有結果 → `html { -webkit-tap-highlight-color: transparent; }`；之後每個可點擊元素都需要自己的 `:active`。
- **高度錯誤。** Grep `100vh`、`h-screen`、`min-h-screen`（ux-rules §8）。另外行銷 hero 上的 `100dvh` → `100svh`：`dvh` 會隨網址列收合而調整，在捲動中途讓版面位移。
- **輸入框縮放。** Grep `maximum-scale`、`user-scalable`，以及設為 `text-xs`/`text-sm` 或小於 16px 的表單欄位（ux-rules §5）。iOS 在 blur 時不會縮回；要修字級，不是修縮放。
- **300ms 點擊延遲。** `touch-action`/`touch-manipulation` 沒有結果 → 在 `button, a, [role="button"]` 上加 `touch-action: manipulation`，讓 `click` 不必等雙擊就觸發。
- **放開時才有回饋。** 按下狀態在 `onClick` 或 `click` listener 中設定 → 改用 `:active`，或 JS 中的 `pointerdown`；`click` 在手指抬起時才觸發。
- **下拉重新整理被劫持。** App 式 UI（自有捲動容器、可拖曳 drawer、canvas）而沒有根層 `overscroll` → `html, body { overscroll-behavior: none; }`；在歡迎下拉重新整理的可捲動文件上不要加。Grep 帶 `preventDefault` 或 `passive: false` 的 `touchmove`：它會阻擋捲動並讓 listener 變成非 passive，耗費幀數；改用 `overscroll-behavior`。
- **瀏海與 home indicator。** 對照 `viewport-fit=cover` grep `safe-area-inset`：沒有該 meta tag，每個 `env()` inset 都是 `0px`。檢查 `fixed bottom-0`、`sticky bottom-0`、固定的 header、tab bar、toast 與 sheet。在 `calc` 內加 fallback：`calc(1rem + env(safe-area-inset-bottom, 0px))`。
- **長按會選到控制項文字。** Grep `select-none`/`user-select`；在 `body` 上是 gap。手寫 CSS 也需要為 Safari 加 `-webkit-user-select: none`；當作控制項的連結與圖片加 `-webkit-touch-callout: none`。
- **Carousel 拖動整個頁面。** 水平 JS 手勢沒有 `touch-action`，或在使用者會捲過的內容上用 `touch-action: none`。該值指出瀏覽器保留什麼：水平 carousel `pan-y`、垂直 sheet handle `pan-x`、`none` 只用在擁有所有軸的表面。原生捲動的 carousel 用 `scroll-snap-type: x mandatory` + `scroll-snap-align: start`，不需要 `touch-action`。
- **狀態列顏色。** Grep `theme-color`/`themeColor`。沒有或只有一個值 → 每個配色方案一個 `<meta name="theme-color" media="(prefers-color-scheme: …)">`，加上 `<meta name="color-scheme" content="light dark">`，顏色對應 header 頂部的顏色，不是品牌色。Next.js：`viewport` export 的 `themeColor: [{ media, color }]`。以 class 切換主題 → 在 JS 中更新該 tag。PWA → manifest 的 `theme_color`/`background_color`。
- **橫向時文字膨脹。** `text-size-adjust` 沒有結果 → `html { -webkit-text-size-adjust: 100%; }`。

程式碼只顯示宣告存在，不顯示它有沒有用。點擊後 hover 殘留、點擊閃爍、網址列對 `vh`、輸入框縮放、點擊延遲、overscroll、safe area 與軟鍵盤在模擬中無法重現：將其行為標為 「未驗證」，絕不 pass。報告交接：dev server 綁 `0.0.0.0` 並以 LAN IP 開啟、Safari Web Inspector 或 `chrome://inspect`、鍵盤開啟。

## 3. Sonner (step 2.7, only when `uses_sonner` is true)

shadcn/ui 的 toast 包裝 Sonner，所以 Toaster props 可能在該 wrapper 內。Grep `<Toaster`、`from 'sonner'`、`toast(`、`toast.`。

- **Mounts.** 剛好一個 `<Toaster />`，靠近根層（Next.js `layout.tsx`；放在 server component 沒問題）。沒有 → toast 永遠不顯示；每頁各一個或有條件的 → 卸載時遺失；layout 與 page 都有 → 每個 toast 出現兩次。第二個 Toaster 需要自己的 `id`，且呼叫要傳 `toasterId`；未指定目標的 toast 只在沒有 `id` 的 Toaster 渲染。
- **Position.** 預設 `bottom-right`；對照 ux-rules §3（桌面與平板 bottom-left、行動端 bottom-center、兩側 16px 且避開 safe area），並記錄任何不符。`mobileOffset`（<600px，預設 16px）接受數字、CSS 字串或每邊物件。滑動方向跟隨 `position`（`swipeDirections` 可覆寫），並保持 ux-rules §7 的退場方向。
- **被 modal 蓋住或被裁切。** Toaster 在 dialog 或 portal 內、在有 `transform`、`filter` 或 `overflow` 的祖先之下，或被 overlay 的 z-index 壓過 → 移到 document 根層。
- **Client only.** server action 或 server component 中的 `toast()` 什麼都不做；回傳結果並在 client 端 toast。`useEffect` 中的 `toast()` 在 dev 的 StrictMode 下會觸發兩次；從 handler 呼叫，或傳穩定的 `id`。
- **`toast.promise`.** 第一個引數必須是會 settle 的 promise（或回傳 promise 的函式），否則 loading 永不結束；要給 `loading`、`success` 與 `error`（error 文字依 ux-rules §6）。手動管理的 `toast.loading` 必須以同一個 `id` 的 `toast.success` 或 `toast.error` 結束，否則 spinner 殘留或出現第二個 toast。
- **Dark mode.** `theme` 預設為 `'light'` 並忽略 OS → `theme="system"`，或用 `next-themes` 的 `<Toaster theme={resolvedTheme} />`。
- **Tailwind classes 被忽略。** Sonner 注入的樣式優先，所以 `className`/`toastOptions.classNames` 中的 class 需要 `!important`（`!text-red-900`）。超過幾個 → 在專案 `toast()` wrapper 後面用 headless 的 `toast.custom()`；那是新元件，所以 「未解決」。
- **完全沒有樣式。** 樣式表遺失（Astro、view transitions）→ 在 layout 中 `import 'sonner/dist/styles.css'`。在 Shadow DOM 內 → 把含 `[data-sonner-toaster]` 的 style tag 複製進 shadow root。
- **Durations.** 對照 ux-rules §9 檢查：不寫死數值、錯誤與復原 toast 停留較久、結果也顯示在頁面上。`duration: Infinity` 需要 `closeButton` 或 action。
- **Close callbacks.** `onDismiss` 在關閉按鈕、滑動與 `toast.dismiss()` 時觸發；`onAutoClose` 在逾時時觸發。復原的提交或清理只放在其中一個，就會漏掉另一條路徑。
- **Minor.** `containerAriaLabel` 預設為英文 `'Notifications'`；設成介面語言。灰色的 success 與 error 是預設；只有設計要彩色時才用 `richColors`。
