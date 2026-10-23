import { NextResponse } from 'next/server'
import { getUser } from '@/lib/market/auth'
import { PaystackError, resolveAccount } from '@/lib/market/paystack'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Best-effort limiter (per server instance). Stops casual abuse of the name-lookup endpoint.
const hits = new Map<string, number[]>()
function tooMany(userId: string): boolean {
  const now = Date.now()
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(userId, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > 8
}

export async function GET(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (tooMany(user.id)) return NextResponse.json({ error: 'Too many lookups. Wait a minute.' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const accountNumber = searchParams.get('account_number') ?? ''
  const bankCode = searchParams.get('bank_code') ?? ''
  if (!/^\d{10}$/.test(accountNumber) || !/^\d{3,6}$/.test(bankCode)) {
    return NextResponse.json({ error: 'Enter a 10-digit account number and choose a bank.' }, { status: 400 })
  }
  try {
    const data = await resolveAccount(accountNumber, bankCode)
    return NextResponse.json({ accountName: data.account_name })
  } catch (e) {
    const isTestKey = (process.env.PAYSTACK_SECRET_KEY ?? '').startsWith('sk_test_')
    const status = e instanceof PaystackError ? e.status : 0
    const reason = e instanceof Error ? e.message : 'unknown error'
    // Visible in your hosting logs (Netlify -> Functions) so the real cause is never hidden.
    console.error('[market] account resolve failed', { status, reason, bankCode, testKey: isTestKey })

    // Lookup itself is unavailable (test mode, or not enabled on the Paystack account).
    // This is not the seller's fault, so the form lets them confirm the details manually.
    if (isTestKey || status === 401 || status === 403) {
      return NextResponse.json({ accountName: null, unavailable: true })
    }

    let error = 'We could not verify that account. Check the bank and account number and try again.'
    if (status === 429) {
      error = 'Paystack is busy. Wait a minute and try again.'
    } else if (status === 400 || status === 422) {
      error = 'Paystack could not match that account number to the selected bank. Check both and try again.'
    }
    return NextResponse.json({ error }, { status: 422 })
  }
}
