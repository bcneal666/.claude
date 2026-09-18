---
description: 批次更新 skills（<type> 可選 global|project，預設 global）；依 skills CLI lockfile 逐一指名更新，未納管者推斷上游後重裝納管，並回報 plugin / synced / CLI 內建的版本狀態
argument-hint: "[<type>]"
---

## 範圍參數 `<type>`（位置參數 `$1`，選填）

- `$1` 為空或 `global` → 目標 `~/.claude/skills/`（排除 `synced/` 子目錄）
- `$1` 為 `project` → 目標 `./.claude/skills/`；不存在則回報「找不到 `./.claude/skills/`」後**停止**，不建立目錄
- 其他值（無法辨識）→ 一行提示後**退回 `global`** 繼續執行，不中止

## 執行流程

### 1. 前置檢查

- 在 git repo 內時執行 `git status --short`；工作區不乾淨時一行提示「diff 會混雜既有未提交變更」，但**不中止**
- 確認 `node -v` 可執行（`npx skills` 前提）；不可用則回報後停止
- `project` 模式假設**目前工作目錄即專案根目錄**（`.claude/` 的上一層）；全程不 `cd` 離開——`npx skills` 的 project lockfile 讀寫以 cwd 為唯一依據，離開此目錄會靜默失效而非報錯

### 2. 盤點目標目錄

列出目標路徑下的 skill 子目錄名稱（`global` 排除 `synced/`；兩者都排除隱藏檔與非目錄項）。

### 3. 讀取來源資料

- `global` → 讀 `~/.agents/.skill-lock.json` 的 `skills{}`（欄位：`source`、`sourceUrl`、`skillPath`、`skillFolderHash`、`updatedAt`）
- `project` → 讀 **`<專案根>/skills-lock.json`**（注意：在專案根目錄，**不在** `.claude/skills/` 底下；檔名**無點前綴**）的 `skills{}`（欄位：`source`、`sourceType`、`skillPath`、`computedHash`，無時間戳）；不存在則視為空清單（不報錯），目標目錄下所有 skill 直接進入步驟 4 的 B／C 推斷流程
- 讀忽略清單（`global` → `~/.claude/skills/.up-skills-ignore`；`project` → `<project>/.claude/skills/.up-skills-ignore`）：逐行去除 `#` 起首之註解與行尾 `# ...` 註解、trim、丟棄空行，得到名稱集合；檔案不存在＝空集合，不自動建立

### 4. 分類

依下表標記各 skill 為 D／A／B／C，**優先序 D > A > B > C**——名稱同時列於忽略清單與 lockfile 時一律歸 D：

| 類 | 判定 | 動作 |
| --- | --- | --- |
| D 自製／凍結 | 名稱列於 `.up-skills-ignore` | 完全跳過：不比對 lockfile、不掃描上游、不執行任何指令 |
| A 已納管 | 名稱同時存在於目標目錄與 lockfile | 步驟 5：`npx skills update` |
| B 可推斷 | 不在 lockfile，但 SKILL.md／README 內含 `npx skills add …` 指令或 GitHub repo URL | 步驟 6：確認後 `npx skills add`（重裝會讓 CLI 自動寫入 lockfile，下次即歸 A 類，不需自建對照表） |
| C 無上游 | 找不到任何上游線索，或由外部二進位安裝 | 步驟 7：僅回報，不執行任何指令 |

`project` 模式 lockfile 內 `sourceType` 為 `node_modules`／`local` 者不歸 A、也不進 B／C 推斷——這是本地來源、無上游可更新的合法狀態，標記「本地來源·不適用」。

`project` 模式缺 `skills-lock.json`（或有紀錄但目標目錄內找不到對應名稱）時，逐一掃描目標目錄內每個 SKILL.md／README，比照 B 類規則推斷來源；推不出來源標記為 C，不猜測、不捏造 repo URL。

### 5. 更新 A 類

先做 git 漂移檢查，再組指令引數：

- 在 git repo 內 → 對每個 A 類 skill 執行 `git status --porcelain skills/<name>/`（`global`，cwd 為 `~/.claude`）或 `git status --porcelain .claude/skills/<name>/`（`project`，cwd 為專案根）；有輸出（未提交改動）→ 該 skill 標記「本地有未提交改動·已跳過」、不進引數列，提示先 commit 或加入 `.up-skills-ignore` 永久排除
- 不在 git repo 內 → 略過此檢查，一行提示「無 git 保護，更新將直接覆蓋」，全部 A 類正常進引數列

分類為 A、通過漂移檢查、且**目標目錄內實際存在**的名稱逐一列為指令引數：

```
npx skills update <name1> <name2> ... -g -y    # global
npx skills update <name1> <name2> ... -p -y    # project
```

⚠️ project 模式**必須明寫 `-p`**，不可只是「不加 `-g`」——指名 skill 名稱時若兩個 flag 都不給，CLI 會判定成同時更新 global 與 project 兩邊（`"both"`），不等於單純的 project。

⚠️ **絕不可省略引數裸跑** `npx skills update -g`（無引數＝更新 lockfile 內全部登記筆數，會把已移除的 skill 重新灌回目錄）。

單一 skill 更新失敗（非零退出）→ 記錄失敗與 stderr 摘要，**繼續處理其餘**，不中止整體流程。stdout 若出現「legacy」／「無法就地更新」等字樣（project 模式常見於缺 `skillPath` 的舊紀錄），摘錄進備註欄、計入「失敗」或「已略過」，不視為指令本身出錯。

project 模式提醒：CLI 內部對這類紀錄重裝時不帶 `-a`，agent 分佈可能因此改變（新增或減少其他 agent 目錄），這是 CLI 已知行為、非本指令可控制，回報時附註即可。

### 6. 更新 B 類

逐一顯示待執行完整指令，經確認後才執行：

```
npx skills add <owner/repo> -s <skill> -g -y -a claude-code
```

`project` 模式不加 `-g`；固定加 `-a claude-code`，避免寫入 lockfile 的 `lastSelectedAgents` 所列其他 agent（amp、cursor、codex 等）目錄。使用者拒絕確認的項目標記為「已略過」。

### 7. 更新 C 類

僅列出名稱與「無法自動更新」，不執行任何指令。

### 8. Plugin 層

1. `claude plugin marketplace update`（全部 marketplace 一併更新）
2. `claude plugin list` 讀目前版本
3. 已啟用 plugin（如 `watch@claude-video`）逐一比對新版，有則執行：
   ```
   claude plugin update <plugin>@<marketplace> -y --json -s user
   ```
4. 回報「更新後需重啟 session 才會生效」

### 9. 唯讀回報層（不寫入、不執行更新）

**僅 global 模式**適用——`skills/synced/` 是 Claude Code 帳號層概念，project 沒有對應物，project 模式略過本步驟。

- 讀 `~/.claude/skills/synced/*/manifest.json`，回報各 skill 的 `source`、`updatedAt` 與整體 `lastUpdated`（平台雲端管理，本機無法更新）
- 執行 `claude --version`，回報目前 CLI 版本；提示可執行 `claude update` 更新 CLI 內建 skills（不自動執行）

### 10. 收尾

```
git diff --stat
git status --short
```

**不** `git commit`、**不** `git push`；末行提示可用 `/now-push` 提交。

## 回報格式

一張表格，欄位：`skill | 類別 | 來源 | 結果 | 備註`（結果為「已更新／已是最新／失敗／已略過／自製·已跳過／本地有改動·已跳過」）；D 類與漂移跳過項也列入表格，不得從表格中省略。

表格後補充：

- Plugin 更新結果（含是否需重啟）
- Synced skills 狀態（唯讀）
- CLI 版本與是否建議 `claude update`
- `git diff --stat` 摘要

## 禁止事項

- 不裸跑 `npx skills update -g`（無引數）——會把 lockfile 內已移除的 skill 全部灌回目錄
- 不使用 `npx skills add … --all` 或 `-s '*'`
- 不觸碰 `skills/synced/`（平台管理，已 gitignore）
- 不自動執行 `claude update`（會替換 CLI 本體）——僅回報建議
- 不 `git commit`、不 `git push`
- B 類重裝前必須先取得使用者確認（來源為推斷，非既有紀錄）
- 不因單一 skill 更新失敗中止整體流程；僅前置檢查失敗才中止
- 不更新 `.up-skills-ignore` 列出的 skill，即使名稱存在於 lockfile
- 不自動增刪 `.up-skills-ignore` 內容——由使用者手動維護
- git 漂移檢查未通過（該 skill 目錄有未提交改動）時不強制覆蓋
- 不對 `npx skills update`／`check`／`upgrade` 加 `--help` 探索用法——三者無 `--help` 攔截，會直接執行更新；語法查閱只讀本文件或頂層 `npx skills --help`
