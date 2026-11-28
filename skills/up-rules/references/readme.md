# README.md sync (step 8)

每次執行都檢查專案根目錄 `./README.md`。

**存在** → 讀取，比對精煉後的規則檔與實際目錄結構，判斷是否需要更新：規則檔區段新增／移除（含 step 5 新增的 `rules/*.md`）應反映在 README；README 提到的 command / skill / 路徑 / 設定已不存在或已改名。README 語言 ≠ `--lng` 語言也算需要更新；整份翻成目標語言（程式碼區塊、路徑、指令、專有名詞不翻譯）。README 違反下方任一 "Style guide" 規則也算需要更新（段落長度、表格 vs 清單的選擇、表格對齊、emoji、裸 URL、歷史用語、長度與深度預算、圖表）。清單不符（見下）也算。重新整理風格並精簡至要點；絕不新增或更動事實——精簡細節不算更動事實。無需更新 → 回報 「README 已同步，未改動」；不為改而改。

**不存在** → 建立；內容判斷標準相同，依 Style guide 組織；專案專屬區段：目錄樹（執行期產物註明已 gitignore）、"Inventory sync" 的清單區段、關鍵設定、維護慣例。

## Inventory sync

每次都執行，不論 README 是否存在。比對實際存在的項目與 README 所列；缺的補上、已不存在的刪除、列順序依實際為準。

| 類別      | 實際來源                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| Rules     | `./.claude/rules/**/*.md`（本 repo：`./rules/**/*.md`）                                                                 |
| Skills    | `./.claude/skills/*/SKILL.md`（含指向 `.agents/skills/` 的 symlink；名稱 = 目錄名稱）（本 repo：`./skills/*/SKILL.md`） |
| Commands  | `./.claude/commands/**/*.md`（本 repo：`./commands/**/*.md`）                                                           |
| Subagents | `./.claude/agents/**/*.md`（本 repo：`./agents/**/*.md`）；名稱 = frontmatter `name`，否則為不含 `.md` 的檔名           |
| Hooks     | `./.claude/settings.json` 的 `hooks` 事件及其呼叫的腳本檔（本 repo：`./settings.json`）                                 |
| MCP       | `./.mcp.json` 的 `mcpServers`                                                                                           |
| Plugins   | `./.claude/settings.json` 中設為 `true` 的 `enabledPlugins` 項目（本 repo：`./settings.json`）                          |

- 僅列本專案實際存在的項目。全域 `~/.claude/` 的項目不列（例外：專案根目錄本身即 `~/.claude`，如本 repo）；絕不寫 "now provided globally" 或類似字句。
- 類別有項目但 README 缺該區段 → 新增區段。類別為空 → 不設區段。
- 每類別輸出一張表，依 "Tables"：欄位 `Name | Purpose`（Rules、Skills、Commands、Subagents、MCP、Plugins）或 `Script | Event | Purpose`（Hooks）；各次執行的表頭與欄位順序相同。Purpose 一行（≤ ~80 display width），取自 SKILL.md / rule / subagent 的 `description` 或首段；絕不臆測。
- 回報每類別新增或移除了什麼；全部相符 → 「清單已同步」。

README 免用 step 6 全部 terse style 規則（含片段句與 emoji 禁令）——讀者是人：完整句、自然語氣、活潑但精簡。新增或更新的內容一律用 `--lng` 語言（預設 English），含目錄樹註解與表格說明欄。

## Style guide

**Structure**（由上而下，不適用者略過）：

1. `# <emoji> <name>` + 一行 tagline（≤120 chars）。Badge 僅在帶有真實訊號時放（CI、version、license）；設定類 repo 通常不放
2. Intro：≤2 句，或 3–6 個重點（依 "Writing" 用表格或條列）
3. 目錄僅在 README 超過 100 行時放
4. `🚀 Quick start`：可直接複製貼上的程式碼區塊
5. 專案專屬區段（structure、commands、skills、subagents、settings、maintenance…）
6. Contributing / License 僅在 repo 有時放

**Writing**：

- 段落 ≤3 句。3 項以上的並列項目，絕不寫成逗號串接的一段
- 3 項以上並列且共用 key（name、command、path、role…）→ **優先用表格**：key 放第一欄、說明放最後一欄。見 "Tables"
- 僅在以下情形改用清單：
  - 任一項說明超過 2 行（~120 display width；CJK／全形字元算 2，≈60 個 CJK 字）——先依 "Depth" 精簡；仍太長 → 整組改清單，絕不在同一組混用表格與清單
  - 項目沒有自然 key（純句子；表格會變成單欄）
  - 項目是有序步驟 → 編號清單
- 清單項：一個 bullet 一個概念，`- **Name** — description` 或 ``- `code` — description``
- 表格儲存格 ≤ 一個短句（≤ ~120 display width）；細節移到表格下方的 bullet 或 `<details>`
- 程式碼區塊帶語言標籤；連結 repo 檔案用相對連結
- URL 絕不裸放：優先 `[text](url)`，URL 本身即文字時用 `<url>`——GFM autolink 會延伸到空白或 `<` 為止，相鄰的 CJK 字元、全形標點（`。，）：`）或其他文字會被吞進連結，導致無法點擊。`[text](url)` 內的 URL 不含空格（編碼為 `%20`）。程式碼區塊／行內程式碼中的 URL 不動
- 活潑但不推銷：tagline 說明使用者得到什麼，而非技術堆疊；功能用重點表（`Name | one sentence`），僅在一列會太長時改用 bullet `- **Name** — one sentence`，可加貼切的 emoji；動詞要具體（"customers file tickets, PMs reply live"，不要 "provides ticketing"）

**Current state only**：

- README 描述現在為真的事。不寫歷史：migration、移除、搬移、改名、"formerly / no longer / now provided by / moved to / 原本 / 不再 / 改由 / 已移除 / 新增了"。刪掉的東西直接消失。
- 歷史屬於 git log 或 CHANGELOG，不屬於 README。

**Depth**（README 是導覽，不是規格）：

- 測試：新人第一天需要這個嗎？不需要 → 不寫。
- 每個功能：一行摘要加 ≤3 個使用者可見的重點；更多 → `<details>` 或刪除。
- 不寫：快取時間、DB 欄位與 SQL、演算法與公式、檔案層級的實作對照、邊界案例、UI 微互動（動畫、skeleton 時序）。這些屬於 `rules/` 或程式碼；需要時用一行連結（`details: .claude/rules/xxx.md`）。
- 長度預算：一般專案 README ≤300 行（含 `<details>` 內容）。超出 → 先刪細節，其次折疊。

**Emoji**：H1 與每個 H2 開頭各放一個語意貼切的 emoji，同一份 README 內不重複；重點列／bullet 可用，狀態欄可用 ✅ / ❌；內文 prose、程式碼、路徑中一律不放。預設選用，以維持各次執行一致：

```
🚀 Quick start   ✨ Features    📁 Structure    ⚡ Commands     🧩 Skills
🤖 Subagents     🔌 Plugins     ⚙️ Settings     🛠️ Maintenance  📝 Notes
🤝 Contributing  📄 License
```

**Tables**：

- **Aligned source**：儲存格兩側各留一個空格；以空格補到欄寬，使每列的 `|` 垂直對齊；寬度 = display width（CJK／全形字元與 emoji 算 2）；分隔列的 dash 填滿欄寬。專案使用 prettier 時，結果應與 `prettier --write` 相符（執行以驗證）。儲存格內的字面 `|` → `\|`
- **Consistent structure**：同類表格（如各 inventory 類別）共用表頭名稱與欄位順序；表頭簡短，用 `--lng` 語言；每欄一種格式（全程式碼或全純文字，不混用）；預設靠左對齊，數字欄用 `---:`；≤4 欄，更多 → 拆表或把細節移到表格下方 bullet
- **Lean cells**：每格一個短句；不換行、不用 `<br>`、格內不放清單；同欄描述長度相近；太長 → 精簡文字，絕不加寬欄位

**Markdown features**：

- GitHub callout（`> [!NOTE]` 等）：每區段 ≤1 個，絕不巢狀
- 長參考內容（完整清單、平台 workaround）→ `<details><summary>…</summary>`，`</summary>` 後留一空行，否則內部 Markdown 不會渲染
- 目錄樹 → 純 `text` 程式碼區塊，用 `├──` / `└──`（「不放圖」規則的允許例外）；`# comment` ≤3 個詞，每行 ≤80 cols；更長的細節 → 樹下方的 bullet
- 3 步以上的流程 → 編號清單；檢核表 → `- [ ]` task list
- 不放圖：不用 Mermaid、SVG 或框線 ASCII
- `--lng` 下不翻譯：callout 關鍵字、emoji、目錄樹中的路徑

**Self-check before writing**：瀏覽標題與各區段首行；讀者須在 30 秒內得知這是什麼、如何開始、東西在哪。再做機械檢查：每張表的 `|` 皆對齊（全形 = 2），同類表頭一致；行數在預算內；歷史用語命中數為零（grep "Current state only" 中的詞）；`mermaid` / 框線圖命中數為零；程式碼外無裸 URL（每個 `http(s)://` 前面皆為 `(` 或 `<`）；inventory 類別與實際檔案相符。
