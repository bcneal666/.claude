# Good vs bad tests

For self-review, or when unsure a test is worth keeping.

Keep a test only if it (a) fails when behavior breaks and (b) keeps passing when internals are refactored without behavior change.

## 1. Existence-only assertions

Bad — passes for almost any output:

```ts
test('returns user', async () => {
  const user = await getUser('42')
  expect(user).toBeDefined()
})
```

Good — pins the actual behavior:

```ts
test('returns user by id', async () => {
  expect(await getUser('42')).toEqual({ id: '42', name: 'Ada', role: 'admin' })
})
```

## 2. Tautological (recomputes the code's logic)

Bad — the expected value is computed the same way as the implementation; if the formula is wrong, the test is wrong the same way:

```ts
test('applies discount', () => {
  const price = 200, rate = 0.15
  expect(applyDiscount(price, rate)).toBe(price - price * rate)
})
```

Good — expected value from an independent source (hand-worked, spec, known-good literal):

```ts
test('applies 15% discount', () => {
  expect(applyDiscount(200, 0.15)).toBe(170)
})
```

## 3. Implementation-coupled

Bad — asserts internal call order and mocks an internal collaborator; breaks if `checkout` is refactored to compute tax differently, even if totals stay correct:

```ts
vi.mock(import('./tax.js'))
test('checkout', () => {
  checkout(cart)
  expect(calcTax).toHaveBeenCalledBefore(calcShipping)
})
```

Good — asserts the observable result through the public interface:

```ts
test('total includes tax and shipping', () => {
  expect(checkout({ items: [{ price: 100, qty: 2 }], region: 'TW' }).total).toBe(215)
})
```

Other implementation-coupling signs: testing private methods, reading state through a side channel (querying DB directly, not via public API), asserting on intermediate variables.

## 4. Asserting on mocks instead of behavior

Bad:

```ts
test('saves', async () => {
  await createUser({ name: 'Ada' })
  expect(db.insert).toHaveBeenCalled()
})
```

Better — when the side effect *is* the behavior (an I/O boundary), assert on the arguments that matter, and also the return value:

```ts
test('persists normalized user and returns id', async () => {
  const id = await createUser({ name: '  Ada ' })
  expect(db.insert).toHaveBeenCalledWith('users', { name: 'Ada' })
  expect(id).toMatch(/^usr_/)
})
```

## 5. Missing edge cases

Per function ask: what happens with `''`, `[]`, `null`, `undefined`, `0`, a negative number, a huge input, a rejected dependency? AI-generated suites usually stop after 2–3 happy-path tests.

## 6. Vacuous async

Bad — no `await`; passes vacuously before Vitest 5, fails in 5:

```ts
test('rejects', () => {
  expect(load('bad')).rejects.toThrow()
})
```

Good:

```ts
test('rejects for bad path', async () => {
  await expect(load('bad')).rejects.toThrow('ENOENT')
})
```

## 7. Horizontal slicing (TDD)

Ten tests up front, then all implementation, encodes guesses about behavior. Write one failing test, make it pass, repeat: each test then reflects behavior actually implemented and observed.
