---
description: 批次更新 skills（<type> 為 global|project，預設 global）；透過 skills CLI 依名稱更新每個 lockfile 條目，推斷上游後重新安裝未受管理的 skills，並回報 plugin / synced / CLI 內建版本狀態
argument-hint: "[<type>]"
disable-model-invocation: true
---

## Scope 參數 `<type>`（選填）

收到：`$ARGUMENTS`（空白 = 無）。

- 空白或 `global` → 目標 `~/.claude/skills/`（排除 `synced/` 子目錄）
- `project` → 目標 `./.claude/skills/`；不存在 → 回報 「找不到 `./.claude/skills/`」 然後**停止**；勿建立目錄
- 其他值（無法辨識）→ 一行提示，**fallback 為 `global`**，繼續；勿中止

## 流程

### 1. Preflight

- 在 git repo → 執行 `git status --short`；工作樹有未提交變更 → 一行提示 「diff 會混雜既有未提交變更」，**勿中止**
- 確認 `node -v` 可執行（`npx skills` 的前提）；不可用 → 回報並停止
- `project` mode 假設 **cwd 為專案根目錄**（`.claude/` 的父目錄）；絕不 `cd` 離開——`npx skills` 僅相對於 cwd 讀寫專案 lockfile；離開 cwd 會無聲失敗，不會報錯

### 2. 盤點目標目錄

列出目標路徑下的 skill 子目錄名稱（`global` 排除 `synced/`；兩者皆排除隱藏檔與非目錄項目）。

### 3. 讀取來源資料

- `global` → 讀 `~/.agents/.skill-lock.json` 的 `skills{}`（欄位：`source`、`sourceUrl`、`skillPath`、`skillFolderHash`、`updatedAt`）
- `project` → 讀 **`<project root>/skills-lock.json`** 的 `skills{}`（注意：在專案根目錄，**不在** `.claude/skills/` 下；檔名**沒有**點前綴）（欄位：`source`、`sourceType`、`skillPath`、`computedHash`；無 timestamp）；不存在 → 視為空清單（不報錯）；目標目錄中每個 skill 直接進入 step 4 B/C 推斷
- 讀取 ignore list（`global` → `~/.claude/skills/.up-skills-ignore`；`project` → `<project>/.claude/skills/.up-skills-ignore`）：逐行去除以 `#` 開頭的註解與行尾 `# ...` 註解，trim，丟棄空行 → 名稱集合；檔案不存在 = 空集合；勿自動建立

### 4. 分類

依表將每個 skill 標為 D/A/B/C，**優先順序 D > A > B > C**——名稱同時在 ignore list 與 lockfile → 一律 D：

| 類別        | 判準                                                                           | 動作                                                                                              |
| ----------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| D 自製/凍結 | 名稱列於 `.up-skills-ignore`                                                   | 完全跳過：不比對 lockfile、不掃描上游、不執行指令                                                 |
| A 受管理    | 名稱同時存在於目標目錄與 lockfile                                              | step 5：`npx skills update`                                                                       |
| B 可推斷    | 不在 lockfile，但 SKILL.md/README 含 `npx skills add …` 指令或 GitHub repo URL | step 6：確認後 `npx skills add`（重新安裝會讓 CLI 自動寫入 lockfile → 下次為 A 類；不手建對照表） |
| C 無上游    | 找不到上游線索，或透過外部 binary 安裝                                         | step 7：僅回報，不執行指令                                                                        |

`project` mode，lockfile `sourceType` 為 `node_modules`/`local` → 非 A，不做 B/C 推斷——本地來源，無上游可更新，屬合法狀態；標 「本地來源·不適用」。

`project` mode 且無 `skills-lock.json`（或有記錄但在目標目錄找不到該名稱）：掃描目標目錄內每個 SKILL.md/README，依 B 規則推斷來源；來源無法推斷 → 標 C；勿猜測，勿捏造 repo URL。

### 5. 更新 A 類

先做 git drift 檢查，再組指令參數：

- 在 git repo → 對每個 entry 為真實目錄的 A 類 skill 執行 `git status --porcelain skills/<name>/`（`global`，cwd `~/.claude`）或 `git status --porcelain .claude/skills/<name>/`（`project`，cwd 專案根目錄）；有任何輸出（未提交變更）→ 標該 skill 「本地有未提交改動·已跳過」，排除於參數清單，建議先 commit，或加入 `.up-skills-ignore` 永久排除
- Entry 為指向 `~/.agents/skills/` 的舊式 symlink（在 `--copy` 之前安裝）→ 跳過 drift 檢查，進入參數清單：內容在 git 之外，沒有本地內容要保護；git 只顯示連結型別變更（`D`/`T`，`core.symlinks=false` 時常見），絕非真實編輯。`update` 可能把真實目錄換成這樣的 symlink（git 隨即顯示所有檔案被刪除加一個未追蹤連結）→ 更新後，對每個原為真實目錄、現為 symlink 的 A 類 skill，執行 `rm <link> && cp -rL <target> <link>`，讓經 git 同步的裝置仍能運作
- 不在 git repo → 跳過檢查，一行提示 「無 git 保護，更新將直接覆蓋」，所有 A 類進入參數清單

被分為 A、通過 drift 檢查、且**實際存在於目標目錄**的名稱 → 逐一列為指令參數：

```
npx skills update <name1> <name2> ... -g -y    # global
npx skills update <name1> <name2> ... -p -y    # project
```

⚠️ `project` mode **必須明確寫 `-p`**，不能只是「省略 `-g`」——給了 skill 名稱而兩個 flag 都沒給時，CLI 會視為同時更新 global 與 project（`"both"`），而非僅 project。

⚠️ **絕不省略參數而裸跑** `npx skills update -g`（無參數 = 更新每個 lockfile 條目；會把已移除的 skills 重新安裝回目錄）。

單一 skill 更新失敗（non-zero exit）→ 記錄失敗與 stderr 摘要，**繼續處理其餘**；勿中止整體流程。stdout 含 「legacy」/「無法就地更新」 或類似字樣（`project` mode 下，缺 `skillPath` 的舊記錄常見）→ 摘錄到備註欄，計為 「失敗」 或 「已略過」；本身不是指令錯誤。

`project` mode 備註：CLI 重新安裝這類記錄時不帶 `-a`，故 agent 分發可能改變（其他 agent 目錄被新增或移除）；為已知 CLI 行為，本指令無法控制；在報告加註。

### 6. 更新 B 類

逐一顯示要執行的完整指令；確認後才執行：

```
npx skills add <owner/repo> -s <skill> -g -y -a claude-code --copy
```

一律加 `--copy`：真實目錄，不是指向 `~/.agents/skills/` 的 symlink——symlink 帶有機器專屬的絕對路徑，在經 git 同步的裝置上會壞。對多個 skills 跑迴圈 → `npx … < /dev/null`；`npx` 會吃掉迴圈的 stdin，之後的迭代永不執行。

`project` mode 省略 `-g`；一律加 `-a claude-code`，避免寫入 lockfile `lastSelectedAgents` 所列其他 agent（amp、cursor、codex 等）的目錄。使用者拒絕 → 標 「已略過」。

### 7. 更新 C 類

僅列出名稱與 「無法自動更新」；不執行任何指令。

### 8. Plugin 層

1. `claude plugin marketplace update`（一次更新所有 marketplaces）
2. `claude plugin list --json`；只保留 `enabled` 為 true 且 `scope` 為 `user` 的條目，並排除 marketplace 為 `builtin` 與 `skills-dir` 者（內建與 skills-dir plugins 在此不可更新；project-scope、synced、managed 條目因 `scope` 而被排除）。`list` 只顯示已安裝版本，沒有較新版本的指示
3. 對每個保留的 plugin（如 `watch@claude-video`）執行：
   ```
   claude plugin update <plugin>@<marketplace> -y --json -s user
   ```
   讀 JSON 中的 `updateOutcome`（`up_to_date` 或 updated）
4. 回報 「更新後需重啟 session 才會生效」

### 9. 唯讀報告層（不寫入、不更新）

**僅限 `global` mode**——`skills/synced/` 是 Claude Code 帳號層級的概念；`project` 無對應；`project` mode 跳過此步驟。

- 讀 `~/.claude/skills/synced/*/manifest.json`；回報各 skill 的 `source`、`updatedAt` 與整體 `lastUpdated`（平台雲端管理，無法在本機更新）
- 執行 `claude --version`；回報目前 CLI 版本；CLI 內建 skills 建議執行 `claude update`（不自動執行）

### 10. 收尾

```
git diff --stat
git status --short
```

**不** `git commit`，**不** `git push`；最後一行提示可用 `/now-push` 來 commit。

## 報告格式

一個表格，欄位：`skill | 類別 | 來源 | 結果 | 備註`（結果值 「已更新／已是最新／失敗／已略過／自製·已跳過／本地有未提交改動·已跳過／本地來源·不適用」）；D 類與因 drift 而跳過的項目也要列入表格；絕不省略。

表格之後附：

- Plugin 更新結果（含是否需重啟）
- Synced skills 狀態（唯讀）
- CLI 版本，及是否建議 `claude update`
- `git diff --stat` 摘要

## 禁止

- 不得 `npx skills add … --all` 或 `-s '*'`
- 絕不動 `skills/synced/`（平台管理，已 gitignore）
- 絕不自動執行 `claude update`（會替換 CLI 本身）——僅建議
- 不 `git commit`，不 `git push`
- 絕不自動新增/移除 `.up-skills-ignore` 內容——由使用者手動維護
- 絕不對 `npx skills update`/`check`/`upgrade` 加 `--help` 來探索用法——沒有一個會攔截 `--help`；它們會直接執行更新；語法僅查閱本檔或頂層 `npx skills --help`
