/** All money in PULL Market is integer kobo. 1 NGN = 100 kobo. */

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatNaira(kobo: number | bigint | string): string {
  const n = Number(kobo)
  if (!Number.isFinite(n)) return '₦0'
  return nairaFormatter.format(n / 100)
}

/**
 * Convert a user-typed naira amount ("1500", "1,500.50") to integer kobo.
 * Uses string maths, not floating point, so there is no rounding drift.
 * Returns null for anything that is not a plain amount with up to 2 decimals.
 */
export function nairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[,\s₦]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.split('.')
  const kobo = Number(whole) * 100 + Number(frac.padEnd(2, '0'))
  return Number.isSafeInteger(kobo) ? kobo : null
}

/** Commission on goods only, rounded to the nearest kobo (matches the SQL in create_order). */
export function commissionKobo(subtotalKobo: number, bps: number): number {
  return Math.floor((subtotalKobo * bps + 5000) / 10000)
}
