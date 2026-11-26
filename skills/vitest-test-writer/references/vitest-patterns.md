# Vitest patterns and Jest → Vitest mapping

For mocks, async tests, timers, parameterized tests, Jest migration. Version notes = Vitest major (3, 4, 5).

## Jest → Vitest

| Jest | Vitest |
|---|---|
| `require('./m')` | `import { x } from './m.js'` (ESM) |
| `jest.fn()` | `vi.fn()` |
| `jest.mock('./m')` | `vi.mock(import('./m.js'))`, top level only; a factory must return every export the test uses |
| `jest.spyOn(obj, 'k')` | `vi.spyOn(obj, 'k')` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `jest.advanceTimersByTime(n)` | `vi.advanceTimersByTime(n)` |
| `jest.requireActual('./m')` | `await vi.importActual('./m.js')` / `importOriginal` in factory |
| `jest.resetAllMocks()` | `vi.resetAllMocks()` |
| `test.each` table | `test.for` (args not spread) or `test.each` |

## Module mocking

Partial mock, real implementation for everything else:

```ts
vi.mock(import('./api.js'), async (importOriginal) => {
  const mod = await importOriginal()
  return { ...mod, fetchUser: vi.fn() }
})
```

`vi.mock` hoists above imports. Variables used in the factory → declare with `vi.hoisted`:

```ts
const { fetchUser } = vi.hoisted(() => ({ fetchUser: vi.fn() }))
vi.mock(import('./api.js'), () => ({ fetchUser }))
```

## Spies and restoring

```ts
const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
// ... with restoreMocks: true in config, no manual restore needed
```

Recommended config, safe on every major (per-version behavior: SKILL.md step 5):

```ts
// vitest.config.ts
export default defineConfig({
  test: { restoreMocks: true, clearMocks: true },
})
```

Mocks called with `new` (Vitest 4+) need `function` or `class` implementation:

```ts
const Client = vi.fn(function () { return { get: vi.fn() } })
```

## Async

```ts
test('rejects for unknown id', async () => {
  await expect(getUser('missing')).rejects.toThrow('not found')
})
```

Without `await`, assertion runs after test ends: before Vitest 5 the test passes no matter what; Vitest 5 fails it.

## Fake timers

```ts
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('retries after 1s', async () => {
  const p = withRetry(task)
  await vi.advanceTimersByTimeAsync(1000)
  await expect(p).resolves.toBe('ok')
})
```

Fake timers also fake `Date` and `performance.now()` (not `process.nextTick` or `queueMicrotask`). Date logic: pin clock after `vi.useFakeTimers()`: `vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))`.

## Parameterized tests

```ts
test.for([
  ['1000', '$1,000.00'],
  ['0', '$0.00'],
  ['-5', '-$5.00'],
])('formats %s as %s', ([input, expected]) => {
  expect(formatUSD(Number(input))).toBe(expected)
})
```

## Fixtures with test.extend

```ts
const test = baseTest.extend<{ db: Db }>({
  db: async ({}, use) => {
    const db = await createTestDb()
    await use(db)
    await db.close()
  },
})
```

Prefer fixtures over `beforeEach` when only some tests need the setup or it needs teardown.

## Errors

```ts
expect(() => parse('')).toThrowErrorMatchingInlineSnapshot(`[Error: input is empty]`)
expect(() => parse('x')).toThrow(/invalid token/)
```

## Environment

Per-file override when config default is `node` but test needs DOM:

```ts
// @vitest-environment jsdom
```

## Running

- Single file: `npx vitest run src/foo.test.ts`
- By name: `npx vitest run -t "formats USD"`
- Never plain `vitest` in an agent: enters watch mode, never exits. Use `vitest run` (or `vitest --run`).
- Vitest 4.1+ run by an agent hides console output of passing tests; `--reporter=default` shows it.
- Flaky hunting: `--sequence.shuffle` (replay an order with `--sequence.seed=<n>`), `--repeats=<n>` (Vitest 5; earlier majors: run the file in a loop), or one test alone with `-t`. For reproducing only; retry and repeats are not fixes.
