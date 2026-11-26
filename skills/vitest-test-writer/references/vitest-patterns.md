# Vitest patterns and Jest → Vitest mapping

For mocks, async tests, timers, parameterized tests, Jest migration. Version notes = Vitest major (3, 4, 5).

## Jest → Vitest

Same names under `vi.*` (`jest.fn`, `spyOn`, `useFakeTimers`, `advanceTimersByTime`, `resetAllMocks`). Differences:

| Jest                        | Vitest                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `require('./m')`            | `import { x } from './m.js'` (ESM)                                                            |
| `jest.mock('./m')`          | `vi.mock(import('./m.js'))`, top level only; a factory must return every export the test uses |
| `jest.requireActual('./m')` | `await vi.importActual('./m.js')` / `importOriginal` in factory                               |
| `test.each` table           | `test.for` (args not spread) or `test.each`                                                   |

## Module mocking

Partial mock, real implementation for everything else:

```ts
vi.mock(import("./api.js"), async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, fetchUser: vi.fn() };
});
```

`vi.mock` hoists above imports. Variables used in the factory → declare with `vi.hoisted`:

```ts
const { fetchUser } = vi.hoisted(() => ({ fetchUser: vi.fn() }));
vi.mock(import("./api.js"), () => ({ fetchUser }));
```

## Spies and restoring

Recommended config, safe on every major (per-version behavior: SKILL.md step 5):

```ts
// vitest.config.ts
export default defineConfig({
  test: { restoreMocks: true, clearMocks: true },
});
```

Mocks called with `new` (Vitest 4+) need `function` or `class` implementation:

```ts
const Client = vi.fn(function () {
  return { get: vi.fn() };
});
```

## Async and timers

- Without `await` on `.rejects` / `.resolves`, the assertion runs after the test ends: before Vitest 5 the test passes no matter what; Vitest 5 fails it.
- Fake timers fake `Date` and `performance.now()` (not `process.nextTick` or `queueMicrotask`). Date logic: pin the clock after `vi.useFakeTimers()` with `vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))`. Pair `vi.useFakeTimers()` with `vi.useRealTimers()` in `afterEach`; await timer-driven promises via `vi.advanceTimersByTimeAsync`.

## Fixtures and environment

- Prefer `test.extend` fixtures over `beforeEach` when only some tests need the setup or it needs teardown (`await use(value)`, then teardown).
- Per-file environment override when the config default is `node` but the test needs DOM: `// @vitest-environment jsdom`.
