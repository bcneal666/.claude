# Good vs bad tests

用於自審，或不確定測試是否值得保留時。

測試必須同時符合 (a) 行為壞掉時會失敗、(b) 內部在行為不變下被 refactor 後仍通過，才保留。

## 1. 僅存在性的 assertions

Bad — 幾乎任何輸出都會通過：

```ts
test('returns user', async () => {
  const user = await getUser('42')
  expect(user).toBeDefined()
})
```

Good — 釘住實際行為：

```ts
test('returns user by id', async () => {
  expect(await getUser('42')).toEqual({ id: '42', name: 'Ada', role: 'admin' })
})
```

## 2. 同義反覆（重算程式碼的邏輯）

Bad — 預期值的算法與實作相同；若公式錯了，測試也同樣錯：

```ts
test('applies discount', () => {
  const price = 200, rate = 0.15
  expect(applyDiscount(price, rate)).toBe(price - price * rate)
})
```

Good — 預期值取自獨立來源（手算、規格、已知正確的 literal）：

```ts
test('applies 15% discount', () => {
  expect(applyDiscount(200, 0.15)).toBe(170)
})
```

## 3. 與實作耦合

Bad — assert 內部呼叫順序並 mock 內部協作者；即使總額仍正確，只要 `checkout` 改用不同方式計算稅，測試就會壞：

```ts
vi.mock(import('./tax.js'))
test('checkout', () => {
  checkout(cart)
  expect(calcTax).toHaveBeenCalledBefore(calcShipping)
})
```

Good — 透過公開介面 assert 可觀察的結果：

```ts
test('total includes tax and shipping', () => {
  expect(checkout({ items: [{ price: 100, qty: 2 }], region: 'TW' }).total).toBe(215)
})
```

其他與實作耦合的徵兆：測 private methods、經由旁路讀取狀態（直接查詢 DB，而非經由公開 API）、assert 中間變數。

## 4. assert mocks 而非行為

Bad：

```ts
test('saves', async () => {
  await createUser({ name: 'Ada' })
  expect(db.insert).toHaveBeenCalled()
})
```

Better — 當副作用*就是*行為（I/O 邊界）時，assert 重要的參數，並同時 assert 回傳值：

```ts
test('persists normalized user and returns id', async () => {
  const id = await createUser({ name: '  Ada ' })
  expect(db.insert).toHaveBeenCalledWith('users', { name: 'Ada' })
  expect(id).toMatch(/^usr_/)
})
```
