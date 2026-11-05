---
description: 批次更新 skills（<type> 可選 global|project，預設 global）；依 skills CLI lockfile 逐一指名更新，未納管者推斷上游後重裝納管，並回報 plugin / synced / CLI 內建的版本狀態
argument-hint: "[<type>]"
disable-model-invocation: true
---

## 範圍參數 `<type>`（位置參數 `$1`，選填）

- `$1` 為空或 `global` → 目標 `~/.claude/skills/`（排除 `synced/` 子目錄）
- `$1` 為 `project` → 目標 `./.claude/skills/`；不存在 → 回報 「找不到 `./.claude/skills/`」 後**停止**；不建立目錄
- 其他值（無法辨識）→ 一行提示，**退回 `global`**，繼續；不中止

## 流程

### 1. 前置檢查

- 在 git repo → 執行 `git status --short`；工作樹有未提交變更 → 一行提示 「diff 會混雜既有未提交變更」，**不中止**
- 確認 `node -v` 可執行（`npx skills` 前提）；不可用 → 回報並停止
- `project` 模式假設 **cwd 為專案根**（`.claude/` 的上層）；絕不 `cd` 離開——`npx skills` 僅相對 cwd 讀寫專案 lockfile；離開 cwd 會靜默失敗，不會報錯

### 2. 盤點目標目錄

列出目標路徑下的 skill 子目錄名稱（`global` 排除 `synced/`；兩者皆排除隱藏檔與非目錄項目）。

### 3. 讀取來源資料

- `global` → 讀 `~/.agents/.skill-lock.json` 的 `skills{}`（欄位：`source`、`sourceUrl`、`skillPath`、`skillFolderHash`、`updatedAt`）
- `project` → 讀 **`<project root>/skills-lock.json`** 的 `skills{}`（注意：在專案根，**不在** `.claude/skills/` 下；檔名**無點前綴**）（欄位：`source`、`sourceType`、`skillPath`、`computedHash`；無時間戳）；不存在 → 視為空清單（不報錯）；目標目錄內每個 skill 直接進入步驟 4 的 B/C 推斷
- 讀 ignore 清單（`global` → `~/.claude/skills/.up-skills-ignore`；`project` → `<project>/.claude/skills/.up-skills-ignore`）：逐行去除 `#` 開頭註解與行尾 `# ...` 註解，trim，丟棄空行 → 名稱集合；檔案不存在 = 空集合；不自動建立

### 4. 分類

依下表將每個 skill 標為 D/A/B/C，**優先序 D > A > B > C**——名稱同時在 ignore 清單與 lockfile → 一律 D：

| 類別 | 判準 | 動作 |
| --- | --- | --- |
| D 自製/凍結 | 名稱列於 `.up-skills-ignore` | 完全略過：不比對 lockfile、不掃上游、不執行指令 |
| A 已納管 | 名稱同時存在於目標目錄與 lockfile | 步驟 5：`npx skills update` |
| B 可推斷 | 不在 lockfile，但 SKILL.md/README 含 `npx skills add …` 指令或 GitHub repo URL | 步驟 6：確認後 `npx skills add`（重裝使 CLI 自動寫入 lockfile → 下次為 A 類；不手建對照表） |
| C 無上游 | 找不到上游線索，或經外部 binary 安裝 | 步驟 7：僅回報，不執行指令 |

`project` 模式，lockfile `sourceType` 為 `node_modules`/`local` → 非 A，也不做 B/C 推斷——本地來源，無上游可更新，屬正常狀態；標 「本地來源·不適用」。

`project` 模式無 `skills-lock.json`（或有紀錄但名稱不在目標目錄）：掃描目標目錄每個 SKILL.md/README，依 B 規則推斷來源；無法推斷 → 標 C；不猜測，不捏造 repo URL。

### 5. 更新 A 類

先做 git drift 檢查，再組指令參數：

- 在 git repo → 對每個 A 類 skill 執行 `git status --porcelain skills/<name>/`（`global`，cwd `~/.claude`）或 `git status --porcelain .claude/skills/<name>/`（`project`，cwd 專案根）；有任何輸出（有未提交變更）→ 標 「本地有未提交改動·已跳過」，排除於參數清單外，建議先 commit 或加入 `.up-skills-ignore` 永久排除
- 不在 git repo → 略過檢查，一行提示 「無 git 保護，更新將直接覆蓋」，所有 A 類進入參數清單

分類為 A、通過 drift 檢查、且**實際存在於目標目錄**的名稱 → 逐一列為指令參數：

```
npx skills update <name1> <name2> ... -g -y    # global
npx skills update <name1> <name2> ... -p -y    # project
```

⚠️ `project` 模式**必須明寫 `-p`**，不能只是「省略 `-g`」——給了 skill 名稱卻沒給任何旗標時，CLI 視為同時更新 global 與 project（`"both"`），而非僅 project。

⚠️ **絕不省略參數裸跑** `npx skills update -g`（無參數 = 更新 lockfile 所有條目；會把已移除的 skill 重裝回目錄）。

單一 skill 更新失敗（非零 exit）→ 記錄失敗與 stderr 摘要，**繼續其餘**；不中止整體流程。stdout 含 「legacy」/「無法就地更新」 或類似字樣（`project` 模式下缺 `skillPath` 的舊紀錄常見）→ 摘錄入備註欄，計為 「失敗」 或 「已略過」；本身不是指令錯誤。

`project` 模式備註：CLI 對此類紀錄不帶 `-a` 重裝，agent 分發可能改變（其他 agent 目錄被新增或移除）；為已知 CLI 行為，本指令無法控制；於報告加註。

### 6. 更新 B 類

逐一顯示完整指令；確認後才執行：

```
npx skills add <owner/repo> -s <skill> -g -y -a claude-code
```

`project` 模式省略 `-g`；一律加 `-a claude-code`，避免寫入 lockfile `lastSelectedAgents` 所列其他 agent（amp、cursor、codex 等）的目錄。使用者拒絕 → 標 「已略過」。

### 7. 更新 C 類

僅列名稱與 「無法自動更新」；不執行指令。

### 8. Plugin 層

1. `claude plugin marketplace update`（一次更新所有 marketplace）
2. `claude plugin list` 取得目前版本
3. 對每個已啟用 plugin（如 `watch@claude-video`）比對新版；有更新版 → 執行：
   ```
   claude plugin update <plugin>@<marketplace> -y --json -s user
   ```
4. 回報 「更新後需重啟 session 才會生效」

### 9. 唯讀回報層（不寫入、不更新）

**僅 `global` 模式**——`skills/synced/` 是 Claude Code 帳號層級概念；`project` 無對應；`project` 模式略過此步。

- 讀 `~/.claude/skills/synced/*/manifest.json`；回報每個 skill 的 `source`、`updatedAt` 與整體 `lastUpdated`（平台雲端管理，無法本地更新）
- 執行 `claude --version`；回報目前 CLI 版本；CLI 內建 skill 建議 `claude update`（不自動執行）

### 10. 收尾

```
git diff --stat
git status --short
```

**不** `git commit`、**不** `git push`；最後一行提示用 `/now-push` commit。

## 報告格式

一張表，欄位：`skill | 類別 | 來源 | 結果 | 備註`（結果值 「已更新／已是最新／失敗／已略過／自製·已跳過／本地有未提交改動·已跳過／本地來源·不適用」）；D 類與 drift 跳過者也列入表中；不得省略。

表後附：

- Plugin 更新結果（含需重啟）
- Synced skills 狀態（唯讀）
- CLI 版本與是否建議 `claude update`
- `git diff --stat` 摘要

## 禁止事項

- 不裸跑 `npx skills update -g`（無參數）——會把所有已移除的 lockfile skill 重裝回目錄
- 不用 `npx skills add … --all` 或 `-s '*'`
- 絕不動 `skills/synced/`（平台管理，已 gitignore）
- 絕不自動執行 `claude update`（會替換 CLI 本身）——僅建議
- 不 `git commit`、不 `git push`
- B 類重裝須先經使用者確認（來源為推斷，非既有紀錄）
- 單一 skill 更新失敗不中止整體流程；僅前置檢查失敗才中止
- 絕不更新列於 `.up-skills-ignore` 的 skill，即使名稱存在於 lockfile
- 絕不自動增刪 `.up-skills-ignore` 內容——由使用者手動維護
- git drift 檢查失敗（skill 目錄有未提交變更）→ 不強制覆蓋
- 絕不對 `npx skills update`/`check`/`upgrade` 加 `--help` 探索用法——它們皆不攔截 `--help`，會直接執行更新；語法僅參考本檔或頂層 `npx skills --help`
