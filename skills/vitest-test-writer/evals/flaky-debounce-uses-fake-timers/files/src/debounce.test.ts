import { describe, test, expect } from 'vitest'
import { debounce } from './debounce'

const calls: string[] = []
const record = (v: string) => {
  calls.push(v)
}

describe('debounce', () => {
  test('fires once with the last value', async () => {
    const d = debounce(record, 50)
    d('a')
    d('b')
    await new Promise((r) => setTimeout(r, 60))
    expect(calls).toEqual(['b'])
  })

  test('waits for the full delay', async () => {
    const d = debounce(record, 50)
    d('c')
    await new Promise((r) => setTimeout(r, 45))
    expect(calls).toEqual(['b'])
    await new Promise((r) => setTimeout(r, 10))
    expect(calls).toEqual(['b', 'c'])
  })
})
