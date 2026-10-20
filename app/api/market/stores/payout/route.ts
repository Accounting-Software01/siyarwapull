import { NextResponse } from 'next/server'
import { getUser } from '@/lib/market/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PaystackError, createSubaccount, resolveAccount } from '@/lib/market/paystack'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_COMMISSION_BPS = 500 // 5% (the flat amount is set per order at checkout)

// Best-effort limiter (per server instance) so this can't be used to probe account names.
const hits = new Map<string, number[]>()
function tooMany(userId: string): boolean {
  const now = Date.now()
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(userId, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > 5
}

/**
 * Step 2 of selling: add (or change) the payout account for the caller's own store.
 * The account name comes from the bank via Paystack, never from the client.
 * The full account number goes to Paystack and is NOT stored.
 */
export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  if (tooMany(user.id)) return NextResponse.json({ error: 'Too many attempts. Wait a minute.' }, { status: 429 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const bankCode = String(body.bankCode ?? '').trim()
  const accountNumber = String(body.accountNumber ?? '').trim()
  if (!/^\d{3,6}$/.test(bankCode) || !/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: 'Choose a bank and enter a 10-digit account number.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: store } = await admin
    .from('stores')
    .select('id, name, slug, status')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!store) return NextResponse.json({ error: 'Create your store first.' }, { status: 404 })
  if (store.status === 'rejected' || store.status === 'suspended') {
    return NextResponse.json({ error: 'This store cannot be changed. Please contact support.' }, { status: 403 })
  }

  try {
    const accountName = (await resolveAccount(accountNumber, bankCode)).account_name
    const sub = await createSubaccount({
      businessName: store.name,
      bankCode,
      accountNumber,
      percentageCharge: DEFAULT_COMMISSION_BPS / 100,
      description: `Siyarwa Pull marketplace store ${store.slug}`,
    })
    const { error } = await admin
      .from('stores')
      .update({
        bank_code: bankCode,
        account_name: accountName,
        account_last4: accountNumber.slice(-4),
        paystack_subaccount_code: sub.subaccount_code,
      })
      .eq('id', store.id)
    if (error) throw error
    return NextResponse.json({ ok: true, accountName })
  } catch (e) {
    const isTestKey = (process.env.PAYSTACK_SECRET_KEY ?? '').startsWith('sk_test_')
    const status = e instanceof PaystackError ? e.status : 0
    console.error('[market] payout setup failed', { status, reason: e instanceof Error ? e.message : 'unknown', testKey: isTestKey })
    const error = isTestKey
      ? 'Payout setup is limited while Paystack is in test mode. Use a live Paystack key to add a real bank account.'
      : status === 401 || status === 403
        ? 'Payout setup is not enabled for this Paystack account yet. Contact Paystack support.'
        : 'We could not set up payouts for that account. Check the bank and account number and try again.'
    return NextResponse.json({ error }, { status: 422 })
  }
}
