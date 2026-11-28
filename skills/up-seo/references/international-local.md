# 國際化與在地檢查

本檔用於 AUDIT：每項 finding 列出檔案 path 與修法，不編輯任何檔案，因使用者於 Stage 2 之後才挑選要修什麼。

Part 1 於上下文區塊列出多於一個語系（locale）時執行；Part 2 於顧客會到訪某地點，或商家服務特定區域時執行。略過的部分以一行報告說明原因。`technical-onpage.md` 已有的 finding 只在那裡列一次。

優先級：**high** = 某語系或地點可能掉出索引，或顧客得到錯誤事實；**medium** = 訊號薄弱或互相衝突；**low** = 細節優化。檔案呈現的是宣告，不是 Google 的行為：status code、索引與 rich results 需 live 驗證。

## Part 1. International

### 1.0 Locate the sources

- Grep `hreflang|hrefLang|canonical|alternates|languages:|xhtml:link|x-default|localePrefix|defaultLocale|locales:|prefixDefaultLocale|strategy:|content-language|<html`。
- 查看：Next.js `generateMetadata`、`app/[locale]/layout.*`、`app/sitemap.*`、`middleware.*`、`i18n/routing.*`；Nuxt `i18n`（`strategy`、`baseUrl`、locale `language`，v9 之前為 `iso`）、`useLocaleHead`；Astro `i18n.routing`、`@astrojs/sitemap` `i18n`；`_headers`、`vercel.json`、`netlify.toml`。
- next-intl middleware 預設在 `link` header 中送出 hreflang 加 `x-default`（`alternateLinks`）；head 的 alternates 必須與之一致，或設 `alternateLinks: false`。

### 1.1 hreflang

head `<link rel="alternate" hreflang=… href=…>`、HTTP `Link` header 與 sitemap `<xhtml:link>` 等效；Google 會丟棄 URL 在這三處不一致的配對，故全部由同一份對照產生。超過約 10 個語系時優先用 sitemap。每頁都帶完整集合（含自身）加 `x-default`。非 HTML 檔案（PDF）用 `Link` header。

- 集合漏掉頁面自己的語系（最常見的錯誤）→ 由完整語系清單建立。(high)
- A 列了 B，B 卻沒列 A → 所有集合由同一份對照產生。回報有問題的配對；有效的配對仍然有效。(high)
- 無效代碼（`en-UK`、`en_US`、`jp`、`cn`、`kr`、`dk`、單獨的 `US`、`es-419`）→ `language[-script][-region]`，ISO 639-1 + ISO 3166-1 alpha-2：`en-GB`、`ja`、`zh-Hans`、`zh-TW`、`ko`、`da`、`sv`、`es-MX`。`/jp/` slug 可保留；將 slug 對應到代碼。(high)
- 同一集合中同一代碼出現兩次且 URL 不同 → 每個代碼一個 URL。(high)
- 目標以替換前綴建立（`/de/pricing`），但 slug 已在地化（`/de/preise`）→ 查翻譯後的 slug。(high)
- 為缺少該頁的語系放了 alternate，或指向該語系首頁而非對應頁面 → 只輸出有該頁的語系。(high)
- 目標會 redirect、為 `noindex`，或被 `robots.txt` 封鎖 → 改為最終可索引的 URL。(high)
- 無 `x-default`，而 `/` 依語言 redirect 或存在語言選擇頁 → 對每個集合補上，指向 `/` 或預設語系頁面。僅缺少本身不會使集合無效。(medium)
- Tags 僅在 client 端 render → 改 server HTML 或 sitemap。(medium)

### 1.2 Canonical per locale

- 翻譯頁 self-canonical（`/de/preise` → 自己）。從 `/de/…` 指向 `/en/…` 的 canonical 會把德文併入英文，且 Google 會忽略被 canonicalize 之頁面上的 hreflang。(high)
- layout 或 CMS 預設中的 `alternates.canonical` 會被每個未覆寫的頁面繼承，導致所有頁面 canonical 指向 `/` 或 `/en` → 每頁各自設定。(high)
- 同語言孿生頁（`en-US`、`en-GB`，文字相同）可在該 cluster 內共用一個偏好的 canonical；Google 仍可能將其合併 → 做出差異（貨幣、價格、聯絡方式）或合併。(medium)
- 分頁的語系頁面 self-canonical，不指向第 1 頁。(medium)
- Canonical、hreflang 與 sitemap 使用同一個 base（`metadataBase`、`baseUrl`、`site`）產生的絕對 URL，且 protocol、host、大小寫與結尾斜線一致。(medium)

Next.js（root layout 中的 `metadataBase`）：`alternates: { canonical: path[locale], languages: { ...path, "x-default": path.en } }`，其中 `path = { en: "/en/pricing", de: "/de/preise" }`。

### 1.3 Locale URL structure

子目錄、子網域與 ccTLD 都可行；選擇本身不是 finding，因遷移 URL 的成本高於收益。

- 一個 URL 服務多種語言：`?lang=de`、僅靠 cookie 切換、next-intl `localePrefix: 'never'`（同時會停用其 alternate links）、Nuxt `strategy: 'no_prefix'` → 每種語言一個帶前綴的 URL。(high)
- 依 `accept-language`、`x-vercel-ip-country`、`cf-ipcountry`、`request.geo`、`localeDetection` 做 redirect 或 rewrite。Googlebot 從美國 IP 爬取且不帶 `Accept-Language`，故只看到一個語系 → 固定 URL；只 redirect `/`（作為 `x-default`）或顯示語言 banner。深層 URL 為 (high)，僅 `/` 為 (medium)
- 混用模式（資料夾與子網域）或大小寫漂移（`/en-us/` 與 `/en-US/` 都能解析）→ 一種模式，其餘 301。(medium)
- 非 ASCII slug（`/de/größe`）沒問題，但 hreflang、canonical、sitemap 與連結必須以相同方式拼寫：percent-encoded UTF-8（`/de/gr%C3%B6%C3%9Fe`），NFC 正規化（macOS 檔名可能為 NFD）。(medium)
- 預設語系不加前綴（`as-needed`、`prefix_except_default`、Astro `prefixDefaultLocale: false`）在該 URL 位於 hreflang 集合內，且 `/en/x` redirect 到 `/x` 時沒問題。新建專案：`always` 加 `/` 作為 `x-default`。(low)

### 1.4 `<html lang>` and per-locale metadata

- 在所有語系共用的 layout 中寫死 `<html lang="en">` → 在 `app/[locale]/layout`（Astro `Astro.currentLocale`）用 `lang={locale}`，採 hreflang 代碼（`pt-BR`，不是 slug `br`）。Google 看可見文字；Bing 與螢幕閱讀器讀 `lang`。(medium)
- Bing 對 hreflang 權重低 → Bing 流量重要時加 `<meta http-equiv="content-language" content="de">`。(low)
- Title 或 description 未翻譯（共用 layout 中的英文字面值、key fallback）→ 逐語系翻譯；語言錯誤的 snippet 會損失點擊。(medium)
- `og:locale` 缺少或為 `de-DE` → 改 `de_DE`，並為每個其他語系加 `og:locale:alternate`。(low)

### 1.5 Language switcher

Grep `LocaleSwitcher|LanguageSelect|setLocale|router.push|<select`。

- `<button onClick>` 或 `<select onChange>` 無 `<a href>`，爬蟲沒有語系之間的路徑 → 每個語系一個 `<a href="/de/preise" hreflang="de" lang="de">Deutsch</a>`。(medium)
- 連結指向語系首頁，而非對應頁面 → 重用 hreflang 對照。(medium)

### 1.6 Untranslated and thin locale pages

主要內容未翻譯的語系頁面算重複內容，且 Google 的 helpfulness 訊號是全站層級，故大量 thin 頁面會拖累強的頁面。機器翻譯本身不是 spam；大量產生的低價值翻譯才可能是。

- 訊號：只翻譯 nav 與 footer；key 缺漏並由 `fallbackLocale`/`fallbackLng` 補上；各語系資料夾中的 body 檔案相同（`diff -rq content/en content/de`）；`generateStaticParams`/`getStaticPaths` 對只存在於一種語言的內容輸出每個語系。
- 修法：翻譯，或停止產生該語系的路由，並從 hreflang 與 sitemap 移除。Noindex 與跨語言 canonical 與 hreflang 矛盾，故不是修法。大量時 (high)，少數頁面時 (medium)

### 1.7 Locale sitemap

每個語系 URL 各有自己的 `<url>`，帶相同的 `xhtml:link` alternates（每個語系加 `x-default`）。

- 缺 `xmlns:xhtml`；語系 URL 無自己的 `<url>`；集合缺其 `<loc>`。Next.js `app/sitemap.ts`：`alternates.languages` 除非列出，否則會漏掉 `<loc>` URL 自己的語系。(high)
- 逐語系檔案（`sitemap-de.xml`）必須全部互相參照 → 改依內容類型拆分。(low)
- 只有 `<loc>` 計入 50,000 個 URL，但 alternates 會先觸及 50MB 上限：約 20 個語系時，每個檔案保持 2,000–5,000 個 URL。超過時 (medium)

## Part 2. Local

### 2.0 Business model first

實體店面、服務區域（人員到府）、混合或多地點：從 product-marketing 檔或程式碼判斷（可見的地址與營業時間、`areaServed`、地點路由）。仍未知 → 執行所有檔案對檔案的檢查，只把取決於模式的判斷（是否公開地址、分店對 `areaServed`、城市頁）標為 "needs user"。僅線上營運 → 略過 Part 2。

Grep `tel:|LocalBusiness|Organization|openingHours|PostalAddress|areaServed|GeoCoordinates|google.com/maps|locations|service-area`；讀 footer、聯絡頁、`lib/business.*` 與 CMS 的地點模型。

### 2.1 Name, address, phone (NAP)

- 事實在多處寫死且不一致（footer `…0100`，JSON-LD `…0199`）。比較語意，不比標點：`St` 對 `Street` 沒問題 → 一個模組或 CMS 紀錄供應 footer、聯絡頁與 JSON-LD。(high)
- `tel:` 非國際格式 → `tel:+15125550100`。(low)
- 名稱堆砌關鍵字（`Acme Plumbing | Best Plumber Austin`）→ 改用真實名稱。(medium)
- 服務區域或居家商家公開了顧客不會到訪的地址（頁面或 JSON-LD）→ 移除；私人地址絕不填入欄位。(high)

### 2.2 LocalBusiness / Organization JSON-LD

Markup 可能由 JS 或 plugin 注入，故 grep 沒找到不代表不存在；檢查 rendered HTML。品牌：首頁一個 `Organization`（`@id` `https://example.com/#org`、`name`、`url`、`logo`、`sameAs`）。每個真實地點：在其自己的頁面放一個 block，含自己的 `@id`、最具體的 subtype、`telephone`、`PostalAddress`、`geo`、`openingHoursSpecification`、`areaServed`，以及指向品牌 `@id` 的 `parentOrganization`。

- 營業時間、電話或地址與可見頁面不同 → 兩者皆由 2.1 的來源 render。(high)
- 服務的城鎮被標為分店並使用捏造地址 → 改為一個含 `areaServed` 的商家。(high)
- 每頁相同的 block、一個 block 含多個地點，或共用 `@id` → 每個地點頁一個 block，各有自己的 `@id`。(medium)
- 缺營業時間 → `openingHoursSpecification`。24 小時：`00:00`–`23:59`；跨午夜：單一 spec `18:00`–`03:00`；假日休息：`00:00`–`00:00` 並帶 `validFrom`/`validThrough`。(medium)
- 有合適 subtype 卻用泛稱 `LocalBusiness` → 用最具體者（`Dentist`、`Restaurant`）；多個時用陣列。(low)
- `geo` 小數少於 5 位，或用於服務區域的城鎮 → ≥5 位小數，僅限實體地點。(low)
- 無公開地址的服務區域商家 → 省略；Google 的 local rich result 要求 `address`，故回報為未滿足，不要捏造。(low)

### 2.3 Location and service-area pages

- 地點頁缺自己的事實：地址、當地電話、營業時間、該處提供的服務、預約或來電連結、停車與交通、地圖。(medium)
- nav 或 footer 無 `/locations` index，或服務頁未連到提供該服務的地點；僅能經 sitemap 抵達的頁面是 orphan。(medium)
- 只有名稱不同的城市頁（`generateStaticParams`/`getStaticPaths` 遍歷只有 `name`/`slug` 的紀錄，body 內插 `{city}`）是 doorway 頁 → 一個服務區域頁，或真實的逐城市資料（在該地完成的工作、涵蓋限制、出勤費）；規模化屬 Stage 3。(high)
- 服務區域頁暗示有辦公室（"visit our Round Rock office"）→ 說明這是服務區域：涵蓋範圍、出勤政策、如何預約。(high)

### 2.4 Map embed

Grep 含 `google.com/maps`、`maps.googleapis.com`、Mapbox 或 Leaflet 的 `<iframe`。

- 地址只在地圖內，而地圖不是頁面文字 → 同時以文字 render。(medium)
- 立即載入的 iframe 或 JS 地圖 → `loading="lazy"`，或改用連到外部的靜態圖片。(medium)
- 無路線連結 → `<a href="https://www.google.com/maps/dir/?api=1&destination=100+Congress+Ave+Austin">Directions</a>`。(low)

### 2.5 Review markup

Grep `aggregateRating|ratingValue|reviewCount|"review"` 與評論 widget。

- 商家自己的 LocalBusiness 或 Organization 上的 `aggregateRating` 或 `review` 不會得到星星：Google 排除自利評論。從 Business Profile 複製的評分（寫死 `"ratingValue": 4.9`）也不是可見內容 → 移除；見證留作純文字。(medium)

站外、無法從專案完成的事項：Business Profile 作業、citations、評論邀請與回覆、Search Console 提交、排名追蹤。僅在某項 finding 依賴其中之一時，才將其標為 "needs user" 並提及。

## 輸出

每行一項 finding，依章節，優先級最高者先：`file path` — 問題 — 修法 — 優先級。範例：

`app/[locale]/layout.tsx:12` — `<html lang="en">` on every locale — `lang={locale}` with the hreflang code — medium

每項標 "verified"（live 檢查）、"needs live verification" 或 "needs user"。列出站得住腳的章節，每個一行，讓修復步驟知道不要動什麼。
