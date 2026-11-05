# 🗂️ ~/.claude

跨專案共用的個人 Claude Code 全域設定：skills、slash command、狀態列與設定檔。

| 亮點      | 說明                                                            |
| --------- | --------------------------------------------------------------- |
| 🧩 Skills | 自訂與第三方 **skills**，加上把它們串成流程的 `/up-*` 工作流    |
| ⚡ 指令    | 僅手動觸發的 **slash command**，用於提交、維護規則與更新 skills |
| ⚙️ 設定    | 納入版本控制的 **settings**、hook，以及單一 Node 程序的狀態列   |

## 🚀 快速開始

```text
/up-rules --audit --lng zh   # 校正並壓縮規則檔，同步本 README
/up-skills                   # 批次更新 skills
/now-push --pr --merge       # 提交、推送、開 PR 並 squash merge
```

## 📁 結構

```
.
├── CLAUDE.md                   # 全域指令（所有專案共用，納入版本控制）
├── README.md                   # 本檔
├── settings.json               # Claude Code 全域設定（permissions、env、hooks、statusLine…）
├── settings.local.json         # 機器專屬覆寫（gitignore，以 `claude --settings` 傳入）
├── statusline-command.mjs      # 狀態列腳本（單一 Node 程序）
├── hooks/                      # Hook 腳本（時間注入，跨平台 Node）
├── commands/                   # 自訂 slash command
├── skills/                     # 自訂 / 第三方 skills（`skills/synced/` 為雲端同步產物）
└── notes/                      # 個人筆記（非設定，僅暫存用）
```

- `skills/synced/` 存放從 Claude 帳號雲端同步下來的 skills（目前 16 個）。由平台管理，請勿手動編輯；已 gitignore。
- `settings.local.json` **不會**自動載入。以 `claude --settings` 傳入，例如在單一作業系統上停用某個 plugin。

<details>
<summary>執行期目錄（已 gitignore，不納入版本控制）</summary>

`sessions/`、`session-env/`、`shell-snapshots/`、`projects/`、`file-history/`、`cache/`、`paste-cache/`、`plugins/`、`backups/`、`daemon/`、`jobs/`、`tasks/`、`plans/`、`uploads/`、`feedback/`、`state/`、`telemetry/`、`ide/`、`chrome/` 等。

</details>

## ⚡ 指令

| 名稱                                        | 用途                                    |
| ------------------------------------------- | --------------------------------------- |
| `/now-push [--lng <code>] [--pr] [--merge]` | 以固定格式 commit 並 push，無需確認     |
| `/up-rules [--audit] [--lng <code>]`        | 校正、分塊並壓縮規則檔，再同步本 README |
| `/up-skills [global\|project]`              | 批次更新 skills                         |

> [!NOTE]
> 三個指令都設了 `disable-model-invocation: true`，因為各有副作用（push、改寫規則檔、重裝 skills）。Claude 不能自行呼叫，只有你親自輸入才會執行。

<details>
<summary><code>/now-push</code> 細節</summary>

- 不經確認直接執行 `git add` + `commit` + `push`
- Commit message 預設為**英文**，並附 `Co-Authored-By` trailer
- `--lng <code>` 切換 message 語言（`zh` = 繁體中文、`ja`…）
- `--pr` 同時開 PR；在預設分支上時自動建立新分支
- `--merge` 隱含 `--pr`，等必要檢查通過後 squash merge，刪除本地與遠端分支，再切回預設分支
- 每次執行都會檢查 GitHub repo description，並更新為與語言一致

</details>

<details>
<summary><code>/up-rules</code> 細節</summary>

- `--lng <code>` 指定所有寫入內容的語言（`zh` = 繁體中文、`ja`；未給 = 英文）；語言不同的內容會被翻譯
- 流程依序為：
  1. 校正 `CLAUDE.md` 事實
  2. 有 `--audit` 時：以 `claude-api` 的 prompt-audit 審查過時指令，再挑選要套用的發現
  3. 將路徑專屬內容分塊到 `rules/<topic>.md`（透過 `paths` frontmatter 按需載入）
  4. 以 caveman full 強度壓縮 `CLAUDE.md`、`.claude/rules/**/*.md` 與 `.claude/commands/**/*.md`（只刪贅詞，不刪語意；`--audit` 套用的 hunk 除外）
  5. 檢查並同步本 README
- README 供人類閱讀，因此免於 caveman 壓縮，並遵循風格指南（結構、emoji、callout、收合）

</details>

<details>
<summary><code>/up-skills</code> 細節</summary>

- 已納管的 skills（global 讀 `~/.agents/.skill-lock.json`；project 讀 `<project root>/skills-lock.json`）以 `npx skills update` 逐一更新
- 未納管的 skills 會推斷上游，經確認後重裝
- 列於 `skills/.up-skills-ignore` 的自製 skills 會略過，有未提交變更的 skills 也一樣
- global 模式另外回報 plugin、雲端同步 skills 與 CLI 版本狀態

</details>

## 🧩 Skills

| 名稱                           | 用途                                                     |
| ------------------------------ | -------------------------------------------------------- |
| `agent-browser`                | 瀏覽器自動化 CLI：操作頁面、填表單、截圖、擷取資料       |
| `ai-seo`                       | 讓內容被 AI 搜尋引擎與 LLM 引用（AEO / GEO、`llms.txt`） |
| `animate`                      | 從零打造動畫，依序決定目的、工具、曲線與退場             |
| `animation-performance`        | 修正掉幀：僅合成屬性、`will-change`、主執行緒成本        |
| `caveman`                      | 極簡語氣，省 token 但保留技術準確度                      |
| `design-md`                    | 把 Stitch 專案提煉成 `DESIGN.md` 設計系統文件            |
| `emil-design-eng`              | Emil Kowalski 的 UI 打磨、元件與動畫哲學                 |
| `find-animation-opportunities` | 唯讀搜尋該有動畫的地方，並給出確切數值                   |
| `find-skills`                  | 從開放的 skills 生態系探索並安裝 skills                  |
| `git-commit`                   | Conventional commit 分析與智慧分批暫存                   |
| `humanizer`                    | 改寫帶 AI 味的英文，讀起來像作者本人寫的                 |
| `humanizer-zh`                 | 中文版：刪除贅詞與模板化句型                             |
| `improve-animations`           | 唯讀的動態審查，產出排序過、可獨立執行的計畫             |
| `mobile-native`                | 用 CSS 與 meta 標籤修正，讓網頁 app 在手機上有原生手感   |
| `programmatic-seo`             | 規劃以範本與資料大量產生的 SEO 頁面                      |
| `remove-animations`            | 移除 UI 不需要的動態；只減不加、不調參                   |
| `review-animations`            | 以高工藝標準審查動畫程式碼（僅手動）                     |
| `review-fix`                   | 對目前專案做功能測試 + review 循環，最多 3 輪            |
| `seo-audit`                    | 診斷排名、索引與流量問題                                 |
| `skill-creator`                | 建立、修改並最佳化 skills，並執行 eval                   |
| `up-animate`                   | `/up-animate [--m] [@path ...]`：對專案 UI 執行動畫流程  |
| `up-seo`                       | `/up-seo [url] [@path ...]`：共用脈絡的 SEO 流程         |

**流程**

- `up-animate`：`remove-animations`（由你挑選要移除的）→ `find-animation-opportunities` → `animate` → `improve-animations`（審查後套用選定的計畫）→ `animation-performance` →（`--m`：`mobile-native`）→ `review-animations`
- `up-seo`：`ai-seo` → `seo-audit` → `programmatic-seo`，每階段後由你挑選要修的項目

**備註**

- 多數第三方 skills 是指向 `~/.agents/skills/` 的 symlink，由 skills CLI 安裝
- `review-animations` 僅手動觸發；`up-animate` 直接讀取它
- `review-fix` 自動偵測 dev 指令與 port，執行專案自己的 `.claude/review-fix/` 檢查或以 `scripts/lib.mjs` 為底的臨時腳本，再跑 `/code-review` 並修正到收斂

## 🪝 Hooks

| 腳本                        | 事件               | 用途                                                  |
| --------------------------- | ------------------ | ----------------------------------------------------- |
| `hooks/inject-datetime.mjs` | `UserPromptSubmit` | 為每則 prompt 注入含時刻與星期的 `Asia/Taipei` 時間戳 |

內建 system prompt 只在 session 開頭給一次日期快照，所以由這個 hook 補上完整時間。

## 🔌 Plugins

| 名稱                                | 用途                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `watch@claude-video`                | 加入 `/watch` 影片分析指令（marketplace `bradautomates/claude-video`）                           |
| `mindful-claude@mindful-claude`     | Claude 工作時在提示上方顯示呼吸動畫，用 `/breathe` 切換（marketplace `halluton/Mindful-Claude`） |
| `image-view@claude-image-view`      | 貼上圖片時顯示縮圖，取代單純的 `[Image #n]` 標籤（marketplace `jarrodwatts/claude-image-view`）  |
| `cc-plugin-you-should-know@builtin` | 來自 Claude Code 內建 marketplace，於 `enabledPlugins` 啟用                                      |
| `stripe@claude-plugins-official`    | Stripe skills（`stripe-best-practices`、`test-cards`、`explain-error`）與 Stripe MCP server      |

`cc-plugin-you-should-know` 與 `stripe` 沒有 `extraKnownMarketplaces` 條目，因為它們的 marketplace 隨 CLI 提供。

> [!IMPORTANT]
> `mindful-claude` 是 function-hooks plugin。需要 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`（已設於 `settings.json` 的 `env`）與 Claude Code 2.1.269 以上版本。

<details>
<summary>終端機與 Windows 上的 <code>image-view</code></summary>

- 只有 kitty 與 Ghostty 能畫出真正的圖片。其他終端機（含 Windows Terminal 與 PowerShell）會退回低解析度的彩色半格字元（`▀`），看起來像馬賽克。這是預期行為，不是 bug。
- 在同步的 `settings.json` 中維持啟用。Windows 上請在已 gitignore 的 `settings.local.json` 停用：

  ```json
  "enabledPlugins": { "image-view@claude-image-view": false }
  ```

- Claude Code 不會自行讀取 `~/.claude/settings.local.json`。PowerShell profile 定義了一個 `claude` 函式，以 `claude.exe --settings ~/.claude/settings.local.json` 啟動（`--settings` 優先於 user scope）。
- 該函式只對從 PowerShell 啟動的 `claude` 生效，IDE 或桌面版啟動不適用。
- 只對 profile 變更後開啟的 shell 生效：請執行 `. $PROFILE` 或開新分頁，因為已開啟的 pwsh 仍會把 `claude` 解析成 `claude.exe`。

</details>

## ⚙️ 設定

| 項目     | 內容                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| 模型     | `model` 為 `opusplan`（plan 模式用 Opus，執行時用 Sonnet）                                                              |
| 輸出     | `outputStyle` 為 `Concise`；`language` 為 `traditional chinese`                                                         |
| 啟動模式 | `permissions.defaultMode` 為 `plan`：先規劃，再執行                                                                     |
| 權限     | `permissions.allow` 僅放行低風險指令（清單見表下）                                                                      |
| 狀態列   | 僅用 Node（`statusline-command.mjs`），無 shell 備援；三行：模型/effort/vim 模式、目錄/分支、context 用量/速率限制/成本 |
| Vim 指示 | `hideVimModeIndicator: true` 關閉內建 `-- INSERT --` 指示，改用自訂版本                                                 |

放行項目：`git add`、`git commit -m`、`git push`、`WebSearch`、`Edit(~/.claude/hooks/**)`、`Edit(~/.claude/commands/**)`、`Skill(update-config)`。

> [!TIP]
> `git add` / `commit` / `push` 同時以 `Bash(...)` 與 `PowerShell(...)` 前綴列出。Windows 上 PowerShell 是獨立的權限命名空間，不會繼承 `Bash(...)` 規則。

<details>
<summary>以 <code>env</code> 清理 agent-browser</summary>

- `AGENT_BROWSER_IDLE_TIMEOUT_MS=900000` 在閒置 15 分鐘後關閉瀏覽器與 daemon
- `AGENT_BROWSER_SCREENSHOT_DIR` / `AGENT_BROWSER_DOWNLOAD_PATH` 把截圖與下載導向 `/tmp/agent-browser/`，由系統的 tmp 清理機制移除
- 閒置關閉會丟失 cookie、登入與開啟的分頁，所以 `CLAUDE.md` 要求 Claude 在登入或多輪驗證流程使用 `--session <name> --restore`

</details>

## 🛠️ 維護

| 情境         | 做法                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| 設定放置     | 共用放 `settings.json`；機器/OS 專屬覆寫放 gitignore 的 `settings.local.json`，因 `settings.json` 無法依平台分支 |
| 改完規則後   | 修改 `CLAUDE.md` 或 `commands/*.md` 後執行 `/up-rules`：校正事實、分塊到 `rules/`、壓縮贅詞並同步本 README       |
| 懷疑措辭過時 | 加 `--audit` 先審查（例如針對舊模型的強調語氣）                                                                  |
| 出貨         | 變更完成並確認後，用 `/now-push` 推送                                                                            |
