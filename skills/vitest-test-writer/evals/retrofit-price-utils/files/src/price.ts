export function formatPrice(amount: number, currency: 'USD' | 'TWD' = 'USD'): string {
  if (!Number.isFinite(amount)) throw new TypeError('amount must be a finite number')
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  if (currency === 'TWD') return `${sign}NT$${Math.round(abs).toLocaleString('en-US')}`
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function applyDiscount(price: number, rate: number): number {
  if (price < 0) throw new RangeError('price must be >= 0')
  if (rate < 0 || rate > 1) throw new RangeError('rate must be between 0 and 1')
  return Math.round(price * (1 - rate) * 100) / 100
}
