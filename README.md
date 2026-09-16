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
├── skills/                     # 自訂 / 第三方 skills
└── notes/                      # 個人筆記（非設定，僅暫存）
```

其餘 `sessions/`、`projects/`、`file-history/`、`cache/`、`plugins/`、`backups/`、`daemon/`、`jobs/`、`feedback/` 等為 runtime 產物，已列入 `.gitignore`，不進版控。

## Commands

| Command | 說明 |
|---|---|
| `/now-push` | 依固定格式自動執行 `git add` + `commit`（繁體中文 commit message，含 `Co-Authored-By` trailer）+ `push`，全程不詢問確認 |
| `/up-rules` | 以 caveman full 強度壓縮 `CLAUDE.md` / `.claude/rules/*.md` / `.claude/commands/**/*.md`，只刪冗詞不刪語意；同時檢查並同步本 README |

## Skills

| Skill | 說明 |
|---|---|
| `agent-browser` | 瀏覽器自動化 CLI，操作網頁、填表、截圖、爬資料 |
| `caveman` | 極致精簡溝通模式，降低 token 用量同時保留技術準確性 |
| `design-md` | 分析 Stitch 專案，整理成 `DESIGN.md` 設計系統文件 |
| `find-skills` | 協助發掘與安裝其他 agent skills |
| `git-commit` | Conventional commit 訊息分析與智慧分批 staging |
| `officecli` / `officecli-docx` / `officecli-pptx` / `officecli-xlsx` | 建立、分析、校對、修改 Office 文件（Word / Excel / PowerPoint） |
| `skill-creator` | 建立、修改、優化 skills，並可跑 eval 測試效能 |

外掛 plugin：`watch@claude-video`（來源 marketplace `bradautomates/claude-video`），提供 `/watch` 影片分析指令。

## Settings 重點

- `model`：`opusplan`
- `outputStyle`：`Concise`（精簡輸出）；`language`：`traditional chinese`
- `permissions.defaultMode`：`plan`（預設進 plan 模式，先規劃再執行）
- `permissions.allow` 白名單常用低風險指令（`git add`、`git commit -m`、`git push`、`WebSearch`、`Edit(~/.claude/hooks/**)`、`Edit(~/.claude/commands/**)`）；`git add`/`commit`/`push` 同時列了 `Bash(...)` 與 `PowerShell(...)` 兩種前綴——Windows 上 PowerShell 是獨立的權限 namespace，不繼承 `Bash(...)` 規則
- statusline 只用 Node 版（`statusline-command.mjs`），無 shell fallback；三行分別為「model／effort／vim mode」「目錄／branch／耗時」「context 用量與大小／rate limits（5h／7d／overage 用量）／cost」，`hideVimModeIndicator:true` 關閉內建 `-- INSERT --` 指示器改由自繪
- UserPromptSubmit hook（`hooks/inject-datetime.mjs`）每則 prompt 注入當前完整時間戳（`Asia/Taipei`，含時刻與星期），彌補內建 system prompt 只給開場日期快照的不足

## 維護慣例

- 全域共用設定寫 `settings.json`
- 規則文件（`CLAUDE.md`、`commands/*.md`）改動後跑 `/up-rules` 壓縮冗詞並同步本 README
- 變更完成且經確認後用 `/now-push` 推送
