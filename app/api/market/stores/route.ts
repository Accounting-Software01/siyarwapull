import { NextResponse } from 'next/server'
import { getUser } from '@/lib/market/auth'
import { createAdminClient } from '@/lib/supabase/admin'
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
  const deliveryFeeKobo = nairaToKobo(String(body.deliveryFee ?? '0'))

  if (name.length < 2 || name.length > 60) return NextResponse.json({ error: 'Store name must be 2–60 characters.' }, { status: 400 })
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)) {
    return NextResponse.json({ error: 'Store link must be 3–40 letters, numbers or dashes.' }, { status: 400 })
  }
  if (description.length > 500) return NextResponse.json({ error: 'Description is too long (max 500).' }, { status: 400 })
  if (!(NIGERIAN_STATES as readonly string[]).includes(state)) return NextResponse.json({ error: 'Choose your state.' }, { status: 400 })
  if (deliveryFeeKobo === null || deliveryFeeKobo > 100_000_000) {
    return NextResponse.json({ error: 'Enter a valid delivery fee (use 0 for free delivery).' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: existing } = await admin.from('stores').select('id').eq('owner_id', user.id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'You already have a store.' }, { status: 409 })

  // Create the store row (status: pending). Payout details are added in a later step
  // (POST /api/market/stores/payout); buyers cannot pay this store until that is done.
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
    })
    .select('id')
    .single()

  if (insertError || !store) {
    if (insertError?.code === '23505') {
      return NextResponse.json({ error: 'That store link is taken. Try another.' }, { status: 409 })
    }
    // The real reason is logged on the server (hosting logs) and a safe code is returned for debugging.
    console.error('[market] store insert failed', insertError)
    const code = insertError?.code ?? 'unknown'
    const msg = insertError?.message ?? ''
    let error = 'Could not create your store.'
    if (code === '42P01' || code === 'PGRST205' || /schema cache|does not exist/i.test(msg)) {
      error = 'The marketplace database is not set up yet. The admin needs to run the market migration (and reload the schema).'
    } else if (code === '23503') {
      error = 'Your profile record could not be found. Sign out, sign back in, and finish your profile first.'
    } else if (/invalid api key|jwt/i.test(msg)) {
      error = 'The server is missing a valid Supabase service key. The admin needs to check SUPABASE_SERVICE_ROLE_KEY.'
    } else if (code === '23514') {
      error = 'One of the store details is not allowed. Check the name, link, state and delivery fee.'
    }
    return NextResponse.json({ error, code }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: 'pending' })
}
