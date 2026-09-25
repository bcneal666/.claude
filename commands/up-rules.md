---
description: 校正 CLAUDE.md 事實、按需分塊到 rules/、以 caveman full 極限壓縮規則文件（CLAUDE.md / .claude/rules / .claude/commands），只保 AI 可解析語意；同步檢查並維護專案根 README.md 供人類閱讀
---

規則文件唯 AI 讀，每 session 全文載入，人類少看。壓縮拉滿 `caveman` **full** 級，**不失指令語意**。

壓縮冗詞、重複敘述、裝飾性說明。具體規則、約束、規則附帶的理由（「——因為…」子句）、消歧義範例不動——理由讓模型在規則沒寫到的情境自行判斷，屬語意而非裝飾。

## 目標檔案

### 壓縮目標（caveman full，只保 AI 可解析語意）

- `CLAUDE.md`（專案根）
- `./.claude/CLAUDE.md`
- `./.claude/rules/**/*.md`（遞迴，含子目錄；專案根即 `.claude` 目錄時（如本倉庫）對應 `./rules/**/*.md`）
- `./.claude/commands/**/*.md`（含子目錄 namespaced commands；專案根即 `.claude` 目錄時（如本倉庫）對應 `./commands/**/*.md`）

存在才處理，缺略過。`@path` import 檔案（如 `@CLAUDE.local.md`）不主動壓縮，除非自身在上述清單內。

⚠️ `./.claude/rules/**/*.md`（或本倉庫 `./rules/**/*.md`）是 **user-level rules**，套用機器上所有專案，非僅本專案；新建或修改前確認影響範圍非本倉庫獨有。

⚠️ 勿用裸 `commands/**/*.md` 通配任意專案——一般專案 `commands/` 可能是原始碼（如 CQRS command 模式）；僅明確對應 Claude Code `.claude/commands/` 才算目標。

### 同步目標（人類可讀為準，不壓縮）

- `./README.md`（專案根）——見「步驟 7」

僅處理上述路徑，**不**擴及 `skills/`、`settings.json`。

## 執行流程

### 1. 蒐集脈絡

- glob 找出實際存在的壓縮目標（含 `.claude/rules/**/*.md`、`.claude/commands/**/*.md`），全讀；確認 `./README.md` 是否存在。
- `git log --oneline -15` + `git diff` 看近期改動方向。抓出新增規則與既有內容**重疊、重複或矛盾**之處——最該合併或刪除。重疊點餵入後續步驟，非僅看過。

### 2. 更新 CLAUDE.md（事實校正）

只修正事實，不新增行為規則。

- 逐一核對 CLAUDE.md（含 `./.claude/CLAUDE.md`、既有 `rules/**/*.md`）提到的路徑、command／skill 名稱、設定值、hook 檔名，驗證是否仍存在。
- 依第 1 步 git log/diff 修正已改名、刪除、值變更之處；合併第 1 步找到的重疊或矛盾規則。
- 無需校正時明說「CLAUDE.md 事實已同步，未改動」，不為改而改。
- 記錄每處校正（前→後、依據）供步驟 8 回報。

### 3. 建立指令清單（壓縮前）

以步驟 2 校正後內容為準，逐檔列**明確指令清單**——規則、約束、禁止事項、格式要求各獨立列一項，附理由者連理由一併列入。此清單是後續驗證不流失的基準，須先建後改。壓縮強度越高流失風險越大。

### 4. 檢查並分塊

判準——**同時滿足**才將內容搬到 `rules/<topic>.md`：

- 內容只在處理特定檔案／目錄／副檔名時適用，可寫成明確 glob。
- 規則不需在「新建檔案且未先 Read 同類既有檔」情境下就生效——`paths` 規則僅在 Claude **Read** 到符合檔案時觸發載入，非每次 tool use；新建情境會漏，關鍵規則不分塊。

**不分塊**：

- 全域行為規則（語言、時區、commit／回報慣例等）。
- 主題無法對應 glob——改用無 `paths` 的 rule 仍與 CLAUDE.md 一樣開場全載，不省 context，不做。
- 多步驟流程／任務型 workflow——rules 不適合承載，回報中**建議**改寫成 skill 或 command，不自動轉換。

**執行**：

- 新建 `rules/<topic>.md`（kebab-case 主題檔名，可用子目錄分類），frontmatter 只寫 `paths`：
  ```markdown
  ---
  paths:
    - "src/api/**/*.ts"
  ---
  ```
  glob 一律加雙引號——不加引號、以 `*` 或 `{` 開頭的字串會被 YAML 誤判，導致 frontmatter 解析失敗、規則退化成無 `paths` 全載。
- 每個 glob 驗證至少匹配 1 個現存檔案；0 匹配時仍寫入，於回報標警示。
- 從 CLAUDE.md **完整移除**已搬走內容，不留 `@path` import（開場即載入，等同沒省 context）、不重複保留。
- 既有 `rules/**/*.md`：內容屬路徑專屬卻無 `paths` → 補上；與 CLAUDE.md 或其他 rule 重疊 → 合併。
- 無分塊需求 → 明說理由（如「全為全域規則，無檔案專屬內容」）；CLAUDE.md 超過 200 行但無可分塊內容 → 於回報提醒行數。

### 5. 逐檔精煉（caveman full）

套下方 **caveman full 規則**改寫檔案內容（含步驟 4 新建／修改的 rules 檔）。不 Read caveman skill——它規範對話風格、整個 session 持續生效，且要求檔案寫正常散文，與本指令相反。

改寫同步：合併第 1 步發現重疊／重複規則；維持利 AI 快速掃描結構（標題、條列、表格、程式碼區塊）。

**caveman full 規則**：

- 刪：冠詞、填充詞（just/really/basically）、客套話、模糊修飾、裝飾性開場與結語
- 不刪：否定與限定詞（not／never／no／only／except、不／勿／僅／除非）、數字與單位——刪了會翻轉語意
- 允許：片語式句子、短同義詞（fix 不寫 implement a solution for）
- 禁止：自創縮寫、裝飾性表格、emoji
- 標準技術縮寫可用：DB / API / HTTP
- 句型：`[thing] [action] [reason]. [next step].`

**語言**：允許把繁中規則改英文 caveman 省 token。以下一律**維持原文**：

- 專有名詞與專案代號（如 `COSS`、主機名、服務名）
- 路徑、指令、環境變數、檔名
- 規則本身**針對語言**條文（如「以繁中回應」）——條文可用英文寫，但引號內目標語言不能改

**逐字保留（byte-for-byte）**：

- 程式碼區塊與 fenced block 內所有內容
- 確切指令字串（如 `git commit -m ...`）
- 格式範本／模板（如 commit message 結構、trailer 如 `Co-Authored-By: ...`）
- 消歧義正反範例（✅ 正確 ／ ❌ 錯誤）
- `@path` import 語法（如 `@CLAUDE.local.md`）——功能性語法，改寫即失效
- frontmatter key 名稱與值（`description:`、`name:`、`paths:` 等）
- command 檔案 frontmatter **整塊**逐字保留（`description`、`argument-hint`、`allowed-tools`、`model`、`disable-model-invocation`）——`description` 決定 slash command 觸發與清單顯示，壓縮即降準確度
- command 內參數佔位符 `$ARGUMENTS`、`$1`–`$9`
- command 內 `!` 前綴 bash 執行語法——功能性語法，改寫即失效

只壓縮這些區塊**周圍散文**，區塊本身不動。

**不壓縮的場合**（沿用 caveman Auto-Clarity 原則）——維持完整句子：

- 多步驟且**順序有意義**流程（刪連接詞後順序易誤讀）
- 條件／例外分支（if / unless / 除非 / 僅當）
- 破壞性或不可逆操作警告
- 壓縮後產生技術歧義

判準：**壓縮後若存在第二種合理解讀，就不壓縮。**

### 6. 驗證未流失（壓縮後）

逐項比對第 3 步指令清單：確認**每一條**改寫後仍存在於 CLAUDE.md ∪ `rules/**/*.md` 聯集中（語意等價即可，不要求字句相同）。已分塊條目須落在 `paths` 涵蓋其原適用範圍的 rule 檔內。

⚠️ 順手「自我感覺沒漏」不算驗證——須拿清單逐條核對，否則悄悄刪邊角規則卻報成功。

caveman 專屬回讀檢查：片語化後順序／條件關係未誤讀；技術詞、程式碼、error string、`@path` import 逐字未動；未自創縮寫。

### 7. README.md 同步

每次執行檢查專案根 `./README.md`。

**有** → 讀取，比對精煉後規則文件與實際目錄結構，判斷是否需更新：規則文件新增／刪除章節（含步驟 4 新建的 `rules/*.md`）是否該反映到 README；README 提到的 command / skill / 路徑 / 設定是否已不存在或改名。無需更新時明說「README 已同步，未改動」，不為改而改。

**無** → 新增，同一套判斷寫內容，骨架參考：一句話定位專案；目錄結構樹（runtime 產物註明已 gitignore）；可用 commands / skills 表格；設定重點；維護慣例。

README **不套 caveman**——目標讀者人類：完整句子、正常標點、必要表格與目錄樹。

### 8. 寫入並回報

直接用 Edit/Write 寫入檔案，**不**自動 git commit，交由 `/now-push` 或使用者決定。回報：

- 事實校正清單（步驟 2）：每處前→後與依據
- 分塊結果（步驟 4）：來源段落 → 目標檔案、`paths`、glob 匹配數；或「無分塊需求」＋理由；skill／command 轉換建議
- 每檔指令清單，逐條標記「保留 ✓」
- 每檔行數／字數前→後對照與壓縮比（**觀察值，非追求目標**）
- 主要刪改點（合併什麼、刪什麼冗詞）
- README.md 處置結果（新增 / 已更新 / 已同步未改動）

## 自我壓縮提醒

`commands/up-rules.md`、`commands/now-push.md` 本身也在壓縮範圍內：

- `now-push.md` 幾乎整份逐字保留（commit 格式模板、type 對照表、✅／❌ 正反範例、`Co-Authored-By` trailer）——只能動模板周圍散文，壓縮空間小，不為壓縮比硬動模板。
- 壓縮自己時，改寫後仍須通過「步驟 6：驗證未流失」逐條核對。

## 禁止事項

- 不新增原本沒有的規則或功能——此條僅約束壓縮目標檔案；README 屬補充文件，不受此限。事實校正（步驟 2）與分塊搬移（步驟 4）不算新增，只修正與搬移，語意不變。
- 不因某條規則「太長」就刪掉它——只刪冗詞，不刪語意。
- 不為壓縮比過度刪減；寧保守不流失指令。caveman full 是**風格**上限，非壓縮率指標。
- 不以 `@path` import 取代分塊——import 開場即載入，未達成按需載入目的。
- 不以 caveman 風格與使用者對話或回報——本指令只改檔案內容，對話與回報維持正常繁體中文。
- 不壓縮到需重讀兩次才懂——AI 讀懂成本也是成本。
