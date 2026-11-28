# 🗂️ ~/.claude

跨專案共用的個人全域 Claude Code 設定：skills、斜線指令、statusline 與 settings。

| 亮點        | 內容                                                               |
| ----------- | ------------------------------------------------------------------ |
| 🧩 Skills   | 自製與第三方 **skills**，包含自成一體的 `/up-*` 工作流程           |
| ⚡ Commands | 一個僅能手動觸發、用來更新 skills 的**斜線指令**                   |
| ⚙️ Settings | 納入版本控制的 **settings**、hooks，以及單一行程的 Node statusline |

## 🚀 Quick start

```text
/up-rules --audit            # 將規則分流到 lint/rules/CLAUDE.md、壓縮、同步本 README
/up-skills                   # 批次更新 skills
/now-push --pr --merge       # commit、push、開 PR 並 squash merge
```

## 📁 Structure

```text
~/.claude
├── CLAUDE.md                 # 全域規則
├── README.md                 # 本檔
├── settings.json             # 全域設定
├── settings.local.json       # 本機覆寫
├── statusline-command.mjs    # statusline
├── hooks/                    # hook 腳本
├── commands/                 # 斜線指令
├── agents/                   # 子代理
├── skills/                   # skills
└── notes/                    # 暫存筆記
```

- `skills/synced/` 存放從 Claude 帳號雲端同步下來的 skills；各帳號與裝置的內容不同。由平台管理，請勿手動編輯；已加入 gitignore。
- `settings.local.json` **不會**自動載入。以 `claude --settings` 帶入，例如在特定 OS 停用某個 plugin。

<details>
<summary>執行期目錄（gitignored，不納入版本控制）</summary>

`sessions/`、`session-env/`、`shell-snapshots/`、`projects/`、`file-history/`、`cache/`、`paste-cache/`、`plugins/`、`backups/`、`daemon/`、`jobs/`、`tasks/`、`plans/`、`uploads/`、`feedback/`、`state/`、`telemetry/`、`ide/`、`chrome/` 等。

</details>

## ⚡ Commands

| 名稱                           | 用途            |
| ------------------------------ | --------------- |
| `/up-skills [global\|project]` | 批次更新 skills |

> [!NOTE]
> 它設有 `disable-model-invocation: true`，因為重新安裝 skills 會產生副作用。Claude 無法自行呼叫，只有你輸入時才會執行。自寫的 skills（`now-push`、`review-fix`、`up-design`、`up-rules`、`up-seo`、`vitest-test-writer`）同樣如此（見 Skills）。

<details>
<summary><code>/up-skills</code> 細節</summary>

- 受管理的 skills（global 讀 `~/.agents/.skill-lock.json`；project 讀 `<專案根目錄>/skills-lock.json`）以 `npx skills update` 逐一更新
- 未受管理的 skills 會推斷上游，經確認後重新安裝
- 列在 `skills/.up-skills-ignore` 的自製 skills 會略過；自身目錄有未 commit 變更的 skills 也會略過（舊式 symlink 的 skills 不檢查，因為內容在 git 之外）
- global 模式另外回報 plugin、雲端同步 skills 與 CLI 版本狀態

</details>

## 🧩 Skills

| 名稱                 | 用途                                                                         |
| -------------------- | ---------------------------------------------------------------------------- |
| `design-md`          | 把 Stitch 專案整理成 `DESIGN.md` 設計系統文件                                |
| `now-push`           | 以固定格式 commit 並 push，不需確認；僅手動觸發（用法見下）                  |
| `review-fix`         | 對目前專案做功能測試加審查迴圈，最多 3 輪；僅手動觸發                        |
| `up-design`          | 帶狀態與規則的增量式 UI 診斷與修正；僅手動觸發（用法見 Pipelines）           |
| `up-rules`           | 將規則分流到 lint、`rules/` 或 `CLAUDE.md`、壓縮，並同步本 README            |
| `up-seo`             | 共用脈絡的 SEO 流程；僅手動觸發（用法見 Pipelines）                          |
| `vitest-test-writer` | 撰寫、審查、修復、去除不穩定或遷移 Vitest 測試，含 TDD red-green；僅手動觸發 |

**Pipelines**

- `/up-design [--full] [--m]`：一輪 UI 流程——診斷（375/768/1024/1440 截圖、UX 規則、靜態設計準則、動態與效能審計）→ 不經詢問直接修正（結構性變更與新增相依套件寫入報告為未解決）→ 驗證 → 把你的偏好寫入 `DESIGN.md`/lint；預設為快速模式（只處理自上次執行後變更的檔案），`--full` 涵蓋整個專案；狀態存於 `./up-design/`；不寫入 git；自成一體，指引在 `skills/up-design/references/`；細節：`skills/up-design/SKILL.md`
- `/up-seo [url] [@path ...]`：AI 搜尋可見度 → 技術與頁面 SEO 審計 → 程式化機會，共用同一份脈絡，每個階段後由你挑選要修的項目；自成一體，指引隨附於 `skills/up-seo/references/`；細節：`skills/up-seo/SKILL.md`

<details>
<summary><code>/now-push</code> 細節</summary>

- 不經確認直接執行 `git add` + `commit` + `push`；設有 `disable-model-invocation: true`，只有你輸入 `/now-push [--lng <code>] [--pr] [--merge]` 時才會執行
- 進行中有 merge、rebase、cherry-pick 或 revert、或有未合併檔案時，以及 diff 含秘密時，會停止且不 commit
- 照原樣 push 目前分支上所有尚未 push 的本機 commit，不只本次的；乾淨的工作樹若有未 push 的 commit 也會 push
- commit 訊息預設為**英文**，並附 `Co-Authored-By` trailer
- `--lng <code>` 切換訊息語言（`zh` = 繁體中文、`ja` 等）
- `--pr` 同時開 PR；位於預設分支時自動建立新分支
- `--merge` 隱含 `--pr`，等待必要檢查通過後 squash merge，刪除本機與遠端分支，再回到預設分支
- 每次執行都會檢查 GitHub repo 描述，並依語言更新使其一致
- 自成一體：commit 格式與 PR/merge 步驟隨附於 `skills/now-push/references/`

</details>

<details>
<summary><code>/up-rules</code> 細節</summary>

- 只有你輸入 `/up-rules [--audit] [--lng <code>]` 時才會執行（`disable-model-invocation: true`）
- `--lng <code>` 設定所有寫入內容的語言，包含 `agents/` 內文、`hooks/` 註解、指令描述與 lint 訊息（`zh` = 繁體中文、`ja`；未指定 = 英文）；不同語言的內容會被翻譯
- 流程依序為：
  1. 事實查核 `CLAUDE.md`
  2. 加 `--audit` 時：審計過時指令，再挑選要套用的發現
  3. 把每條規則分流到仍能確實執行的最低成本位置：專案既有 linter 的 lint 規則（理由寫在 lint 訊息）、經 `paths` 按需載入的 `rules/<topic>.md`、最後才是 `CLAUDE.md`
  4. 以精簡風格壓縮 `CLAUDE.md`、`.claude/rules/**/*.md`、`.claude/commands/**/*.md`，以及列在 `skills/.up-skills-ignore` 的自製 skills 的 `.md` 檔（另外，`./up-design/` 存在時，也包含其 `.md` 檔、`DESIGN.md` 與 `.claude/skills/design-*/`；這些不翻譯）（只刪贅詞，不刪語意，經 `--audit` 套用的 hunk 除外）
  5. 檢查並同步本 README
- 不會安裝 linter，也不會修改原始碼；新的 lint 規則維持 error，只有已違規的檔案降為 warn，並計入報告
- README 是寫給人看的，因此不適用精簡壓縮，而是遵循風格指南（結構、emoji、callout、摺疊）

</details>

**Notes**

- 第三方 skills 以 `npx skills add --copy` 安裝，因此每個都是 `skills/` 中的實體目錄，可透過 git 跨裝置同步；`/up-skills` 仍會就地從上游更新
- 更新來源清單在 repo 之外的 `~/.agents/.skill-lock.json`；新裝置上，每個 skill 執行一次 `npx skills add <owner/repo> -s <skill> -g -y -a claude-code --copy` 來登記
- `up-design` 會自行把使用者的設計修正寫入 `DESIGN.md` / lint（寫規則的指引：`skills/up-design/references/rule-routing.md`）
- `/review-fix [low|medium|high|xhigh|max]` 自動偵測 dev server，執行專案的 `.claude/review-fix/` 檢查（或以 `scripts/lib.mjs` 為基礎的用完即丟腳本）加上其 `typecheck`/`lint`/`test` scripts，再跑 `/code-review`（預設 `high`）並修正直到收斂；`ultra` 會計費且須由使用者觸發，所以只會提示你自己執行 `/code-review ultra`

## 🤖 Subagents

| 名稱           | 用途                                                            |
| -------------- | --------------------------------------------------------------- |
| `researcher`   | 查詢文件、API 與錯誤訊息；回傳附出處的簡短答案                  |
| `ui-ux-tester` | 以 agent-browser 測試執行中的網頁應用；回報流程、視覺與 UX 瑕疵 |

> [!NOTE]
> 兩個 subagent 都是唯讀（未授予 `Edit` / `Write`），描述中都寫有「主動使用」，所以主 agent 會自動委派給它們。兩者都固定 `model: sonnet`。`ui-ux-tester` 從 CLI 本身載入 `agent-browser` 使用指南（`agent-browser skills get core`）。

## 🪝 Hooks

| 腳本                              | 事件               | 用途                                                          |
| --------------------------------- | ------------------ | ------------------------------------------------------------- |
| `hooks/inject-datetime.mjs`       | `UserPromptSubmit` | 在每個 prompt 加入含時刻與星期的 `Asia/Taipei` 時間戳         |
| `hooks/agent-browser-session.mjs` | `SessionStart`     | 為每個 Claude session 指定專屬的 `agent-browser` session 名稱 |
| `hooks/agent-browser-session.mjs` | `SessionEnd`       | 關閉該 session 的瀏覽器，不留下 Chrome 行程                   |
| `hooks/git-secret-guard.mjs`      | `PreToolUse`       | 變更內含秘密時，阻擋 `git commit` / `git push`                |
| `settings.json`（內嵌指令）       | `PostToolUse`      | 對 Claude 寫入或編輯的每個檔案執行 `prettier --write`         |

內建 system prompt 只在 session 開始時給一次日期快照，所以由 `inject-datetime` 補上完整時間。清理細節見 Settings。

`git-secret-guard` 會掃描新增的行與未追蹤的檔案，找私鑰、常見 API token、寫死的憑證與 `.env` 檔（允許 `.env.example`）。在該行加上 `secret-scan:allow` 可略過誤判。名稱列在 repo 的 `skills-lock.json` 的 skill 目錄（`.claude/skills/<name>/`、`.agents/skills/<name>/`）不掃描；手寫的 skills 會掃描。它 fail open：任何內部錯誤都會放行指令。

## 🔌 Plugins

| 名稱                                | 用途                                                        |
| ----------------------------------- | ----------------------------------------------------------- |
| `watch@claude-video`                | 加入 `/watch` 影片分析指令                                  |
| `mindful-claude@mindful-claude`     | Claude 工作時顯示呼吸動畫；以 `/breathe` 切換               |
| `image-view@claude-image-view`      | 顯示貼上圖片的縮圖，取代單純的 `[Image #n]` 標籤            |
| `cc-plugin-you-should-know@builtin` | 來自 Claude Code 內建 marketplace，在 `enabledPlugins` 啟用 |

`cc-plugin-you-should-know` 沒有 `extraKnownMarketplaces` 項目，因為它的 marketplace 隨 CLI 一起提供。

> [!IMPORTANT]
> `mindful-claude` 是 function-hooks plugin。它需要 `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`（已設在 `settings.json` 的 `env`）與 Claude Code 2.1.269 以上。

<details>
<summary><code>image-view</code> 在終端機與 Windows 上的行為</summary>

- 只有 kitty 與 Ghostty 能畫出真正的圖片。其他終端機，包括 Windows Terminal 與 PowerShell，會退回低解析度的彩色半方塊（`▀`），看起來像馬賽克。這是預期行為，不是 bug。
- 在同步的 `settings.json` 中維持啟用。在 Windows 上，請於 gitignored 的 `settings.local.json` 停用：

  ```json
  "enabledPlugins": { "image-view@claude-image-view": false }
  ```

- Claude Code 不會自己讀取 `~/.claude/settings.local.json`。PowerShell profile 定義了一個 `claude` 函式，以 `claude.exe --settings ~/.claude/settings.local.json` 啟動（`--settings` 優先於 user 層級）。
- 該函式只對從 PowerShell 啟動的 `claude` 有效，IDE 或桌面版啟動不適用。
- 只對 profile 修改之後開啟的 shell 有效：執行 `. $PROFILE` 或開新分頁，因為已開啟的 pwsh 仍會把 `claude` 解析為 `claude.exe`。

</details>

## ⚙️ Settings

| 項目           | 內容                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Model          | `model` 為 `opusplan`（plan mode 用 Opus，執行時用 Sonnet）                                              |
| Effort         | `modelSettings`：Opus `xhigh`、Sonnet `high`；`opusplan` 兩個階段都用 Sonnet 項目（plan 以 `high` 執行） |
| Subagent model | `env` 設定 `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` 作為後備；自訂 agent 固定自己的 `model`，以其為準         |
| Output         | `outputStyle` 為 `Concise`；`language` 為 `Traditional Chinese (Taiwan)`                                 |
| 啟動模式       | `permissions.defaultMode` 為 `plan`                                                                      |
| Permissions    | `permissions.allow` 白名單列出低風險指令（清單在表格下方）                                               |
| Deny           | `permissions.deny` 阻擋 force push 與讀取 `~/.ssh`                                                       |
| Skill 清單     | `skillOverrides` 隱藏 claude.ai 同步與少用的 skills；只保留 `docx`/`pdf`/`pptx`/`xlsx` 列出              |
| 同步 plugins   | `syncClaudeAiPlugins: false` 停止 claude.ai plugin 同步（捨棄 `logo-design`、`frontend-design`）         |
| 時區           | `timeZone` 為 `Asia/Taipei`                                                                              |
| Statusline     | 僅用 Node（`statusline-command.mjs`），無 shell 後備；三行（model、位置、用量）                          |
| Vim 指示器     | `statusLine.hideVimModeIndicator: true` 關閉內建的 `-- INSERT --` 指示器，改用自訂指示器                 |

允許：`git add`、`git commit -m`、`git push`、`WebSearch`、`agent-browser snapshot` / `wait`、`Edit(~/.claude/commands/**)`、`Skill(update-config)`。

> [!TIP]
> `git add` / `commit` / `push` 同時以 `Bash(...)` 與 `PowerShell(...)` 前綴列出。在 Windows 上，PowerShell 是獨立的權限命名空間，不會繼承 `Bash(...)` 規則。

<details>
<summary>透過 <code>env</code> 清理 agent-browser</summary>

- `AGENT_BROWSER_IDLE_TIMEOUT_MS=900000` 在閒置 15 分鐘後關閉瀏覽器與 daemon
- `AGENT_BROWSER_SCREENSHOT_DIR` / `AGENT_BROWSER_DOWNLOAD_PATH` 把截圖與下載送到 `/tmp/agent-browser/`，由系統的 tmp 清理機制移除
- `hooks/agent-browser-session.mjs` 在 `SessionStart` / `SessionEnd` 執行：開始時把 `AGENT_BROWSER_SESSION=cc-<session_id>` 寫入 `CLAUDE_ENV_FILE`，讓每個 Claude session 有自己的瀏覽器；結束時執行 `agent-browser close --session cc-<session_id>`（不影響其他同時執行的 session）。`SessionEnd` 設有 `timeout: 10`，因為預設值是 1.5 秒
- 在 Windows 上，`CLAUDE_ENV_FILE` 只提供給透過 Git Bash 執行的 hooks；沒有它就不會設定 session 變數，清理退回閒置逾時
- 閒置關閉會丟失 cookie、登入狀態與已開分頁，所以 `CLAUDE.md` 要求 Claude 在登入或多輪驗證流程加上 `--restore`

</details>

## 🛠️ Maintenance

| 情況         | 做法                                                                                 |
| ------------ | ------------------------------------------------------------------------------------ |
| 設定放哪裡   | 共用的放 `settings.json`；特定機器或 OS 的覆寫放 gitignored 的 `settings.local.json` |
| 編輯規則之後 | 修改 `CLAUDE.md`、`commands/*.md` 或自製 skill 後執行 `/up-rules`                    |
| 懷疑措辭過時 | 加 `--audit` 先審計（例如針對舊模型的強調語氣）                                      |
| 發佈         | 變更完成並確認後，以 `/now-push` push                                                |
