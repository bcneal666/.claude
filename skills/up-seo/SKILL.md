---
name: up-seo
description: 對目前專案執行一次 SEO 流程，分三階段（AI 搜尋可見度、技術與頁面內 SEO 稽核、程式化 SEO 機會），共用同一份上下文；每階段結束後由使用者挑選要修的項目。可選網站 URL 或 @path 範圍。
argument-hint: "[url] [@path ...]"
disable-model-invocation: true
---

對目前專案（cwd）做 SEO 流程：AI 可見度 → 技術/頁面內稽核 → 程式化機會。留在主對話，勿 fork，因使用者在一階段的選擇會影響下一階段。

Arguments: `$ARGUMENTS`

**Pick** = AskUserQuestion，multiSelect，每題 ≤4 個選項，附 "All" 選項。超過四項的 findings 放進後續題目，優先級最高者先。

## 檔案

`<skill-dir>` = 本 SKILL.md 所在目錄。執行所需檔案皆在此；到指名該檔的階段再讀。references 供稽核用：列出 findings 與修法，不編輯檔案，因使用者須先挑選。

| 檔案                                | 讀取時機                                     | 用途                                              |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| `references/ai-visibility.md`       | Stage 1                                      | llms.txt、AI 爬蟲存取、可被引用的結構、結構化資料 |
| `references/technical-onpage.md`    | Stage 2                                      | 可爬取性、索引、metadata、結構化資料、效能        |
| `references/international-local.md` | Stage 2，僅限多語系（locales）或在地商家時讀 | hreflang、語系 URL、LocalBusiness markup          |
| `references/programmatic.md`        | Stage 3                                      | Playbook 適配、go/no-go、品質防護、pilot 計畫     |

## 步驟

1. **一次收集上下文**，各階段不再重問。
   - 以 `http` 開頭的 token = 網站 URL；`@path` token = 範圍（去掉 `@`）；path 不存在 → 列出該 path 並停止。
   - 若存在，讀專案 `CLAUDE.md`、`.agents/product-marketing.md` / `.claude/product-marketing.md`。
   - 偵測框架、i18n/locales、渲染模式、sitemap/robots/`llms.txt` 來源；未提供網站 URL 時一併偵測（config、`metadataBase`、sitemap、package homepage）。仍未知 → 問一次。
   - 印出簡短上下文區塊：URL、框架、locales、範圍。帶入每個階段。

2. **Stage 1 — AI 可見度。** 讀 `references/ai-visibility.md`，據此稽核範圍內檔案；輸出依優先級排序的 findings，附具體到檔案層級的修法。
   - Pick findings；在範圍內套用所選修法。未選任何項目 → 繼續。

3. **Stage 2 — 技術與頁面內。** 讀 `references/technical-onpage.md`；上下文區塊顯示多語系（locales）或在地商家時，另讀 `references/international-local.md`。稽核可爬取性、索引、metadata、canonical/hreflang、結構化資料與效能；有 URL 時執行 live-URL 檢查；輸出依優先級排序的 findings 與修法。同樣的 Pick 並套用流程。略過 stage 1 已修的項目。

4. **Stage 3 — 程式化。** 讀 `references/programmatic.md`。評估哪些 playbook 適合本專案的真實資料，並提出計畫：模式、URL 結構、模板、每頁獨特價值、品質防護。僅出計畫；不產生頁面。
   - 呈現計畫；使用者透過 AskUserQuestion 挑選。僅實作所選的模板/路由骨架，搭配小型 pilot 集合，絕不大量建頁。答案 "programmatic does not fit here" 是有效的計畫。

5. **摘要。** 上下文；各階段 findings（applied / skipped / needs user）；變更（`file:line`）；需 live 驗證項目（索引、排名、AI 引用無法在本機確認）。

## 規則

確保一次性流程可檢視，且不危及使用者網站。

- 不 `git commit`、`git push` 或部署：使用者自行檢視 working tree 並上線。
- 遵守專案 CLAUDE.md 的 AdSense 政策（若存在）：不做 thin、重複或自動 spin 的頁面，不做違反政策的廣告版位變更，因政策處分的代價高於任何 SEO 收益。
- 不申請新的 AdSense 帳號，不新增廣告聯播網。
- 僅編輯範圍內檔案；範圍外的問題寫進摘要。
