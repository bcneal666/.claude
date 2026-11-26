# up-design {{DATETIME}}（{{MODE}}）

範圍：{{FILE_COUNT}} 個檔案
行動端：{{MOBILE}}
Sonner：{{SONNER}}

## UX 規則

<!-- Per references/ux-rules.md, one verdict per section, in-scope files only. Verdicts: pass / gap / N/A (incl. out of scope) / 未驗證.
     Anything needing a real device or live data is always 未驗證. Structural fixes (new route, Drawer/Dialog wrapper, new component, new dependency) are not applied; list them under 未解決. -->

| 節                           | 判定 | 證據或 file:line |
| ---------------------------- | ---- | ---------------- |
| §1 斷點與判斷原則            |      |                  |
| §2 Overlay 與選單            |      |                  |
| §3 窄版版面                  |      |                  |
| §4 資料顯示                  |      |                  |
| §5 觸控與輸入                |      |                  |
| §6 表單行為                  |      |                  |
| §7 手勢                      |      |                  |
| §8 視窗高度、safe area、捲動 |      |                  |
| §9 載入、回饋、錯誤          |      |                  |
| §10 導覽、連結、快捷鍵       |      |                  |
| §11 文案                     |      |                  |
| §12 動效                     |      |                  |
| §13 無障礙                   |      |                  |

## 診斷

<!-- Ordered by priority. Per item: file, problem, source (reference §, shadscan, static design criteria) -->

| #   | 檔案 | 問題 | 來源 |
| --- | ---- | ---- | ---- |

## 設計建議（未套用）

<!-- Taste-based static design items (originality, visual hierarchy, color ratio, layout). Listed here only, never auto-fixed. None → write 「無」 -->

| 面向 | 位置 | 建議（含數值） |
| ---- | ---- | -------------- |

## 修正結果

<!-- Per item: file + one sentence. None → write 「無」 -->

### 穩定性

### 移除

### 效能

### 動畫

### 效能比較

| 指標 | 基準 | 本輪 | 差異 |
| ---- | ---- | ---- | ---- |

### 畫面驗收

<!-- Baseline (diagnosis phase) vs final screenshots: 375 / 768 / 1024 / 1440, 320px reflow, overlays. Regressions or not, unverified items.
     shadscan: score before → after (or reason skipped). Cannot capture → write 「未驗證（無畫面）」. -->

## 未解決

<!-- Failed review, out-of-scope problems, structural fixes and items needing a new dependency / animation library, lint rules set to warn because of out-of-scope errors, pre-existing lint/typecheck errors -->

## 規則變更

<!-- Only preferences the user expressed. Per rule: add / fix / move (新增 / 修正 / 搬移), content, why, source (user's words or edit), write location.
     Lint cannot run or config invalid → attach suggested config marked 未驗證. Conflict with an existing rule → say which one was rewritten. -->

| 動作 | 規則 | Why | 來源 | 位置 |
| ---- | ---- | --- | ---- | ---- |

## 建議規則（未寫入）

<!-- Candidate rules the agent found itself but the user never expressed (review block reasons, recurring problems). Never written to files; listed only here. -->

| 規則 | Why | 依據 | 建議位置 |
| ---- | --- | ---- | -------- |
