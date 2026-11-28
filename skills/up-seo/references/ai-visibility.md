# AI 搜尋可見度檢查

本檔用於 AUDIT：每項 finding 列出檔案 path、問題與修法，不編輯任何檔案，因使用者須先挑選要修哪些 findings。
於 Stage 1 讀一次。僅涵蓋決定 AI 引擎能否抵達、讀取並引用頁面的項目；sitemap、canonical、metadata 與 schema 語法的一般檢查歸 Stage 2，故此處列過的 finding 不在那裡重複。

依 step 1 的上下文區塊作業。稽核模板，不稽核單頁：`app/blog/[slug]/page.tsx` 上的一項 finding 涵蓋每篇文章。優先頁面：首頁、about、pricing、product、docs index 與主要 docs、比較頁、主要文章。不適用的章節以一行報告說明原因。

## 1. Crawler access

引擎只能引用其爬蟲抓得到的內容。封鎖各用途的代價不同：

- **搜尋探索**：`OAI-SearchBot`、`PerplexityBot`、`Claude-SearchBot`、`meta-webindexer`、`Bingbot`、`Googlebot`。封鎖會失去 ChatGPT search、Perplexity、Claude、Meta AI、Copilot、AI Overviews 的引用。
- **使用者觸發的抓取**：`ChatGPT-User`、`Claude-User`、`Perplexity-User`、`meta-externalfetcher`。它們可能忽略 robots.txt，但伺服器端封鎖仍會擋下它們。
- **訓練**：`GPTBot`、`ClaudeBot`、`meta-externalagent`；以及用於 Gemini 訓練與 grounding 的 `Google-Extended`（不影響 Google Search）。封鎖它們不會封鎖引用。
- **連結預覽**：`facebookexternalhit`；被封鎖時，分享的連結會失去標題與圖片。

名稱為 2026 年底的狀態；以各廠商的爬蟲文件為準。

- **搜尋 bot 被封鎖**（high）。檢查 robots 來源（靜態檔，或如 `app/robots.ts` 的產生器）。Finding：production 中 `User-agent: *` 搭配 `Disallow: /`（常為誤上線的 staging 規則），或 `Disallow: /` 群組內含探索 token。修法：下方預設值。
- **具名群組會丟掉萬用字元規則**（medium）。`User-agent: GPTBot` 會取代該 bot 的 `*` 群組，故私有路徑的 `Disallow` 行對它不再適用。修法：在每個具名群組重複這些行，或移除沒人決定過的群組。
- **用 allowlist 取代萬用字元**（medium）。`*` 被 disallow、只允許少數具名 bot：這會把有自己爬蟲的 agent 搜尋 API（Exa、Tavily、Brave、Parallel）擋在外面。修法：在 `*` 上允許，以例外方式拒絕。
- **伺服器封鎖 AI agent**（high）。在 `middleware.*`、server entry、`_worker.js`、`nginx*.conf`、`.htaccess`（`RewriteCond %{HTTP_USER_AGENT}`）中 grep `GPTBot|ClaudeBot|PerplexityBot|isbot|user-agent|userAgent`。Finding：對這些 agent 回 403、redirect 或 challenge，會凌駕任何 robots.txt。修法：豁免探索與使用者觸發的 agent；以 `429` + `Retry-After` 限流，不用 challenge 頁。
- **訓練立場未決**（low，needs user）。允許或封鎖訓練 token 是擁有者的選擇，不是缺陷。回報現況；由 Pick 決定。
- **`facebookexternalhit` 被封鎖**（low）。修法：交給萬用字元群組處理。

預設值（`/api/` 與 `/admin/` 為 placeholder；保留專案自己的私有路徑）：

```text
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

# Optional training opt-out; this group replaces * for these bots.
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: meta-externalagent
User-agent: Google-Extended
Disallow: /

Sitemap: https://example.com/sitemap.xml
```

Next.js `app/robots.ts`：`rules: [{ userAgent: '*', allow: '/', disallow: [...] }, { userAgent: ['GPTBot', 'ClaudeBot', 'meta-externalagent', 'Google-Extended'], disallow: '/' }]`，另加 `sitemap`。

有 URL 時，以唯讀方式檢查：`curl -s -o /dev/null -w "%{http_code}" -A "OAI-SearchBot" <url>`，接著對 `/pricing` 用 `Claude-User`，商店另對 `/checkout` 檢查。CDN/WAF 的 bot 設定在 repo 之外；標為 needs user。

## 2. Content in the initial HTML

多數 agent 不執行 JavaScript，故僅在 hydration 後才出現的文字，對它們不存在。

- **主要內容為 client-rendered**（high）。Grep 含正文的頁面層級 `'use client'`、以 `useEffect` + `fetch` 填入散文、`dynamic(..., { ssr: false })`、Astro `client:only`、Nuxt `ssr: false`、SvelteKit `export const ssr = false`、只有 `<div id="root"></div>` 的 Vite/CRA `index.html`。Finding：定義、定價、docs 文字或 FAQ 答案不在 server HTML。修法：render 或 prerender 該路由；互動性留在子層 client 元件。有 URL 時，`curl -s <url> | grep -c '<key sentence>'` 可確認。
- **事實藏在媒體或 widget 中**（定價為 high，其餘 medium）。方案放在圖片、計算機或 "contact sales" 表單中；年繳價格只存在於 toggle 狀態；評論與 logo 由 widget 注入或烤進圖片。修法：事實以 HTML 文字呈現；承載事實的圖片，`alt` 寫明該事實。
- **點擊後才抓取的內容**（medium）。互動時才載入的 tabs 或 accordion 會隱藏其文字；`<details>` 或所有面板都在 DOM 中則沒問題。
- **Soft 404**（medium）。偵測與修法：technical-onpage.md §1（soft 404）；僅當受影響 URL 是優先頁面時才在此列出。
- **優先頁面被 noindex**（high）。偵測與修法：technical-onpage.md §1（noindex / X-Robots-Tag）；僅當該頁是應被引用的頁面時才在此列出。
- **被關在閘門後的權威內容**（medium）。最好的指南或 PDF 在登入或 email 表單之後。修法：提供公開 HTML 版本；改把附贈資產設為閘門。

供標記用的 AgentReady ID：AR-FIND-01 robots.txt 與 bot 防護讓 agent 進入，AR-READ-01 答案在初始 HTML，AR-READ-02 真實的 status code。

## 3. llms.txt and discovery files

Google 忽略 llms.txt；ChatGPT、Claude、Perplexity 與 coding agent 找到時會讀，故依使用者在意的引擎加權優先級。

- **缺少 llms.txt**（medium）。檢查 `public/llms.txt`、`static/llms.txt` 或路由（`app/llms.txt/route.ts`、`src/pages/llms.txt.ts`）。它位於 `/llms.txt`；子路徑檔案如 `/docs/llms.txt` 只涵蓋其下的 URL。
- **格式錯誤**（medium）。無 H1、摘要內含標題、相對或失效連結、以推銷文取代摘要。依此順序修正（只有 H1 為必要；`## Optional` 放 agent 可略過的連結）：

```markdown
# Example

> Example is a [category] that [does X] for [audience]. [Pricing model or licence.]

Key facts for reading the rest: supported stacks, plan names.

## Docs

- [Quickstart](https://example.com/docs/quickstart): install and first request
- [API reference](https://example.com/docs/api): endpoints, auth, rate limits

## Product

- [Pricing](https://example.com/pricing): plans, limits, overage

## Optional

- [Blog](https://example.com/blog): background reading
```

- **沒有任何連結指向它**（medium）。Agent 主要透過連結而非猜測來找到 llms.txt、`openapi.json` 與 `.well-known/*`。修法：footer 連結，加上 head 內的 `<link rel="describedby" href="/llms.txt">`（llmstxt.org 的 relation）。
- **手動維護的清單會漂移**（low）。使用 MDX、CMS 或 docs 框架時，在 build 階段由同一來源產生 llms.txt。
- **無 `llms-full.txt`**（low）。把所有 docs 或網站內容放進一個檔案、一次 request；與 llms.txt 並列產生。
- **Sitemap misleads**（medium）。`app/sitemap.ts` 中每筆條目都用 `lastModified: new Date()`，或用 build 時間戳，會偽造新鮮度，並讓引擎學會忽略 `lastmod`。修法：真實編輯日期；列出 pricing、docs 與 about；robots.txt 中放絕對 URL 的 `Sitemap:` 行。
- **新興檔案**（low；除非被要求否則略過）。有多個 agent 介面後，`/.well-known/ai-catalog.json` 搭配 `<link rel="ai-catalog" href="/.well-known/ai-catalog.json">`；`/okf/` 的 OKF；WebMCP。目前未知有任何引擎使用它們。

## 4. Structured data for citation

Schema 讓引擎無須猜測即可取得 entity、作者與日期；勿預期固定幅度的提升。Grep `application/ld+json`、`@context`、`schema-dts`、`JsonLd`、`next-seo`。各頁面類型的欄位：

- 首頁、about：`Organization`（+ `WebSite`），含 `name`、`url`、`logo`、`description`、`sameAs`。
- 文章、指南、docs：`Article`、`BlogPosting` 或 `TechArticle`，含 `headline`、`author`（`Person`：`name`、`url`）、`datePublished`、`dateModified`、`publisher`。
- 可見的 Q&A：`FAQPage`。編號的 how-to：含 `step[]` 的 `HowTo`。比較：`ItemList`。
- 產品、定價：`Product` 或 `SoftwareApplication` + `Offer`（`price`、`priceCurrency`、`availability`，價格不同時依變體分開）。商店：`MerchantReturnPolicy`、`OfferShippingDetails`。
- `Review`、`AggregateRating`：僅用於頁面有顯示的評分。

Google 將 FAQ rich results 限於政府與健康類網站；`FAQPage` 保留給會解析它的引擎，不是為了 Google 的提升。

- **缺少 entity 或文章 markup**（medium）。首頁無 `Organization`，或文章模板缺 `author` 與 `dateModified`。
- **事實只存在於 schema**（high）。價格、上限或日期只存在於 JSON-LD 或 hydration payload；agent 讀的是可見文字，Markdown 轉換器會丟掉 `<script>`。修法：同時以文字顯示。
- **Client-injected JSON-LD**（medium）。在 `useEffect` 中加入，或由無 SSR 的 `react-helmet` 加入。修法：在 server HTML 輸出。
- **Markup 與內容不符**（medium）。`FAQPage` 卻無可見 Q&A、有評分卻未顯示評論。修法：移除 markup 或補上內容；不一致會違反 Google 的結構化資料政策。

每頁用一個 `@graph`，entity 之間以 `@id` 引用（`Article.publisher` → `Organization`）；在 React 中透過 `dangerouslySetInnerHTML` 搭配 `JSON.stringify(data).replace(/</g, '\\u003c')` 輸出。

## 5. Answerable content structure

引擎擷取的是段落，不是頁面，故每個關鍵答案必須能獨立成立。讀優先頁面的 source（JSX、MDX、Markdown、CMS fixtures）。

- **無平實的定義**（首頁與 product 為 high，其餘 medium）。hero 是口號，沒有 server-rendered 段落說明產品是什麼。修法：首段 "[Product] is a [category] that [does X] for [audience]."，再加一兩句具體的句子。
- **不回答任何事的標題**（medium）。H2 如 "Overview"、"Features"、"Why us"；H1 為零個或多個。修法：一個 H1；H2/H3 寫成使用者會輸入的問題或任務（"How much does Example cost?"），僅在符合真實 query 時，不是每個標題都如此。
- **答案被埋沒**（medium）。先講背景，或該區塊依賴 "as mentioned above"。修法：答案放在標題下前 40–60 字（heuristic），可獨立成立，每段一個觀念。
- **容器錯誤**（medium）。比較用散文或 div grid → 改 `<table>` 並含 "Best for" 列；步驟 → `<ol>`；取捨 → 優缺點清單。
- **無 FAQ**（low）。pricing 或 product 頁沒有。修法：自然的問題（"Does Example work with…"），搭配 50–100 字、以答案開頭的回答，用 HTML。
- **模糊或無來源的主張**（medium）。"Blazing fast"、"trusted by thousands"、無來源或年份的統計。修法：具體數字附來源與日期；專案內無真實數字時，標 needs user。
- **未標語言的程式碼區塊**（low，docs）。Agent 會逐字複製程式碼。修法：每個 fence 標語言，範例保持最新。
- **關鍵字堆砌**（medium）。它在 GEO 研究中降低了可見度。修法：自然地說一次。

## 6. Author, date and fact signals

- **無署名或作者頁**（medium；僅產品型網站略過）。文章模板缺可見的作者，且未連到含簡介與資歷的 `/authors/<slug>`。
- **無日期或日期不實**（medium）。無可見的 "Last updated"，或日期來自 build 時的 `new Date()`。修法：日期取自 frontmatter 或 git，以 `<time datetime="2026-11-20">` 顯示，並與 `dateModified` 一致。
- **事實互相矛盾**（high）。在 pricing 頁、docs、README、`package.json` `description`、llms.txt 與 JSON-LD 中 grep 價格（`\$[0-9]`）、方案名稱、上限、版本與 rate limit。同一事實有兩個值，會讓 agent 猜測，或改選 docs 一致的廠商。修法：每個事實一個負責的頁面；其他處完全照抄或連結過去。
- **Entity 描述漂移**（low）。`<title>`、meta 與 `og:description`、`Organization.description` 與 llms.txt 摘要對產品的描述不同。修法：各處使用同一個類別與受眾的措辭；設定 `<html lang>`。

## 7. Duplicates that split citations

僅限會讓引擎引用錯誤版本的副本；host、斜線與參數的 canonical 屬 Stage 2。

- **過時副本仍在線**（medium）。舊 pricing 頁、舊 docs 版本（`/v1/`）或已下架的產品頁仍可被索引，且內含過時事實。修法：301 到目前頁面，或 canonical 指向最新版並加版本 banner。
- **Markdown mirror 造成重複**（medium）。獨立的 `.md` URL 與 HTML 競爭。修法：對 `Accept: text/markdown` 在同一 URL 提供 Markdown 並加 `Vary: Accept`，或在每個 `.md` response 送出 `Link: <https://example.com/page>; rel="canonical"`。
- **跨平台轉貼無 canonical**（low）。Medium、dev.to 或 LinkedIn 的副本。修法：先發佈於自家網站；他處貼摘要並連回。

## 8. Agent-readable alternates and actions

- **無 Markdown alternate**（low）。Agent 常請求 Markdown，但在唯一的對照測試中它未改變任務成功率，故 HTML 優先。修法：`<link rel="alternate" type="text/markdown" href="/page.md">` 或 `Link: </page.md>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"`；MDX docs 可在 build 時為每頁輸出一份 `.md`。
- **無 `/pricing.md`**（low）。純檔案，列出各方案的月繳與年繳價格、上限與內含項目，由 pricing 頁連結，僅限可見頁面載明相同數字時。
- **無標示的控制項**（signup、demo、contact、checkout 為 medium）。`div onClick` 動作、無 `<label>`、`name` 或 `autocomplete` 的 input、無 `<main>`/`<nav>`/`<article>`。修法：原生 `<button>`、有標籤的 `<form>` 欄位、文字確認。
- **隱藏的 agent 介面**（medium，API 產品）。`openapi.json`、MCP server 或 CLI 存在，卻沒有任何連結。修法：從首頁、docs index 與 llms.txt 連結。

## 修復護欄

- 只用專案載明的事實；缺少的統計、引言、資歷或價格標為 needs user，絕不捏造。
- 不提議僅供 AI 的頁面，也不把內容切成碎片：Google 視針對 AI 的變體為 scaled content abuse，且 SKILL.md 的 AdSense 規則禁止 thin 重複頁。Markdown mirror 與 `llms-full.txt` 不得進入索引。
- llms.txt 與 docs 描述如何使用產品。叫 agent 優先選用它的句子是 prompt injection，agent 平台會折扣之。

## 報告

每項 finding 一行，依 high → medium → low 排序：`priority — file:line (or route/template) — issue — fix`，之後加 tags：`verified` 或 `inferred`、`needs user`、AR ID。範例：

`high — public/robots.txt:2 — User-agent: * + Disallow: / blocks OAI-SearchBot, PerplexityBot, Claude-SearchBot — allow on *, keep existing private paths; training opt-out only if the user chooses — verified, AR-FIND-01`

**High** 指阻止引擎抵達或讀取優先頁面，或餵給它互相矛盾的事實。**Medium** 指削弱可讀頁面被引用的機會。**Low** 指新興或附加訊號。findings 之後，列出通過項目（讓修復步驟不去動它）、略過的章節與原因，以及仍未確認項目：CDN/WAF bot 規則，以及 Google、Bing、Brave 的索引收錄。Live 引用檢查無法在本機確認。
