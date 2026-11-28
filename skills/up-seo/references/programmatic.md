# 程式化 SEO：適配、計畫、pilot

本檔用於 Stage 3 的 EVALUATION 與 PLANNING；讀一次。判斷「模板加資料」的頁面是否適合專案的真實資料、提出計畫，且不建立任何頁面。
在適配性被證明前就建的頁面，規模化後會變成 thin 頁面，有被降權與 AdSense 政策處分的風險。
使用者挑選後，僅建立路由/模板骨架與小型 pilot 集合（§7）。

沿用 step 1 的上下文（URL、框架、語系、渲染模式）；不重問。專案 CLAUDE.md 載有 AdSense 政策（不做 thin、重複或自動 spin 的頁面）時，下列每道 gate 皆為硬性 gate。

## 1. Fit test

程式化僅在三項皆成立時適合。以 repo 內容回答，不以該領域通常有什麼來回答。

1. **每頁有真實資料。** 找出來源：DB schema 或 migrations、repo 內的 JSON/CSV/YAML、CMS collections、app 已在呼叫的 API。計算 row 數、每 row 的欄位數，以及兩個 row 之間有多少欄位不同。只有名稱清單（城市、工具、詞彙）、每 row 別無他物，不算資料。
2. **有需求的重複搜尋模式。** 點出模式（`[service] in [city]`、`[x] vs [y]`）及其變數。Stage 3 沒有關鍵字工具：有證據時（Search Console queries、analytics landing pages、站內搜尋紀錄、使用者的說法）把需求標為 **verified**，否則標 **assumed**。絕不捏造搜尋量。
3. **模板本身給不出的價值。** 每頁以該 row 特有的內容回答其 query：數字、列表、運算出的比較、可運作的工具。測試（hide-the-name test）：隱藏變數名稱；若兩頁此時讀起來相同，即為 thin。

資料防禦力，由強到弱：proprietary > product-derived（使用者的活動）> user-generated > licensed > public。僅有 public 資料表示任何人都能發佈相同頁面；僅當專案在其上加了運算或分析時才適合。

## 2. When the answer is "don't do programmatic here"

任一項成立即判定 NO-GO。直接說明並附原因，然後推薦替代方案。

- **無逐 row 資料。** 獨特部分將是沒有來源 row 支撐的 LLM 撰寫散文。無論 prompt 多好，那都是自動 spin 的內容。
- **僅變數替換。** 頁面只差在名稱、title 與一句話。
- **頁面太少。** 候選僅寥寥數個（個位數）→ 手寫；模板增加風險卻省不了工。十幾個以上、每個都帶獨特資料的 row（見 content gate）仍可支持小型的 hub-and-detail 目錄：以 row 品質判斷，不以頁數門檻判斷。
- **無重複模式。** 該變數的 query 沒有共同形態，或使用者確認沒人搜尋。
- **資料過時。** Row 無法更新；過時的頁面是錯的也是 thin 的。
- **Cannibalization。** 這些頁面會鎖定既有手寫頁面已涵蓋的 query。
- **無 server HTML。** 無 SSR 或 prerender 的純 client SPA：爬蟲在初始 HTML 中拿不到內容。先修 rendering。

替代方案：為少數最強的變數手寫頁面；一個 hub 頁加可篩選的全部 row 表格；用該資料充實既有頁面。

## 3. Playbook catalog

| Playbook     | Query                  | URL                      | 每頁資料                           | 主要風險                    |
| ------------ | ---------------------- | ------------------------ | ---------------------------------- | --------------------------- |
| Templates    | `[type] template`      | `/templates/[type]/`     | 可用的模板，多種變化               | 僅預覽的頁面                |
| Curation     | `best [category]`      | `/best/[category]/`      | 準則、真實測試、更新日期           | 未經測試的排名              |
| Conversions  | `[x] to [y]`           | `/convert/[x]-to-[y]/`   | 準確的費率或公式、可運作的工具     | 數字錯誤；逐金額複製頁      |
| Comparisons  | `[x] vs [y]`           | `/compare/[x]-vs-[y]/`   | 真實的功能與價格資料、依用途的結論 | 一面倒；`a-vs-b` + `b-vs-a` |
| Examples     | `[type] examples`      | `/examples/[type]/`      | 附分析的真實範例                   | 無評論的爬取圖庫            |
| Locations    | `[service] in [city]`  | `/[service]/[city]/`     | 在地列表、價格、規則               | 換城市名（doorway 頁）      |
| Personas     | `[product] for [role]` | `/for/[persona]/`        | 分眾功能、使用情境、見證           | 只換受眾名詞                |
| Integrations | `[a] [b] integration`  | `/integrations/[b]/`     | 可運作的整合、設定步驟             | 不存在的整合                |
| Glossary     | `what is [term]`       | `/glossary/[term]/`      | 定義、範例、相關詞彙               | 僅字典深度，或為產生內容    |
| Translations | 任何 query，其他語言   | `/[lang]/[page]/`        | 人工審閱的在地化、hreflang         | 機器翻譯 = auto-spun        |
| Directory    | `[category] tools`     | `/directory/[category]/` | 每個列表的細節、篩選、更新         | 僅有名稱的列表              |
| Profiles     | `[entity] [attribute]` | `/companies/[name]/`     | 有來源的事實加自有彙整             | Wikipedia 改寫              |

**對應資產。** Proprietary 資料 → Directory、Profiles、Curation。有整合的產品 → Integrations。設計或創意類產品 → Templates、Examples。多分眾受眾 → Personas。有在地據點 → Locations。工具或實用程式 → Conversions。內容或專業 → Glossary、Curation。國際受眾 → Translations。競爭者版圖 → Comparisons。

**疊加** playbook（`best coworking spaces in san diego` = Curation + Locations）僅在每一層都帶來自己的資料時；沒有資料的一層會使 thin 頁面倍增。

**URL。** 主網域下的子資料夾：它繼承網站的內部連結，而子網域需要自己的（Google 對兩者排名無偏好）。Slug：小寫、連字號、取自穩定 ID 或正規化名稱。

## 4. Go/no-go checklist

對每個候選 playbook 執行；每行標 pass、fail 或 unknown。

- [ ] 已找到資料來源；已計算 row 數與每 row 欄位數（§1.1）
- [ ] 兩個隨機 row 通過 hide-the-name 測試（§1.3）
- [ ] 獨特內容來自資料或使用者，不是產生的散文（§2）
- [ ] 已點出重複模式；需求已標 verified 或 assumed（§1.2）
- [ ] 足夠多的 row 通過 §5 的 content gate，足以支持模板（§2）
- [ ] 存在更新路徑（rebuild、revalidate、sync）
- [ ] Server-rendered 或 prerendered HTML
- [ ] 與既有頁面的目標 query 無重疊
- [ ] 逐頁的 noindex、canonical 與 sitemap 成員資格可在程式碼中控制

任一 fail → 該候選 NO-GO。每個 unknown → 說明什麼能解決它。Assumed 需求不阻擋 pilot，但列為第一項風險。

## 5. Quality safeguards

建進模板；它們隨 pilot 一起上線，不是之後才補。

- **Content gate in code。** 一個函式（如 `isPublishable(row)`），含明確規則：必要欄位齊全、無 placeholder 值、至少 N 個資料驅動的區塊非空且 row 之間不同（house heuristic：三個）。AdSense 政策下，未通過的 row 不 render（404）：該政策禁止 thin 頁面，不只限於被索引者，且 noindex 的頁面仍會投放廣告。無該政策時，`noindex, follow` 加 sitemap 排除即可接受。
- **弱變體用 noindex。** 對訪客有用但無搜尋需求的獨立頁面（極小的分類）用 `noindex, follow`；不放進 sitemap。
- **Canonical。** 每頁絕對 URL 的 self-referencing canonical。每個 entity 一個 URL：正規化大小寫、結尾斜線與同義詞（`nyc` 對 `new-york-city`），其餘 301；比較頁用單一順序（字母序），反向 301；sort、filter 與追蹤參數 canonicalize 到乾淨 URL；`?page=N` 維持 self-canonical。
- **Metadata。** 唯一的 title、description 與 H1，由資料欄位建立，不只靠變數。結構化資料僅限頁面可見的內容。
- **Hub 與 spokes。** 每種頁面類型一個 hub，列出每個已發佈的 spoke；每個 spoke 連回其 hub、有 breadcrumbs（BreadcrumbList），並連到幾個依資料挑選的相關 spoke（同分類、鄰近）。每個 spoke 都能從網站導覽經由純 `<a href>` 抵達；無 orphan。
- **Pagination。** 長 hub 以純連結分頁（`/compare/page/2/`），每頁 self-canonical。不將第 2 頁 canonical 到第 1 頁，也不把 spoke 藏在無連結的 infinite scroll 後。
- **Sitemaps。** 每種頁面類型一個 sitemap，置於 sitemap index 之下，每檔最多 50,000 個 URL 與未壓縮 50 MB。僅列已發佈、可索引、canonical 的 URL；`lastmod` 取自 row 的真實更新時間，不是 build 時間。
- **Crawl budget。** 於數千個 URL 時才重要。只為有需求的變數組合產生 URL，不為每種 filter 組合都產生；已刪除的 row 回 404 或 410，絕不回空的 200 頁面（soft 404）；保持 server 回應快速。

## 6. Plan output

```
Verdict: GO | NO-GO (one-line reason)
Data inventory: source (file or table), rows, fields per row, refresh path

Candidate 1: <playbook>
- Pattern and demand: `[x] vs [y]`; verified (source) | assumed
- URL: hub `/compare/`, spoke `/compare/[a]-vs-[b]/`
- Pages: N candidate rows → M pass the content gate
- Template: sections, each fixed | data | conditional
- Unique value per page: what this row shows that siblings don't
- Content gate: the isPublishable rules
- Safeguards: canonical rule, noindex rule, sitemap file, hub and related links
- Pilot: slugs sized per "Pilot size", and why these
- Files: route, loader, gate, hub, sitemap
- Risks

Rejected: <playbook>: reason (one line each)
Needs live verification: indexing, impressions, ranking of the pilot
```

NO-GO（無候選通過 §4）→ 給出原因與 §2 的替代方案；不做 pick。GO → 對最多三個排序後的候選做 Pick，使它們加 "All" 能放進一題。

## 7. After the pick: scaffolding and pilot

建立路由、模板、資料 loader、content gate、hub 與 sitemap 條目。只 render pilot slug；其他所有 slug 在 pilot 證明成功前都 404。不把產生的散文寫進資料：沒有來源資料的區塊就省略（conditional），不要填充。

**唯一真實來源。** 單一 `getPublishedPages()` 套用 gate 與 pilot 清單；路由參數、sitemap、hub 與相關連結都讀它，故 sitemap 絕不會列出會 404 或被 noindex 的頁面。以下 API 名稱為範例；以已安裝版本的文件為準。

**框架**（Next.js App Router、Astro、SvelteKit、Nuxt、Remix：以已安裝版本的文件為準）。Prerender 或 server-render 一份明確的 pilot slug 清單（`generateStaticParams` + `dynamicParams = false`、`getStaticPaths`、`entries`、prerender routes）；其他所有 slug 回 404，gate 失敗則呼叫框架的 404。Metadata 設定 title、description、絕對 URL canonical，以及 noindex 變體的 `robots`。sitemap（大時依頁面類型拆分）讀 `getPublishedPages()`，`lastmod` 取自真實的 row 日期；`@astrojs/sitemap` `filter` 會剔除未發佈與 noindex 的 URL。

**CMS-backed**（WordPress、headless CMS）。一個 collection 或 post type 加欄位；逐項的 noindex 與 canonical 透過欄位或 SEO plugin；對照方案的項目上限與明年的頁數。

**Client-only SPA。** 在有 SSR 或 prerender 前為 NO-GO；改以提出它作為第一步。

**Pilot size。** 最強頁面（row 最完整、需求最明確）的小型子集：小資料集幾個，大資料集幾十個，絕不是整個集合。待 pilot 上線，且 Search Console 顯示頁面已被索引並取得曝光後才擴大。大量 "Crawled – currently not indexed" 代表模板是 thin：新增 row 前先修。在摘要中將這些檢查列於 live 驗證之下。
