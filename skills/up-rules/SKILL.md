---
name: up-rules
description: 對 CLAUDE.md 做事實查核，把每條規則分流到仍能強制執行的最低成本位置（先 lint 設定，其次按需載入的 .claude/rules/，最後才是 CLAUDE.md），將規則檔（CLAUDE.md / .claude/rules / .claude/commands，加上列於 skills/.up-skills-ignore 的自製 skill，以及 ./up-design/ 存在時的 up-design 產出物）壓縮成 terse style，僅保留 AI 可解析的語意；檢查並維護專案根目錄給人看的 README.md；加 `--audit` 時先稽核過時指令；`--lng` 設定所有檔案內容的語言（預設 English）
argument-hint: "[--audit] [--lng <zh|ja|...>]"
disable-model-invocation: true
---

規則檔僅供 AI 讀取，啟用時整份載入（`CLAUDE.md` 每個 session、`rules/` 依 `paths`、commands 於呼叫時），人類很少讀。壓縮成 **terse style**（`references/compression.md`），**指令語意零損失**。

壓縮贅詞、重複、裝飾性解釋。具體規則、限制、附在規則上的理由（「——因為…」子句）、用於區辨的範例一律不動——理由讓模型能判斷規則未涵蓋的情況；保留語意，不保留裝飾。

每條規則放在仍能強制執行的最低成本位置：**lint**（每次執行由機器檢查，零 context）→ **`.claude/rules/`** 搭配 `paths`（僅在讀到相符檔案時載入）→ **`CLAUDE.md`**（每個 session 載入）。長檔案中的一句話在 context 滿時會被略過；lint 錯誤不會。

## Arguments (parse from `$ARGUMENTS`, any order)

- `--audit`：見 step 3
- `--lng <code>` 或 `--lng=<code>`：本 skill 寫入的**所有檔案內容**的語言——壓縮目標（`CLAUDE.md`、`rules/`、`commands/` 的 prose）、lint 規則 `message` 文字、language-only 目標（`agents/` prose、`hooks/` 註解、command `description`）與 `README.md` 皆隨之；接受 BCP-47 code（`zh`、`ja`、`de`，不分大小寫）或自然語言名稱（`繁中`、`日文`、`Japanese`）
  - 未指定 → **English**
  - 無法辨識或缺值 → 一行提示，**退回 English**，繼續；不中止
  - `zh` → Traditional Chinese（`zh-cn`/`簡中` → Simplified）
  - 既有檔案語言 ≠ 目標 → 需改寫；翻成目標語言，語意等價
- 其他未知 token → 一行提示，忽略；不中止
- `--lng` 僅管檔案內容；對話與報告一律用繁體中文

## Files

`<skill-dir>` = 本 SKILL.md 所在目錄。執行所需的一切都隨附於此；在指名該檔的 step 才讀取。

| File                         | Read at       | Purpose                                                               |
| ---------------------------- | ------------- | --------------------------------------------------------------------- |
| `references/targets.md`      | Step 1        | 哪些檔案要壓縮、翻譯、同步或寫入（lint 設定）                         |
| `references/stale-audit.md`  | Step 3        | 過時指令稽核：pattern、保留清單、報告與 hunk 格式                     |
| `references/rule-routing.md` | Step 5        | Lint → `rules/` → `CLAUDE.md` 分流；linter 偵測、寫入與檢查           |
| `references/compression.md`  | Steps 6 and 7 | Terse style 規則、語言、verbatim 清單、do-not-compress、readback 檢查 |
| `references/readme.md`       | Step 8        | README 同步、inventory sync、style guide                              |

## Flow

### 1. Gather context

- 讀 `references/targets.md`。Glob 實際存在的壓縮目標（含 `.claude/rules/**/*.md`、`.claude/commands/**/*.md`、依 "Self-made skills" 的 self-made skill `.md` 檔、依 "up-design artifacts" 的 up-design 產出物），全部讀取；檢查 `./README.md` 是否存在。
- 偵測專案的 linter 與其執行指令（`references/rule-routing.md` § Detection）；記下 CLAUDE.md、hook 或 CI 是否已執行 lint。
- `git log --oneline -15` + `git diff` 掌握近期方向。找出**重疊、重複或矛盾**於既有內容的新規則——優先合併或刪除。將重疊帶入後續步驟，不只是看過。

### 2. Update CLAUDE.md (fact correction)

僅修正事實；不新增行為規則。

- 檢查 CLAUDE.md（含 `./.claude/CLAUDE.md`、`CLAUDE.local.md`、既有 `rules/**/*.md`）提到的每個路徑、command／skill 名稱、設定值、hook 檔名；確認仍存在。
- Self-made skill 檔案：確認每個 sub-skill 名稱、檔案路徑（含 `${CLAUDE_SKILL_DIR}/…` 與 fallback 路徑）與指令仍存在；僅修正事實。
- up-design 產出物：`DESIGN.md` 與 `design-*` skill 檔案做同樣的事實檢查（路徑、token、檔名、指令）；`up-design/**`（報告、baseline）跳過——屬歷史與量測。
- `CLAUDE.local.md` 與 CLAUDE.md 重疊或矛盾 → 僅回報，不跨檔合併（local 檔是個人 override；由使用者決定）。
- 依 step 1 的 git log/diff，修正已改名、已刪除、值已變的項目；合併 step 1 找到的重疊或矛盾規則。
- 無需修正 → 回報 「CLAUDE.md 事實已同步，未改動」；不為改而改。
- 記錄每項修正（before→after、依據），供 step 9 報告。

### 3. Stale-instruction audit (when `--audit`)

`$ARGUMENTS` 沒有 `--audit` → 跳過本步驟，不提及，流程視同沒有這一步。

有 `--audit` →

- 讀 `references/stale-audit.md` 並執行，範圍限於 step 1 收集的壓縮目標檔案，含 self-made skill 檔案、`DESIGN.md` 與 `design-*` skill 檔案（排除 `up-design/**`——歷史與量測，不是指令；README.md、其他 `skills/`、`agents/`、`settings.json`）。
- 取得 audit report 與提議的 hunk 後**暫停**；列出 findings，請使用者逐一挑選要套用的 hunk；本 skill 是互動式。
- 已選的 hunk → 套用到檔案；未選的僅留在 report，不套用。
- 低 confidence／`flag` 項目僅回報，不作為可選 hunk 提供。
- 套用結果併入 step 4 指令清單的基準——被刪除的語意**不**列入，避免 step 7 驗證誤判為遺失。

### 4. Build instruction list (before compression)

以 step 2 修正與 step 3 已套用 hunk（若有執行）之後的內容為基準，為每個檔案列出**明確的指令清單**——規則、限制、禁令、格式要求各自一項；附帶的理由與其同列。清單是後續無損驗證的基準；必須在編輯前建立。壓縮強度越高，遺失風險越高。

對 `CLAUDE.md`、`./.claude/CLAUDE.md` 與 `rules/**/*.md` 的項目，另依 `references/rule-routing.md` 記下候選去處（lint / `rules/<topic>.md` / `CLAUDE.md`）；step 5 再確認。

### 5. Route rules (lint → rules/ → CLAUDE.md)

讀 `references/rule-routing.md`，把 step 4 的每個項目分流到第一個適用的層級：

1. **Lint**：整條指令可機械檢查，已安裝的 linter 能表達，且理由可放進 `message`（或設定註解），且之後 lint 仍以有效設定執行 → 寫入 lint 規則，刪除該句。
2. **`rules/<topic>.md`**：依該檔的分塊條件屬路徑專屬 → 搭配 `paths` frontmatter 移入。
3. **`CLAUDE.md`**：其餘全部留下。

無項目可分流 → 於報告說明理由（如 "no linter, all global rules"）。

### 6. Refine per file (terse style)

讀 `references/compression.md`，依其 terse style 規則、語言規則、verbatim 清單與 do-not-compress 清單，改寫每個壓縮目標（含 step 5 建立／修改的規則檔）。一併改寫：合併 step 1 找到的重疊／重複規則；保留有助 AI 快速掃描的結構（標題、bullet、表格、程式碼區塊）。

### 7. Verify no loss (after compression)

逐項與 step 4 指令清單比對：確認**每一項**在改寫後仍存在（語意等價即可，措辭不必相同），於該檔案的驗證集合中：

- `CLAUDE.md`、`rules/**/*.md` 與 step 5 寫入的 lint 規則：三者聯集（分塊項目須落在 `paths` 涵蓋原範圍的規則檔；lint 項目須落在檔案範圍涵蓋原範圍的規則，且理由在其 `message` 或註解中）
- `CLAUDE.local.md`：自身（維持獨立檔案）
- self-made skill：其自身目錄下所有 `.md` 檔的聯集（允許彼此合併）；絕不對照 CLAUDE.md ∪ rules
- `design-*` skill：同 self-made skill
- `DESIGN.md`、每個 `up-design/**/*.md`：自身

Skill anchor（步驟編號、被參照的標題、交叉參照的檔名）不變。

⚠️ 「感覺沒漏」不算驗證——須逐項核對清單，否則邊界規則會被默默刪掉，卻回報成功。

之後執行 `references/compression.md` § Checks 的 readback 與 language 檢查；若 step 5 寫了任何 lint 規則，再重跑一次 lint。

### 8. README.md sync

讀 `references/readme.md` 並照做。每次執行都檢查專案根目錄 `./README.md`；inventory sync 每次都跑。

### 9. Write and report

直接用 Edit/Write 寫檔，**不**自動 git commit；交給 `/now-push` 或使用者。報告：

- 事實修正清單（step 2）：每項 before→after 與依據
- 過時指令稽核（step 3，有 `--audit` 時）：findings 數量／confidence 分布、已套用 hunk 清單、未套用項目（含低 confidence／`flag`）；未執行 → 寫 「未加 `--audit`，略過」
- 規則分流（step 5）：
  - Lint：規則 → 設定檔、lint 規則名稱、severity、既有程式碼中的違規（數量）、lint 執行結果；未寫入的建議設定（標 「未驗證」）與理由；是否已在 CLAUDE.md 加入 lint 指令行
  - 分塊：來源區段 → 目標檔案、`paths`、glob 符合數量；或 「無分塊需求」 + 理由；skill/command 轉換建議
- 每檔指令清單，每項標 「保留 ✓」（或附去處的 「→ lint」 / 「→ rules/<file>」）
- 每檔 lines/chars before→after 與壓縮率（**僅供觀察，不是目標**）
- Self-made skills（僅 `.up-skills-ignore` 存在時）：處理的 skill 與檔案、每檔 lines/chars before→after、列出無對應目錄的名稱
- up-design artifacts（僅 `./up-design/` 存在時）：處理的檔案、每檔 lines/chars before→after
- 主要編輯（合併了什麼、刪了哪些贅詞）
- README.md 結果（建立／更新／重整風格或精簡／同步且未改動），lines before→after
- Inventory sync（step 8）：每類別新增／移除的項目，或 「清單已同步」
- 語言結果：實際使用的語言（含無法辨識的 `--lng` 退回 English 時的提示）、每個檔案是否已翻譯（來源→目標語言），含 language-only 目標（agents、hooks 註解、command description）逐檔

## Self-compression reminder

`commands/up-skills.md` 與 self-made skill `skills/up-rules/`、`skills/now-push/` 本身也在壓縮範圍內：

- `skills/now-push/references/commit-format.md` 幾乎整份 verbatim（commit 格式範本、允許的 type 清單、✅/❌ 好壞範例、`Co-Authored-By` trailer）——僅動範本周圍的 prose，空間很小；不要為壓縮率而強改範本。
- `skills/up-rules/references/stale-audit.md` 的 Before/After 表與 signal regex 是引用的範例——verbatim。
- 壓縮自身時，改寫結果必須逐項通過 "Step 7: verify no loss"。

## Prohibited

- 不新增原本沒有的規則或功能——僅適用壓縮目標檔案；README 是補充性質，豁免。事實修正（step 2）、分塊移動與 lint 移動（step 5）不算新增，僅是修正與搬移，語意不變；step 5 加入 CLAUDE.md 的那一行 lint 指令豁免；使用者在 `--audit`（step 3）下選取的 hunk 豁免，屬使用者授權的語意變更。
- 不因為「太長」而刪規則——只刪贅詞，絕不刪語意；因已驗證的 lint 規則承接而刪掉的句子是搬移，不是刪除；使用者在 `--audit` 下選取的 hunk 豁免。
- 不為壓縮率過度刪減；寧可保守，也不遺失指令。Terse style 是風格上限，不是壓縮率指標。
- 壓縮（step 6）不得重新引入 `--audit` 移除過的過時 pattern（全大寫強調 MUST/CRITICAL、施壓語氣、裝飾性步驟腳本）。
- 不以 terse style 對話或報告——本 skill 只改檔案內容；對話與報告維持正常的繁體中文，不隨 `--lng`。
- 翻譯不得改變語意：不新增或刪除規則，不弱化否定或限定詞；有歧義處 → 保留原文並於報告標警告，不要猜。
- 不壓縮到需要讀兩遍才懂——AI 的理解成本也是成本。
- 不安裝 lint 工具、plugin 或任何依賴，也不為修 lint 違規而編輯原始碼：本 skill 只改規則檔與 lint 設定。
