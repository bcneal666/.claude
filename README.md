# ~/.claude

個人的 Claude Code 全域設定倉庫，內含自訂 skills、slash commands、statusline 與 settings，跨專案共用。

## 目錄結構

```
.
├── CLAUDE.md                   # 全域指令（所有專案共用，進版控）
├── README.md                   # 本文件
├── settings.json               # 全域 Claude Code 設定（permissions、env、hooks、statusLine…）
├── statusline-command.mjs      # statusline 腳本（Node 單一程序版）
├── hooks/                      # hook 腳本（時間注入，跨平台 Node）
├── commands/                   # 自訂 slash commands
├── skills/                     # 自訂 / 第三方 skills（`skills/synced/` 為雲端同步產物，見下）
└── notes/                      # 個人筆記（非設定，僅暫存）
```

其餘 `sessions/`、`session-env/`、`shell-snapshots/`、`projects/`、`file-history/`、`cache/`、`paste-cache/`、`plugins/`、`backups/`、`daemon/`、`jobs/`、`tasks/`、`plans/`、`feedback/`、`telemetry/`、`ide/`、`chrome/` 等為 runtime 產物，已列入 `.gitignore`，不進版控。

`skills/synced/` 是 Claude 帳號雲端同步下來的 skills（目前 9 個），內容由平台管理、不手動編輯，已列入 `.gitignore`，不進版控。

## Commands

| Command | 說明 |
|---|---|
| `/now-push [<lng>]` | 依固定格式自動執行 `git add` + `commit`（**英文** commit message，含 `Co-Authored-By` trailer）+ `push`，全程不詢問確認；帶 `<lng>`（如 `zh-TW`、`ja`）改用該語言撰寫 subject／body |
| `/up-rules [--audit]` | 依序：校正 `CLAUDE.md` 事實 →（帶 `--audit` 時）以 `claude-api` prompt-audit 審查過時指令，列 findings 供選擇套用 → 檢查是否有內容該分塊到 `rules/<topic>.md`（`paths` frontmatter 按需載入）→ 以 caveman full 強度壓縮 `CLAUDE.md` / `.claude/rules/**/*.md` / `.claude/commands/**/*.md`（只刪冗詞不刪語意，`--audit` 套用的刪改除外）→ 檢查並同步本 README |
| `/up-skills [global\|project]` | 批次更新 skills：已納管者（global 讀 `~/.agents/.skill-lock.json`；project 讀 `<專案根>/skills-lock.json`）逐一指名跑 `npx skills update`；未納管者推斷上游後確認重裝；`skills/.up-skills-ignore` 列出的自製 skill 完全跳過，有未提交改動的 skill 也自動跳過；global 另回報 plugin、雲端同步 skills、CLI 版本狀態 |

## Skills

| Skill | 說明 |
|---|---|
| `agent-browser` | 瀏覽器自動化 CLI，操作網頁、填表、截圖、爬資料 |
| `caveman` | 極致精簡溝通模式，降低 token 用量同時保留技術準確性 |
| `design-md` | 分析 Stitch 專案，整理成 `DESIGN.md` 設計系統文件 |
| `find-skills` | 協助發掘與安裝其他 agent skills |
| `git-commit` | Conventional commit 訊息分析與智慧分批 staging |
| `skill-creator` | 建立、修改、優化 skills，並可跑 eval 測試效能 |

外掛 plugin：`watch@claude-video`（來源 marketplace `bradautomates/claude-video`），提供 `/watch` 影片分析指令。

## Settings 重點

- `model`：`opusplan`（規劃階段用 Opus，執行階段自動切換模型）
- `outputStyle`：`Concise`（精簡輸出）；`language`：`traditional chinese`
- `permissions.defaultMode`：`plan`（預設進 plan 模式，先規劃再執行）
- `permissions.allow` 白名單常用低風險指令（`git add`、`git commit -m`、`git push`、`WebSearch`、`Edit(~/.claude/hooks/**)`、`Edit(~/.claude/commands/**)`）；`git add`/`commit`/`push` 同時列了 `Bash(...)` 與 `PowerShell(...)` 兩種前綴——Windows 上 PowerShell 是獨立的權限 namespace，不繼承 `Bash(...)` 規則
- statusline 只用 Node 版（`statusline-command.mjs`），無 shell fallback；三行分別為「model／effort／vim mode」「目錄／branch」「context 用量與大小／rate limits（5h／overage 用量）／cost」，`hideVimModeIndicator:true` 關閉內建 `-- INSERT --` 指示器改由自繪
- UserPromptSubmit hook（`hooks/inject-datetime.mjs`）每則 prompt 注入當前完整時間戳（`Asia/Taipei`，含時刻與星期），彌補內建 system prompt 只給開場日期快照的不足

## 維護慣例

- 全域共用設定寫 `settings.json`
- 規則文件（`CLAUDE.md`、`commands/*.md`）改動後跑 `/up-rules` 校正事實、視需要分塊到 `rules/`、壓縮冗詞並同步本 README；懷疑文件累積過時措辭（如針對舊模型的強調語氣）時加 `--audit` 先審查
- 變更完成且經確認後用 `/now-push` 推送
