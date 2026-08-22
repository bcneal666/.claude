# ~/.claude

個人的 Claude Code 全域設定倉庫，內含自訂 skills、slash commands、statusline 與 settings，跨專案共用。

## 目錄結構

```
.
├── CLAUDE.md                  # 全域指令（所有專案共用，進版控）
├── CLAUDE.local.md             # 本機設備事實（不進版控，機器異動）
├── CLAUDE.local.example.md     # 本機設定範本
├── settings.json               # 全域 Claude Code 設定（permissions、env、outputStyle…）
├── settings.local.json         # 本機專屬設定（不進版控）
├── statusline-command.mjs      # statusline 腳本（Node 單一程序版，取代 .sh）
├── statusline-command.sh       # statusline 腳本舊版（保留）
├── commands/                   # 自訂 slash commands
├── skills/                     # 自訂 / 第三方 skills
└── notes/                      # 個人筆記（非設定，僅暫存）
```

其餘 `sessions/`、`projects/`、`file-history/`、`cache/`、`plugins/` 等為 runtime 產物，已列入 `.gitignore`，不進版控。

## Commands

| Command | 說明 |
|---|---|
| `/now-push` | 依固定格式自動執行 `git add` + `commit`（繁中 commit message）+ `push`，全程不詢問確認 |
| `/up-rules` | 精煉 `CLAUDE.md` / `.claude/rules/*.md` 的字句，壓縮冗詞但保留完整指令語意 |

## Skills

| Skill | 說明 |
|---|---|
| `agent-browser` | 瀏覽器自動化 CLI，操作網頁、填表、截圖、爬資料 |
| `caveman` | 極致精簡溝通模式，降低 token 用量同時保留技術準確性 |
| `design-md` | 分析 Stitch 專案，整理成 `DESIGN.md` 設計系統文件 |
| `eli5` | 用五歲小孩能懂的方式解釋主題 |
| `find-skills` | 協助發掘與安裝其他 agent skills |
| `git-commit` | Conventional commit 訊息分析與智慧分批 staging |
| `officecli` / `officecli-docx` / `officecli-pptx` / `officecli-xlsx` | 建立、分析、校對、修改 Office 文件（Word / Excel / PowerPoint） |
| `seo-audit` | 網站 SEO 健檢與問題診斷 |
| `skill-creator` | 建立、修改、優化 skills，並可跑 eval 測試效能 |

## Settings 重點

- `outputStyle`：`Concise`（精簡輸出）
- 固定使用 Node 版 statusline（`statusline-command.mjs`）
- `permissions.allow` 內白名單常用唯讀 / 低風險指令（`git add`、`git commit -m`、`git push`、`WebSearch` 等）

## 維護慣例

- 本機專屬事實只寫 `CLAUDE.local.md`，不進版控；新機器從 `CLAUDE.local.example.md` 複製
- 規則文件改動後可跑 `/up-rules` 壓縮冗詞
- 變更完成且經確認後用 `/now-push` 推送
