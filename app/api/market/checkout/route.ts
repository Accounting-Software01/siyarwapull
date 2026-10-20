import { NextResponse } from 'next/server'
import { getUser } from '@/lib/market/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { initializeTransaction, PaystackError } from '@/lib/market/paystack'
import { NIGERIAN_STATES } from '@/lib/market/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/

const RPC_ERRORS: Record<string, { status: number; message: string }> = {
  store_unavailable: { status: 404, message: 'This store is not available right now.' },
  store_not_payable: { status: 409, message: 'This store cannot take payments yet.' },
  own_store: { status: 400, message: 'You cannot buy from your own store.' },
  too_many_pending: { status: 429, message: 'You have several unpaid orders. Pay or wait for them to expire first.' },
  product_unavailable: { status: 404, message: 'This product is no longer available.' },
  out_of_stock: { status: 409, message: 'Not enough stock for that quantity.' },
  invalid_quantity: { status: 400, message: 'Choose a quantity between 1 and 100.' },
  invalid_items: { status: 400, message: 'Your order has no valid items.' },
  duplicate_items: { status: 400, message: 'Your order has duplicate items.' },
  invalid_product: { status: 400, message: 'Invalid product.' },
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to buy.' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // ---- Validate input. Note: the client sends NO prices, totals or fees. ----
  const productId = String(body.productId ?? '')
  const quantity = Number(body.quantity)
  const name = String(body.name ?? '').trim()
  const phone = String(body.phone ?? '').replace(/[\s()-]/g, '')
  const address = String(body.address ?? '').trim()
  const state = String(body.state ?? '').trim()

  if (!UUID_RE.test(productId)) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 })
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return NextResponse.json({ error: 'Choose a quantity between 1 and 100.' }, { status: 400 })
  }
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: 'Enter the receiver’s name.' }, { status: 400 })
  if (!/^\+?[0-9]{10,15}$/.test(phone)) return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 })
  if (address.length < 8 || address.length > 300) return NextResponse.json({ error: 'Enter a full delivery address.' }, { status: 400 })
  if (!(NIGERIAN_STATES as readonly string[]).includes(state)) return NextResponse.json({ error: 'Choose a delivery state.' }, { status: 400 })

  const email = (user.email ?? String(body.email ?? '')).trim()
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'An email address is needed for your payment receipt.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find the product's store server-side (never trust a client-supplied store id).
  const { data: product } = await admin
    .from('products')
    .select('id, store_id')
    .eq('id', productId)
    .eq('status', 'active')
    .maybeSingle()
  if (!product) return NextResponse.json({ error: 'This product is no longer available.' }, { status: 404 })

  // ---- Create the order + reserve stock atomically. Prices come from the database. ----
  const { data: rows, error } = await admin.rpc('create_order', {
    p_buyer: user.id,
    p_store: product.store_id,
    p_items: [{ product_id: productId, quantity }],
    p_name: name,
    p_phone: phone,
    p_address: address,
    p_state: state,
  })

  if (error) {
    const key = Object.keys(RPC_ERRORS).find((k) => error.message?.includes(k))
    if (key) return NextResponse.json({ error: RPC_ERRORS[key].message }, { status: RPC_ERRORS[key].status })
    console.error('[market] create_order failed', error)
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 })
  }

  const order = Array.isArray(rows) ? rows[0] : rows
  if (!order) return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 })

  // ---- Initialise the Paystack payment using the DATABASE's numbers. ----
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!configuredUrl && process.env.NODE_ENV === 'production') {
    console.error('[market] NEXT_PUBLIC_SITE_URL is not set')
    await admin.rpc('cancel_pending_order', { p_order: order.order_id })
    return NextResponse.json({ error: 'Checkout is not configured yet.' }, { status: 503 })
  }
  const siteUrl = (configuredUrl || new URL(req.url).origin).replace(/\/$/, '')
  try {
    const init = await initializeTransaction({
      email,
      amountKobo: Number(order.total_kobo),
      reference: order.reference,
      callbackUrl: `${siteUrl}/market/pay/callback`,
      subaccount: order.subaccount_code,
      transactionChargeKobo: Number(order.commission_kobo),
      metadata: { order_id: order.order_id, buyer_id: user.id },
    })
    return NextResponse.json({ authorizationUrl: init.authorization_url })
  } catch (err) {
    // Release the stock we just reserved.
    await admin.rpc('cancel_pending_order', { p_order: order.order_id })
    console.error('[market] paystack initialize failed', err instanceof PaystackError ? err.message : err)
    return NextResponse.json({ error: 'Payment could not be started. Please try again.' }, { status: 502 })
  }
}
