import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/market/paystack'
import { settleReference } from '@/lib/market/settle'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Paystack webhook. Security layers:
 *   1. HMAC-SHA512 signature over the RAW body (constant-time compare)
 *   2. only `charge.success` is acted on
 *   3. we re-verify the transaction with Paystack before marking anything paid
 *   4. mark_order_paid checks amount + currency and is idempotent (safe on retries)
 * Permanent failures answer 200 (so Paystack stops retrying); transient ones answer 500 (so it retries).
 */
export async function POST(req: Request) {
  const raw = await req.text()
  if (raw.length > 200_000) return new NextResponse('payload too large', { status: 413 })

  if (!verifyWebhookSignature(raw, req.headers.get('x-paystack-signature'))) {
    return new NextResponse('invalid signature', { status: 401 })
  }

  let event: { event?: string; data?: { reference?: string } }
  try {
    event = JSON.parse(raw)
  } catch {
    return new NextResponse('bad json', { status: 400 })
  }

  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true, handled: false })
  }

  try {
    const result = await settleReference(event.data?.reference, 'webhook')
    return NextResponse.json({ received: true, handled: result.ok })
  } catch (err) {
    console.error('[market] webhook settle error', err)
    return new NextResponse('temporary error', { status: 500 })
  }
}
