# Compression (steps 6 and 7)

壓縮目標的改寫方式。

## Terse style rules

僅適用壓縮目標；README 不依此規則（`readme.md`）。

- 刪：冠詞、贅詞（just/really/basically）、客套話、含糊的模糊語氣、裝飾性開頭與結尾
- 留：否定與限定詞（not/never/no/only/except、不/勿/僅/除非）、數字與單位——刪除會翻轉語意
- 允許：片段句、較短的同義詞（fix，而非 implement a solution for）
- 一物一詞；代名詞僅在指涉明確時使用
- 簡潔寫法不比平述短 → 用平述
- 禁止：自創縮寫（cfg、impl、fn：token 相同、更難讀）、裝飾性表格、emoji
- 允許標準技術縮寫：DB / API / HTTP
- 模式：`[thing] [action] [reason]. [next step].`

## Language

改寫後的 prose 一律用 `--lng` 語言（預設 English）；來源語言不同 → 翻譯，語意等價。Terse style 精神（刪贅詞、客套話、重複；留否定／限定詞與數字）適用於任何目標語言。以下一律**保留原文**，不翻譯：

- 專有名詞與專案代號（如 `COSS`、主機名稱、服務名稱）
- 路徑、指令、環境變數、檔名
- **關於語言**的規則本身（如 「以繁中回應」）——規則 prose 隨 `--lng`，但引號內指名的目標語言不得更動
- 下方「verbatim」清單的全部內容
- 以中文引號括起的使用者可見輸出字串（如 「CLAUDE.md 事實已同步，未改動」）——回報語言維持繁體中文

## Verbatim (byte-for-byte)

- 程式碼區塊與 fenced 區塊內的全部內容
- 完整指令字串（如 `git commit -m ...`）
- 格式範本（如 commit message 結構、`Co-Authored-By: ...` 這類 trailer）
- 用於區辨的好／壞範例（✅ 正確 / ❌ 錯誤）
- `@path` import 語法（如 `@CLAUDE.local.md`）——功能性語法，改寫會壞
- Frontmatter 的 key 名稱與值（`description:`、`name:`、`paths:` 等）
- Command 檔 frontmatter 區塊（`argument-hint`、`allowed-tools`、`model`、`disable-model-invocation`）逐字保留，`description` 除外（依 "Language-only targets" 僅翻譯）
- Command 參數佔位符 `$ARGUMENTS`、`$1`–`$9`
- Command 以 `!` 開頭的 bash 執行語法——功能性語法，改寫會壞
- Skill `SKILL.md` frontmatter（`name`、`argument-hint`、`disable-model-invocation`、`allowed-tools`、`model`、…）逐字保留，`description` 除外（與 command `description` 相同，僅翻譯）
- Skill 佔位符 `$ARGUMENTS`、`${CLAUDE_SKILL_DIR}`
- Skill anchor：步驟編號、其他文字或檔案會參照的標題（如 "Modern web guidance"）、skill 檔案互相參照的檔名——改名會斷掉交叉參照
- 引號內的範例字串（如 UI 文案「確定」「建立工單」、引號內的 sub-skill `args` 任務 prompt）——屬內容或 prompt，不是 prose
- 其他檔案或腳本會精確比對的 token：verdict 值（`pass` / `gap` / `N/A` / `未驗證`）、報告區段名稱、`{{PLACEHOLDER}}` 範本 token——翻譯或改寫會破壞比對

僅壓縮這些區塊**周圍的 prose**；區塊本身不動。

## Do not compress

以下情形優先於上方所有 terse style 規則。保留原句（不拆句、不改寫、不改成片段）：

- **順序有影響**的多步驟流程（刪掉連接詞會讓順序容易誤讀）
- 條件／例外分支（if / unless / 除非 / 僅當）
- 破壞性或不可逆操作的警告
- 壓縮造成技術歧義

測試：**壓縮後的文字若有第二種合理讀法，就不壓縮。**

## Checks (step 7, after the item-by-item comparison in SKILL.md)

Readback check：片段化後順序／條件不被誤讀；技術名詞、程式碼、錯誤字串、`@path` import 逐字未動；無自創縮寫。

Language check：目標檔案 prose 全為 `--lng` 語言（不含 verbatim 區塊與專有名詞）；翻譯未改變任何否定、限定詞、數字、條件分支；語言規則引號內的目標語言未動。up-design 產出物不納入語言檢查（絕不翻譯）；標題、表格、`last-run.json` 未變（`git diff`）。Language-only targets：agents prose + `description`、hook 註解、command `description` 全為 `--lng`；`git diff hooks/` 僅顯示註解行變動，`node --check` 通過；`description` 以外的 frontmatter key 未動。
