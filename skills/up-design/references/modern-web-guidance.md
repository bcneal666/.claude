# Modern Web Guidance (platform features)

撰寫使用平台功能的 HTML / CSS / client JS 之前先查：dialog / popover、container query、dark mode、forms、scrollbar、images and LCP、accessibility、view transition、scroll-driven animation、`@starting-style`、`content-visibility`、CWV。訓練資料含過時寫法；指南是最新的。純後端、工具設定、文案修改：略過。

Runner：`npx -y modern-web-guidance@latest …`（有 pnpm 時用 `pnpx modern-web-guidance@latest …`，不加 `-y`；Windows 用 `npx.cmd`）。需要網路。離線卡住 → 改用 `npx --offline …` 重試。

## 1. Search

每個功能一次查詢，2–5 個英文字，`<verb> + <UI/platform object>`。不含框架、函式庫或專案名詞。複合任務要拆開。把意圖轉成隱含的原生元件（`"confirm dialog"`，不是 `"confirm destructive action"`；`"date picker input"`，不是 `"pick a date"`）。

```sh
npx -y modern-web-guidance@latest search "light dismiss dialog"
```

回傳 `[{ "id", "description" }]`。依 `description` 判斷。結果弱或空 → 改用具體元件名詞（`dialog`、`popover`、`table`、`form`）重寫一次，最後才用 `list`。仍無結果 → 照常實作，並在報告註記。

## 2. Retrieve

```sh
npx -y modern-web-guidance@latest retrieve "<id>,<id>"
```

取符合的 use-case 指南，加上適用的 discipline 指南（`html`、`css`、`js`、`forms`、`accessibility`、`color`、`performance`、`security`）。輸出 > 9.5 KB 時會存到暫存檔 → 用 Read 工具完整讀取。

## 3. Apply and verify

- 指南是 vanilla HTML/CSS/JS；適配到框架時不得放棄現代功能：
  - Types：對新的 HTML 屬性用 spread 或 cast（`{...({ popover: 'hint', commandfor: id } as any)}`），不要移除它們。
  - SSR：保護 `window` / `HTMLElement`；在 client effect 中以裸 `import('<pkg>')` 載入 polyfill，絕不從 `node_modules` 複製。
  - DOM：透過 ref 呼叫 `showModal()` 等；每個實例各自的 ID 與 `anchor-name`（`useId()`）；`:root` 與 `@starting-style` 保持在頂層。
- 瀏覽器支援：Baseline widely available → 不需 fallback。任何更新的功能 → 套用指南的 fallback，除非專案（CLAUDE.md / AGENTS.md / DESIGN.md）載明支援政策；那就拿指南的「Baseline since」資料對照該政策。
- 繼續之前，對照指南檢查改動：fallback 都在、沒有加入未要求的功能。

## 4. Report

在 up-design 報告結尾附加 `### Modern Web Guidance` 區段：

- 每個套用的指南：`- **\`<id>\`**: <non-obvious API, override or fallback used and the pitfall it prevents> ("<short verbatim quote of that rule>")`。只列影響本輪改動的指南；絕不憑記憶猜 id 或引文（壓縮 context 後重跑 `retrieve`）。
- 搜尋過但沒套用任何指南 → 一句話說明查了哪些主題、為何都沒套用。
