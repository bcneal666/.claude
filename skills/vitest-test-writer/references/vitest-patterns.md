# Vitest patterns 與 Jest → Vitest 對照

用於 mocks、async 測試、timers、參數化測試、Jest 遷移。版本註記 = Vitest major（3、4、5）。

## Jest → Vitest

名稱相同，改放在 `vi.*` 下（`jest.fn`、`spyOn`、`useFakeTimers`、`advanceTimersByTime`、`resetAllMocks`）。差異：

| Jest                        | Vitest                                                                       |
| --------------------------- | ---------------------------------------------------------------------------- |
| `require('./m')`            | `import { x } from './m.js'` (ESM)                                           |
| `jest.mock('./m')`          | `vi.mock(import('./m.js'))`，僅限頂層；factory 必須回傳測試用到的每個 export |
| `jest.requireActual('./m')` | `await vi.importActual('./m.js')` / factory 內的 `importOriginal`            |
| `test.each` table           | `test.for`（args 不展開）或 `test.each`                                      |

## Module mocking

Partial mock，其餘一律用真實實作：

```ts
vi.mock(import("./api.js"), async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, fetchUser: vi.fn() };
});
```

`vi.mock` 會 hoist 到 imports 之上。factory 內用到的變數 → 以 `vi.hoisted` 宣告：

```ts
const { fetchUser } = vi.hoisted(() => ({ fetchUser: vi.fn() }));
vi.mock(import("./api.js"), () => ({ fetchUser }));
```

## Spies 與還原

建議設定，在每個 major 都安全（各版本行為：SKILL.md step 5）：

```ts
// vitest.config.ts
export default defineConfig({
  test: { restoreMocks: true, clearMocks: true },
});
```

以 `new` 呼叫的 mocks（Vitest 4+）需要 `function` 或 `class` 實作：

```ts
const Client = vi.fn(function () {
  return { get: vi.fn() };
});
```

## Async 與 timers

- `.rejects` / `.resolves` 沒有 `await`，assertion 會在測試結束後才執行：Vitest 5 之前測試無論如何都會通過；Vitest 5 則使其失敗。
- Fake timers 會偽造 `Date` 與 `performance.now()`（不含 `process.nextTick` 或 `queueMicrotask`）。Date 邏輯：在 `vi.useFakeTimers()` 之後用 `vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))` 固定時鐘。`vi.useFakeTimers()` 要在 `afterEach` 搭配 `vi.useRealTimers()`；由 timer 驅動的 promises 用 `vi.advanceTimersByTimeAsync` 來 await。

## Fixtures 與環境

- 當只有部分測試需要該設置，或設置需要 teardown（`await use(value)`，之後做 teardown）時，優先用 `test.extend` fixtures 而非 `beforeEach`。
- 設定預設為 `node` 但測試需要 DOM 時，以檔案為單位覆寫環境：`// @vitest-environment jsdom`。
