---
name: vitest-test-writer
description: 為 JavaScript/TypeScript 程式碼撰寫、審查、修正、以測試驅動（TDD red-green）開發、去除不穩定（de-flake）或從 Jest 遷移 Vitest 單元測試。
argument-hint: "[file, task or test description]"
disable-model-invocation: true
---

# Vitest Test Writer

依據 Vitest 指南「Writing Tests with AI」（vitest.dev/guide/learn/writing-tests-with-ai）加上 TDD 紀律（vertical slices、獨立的預期值）。產生的測試品質僅取決於所蒐集的脈絡與事後的審查；做法含糊 → 只得到淺層 happy-path 測試，斷言空洞。

## 選擇模式

- **Retrofit**：程式碼已存在，使用者要測試。Steps 1 → 2 → 5 → 6 → 7。
- **TDD**：先寫測試的新功能或 bug 修正（"TDD"、"red-green"、"test first"）。Steps 1 → 3 → 5 → 6 → 7。
- **Existing tests**：修正失敗或 flaky 的測試、審查測試、從 Jest 遷移。Steps 1 → 4 → 5 → 6 → 7。

不明確：既有測試檔是主題 → existing tests；目標程式碼已存在 → retrofit；否則 TDD。

## 1. 動筆前先蒐集脈絡

沒有脈絡，測試會用錯慣例、錯環境、mock 未見過的程式碼。依序讀：

1. **受測原始碼**：真實檔案，含 imports 與 types。絕不憑描述寫測試。
2. **Vitest 版本**：已安裝的 `node_modules/vitest/package.json`，否則 `package.json` 的 `vitest` 範圍。依賴安裝前不要用 `npx vitest --version`：它會改為抓取最新版。Mock reset、fake timers 與部分 API 在 major 3、4、5 之間不同（step 5）；套用錯誤版本的規則，會使測試空洞地通過，或因錯誤原因失敗。
3. **Vitest 設定**（`vitest.config.*`，否則 `vite.config.*`；各 package 的設定可能放在 `test.projects` 下；僅 Vitest 3 仍讀取獨立的 `vitest.workspace.*`）。留意 `globals`、`environment`、`setupFiles`、`restoreMocks` / `clearMocks` / `mockReset`、`include`：它們決定是否要 import `describe/test/expect`、DOM API 是否存在、mock 是否在測試間重置。
4. **目標附近 1–2 個既有測試檔**。沿用慣例：`test` vs `it`、`describe` 排版、`test.extend` fixtures vs `beforeEach`、檔名與位置。既有檔案勝過任何風格描述。
5. **需要 mock 的依賴**：至少看 type signatures。
6. **專案規則**：`AGENTS.md`、`CLAUDE.md`、`GLOSSARY.md`、contributing 文件。測試名稱使用專案的領域用語。

尚無測試 → 預設：每個 export 的 function/class 一個 `describe`，用 `test`，與原始碼同目錄的 `*.test.ts`。

## 2. Retrofit：撰寫測試

mocks、async、timers、參數化測試的 API 細節：`references/vitest-patterns.md`。

**Seams。** 透過公開介面測試（exported functions、public class methods、HTTP handlers），行為在此可觀察。不測 private helpers 或內部呼叫順序：這類測試會在正確的 refactor 時壞掉。

**適用時須涵蓋**（AI 撰寫的測試總是漏掉這些）：驗證與錯誤路徑、空輸入（`''`、`[]`、`{}`）、`null` / `undefined`、邊界（0、負數、最大值、off-by-one）、async 失敗（網路錯誤、timeout、被 reject 的依賴），加上 happy path。

**預期值取自獨立來源**：手算範例、規格、已知正確的 literal。絕不以程式碼的方式重算預期值（`expect(add(a, b)).toBe(a + b)`）：同義反覆，不可能失敗。見 `references/good-vs-bad-tests.md`。

**只 mock I/O 邊界**：網路、資料庫、檔案系統、時間（`vi.useFakeTimers`）、隨機性。不 mock 受測模組，或它所用的純 helpers。AI 工具預設會 over-mock；要抵抗。

## 3. TDD：以 vertical slices 做 red → green

1. **先對齊 seams。** 列出公開介面與要測的 seams，每個附一行說明它能抓到與抓不到什麼。使用者已明列行為 → 陳述清單後繼續；否則寫測試前先確認，因為 seam 選錯會浪費之後每個循環。
2. **每個循環一個 slice**：在一個 seam 寫_一個_失敗的測試 → 執行，確認因正確原因失敗（red）→ 以最少程式碼使其通過（green）→ 再執行。
3. **不要先寫完所有測試。** 批次寫出的測試驗證的是想像的行為，不是真實行為。不做投機功能，不為未來需求寫測試。
4. **green 之後再 refactor**，是獨立的一步，測試保持 green。測試在保持行為的 refactor 中壞掉 = 與實作耦合：修測試，不是修 refactor。

step 2 的涵蓋清單適用於每個 slice。

## 4. Existing tests：修正、去除 flaky、審查、遷移

- **Failing**：執行該檔，讀實際失敗訊息，判斷是測試還是原始碼有誤。測試有誤（過期的預期、錯誤的 API、壞掉的 mock）→ 修正。真實的原始碼 bug → 回報，絕不掩蓋。
- **Flaky**：修之前先重現；沒看過失敗的修法只是猜測。以 shuffle 執行（`vitest run <file> --sequence.shuffle`；`--sequence.seed=<n>` 重播失敗的順序）、重複執行（Vitest 5 用 `--repeats=<n>`；較早的 major：對該檔跑迴圈）、單獨執行每個測試（`-t "<name>"`）。Fake-timer 與 mock 模式：`references/vitest-patterns.md`。常見原因：
  - 真實時間：`setTimeout` 等待、`Date`、`performance.now()` → `vi.useFakeTimers()` 並推進時間
  - 測試間共享的狀態：module-level 變數、singletons、未重置的 mocks 與 spies、env vars（`vi.stubEnv` + `vi.unstubAllEnvs()`）
  - 未 await 的 promises、真實的 `Math.random()`、真實網路

  修根本原因。重試、`repeats`、更長的 timeout 或等待只會掩蓋問題：絕不是修法。

- **Review**：執行 checker（step 6）與自審清單（step 7），每個問題附 `file:line` 與具體修法回報。僅回報：只有使用者也要求修正時才改檔。
- **Jest migration**：對照表見 `references/vitest-patterns.md`。`require` → ESM imports，`jest.*` → `vi.*`，`jest.mock('./m')` → 頂層 `vi.mock(import('./m.js'))`。順手修掉發現的弱 assertions；告知使用者哪些改了。

## 5. Vitest 專屬規則

- 只用 Vitest API：`vi.fn`、`vi.mock`、`vi.spyOn`、`vi.useFakeTimers`。絕不用 `jest.*`：受 Jest 訓練的模型會滑向它。
- Imports：`globals: true` → 不 import test globals；否則 `import { describe, test, expect, vi } from 'vitest'`。
- Module mocks：優先用 `vi.mock(import('./mod.js'))` 而非 `vi.mock('./mod.js')`（Vitest 2.1+）：`importOriginal` 與 factory 有型別，改名後仍有效。`vi.mock` 與 `vi.hoisted` 放在檔案頂層；Vitest 5 在巢狀時會 throw。
- 以 `new` 呼叫的 mocks（Vitest 4+）：用 `function` 或 `class` 實作，不用 arrow。
- Async：`async`/`await`，`await expect(p).resolves...` / `.rejects...`。`.rejects` 缺 `await` 在 Vitest 5 之前會空洞地通過，在 5 則失敗。
- 測試選項放在中間：`test(name, { timeout: 10_000 }, fn)`。第三個參數的 options 物件已在 Vitest 4 移除。
- 多組輸入 → `test.for` / `test.each`，不要複製貼上測試。
- 錯誤訊息 → `toThrowErrorMatchingInlineSnapshot()` 或明確的 message/regex。
- Mock 在測試間洩漏，取決於 major：

  | Major | `restoreMocks: true` 的作用                              | 另需                                                          |
  | ----- | -------------------------------------------------------- | ------------------------------------------------------------- |
  | 3     | 還原 spies、清除呼叫紀錄、重置 `vi.fn()` implementations | 不需要                                                        |
  | 4     | 僅還原 `vi.spyOn` spies                                  | `clearMocks: true`，否則 `vi.fn()` 的呼叫次數會洩漏到後續測試 |
  | 5     | 僅還原 `vi.spyOn` spies                                  | 不需要（`clearMocks` 預設為 `true`）                          |

  `restoreMocks: true` + `clearMocks: true` 在每個版本都安全。設定不可改 → 在檔案內加 `afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })`。

- 命名：簡短、聚焦行為（`formats USD prices`、`throws for negative amounts`），不寫描述實作的句子。

## 6. 執行並驗證

一律執行，絕不用 watch mode（agent 等待 watch 永遠不會結束）。用專案的 package manager（`pnpm exec`、`yarn`、`bunx`，否則 `npx`）：

```bash
npx vitest run path/to/file.test.ts
```

Vitest 4.1+ 由 AI agent 執行時使用 minimal reporter，會隱藏通過測試的 console 輸出；加 `--reporter=default` 以查看 logs。

然後，在含 Vitest 設定的目錄（monorepo 中為 package 根目錄）執行內附的靜態 checker，檢查常見的 AI 錯誤：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/check-tests.mjs" path/to/file.test.ts
```

它自行找出 Vitest 設定與版本（`--config <path>` 可覆寫）。標出：`jest.*`、`.only`、未 await 的 `.rejects/.resolves`（含跨行）、字串路徑的 `vi.mock`、唯一 assertions 為存在性、不 throw 或 mock 呼叫的測試、同義反覆的預期值、真實時間等待、未固定的 `Date`/`Math.random`、缺少 test-global imports、對已安裝 major 會洩漏的 mock-reset 設定。修掉它回報的問題，除非是刻意的例外（review mode：改為回報）。

修到 import 錯誤、錯誤 API、不存在的引用全部消失並 green。**測試因真實原始碼 bug 失敗 → 向使用者回報 bug，絕不弱化 assertion**：為了通過而放寬測試會摧毀其價值。

## 7. 自審，然後回報

結束前重讀每個測試；符合以下任一則不予採納：

- 只 assert 存在性（`toBeDefined`、`toBeTruthy`）或「不 throw」
- assert 的是 mocks，而非輸出或可觀察的效果
- 對內部做正確的 refactor 後會失敗
- 預期值由與程式碼相同的邏輯算出
- 依賴另一個測試先執行

簡短回報：新增/變更的檔案、涵蓋的情境、刻意留下的缺口、發現的 bugs、根本原因（flaky 測試）、設定建議（如其 major 對應的 mock-reset 設定）。
