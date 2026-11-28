# Rule routing (step 5)

step 4 的每個指令項目，分流到第一個適用的層級。

| Tier | Destination                     | Fits when                                              |
| ---- | ------------------------------- | ------------------------------------------------------ |
| 1    | Lint config                     | § Eligibility 全部成立                                 |
| 2    | `rules/<topic>.md` with `paths` | 非 lint，且 § Tier 2 的兩項分塊條件皆成立              |
| 3    | `CLAUDE.md`                     | 其餘全部（全域規則、流程、新檔案在讀取前就需要的規則） |

納入分流者：`CLAUDE.md`、`./.claude/CLAUDE.md`、既有 `rules/**/*.md`（規則檔的項目也要重新分流：linter 能檢查的路徑規則移到 lint）。絕不分流：`CLAUDE.local.md`（個人檔；lint 設定是共用的）、self-made skill、commands、up-design artifacts。

## Contents

1. Tier 1: lint
2. Tier 2: rules/
3. Tier 3: CLAUDE.md
4. Examples

## 1. Tier 1: lint

專案根目錄本身即 `~/.claude`（該處規則屬使用者層級，適用所有專案；此處的 lint 設定一個都碰不到），或 § Detection 找不到 linter 時，**整個層級跳過**。

### Eligibility (all must hold)

1. **整條指令皆可機械檢查**：違規可由比對程式碼看出（禁用 import、禁用呼叫或語法、禁用值或屬性、命名模式）。含判斷子句的指令（"unless the caller already validated"、"prefer X when it reads better"）維持 prose，因為 lint 只會執行一半，而被刪掉的句子正帶著另一半。
2. **已安裝的 linter 能用內建規則表達**（§ Rules that carry a message）。絕不安裝 linter、plugin 或依賴：那會改動專案，超出本 skill 職責。
3. **規則範圍相符**：linter 涵蓋的檔案至少等於指令涵蓋的檔案；範圍較窄的指令用 linter 自身的檔案範圍機制（ESLint flat-config `files`、Stylelint `overrides`、Ruff `per-file-ignores`）。無法限定範圍 → 不合格。
4. **理由有載體**：指令的理由放進規則的 `message`（或 `msg`）；沒有 message 選項的規則，把理由寫成規則旁的註解（JS/TS/JSONC/YAML/TOML 設定）。兩者皆不可行（如沒有 message 選項的純 `.json`）→ 不合格，因為理由屬語意，step 7 會檢查。指令沒有理由 → message 直述規則即可。
5. **之後 lint 以有效設定執行**（§ Check after writing）。

不合格 → 落到 tier 2。

### Detection

找出 linter 設定（ESLint、Stylelint、Biome、Oxlint、Ruff：任何設定檔、`package.json` 的 key 或 `pyproject.toml` 的 `[tool.ruff]`）。僅當其套件在專案依賴（或 Python 環境）中且可執行時，才算已安裝。找出執行指令：`package.json` scripts（`lint`、`lint:css`、`lint:style`、`lint:js`），否則直接呼叫（`npx eslint .`、`npx stylelint "**/*.{css,scss}"`、`npx biome lint .`、`ruff check .`），套件管理器依 lockfile 判斷。

專案的 formatter 設定（Prettier、EditorConfig、Biome formatter、Ruff format）已強制的格式規則（縮排、引號、分號、行寬）屬冗餘：刪除該句並回報 「已由 formatter 執行」。絕不寫 formatter 選項。

### Rules that carry a message

不確定規則名稱或選項格式 → 用工具本身確認（`npx eslint --print-config <file>`、`npx stylelint --print-config <file>`、`npx biome explain <rule>`、`ruff rule <code>`）或查官方文件；絕不憑記憶寫。

| Tool      | Rule                                                                     | Good for                                  | Why goes in                              |
| --------- | ------------------------------------------------------------------------ | ----------------------------------------- | ---------------------------------------- |
| ESLint    | `no-restricted-imports`                                                  | Banned packages or paths                  | `paths[].message` / `patterns[].message` |
| ESLint    | `no-restricted-syntax`                                                   | Banned calls or patterns via AST selector | `message`                                |
| ESLint    | `no-restricted-globals`, `no-restricted-properties`                      | Banned globals or member access           | `message`                                |
| Stylelint | `declaration-property-value-disallowed-list`, `property-disallowed-list` | Banned values or properties               | secondary option `message`               |
| Biome     | `noRestrictedImports`, `noRestrictedGlobals`                             | Banned packages or globals                | `message` (rule group varies by version) |
| Ruff      | `flake8-tidy-imports.banned-api`                                         | Banned modules or functions               | `msg`                                    |

其他內建規則（`no-console`、`eqeqeq`、命名規則）在設定格式允許以註解寫理由時可用。

### Writing

- 編輯既有設定，保持其格式與註解風格；合併進既有規則項目（如附加到既有 `no-restricted-imports.paths` 清單），不重複 key。
- `message` 文字隨 `--lng`；僅寫規則加理由，寫給會讀到 lint 錯誤的 agent 看。
- Severity 用 `error`，§ Check after writing 例外。

### Check after writing

所有 tier-1 編輯完成後，執行 lint 指令一次。

| Result                                             | Action                                                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Config invalid (parse failure, unknown rule)       | 還原該編輯；該項目改分流到 tier 2/3；於報告附上嘗試過的設定，標 「未驗證」                                           |
| Existing code violates the new rule                | 規則維持 `error`；加 per-file override，僅對已違規的檔案降為 `warn`（§ Existing violations）；記錄數量；絕不改原始碼 |
| Lint cannot run (dependencies missing, no command) | 不寫 lint；該項目改分流到 tier 2/3；於報告附上建議設定，標 「未驗證」                                                |
| Passes                                             | 從原檔刪除該指令句                                                                                                   |

錯誤的 lint 設定可能直接讓 CI 失敗，因此未實際執行過的內容一律不寫入。

### Existing violations

被刪的句子原本擋下每一個新違規，lint 規則也必須做到：規則留在 `warn` 會讓 lint 在新違規時仍 exit 0，而 agent 只修 error。全部維持 `error`，僅用 linter 的 per-file override 降級已違規的檔案：

| Tool      | Per-file override                                                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint    | Extra flat-config object `{ files: ["src/legacy/report.js"], rules: { "no-restricted-imports": "warn" } }` (severity only keeps the options and `message`) |
| Stylelint | `overrides: [{ files: [...], rules: { "<rule>": [<options>, { severity: "warning" }] } }]`                                                                 |
| Biome     | `overrides: [{ include: [...], linter: { rules: { ... } } }]`                                                                                              |
| Ruff      | `per-file-ignores` for those files (Ruff has no warn level)                                                                                                |

在 override 旁加註解（如 `// existing violations, warn until migrated`）。linter 無法限定降級範圍 → 該項目不合格；分流到 tier 2/3 並保留原句。寫入後，對一個會違反該規則的暫時 probe 檔跑 lint：必須以該 `message` 失敗；之後刪除 probe。

### Make sure lint gets run

被刪的句子要靠 agent 執行 lint 才有強制力。任何 tier-1 搬移後，檢查 `CLAUDE.md`、`.claude/settings.json` 的 hook 或 pre-commit hook 是否已執行 lint 指令。皆無 → 在 `CLAUDE.md` 加一行，如 ``After editing code, run `npm run lint` and fix every error.``（用專案實際指令）。這是本 skill 唯一會新增的規則。

## 2. Tier 2: rules/

條件——僅當**兩者皆成立**才把內容移到 `rules/<topic>.md`：

- 內容僅在處理特定檔案／目錄／副檔名時適用，且可寫成明確的 glob。
- 規則不需要在「未先讀過相似既有檔案就建立新檔」的情境下生效——`paths` 規則僅在 Claude **Read** 到相符檔案時載入，並非每次使用工具都載入；新建檔案的情境會漏掉；關鍵規則不分塊。

**不分塊**：

- 全域行為規則（語言、時區、commit／報告慣例等）。
- 無法對應 glob 的主題——沒有 `paths` 的規則仍會像 CLAUDE.md 一樣在啟動時載入，省不了 context；不要分。
- 多步驟流程／任務型 workflow——不適合當規則；於報告中**建議**改寫成 skill 或 command；不自動轉換。
- Self-made skill 內容——skill 本來就按需載入；絕不移進 `rules/`。
- up-design artifacts（`up-design/**`、`DESIGN.md`、`design-*` skill）——`/up-design` 依固定位置讀取；絕不移進 `rules/`。

**Execute**：

- 建立 `rules/<topic>.md`（檔名用 kebab-case 的 topic，可用子目錄分組），frontmatter 僅 `paths`：
  ```markdown
  ---
  paths:
    - "src/api/**/*.ts"
  ---
  ```
  glob 一律用雙引號——以 `*` 或 `{` 開頭的未加引號字串會被 YAML 誤解析，破壞 frontmatter，使規則退化為沒有 `paths` 的全載入。
- 驗證每個 glob 至少符合 1 個既有檔案；符合 0 個 → 仍寫入，於報告標警告。
- 移走的內容須從 CLAUDE.md **完全移除**；不留 `@path` import（啟動時載入，等同沒省 context），不留重複副本。
- 既有 `rules/**/*.md`：缺 `paths` 的路徑專屬內容 → 補上；與 CLAUDE.md 或其他規則重疊 → 合併。
- 無分塊需求 → 說明理由（如 "all global rules, no file-specific content"）；CLAUDE.md 超過 200 行且無可分塊內容 → 於報告註明行數。

## 3. Tier 3: CLAUDE.md

上述未分流的全部留在 `CLAUDE.md`，並經 step 6 壓縮。沒有 path 的規則也留在這裡：沒有 `paths` 的規則檔像 CLAUDE.md 一樣在啟動時載入，省不了 context。

## 4. Examples

**Lint, why in message.** CLAUDE.md: 「不要 import `lodash`，改用 `es-toolkit`——lodash 讓 bundle 多 70KB。」 專案有 ESLint flat config 且 `npm run lint` 通過 →

→ 在既有 ESLint 設定加 `no-restricted-imports`，以 `paths: [{ name: "lodash", message: "Use es-toolkit instead: lodash adds 70KB to the bundle." }]` 合併進任何既有項目。

從 CLAUDE.md 刪除該句；若先前沒有任何東西執行 lint，CLAUDE.md 新增 ``After editing code, run `npm run lint` and fix every error.``。

**Judgment clause, not lint.** 「API handler 不要直接呼叫 `db.query`，除非是 migration script。」 除非 migration 放在獨立目錄，否則比對程式碼無法區分 migration script 與 handler。有（`scripts/migrations/**`）→ lint，用 `files: ["src/api/**"]`。沒有 → tier 2（`paths: ["src/api/**"]`）。

**No linter.** 同樣的 lodash 規則，專案沒有 linter → 留在 CLAUDE.md（若屬路徑專屬則 tier 2）；報告附上建議的 ESLint 設定並標 「未驗證」，不新增 ESLint。

**Existing violation.** `src/legacy/report.js` 已 import lodash → `no-restricted-imports` 維持 `error`；以 override 物件僅對 `src/legacy/report.js` 設為 `warn`；報告列 「1 處既有違規（已降為 warn）」；原始碼不動。其他任何位置的新 lodash import 仍會讓 lint 失敗。
