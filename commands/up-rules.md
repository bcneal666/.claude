---
description: 校正 CLAUDE.md 事實、按需分塊到 rules/、以 caveman full 極限壓縮規則文件（CLAUDE.md / .claude/rules / .claude/commands），只保 AI 可解析語意；同步檢查並維護專案根 README.md 供人類閱讀；`--audit` 時先以 prompt-audit 審查過時指令；`--lng` 指定所有檔案內容語言（預設英文）
argument-hint: "[--audit] [--lng <zh|ja|...>]"
disable-model-invocation: true
---

規則檔僅供 AI 讀取，啟用時整份載入（`CLAUDE.md` 每 session、`rules/` 依 `paths`、commands 於呼叫時），人類極少閱讀。壓縮至 `caveman` **full**，**不損失指令語意**。

壓縮贅詞、重複、裝飾性說明。具體規則、限制、附於規則的理由（「——因為…」子句）、消歧義範例一律不動——理由讓模型能判斷規則未涵蓋的情境；壓語意以外的裝飾，不壓語意。

## 參數（從 `$ARGUMENTS` 解析，順序不拘）

- `--audit`：見步驟 3
- `--lng <code>` 或 `--lng=<code>`：本指令寫入的**所有檔案內容**語言——壓縮目標（`CLAUDE.md`、`rules/`、`commands/` prose）與 `README.md` 皆遵循；接受 BCP-47 代碼（`zh`、`ja`、`de`，不分大小寫）或自然語言名稱（`繁中`、`日文`、`Japanese`）
  - 未給 → **英文**
  - 無法辨識或缺值 → 一行提示，**退回英文**，繼續；不中止
  - `zh` → 繁體中文（`zh-cn`/`簡中` → 簡體中文）
  - 既有檔案語言 ≠ 目標 → 需改寫；翻成目標語言，語意等價
- 其他未知 token → 一行提示，忽略；不中止
- `--lng` 僅管檔案內容；對話與報告一律繁體中文

## 目標檔案

### 壓縮目標（caveman full，只留 AI 可解析語意）

- `CLAUDE.md`（專案根）
- `./.claude/CLAUDE.md`
- `CLAUDE.local.md`（專案根）與 `./.claude/CLAUDE.local.md`——個人、機器本地，通常 gitignore；處理同 CLAUDE.md（事實查核、壓縮、無損驗證）；絕不加入 README 或 commit
- `./.claude/rules/**/*.md`（遞迴，含子目錄；專案根本身就是 `.claude` 目錄（如本 repo）→ `./rules/**/*.md`）
- `./.claude/commands/**/*.md`（含命名空間子目錄；專案根本身就是 `.claude` 目錄（如本 repo）→ `./commands/**/*.md`）

僅處理存在者；缺少即略過（多數機器無 `CLAUDE.local.md`——正常，不提示）。其他 `@path` 匯入檔除非列於上方，否則不主動壓縮。

⚠️ `./.claude/rules/**/*.md`（或本 repo 的 `./rules/**/*.md`）是**使用者層級規則**，適用於本機所有專案，不只本專案；建立或修改前，確認範圍並非本 repo 獨有。

⚠️ 絕不在任意專案 glob 裸 `commands/**/*.md`——一般專案的 `commands/` 可能是原始碼（如 CQRS command 模式）；僅明確對應 Claude Code `.claude/commands/` 的路徑才算目標。

### 同步目標（人類可讀優先，不壓縮）

- `./README.md`（專案根）——見「步驟 8」

僅處理上列路徑；**不**延伸到 `skills/`、`settings.json`。例外：「清單同步」（步驟 8）的唯讀盤點——絕不壓縮或修改這些檔案。

## 流程

### 1. 蒐集脈絡

- Glob 實際存在的壓縮目標（含 `.claude/rules/**/*.md`、`.claude/commands/**/*.md`），全部讀取；檢查 `./README.md` 是否存在。
- `git log --oneline -15` + `git diff` 看近期方向。找出與既有內容**重疊、重複或矛盾**的新規則——優先合併或刪除。將重疊帶入後續步驟，不只是看過。

### 2. 更新 CLAUDE.md（事實校正）

僅修事實；不新增行為規則。

- 檢查 CLAUDE.md（含 `./.claude/CLAUDE.md`、`CLAUDE.local.md`、既有 `rules/**/*.md`）提及的每個路徑、指令/skill 名稱、設定值、hook 檔名；確認仍存在。
- `CLAUDE.local.md` 與 CLAUDE.md 重疊或矛盾 → 僅回報，不跨檔合併（本地檔是個人覆寫；由使用者決定）。
- 依步驟 1 的 git log/diff 修正已改名、已刪除、值已變的項目；合併步驟 1 找到的重疊或矛盾規則。
- 無需校正 → 回報 「CLAUDE.md 事實已同步，未改動」；不為改而改。
- 記錄每項校正（前→後、依據）供步驟 9 報告。

### 3. 過時指令審查（有 `--audit` 時）

`$ARGUMENTS` 缺 `--audit` → 略過此步，不提及，流程視為無此步。

有 `--audit` →

- 呼叫 `Skill(skill: "claude-api", args: "prompt-audit")`，範圍限於步驟 1 蒐集的壓縮目標檔（不含 README.md、`skills/`、`settings.json`）；目標模型依 prompt-audit 自身的 Step 0 規則。
- 取得審查報告與建議 diff 後**暫停**；列出發現，請使用者逐一挑選要套用的 hunk——不採用 prompt-audit 預設的「不詢問、只給 diff」；本指令為互動式。
- 選定的 hunk → 套用至檔案；未選者僅留在報告，不套用。
- 低信心/`flag` 項目僅回報，不作為可選 hunk 提供。
- 套用結果併入步驟 4 指令清單基準——被刪除的語意**不**列入，讓步驟 7 驗證不誤判為遺失。

### 4. 建立指令清單（壓縮前）

以步驟 2 校正與步驟 3 已套用 hunk（若有執行）後的內容為準，逐檔列出**明確指令清單**——規則、限制、禁令、格式要求各自成項；附屬理由隨條目一起列。清單是後續無損驗證的基準；必須在編輯前建立。壓縮強度越高，遺失風險越高。

### 5. 檢查與分塊

準則——**兩項皆成立**才將內容移至 `rules/<topic>.md`：

- 內容僅在處理特定檔案/目錄/副檔名時適用，可用明確 glob 表達。
- 規則不需在「未先讀取類似既有檔案就建立新檔」的情境生效——`paths` 規則僅在 Claude **Read** 到符合的檔案時載入，不是每次工具呼叫都載入；新檔情境會漏載；關鍵規則不分塊。

**不分塊**：

- 全域行為規則（語言、時區、commit/報告慣例等）。
- 無法對應 glob 的主題——無 `paths` 的規則仍於啟動時載入，同 CLAUDE.md，省不了脈絡；不做。
- 多步驟流程/任務型工作流——不適合當規則；於報告中**建議**改寫為 skill 或 command；不自動轉換。

**執行**：

- 建立 `rules/<topic>.md`（kebab-case 主題檔名，可用子目錄分組），frontmatter 僅 `paths`：
  ```markdown
  ---
  paths:
    - "src/api/**/*.ts"
  ---
  ```
  glob 一律加雙引號——以 `*` 或 `{` 開頭的未加引號字串會被 YAML 誤解析，破壞 frontmatter，使規則退化為無 `paths` 的全量載入。
- 驗證每個 glob 至少符合 1 個既有檔案；0 筆 → 仍寫入，於報告標警告。
- 從 CLAUDE.md **完整移除**已搬走的內容；不留 `@path` 匯入（啟動即載入，等於沒省脈絡），不留重複副本。
- 既有 `rules/**/*.md`：路徑專屬內容缺 `paths` → 補上；與 CLAUDE.md 或其他規則重疊 → 合併。
- 無分塊需求 → 說明理由（如「全為全域規則，無檔案專屬內容」）；CLAUDE.md 超過 200 行且無可分塊內容 → 於報告註明行數。

### 6. 逐檔精煉（caveman full）

依下列 **caveman full 規則**改寫檔案內容（含步驟 5 建立/修改的規則檔）。不要 Read caveman skill——它管的是對話風格，會持續整個 session，且要求檔案用一般 prose，與本指令相反。

一併改寫：合併步驟 1 找到的重疊/重複規則；保留有助 AI 快速掃描的結構（標題、條列、表格、code block）。

**caveman full 規則**（僅限壓縮目標；README 一律不適用，見步驟 8）：

- 刪：冠詞、贅詞（just/really/basically）、客套、模糊修飾、裝飾性開場與收尾
- 留：否定與限定詞（not/never/no/only/except、不/勿/僅/除非）、數字與單位——刪掉會反轉語意
- 可：片段句、短同義詞（fix，不用 implement a solution for）
- 禁：自創縮寫、裝飾性表格、emoji
- 允許標準技術縮寫：DB / API / HTTP
- 句型：`[thing] [action] [reason]. [next step].`

**語言**：改寫後 prose 一律用 `--lng` 語言（預設英文）；來源語言不同 → 翻譯，語意等價。caveman full 精神（刪贅詞、客套、冗餘；留否定/限定詞與數字）適用任何目標語言。一律**保留原文**、不翻譯：

- 專有名詞與專案代號（如 `COSS`、主機名、服務名）
- 路徑、指令、環境變數、檔名
- **關於語言**的規則本身（如 「以繁中回應」）——規則 prose 隨 `--lng`，但引號內指名的目標語言不得更動
- 下方「逐字」清單的全部內容——含整個 command frontmatter 區塊，故 command 的 `description`/`argument-hint` 不隨 `--lng`
- 以中文引用的使用者可見輸出字串（如 「CLAUDE.md 事實已同步，未改動」）——報告語言維持繁體中文

**逐字（byte-for-byte）**：

- code block 與 fenced block 內所有內容
- 確切的指令字串（如 `git commit -m ...`）
- 格式模板（如 commit message 結構、`Co-Authored-By: ...` 之類的 trailer）
- 消歧義的好/壞範例（✅ 正確 / ❌ 錯誤）
- `@path` 匯入語法（如 `@CLAUDE.local.md`）——功能性語法，改寫會壞
- Frontmatter 鍵名與值（`description:`、`name:`、`paths:` 等）
- Command 檔 frontmatter **整個區塊**逐字（`description`、`argument-hint`、`allowed-tools`、`model`、`disable-model-invocation`）——`description` 驅動 slash command 觸發與清單顯示，壓縮會降低準確度
- Command 參數佔位符 `$ARGUMENTS`、`$1`–`$9`
- Command 以 `!` 開頭的 bash 執行語法——功能性語法，改寫會壞

僅壓縮這些區塊**周圍的 prose**；區塊本身不動。

**不壓縮**（依 caveman Auto-Clarity）——保留完整句子：

- **順序重要**的多步驟流程（刪連接詞易讀錯順序）
- 條件/例外分支（if / unless / 除非 / 僅當）
- 破壞性或不可逆操作的警告
- 壓縮造成技術歧義

檢驗：**壓縮後的文字若有第二種合理解讀，就不壓。**

### 7. 驗證無損（壓縮後）

逐項對照步驟 4 指令清單：確認**每一項**在改寫後仍存在於 CLAUDE.md ∪ `rules/**/*.md` 的聯集（`CLAUDE.local.md` 對自身驗證，不入聯集——維持獨立檔案）（語意等價即可，不必字句相同）。分塊項目必須落在 `paths` 涵蓋原範圍的規則檔。

⚠️ 憑感覺「好像沒少」不算驗證——須逐項核對清單，否則邊角規則會被靜默刪除卻回報成功。

Caveman 回讀檢查：片段化後順序/條件未被誤讀；技術術語、code、錯誤字串、`@path` 匯入逐字未動；無自創縮寫。

語言檢查：目標檔 prose 全為 `--lng` 語言（逐字區塊與專有名詞除外）；翻譯未改動任何否定、限定詞、數字、條件分支；語言規則引號內的目標語言未動。

### 8. README.md 同步

每次執行都檢查專案根 `./README.md`。

**存在** → 讀取，對照精煉後的規則檔與實際目錄結構，判斷是否需更新：規則檔段落新增/移除（含步驟 5 新建的 `rules/*.md`）應反映於 README；README 提及的 command / skill / 路徑 / 設定已不存在或已改名。README 語言 ≠ `--lng` 語言也算需更新；整份翻成目標語言（code block、路徑、指令、專有名詞不翻）。README 明顯違反下方「風格指南」也算需更新：段落超過 3 句、並列項目擠在一段、帶鍵並列 bullet 應改表格或表格應改清單（見「寫法」）、表格違反「表格」（原始碼未對齊、表頭不一致、儲存格過長）、H2 無 emoji、歷史用語（「僅現況」）、超出長度預算或含實作細節（「深度」）。重新排版並精簡至要點；絕不新增或更動事實——刪細節不算改事實。清單不符（見下）也算。無需更新 → 回報 「README 已同步，未改動」；不為改而改。

**不存在** → 建立，內容判斷同上，結構依風格指南；專案專屬段落：目錄樹（執行期產物標註 gitignore）、「清單同步」的清單段落、關鍵設定、維護慣例。

#### 清單同步

每次都執行，不論 README 是否存在。比對實際存在者與 README 列出者；缺的補、沒了的刪、列順序依實際。

| 類別 | 實際來源 |
| -------- | ------------- |
| Rules | `./.claude/rules/**/*.md`（本 repo：`./rules/**/*.md`） |
| Skills | `./.claude/skills/*/SKILL.md`（含指向 `.agents/skills/` 的 symlink；名稱 = 目錄名）（本 repo：`./skills/*/SKILL.md`） |
| Commands | `./.claude/commands/**/*.md`（本 repo：`./commands/**/*.md`） |
| Hooks | `./.claude/settings.json` 的 `hooks` 事件及其呼叫的腳本檔（本 repo：`./settings.json`） |
| MCP | `./.mcp.json` 的 `mcpServers` |
| Plugins | `./.claude/settings.json` 中設為 `true` 的 `enabledPlugins` 項目（本 repo：`./settings.json`） |

- 只列本專案存在的項目。來自全域 `~/.claude/` 的項目不列（專案根本身就是 `~/.claude`，如本 repo，則例外）；絕不寫「現改由全域提供」之類字句。
- 類別有項目但 README 缺該段 → 新增該段。類別為空 → 不設該段。
- 每類別輸出一張表，依「表格」：欄位 `Name | Purpose`（Rules、Skills、Commands、MCP、Plugins）或 `Script | Event | Purpose`（Hooks）；各次執行表頭與欄序一致。Purpose 一行（≤ ~80 顯示寬度），取自 SKILL.md / 規則 `description` 或首段；不猜測。
- 回報每類別新增或移除了什麼；全部相符 → 「清單已同步」。

README 免於步驟 6 所有 caveman 規則（含片段句與 emoji 禁令）——讀者是人類：完整句子、自然語氣、生動但精簡。新增或更新的內容一律用 `--lng` 語言（預設英文），含目錄樹註解與表格說明欄。

#### 風格指南

提煉自 standard-readme 與知名 GitHub README：先講清楚身分、快速到行動、結構易掃、長參考收合。

**結構**（由上而下，不適用者略過）：

1. `# <emoji> <name>` + 一行標語（≤120 字元）。徽章僅在帶有真實訊號時加（CI、版本、授權）；設定類 repo 通常不加
2. 簡介：≤2 句，或 3–6 個亮點（依「寫法」用表格或條列）
3. 目錄僅在 README 超過 100 行時加
4. `🚀 Quick start`：可直接複製貼上的 code block
5. 專案專屬段落（結構、指令、skills、設定、維護…）
6. Contributing / License 僅在 repo 有時加

**寫法**：

- 段落 ≤3 句。3 個以上並列項目絕不擠成一個逗號串接的段落
- 3 個以上共用同一鍵（名稱、指令、路徑、角色…）的並列項目 → **優先用表格**：鍵放第一欄，說明放最後一欄。見「表格」
- 僅在下列情況改用清單：
  - 任一項說明超過 2 行（~120 顯示寬度；CJK/全形字算 2，≈60 個 CJK 字）——先依「深度」精簡；仍過長 → 整組改清單，同組不混用表格與清單
  - 項目無自然的鍵（純句子；表格會只剩一欄）
  - 項目是有序步驟 → 編號清單
- 清單項：一個概念一條，`- **Name** — description` 或 `` - `code` — description ``
- 表格儲存格 ≤ 一個短句（≤ ~120 顯示寬度）；細節移至表格下方條列或 `<details>`
- 主動語態、具體動詞；寫它做什麼，不寫它多厲害
- 粗體僅用於關鍵詞，每段 ≤2 處
- Code block 帶語言標籤；repo 檔案用相對連結
- 生動但不推銷：標語寫使用者得到什麼，不寫技術堆疊；功能用亮點表格（`Name | one sentence`），僅在一列會過長時改用 `- **Name** — one sentence` 條列，可加合適的 emoji；動詞要具體（「客戶開工單，PM 即時回覆」，不是「提供工單功能」）

**僅現況**：

- README 只描述現在為真的事。無歷史：遷移、移除、搬遷、改名、「formerly / no longer / now provided by / moved to / 原本 / 不再 / 改由 / 已移除 / 新增了」。被刪除的東西直接消失。
- 歷史屬於 git log 或 CHANGELOG，不屬於 README。

**深度**（README 是指南，不是規格）：

- 檢驗：新手第一天需要這個嗎？不需要 → 不寫。
- 每個功能：一行摘要加 ≤3 個使用者可見亮點；超過 → `<details>` 或刪除。
- 不寫：快取時長、DB 欄位與 SQL、演算法與公式、檔案層級實作地圖、邊角情況、UI 微互動（動畫、skeleton 時序）。這些屬於 `rules/` 或程式碼；必要時用一行連結（`details: .claude/rules/xxx.md`）。
- 長度預算：一般專案 README ≤300 行（含 `<details>` 內容）。超標 → 先砍細節，再收合。

**Emoji**：H1 與每個 H2 開頭各一個語意貼切的 emoji，同一 README 內不重複；允許用於亮點列/條列與狀態欄的 ✅ / ❌；內文 prose、code、路徑內不用。預設選擇以維持各次執行一致：

```
🚀 Quick start   ✨ Features    📁 Structure    ⚡ Commands     🧩 Skills
🔌 Plugins       ⚙️ Settings    🛠️ Maintenance  📝 Notes        🤝 Contributing   📄 License
```

**表格**：

- **原始碼對齊**：儲存格左右各一空格；以空格補到欄寬，使每列的 `|` 垂直對齊；寬度 = 顯示寬度（CJK/全形字與 emoji 算 2）；分隔列的破折號填滿欄寬。專案使用 prettier 時，結果應與 `prettier --write` 一致（執行以驗證）。儲存格內的字面 `|` → `\|`
- **結構一致**：同類表格（如各清單類別）共用表頭名稱與欄序；表頭簡短，用 `--lng` 語言；每欄格式一致（全為 code 或全為純文字，不混用）；預設靠左，數字欄 `---:`；≤4 欄，更多 → 拆表或把細節移到表下條列
- **儲存格精簡**：每格一個短句；不換行、不用 `<br>`、格內不放清單；同欄說明長度相近；過長 → 精簡文字，絕不加寬欄位

**Markdown 功能**：

- Callout：`> [!NOTE]`、`> [!TIP]`、`> [!IMPORTANT]`、`> [!WARNING]`、`> [!CAUTION]`；每段 ≤1 個，不巢狀
- 長參考（完整清單、平台 workaround）→ `<details><summary>…</summary>`，`</summary>` 後空一行，否則內層 Markdown 不會渲染
- Mermaid `flowchart` 僅用於 3 步以上、圖勝過清單的流程
- `--lng` 下不翻譯：callout 關鍵字、emoji、Mermaid 語法

**寫入前自檢**：掃過標題與每段首行；讀者須在 30 秒內得知它是什麼、如何開始、東西在哪。檢查段落長度、每個清單都符合「改用清單」條件（否則改表格）、每張表的 `|` 已對齊（全形 = 2）且同類表頭一致、無 `<br>`、儲存格長度、emoji 不重複、callout 語法、行數在預算內、歷史用語零命中（grep 「僅現況」中的字詞）、清單類別與實際檔案相符、每個功能 ≤3 個亮點。

### 9. 寫入與報告

直接用 Edit/Write 寫檔，**不**自動 git commit；留給 `/now-push` 或使用者。報告：

- 事實校正清單（步驟 2）：每項前→後與依據
- 過時指令審查（步驟 3，有 `--audit` 時）：發現數/信心分布、已套用 hunk 清單、未套用（含低信心/`flag`）項目；未執行 → 寫 「未加 `--audit`，略過」
- 分塊結果（步驟 5）：來源段落 → 目標檔、`paths`、glob 符合數；或 「無分塊需求」 + 理由；skill/command 轉換建議
- 逐檔指令清單，每項標 「保留 ✓」
- 逐檔行數/字元數前→後與壓縮比（**僅觀察，非目標**）
- 主要編輯（合併了什麼、刪了哪些贅詞）
- README.md 結果（新建 / 更新 / 重新排版或精簡 / 已同步未改動），行數前→後
- 清單同步（步驟 8）：每類別新增/移除的項目，或 「清單已同步」
- 語言結果：實際使用的語言（含無法辨識的 `--lng` 退回英文時的提示）、各檔是否翻譯（來源→目標語言）

## 自我壓縮提醒

`commands/up-rules.md`、`commands/now-push.md`、`commands/up-skills.md` 本身在壓縮範圍內：

- `now-push.md` 幾乎整份逐字（commit 格式模板、type 表、✅/❌ 好壞範例、`Co-Authored-By` trailer）——僅動模板周圍的 prose，空間不大；不為壓縮比強改模板。
- 壓縮自身時，改寫結果仍須逐項通過「步驟 7：驗證無損」。

## 禁止事項

- 不新增既有內容沒有的規則或功能——僅適用於壓縮目標檔；README 是補充性質，不在此限。事實校正（步驟 2）與分塊搬移（步驟 5）不算新增，僅修正與搬移，語意不變；使用者在 `--audit`（步驟 3）選定的 hunk 例外，屬使用者授權的語意變更。
- 不因「太長」而刪規則——只刪贅詞，絕不刪語意；使用者在 `--audit` 選定的 hunk 例外。
- 不為壓縮比過度砍；寧可保守也不遺失指令。caveman full 是風格上限，不是壓縮率指標。
- 壓縮（步驟 6）不得重新引入 `--audit` 已移除的過時模式（全大寫強調 MUST/CRITICAL、施壓語氣、裝飾性步驟腳本）。
- 不以 `@path` 匯入取代分塊——匯入於啟動時載入，達不到按需載入的目的。
- 不用 caveman 風格對話或回報——本指令只改檔案內容；對話與報告維持一般繁體中文，不隨 `--lng`。
- 翻譯不得改變語意：不增刪規則，不弱化否定或限定詞；有疑義處 → 保留原文並於報告標警告，不猜測。
- 不壓縮到需要重讀兩次才懂——AI 的理解成本也是成本。
