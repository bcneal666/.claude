# Vitest patterns and Jest → Vitest mapping

Read this when writing mocks, async tests, parameterized tests, or migrating Jest code.

## Jest → Vitest

| Jest | Vitest |
|---|---|
| `jest.fn()` | `vi.fn()` |
| `jest.mock('./m')` | `vi.mock(import('./m.js'))` |
| `jest.spyOn(obj, 'k')` | `vi.spyOn(obj, 'k')` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `jest.advanceTimersByTime(n)` | `vi.advanceTimersByTime(n)` |
| `jest.requireActual('./m')` | `await vi.importActual('./m.js')` / `importOriginal` in factory |
| `jest.resetAllMocks()` | `vi.resetAllMocks()` |
| `test.each` table | `test.for` (args not spread) or `test.each` |

## Module mocking

Partial mock keeping the real implementation for everything else:

```ts
vi.mock(import('./api.js'), async (importOriginal) => {
  const mod = await importOriginal()
  return { ...mod, fetchUser: vi.fn() }
})
```

`vi.mock` is hoisted above imports. To reference variables in the factory, declare them with `vi.hoisted`:

```ts
const { fetchUser } = vi.hoisted(() => ({ fetchUser: vi.fn() }))
vi.mock(import('./api.js'), () => ({ fetchUser }))
```

## Spies and restoring

```ts
const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
// ... with restoreMocks: true in config, no manual restore needed
```

Recommended config:

```ts
// vitest.config.ts
export default defineConfig({
  test: { restoreMocks: true },
})
```

## Async

```ts
test('rejects for unknown id', async () => {
  await expect(getUser('missing')).rejects.toThrow('not found')
})
```

Without `await`, the assertion runs after the test ends and the test passes no matter what.

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

Fix the clock for date logic: `vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))`.

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

Prefer fixtures over `beforeEach` when setup is only needed by some tests or needs teardown.

## Errors

```ts
expect(() => parse('')).toThrowErrorMatchingInlineSnapshot(`[Error: input is empty]`)
expect(() => parse('x')).toThrow(/invalid token/)
```

## Environment

Per-file override when config default is `node` but the test needs DOM:

```ts
// @vitest-environment jsdom
```

## Running

- Single file: `npx vitest run src/foo.test.ts`
- By name: `npx vitest run -t "formats USD"`
- Never plain `vitest` in an agent: it enters watch mode and never exits. Use `vitest run` or `vitest --no-watch`.
