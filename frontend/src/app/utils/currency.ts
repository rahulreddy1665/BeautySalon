/**
 * Indian Rupee formatting with Indian digit grouping.
 * Always use this for currency — never inline Intl calls in screens.
 */
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberIn = new Intl.NumberFormat('en-IN')

export function formatINR(value: number, precise = false): string {
  return (precise ? inrPrecise : inr).format(value)
}

export function formatNumber(value: number): string {
  return numberIn.format(value)
}

export function formatDeltaPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
