import { NextResponse } from 'next/server'
import { getUser } from '@/lib/market/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSubaccount, resolveAccount } from '@/lib/market/paystack'
import { NIGERIAN_STATES } from '@/lib/market/constants'
import { nairaToKobo } from '@/lib/market/money'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_COMMISSION_BPS = 500 // 5%

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const name = String(body.name ?? '').trim()
  const slug = String(body.slug ?? '').trim().toLowerCase()
  const description = String(body.description ?? '').trim()
  const state = String(body.state ?? '').trim()
  const bankCode = String(body.bankCode ?? '').trim()
  const accountNumber = String(body.accountNumber ?? '').trim()
  const deliveryFeeKobo = nairaToKobo(String(body.deliveryFee ?? '0'))

  if (name.length < 2 || name.length > 60) return NextResponse.json({ error: 'Store name must be 2–60 characters.' }, { status: 400 })
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)) {
    return NextResponse.json({ error: 'Store link must be 3–40 letters, numbers or dashes.' }, { status: 400 })
  }
  if (description.length > 500) return NextResponse.json({ error: 'Description is too long (max 500).' }, { status: 400 })
  if (!(NIGERIAN_STATES as readonly string[]).includes(state)) return NextResponse.json({ error: 'Choose your state.' }, { status: 400 })
  if (!/^\d{3,6}$/.test(bankCode) || !/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: 'Choose a bank and enter a 10-digit account number.' }, { status: 400 })
  }
  if (deliveryFeeKobo === null || deliveryFeeKobo > 100_000_000) {
    return NextResponse.json({ error: 'Enter a valid delivery fee (use 0 for free delivery).' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: existing } = await admin.from('stores').select('id').eq('owner_id', user.id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'You already have a store.' }, { status: 409 })

  // Verify the bank account with Paystack (name comes from the bank, not from the client).
  let accountName: string
  try {
    accountName = (await resolveAccount(accountNumber, bankCode)).account_name
  } catch {
    return NextResponse.json({ error: 'We could not verify that bank account.' }, { status: 422 })
  }

  // 1) create the store row first (status: pending, no payout yet)
  const { data: store, error: insertError } = await admin
    .from('stores')
    .insert({
      owner_id: user.id,
      slug,
      name,
      description,
      state,
      delivery_fee_kobo: deliveryFeeKobo,
      commission_bps: DEFAULT_COMMISSION_BPS,
      bank_code: bankCode,
      account_name: accountName,
      account_last4: accountNumber.slice(-4), // the full number is never stored
    })
    .select('id')
    .single()

  if (insertError || !store) {
    if (insertError?.code === '23505') {
      return NextResponse.json({ error: 'That store link is taken. Try another.' }, { status: 409 })
    }
    console.error('[market] store insert failed', insertError)
    return NextResponse.json({ error: 'Could not create your store.' }, { status: 500 })
  }

  // 2) create the Paystack subaccount; roll the row back if it fails
  try {
    const sub = await createSubaccount({
      businessName: name,
      bankCode,
      accountNumber,
      percentageCharge: DEFAULT_COMMISSION_BPS / 100,
      description: `Siyarwa Pull marketplace store ${slug}`,
    })
    const { error: updateError } = await admin
      .from('stores')
      .update({ paystack_subaccount_code: sub.subaccount_code })
      .eq('id', store.id)
    if (updateError) throw updateError
  } catch (err) {
    await admin.from('stores').delete().eq('id', store.id)
    console.error('[market] subaccount creation failed', err)
    return NextResponse.json(
      { error: 'We could not set up payouts for that account. Check the details and try again.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, status: 'pending' })
}
