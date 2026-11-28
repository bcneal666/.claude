# Target files

Step 1 讀取。本 skill 壓縮、翻譯、寫入或同步哪些檔案。

### Compression targets (terse style, keep only AI-parseable semantics)

- `CLAUDE.md`（專案根目錄）
- `./.claude/CLAUDE.md`
- `CLAUDE.local.md`（專案根目錄）與 `./.claude/CLAUDE.local.md`——個人、本機專屬，通常 gitignore；處理方式同 CLAUDE.md（事實檢查、壓縮、無損驗證）；絕不加入 README 或 commit
- `./.claude/rules/**/*.md`（遞迴，含子目錄；專案根目錄本身即 `.claude` 目錄（如本 repo）→ `./rules/**/*.md`）
- `./.claude/commands/**/*.md`（含命名空間子目錄；專案根目錄本身即 `.claude` 目錄（如本 repo）→ `./commands/**/*.md`）

僅處理存在者；缺少則跳過（多數機器沒有 `CLAUDE.local.md`——正常，不提示）。其他 `@path` import 檔案，除非列於上方，否則不主動壓縮。

⚠️ `./.claude/rules/**/*.md`（或本 repo 的 `./rules/**/*.md`）是**使用者層級規則**，適用本機所有專案，不只本專案；建立或修改前，先確認範圍並非僅屬本 repo。

⚠️ 絕不在任意專案中 glob 裸的 `commands/**/*.md`——一般專案的 `commands/` 可能是原始碼（如 CQRS command pattern）；僅明確對應 Claude Code `.claude/commands/` 的路徑才算目標。

### Self-made skills (compression targets, terse style)

- 清單檔：`./.claude/skills/.up-skills-ignore`（專案根目錄本身即 `.claude` 目錄（如本 repo）→ `./skills/.up-skills-ignore`）。解析方式同 `/up-skills`：去掉以 `#` 開頭的註解與行尾 `# ...` 註解、trim、丟棄空行 → 名稱集合。
- 清單檔不存在 → 專案沒有 self-made skill；整段靜默跳過，不提示。
- 每個名稱 → 每個 `<skills dir>/<name>/**/*.md` 都是壓縮目標（`SKILL.md` 加上 `CRITERIA.md` 等附屬檔），`evals/**` 除外（測試 fixture：prompt 是使用者原話，grader 比對精確字串；絕不碰）；非 `.md` 檔（腳本等）不動。名稱在 skills dir 下沒有實際目錄 → 一行提示，跳過。
- 不在清單內的 skill → 絕不碰（上游管理，`/up-skills` 會覆寫）。
- ⚠️ 本 repo 的 `skills/` 是使用者層級，適用本機所有專案；修改前，先確認範圍並非僅屬本 repo。

### up-design artifacts (compression targets, terse style)

僅當專案根目錄有 `./up-design/` 目錄；不存在 → 整段靜默跳過，不提示。

- `./up-design/**/*.md`（`perf-baseline.md`、`reports/*.md`）
- `DESIGN.md`（專案根目錄）
- `./.claude/skills/design-*/**/*.md`（專案根目錄本身即 `.claude` 目錄 → `./skills/design-*/**/*.md`）；視同 self-made skill（SKILL.md frontmatter 逐字保留，`description` 除外；anchor 不動），但不需列入 `.up-skills-ignore`
- 絕不碰 `up-design/last-run.json` 或任何非 `.md` 檔——由腳本寫入，手改會破壞 quick/full 模式判斷。
- **不翻譯，僅壓縮**——`--lng` 不適用（含 `description`）：`/up-design` 靠固定標題定位區段（報告 `診斷` / `修正結果` / `未解決` / `規則變更`，DESIGN.md `Surfaces` … `Copy`），並以範本語言寫後續報告；翻譯會破壞定位並混用語言。
- 除 step 6 清單外另須逐字保留：所有標題、表格（表頭、儲存格、`file:line`、數字、verdict pass/gap/N/A/未驗證）、`<!-- date：「user words」 -->` 註解、`Updated:` / `Source report:` 行。`Why:` 行：僅刪贅詞，保留理由。
- `reports/*.md` 是歷史：不做 step 2 事實修正、不刪除、不合併報告；僅壓縮 prose。
- 絕不分塊進 `rules/`（step 5）。

### Language-only targets (translate to `--lng`, never compress, never audit)

- `./.claude/agents/**/*.md`（本 repo → `./agents/**/*.md`）：本文 prose 與 frontmatter `description` 隨 `--lng`；其他 frontmatter key（`name`、`tools`、`model`、`skills`、…）逐字保留。`description` 驅動自動委派 → 保留觸發詞的語意（如 "Use proactively …"）；tool、skill、agent 名稱逐字保留
- `./.claude/hooks/**`（本 repo → `./hooks/**`）：僅翻譯註解；程式碼、字串字面值、識別字、log／輸出字串不動
- Command `description`（壓縮目標 command 的 frontmatter）：隨 `--lng`；其中的旗標（`--lng`、`--pr`、…）、路徑、command／skill 名稱逐字保留。僅翻譯，絕不壓縮——`description` 驅動 slash command 觸發與清單顯示
- 語言已等於 `--lng` → 不改；不為改而改。不在 step 3 audit 範圍，不做 terse 壓縮，不做事實編輯

### Lint configs (write target, step 5 only)

- 專案現有的 linter 設定檔，由 `rule-routing.md` § Detection 找出（如 `eslint.config.*`、`.stylelintrc*`、`biome.json`、`ruff.toml` / `pyproject.toml` `[tool.ruff]`）
- 僅為加入 step 5 分流的規則而編輯；保持既有格式、註解風格與其他規則不動
- 專案沒有 linter 時絕不建立 linter 設定，絕不碰 `package.json` 依賴或 lockfile
- 不壓縮、不翻譯（本 skill 寫入的 `message` 字串除外，其隨 `--lng`）

### Sync target (human-readable first, not compressed)

- `./README.md`（專案根目錄）——見 "Step 8"

僅處理上述路徑（含 lint 設定）；**不得**擴及 `settings.json`，或上述 self-made skill 與 up-design artifacts 以外的 `skills/`。例外："Inventory sync"（step 8）的唯讀清單——絕不壓縮或修改那些檔案。
