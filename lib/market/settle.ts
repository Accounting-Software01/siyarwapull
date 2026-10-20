import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTransaction } from '@/lib/market/paystack'

const REFERENCE_RE = /^PL-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type SettleResult =
  | { ok: true; orderStatus: string }
  | { ok: false; reason: 'bad_reference' | 'not_successful' | 'unknown_reference' | 'amount_mismatch'; detail?: string }

async function audit(reference: string | null, source: 'webhook' | 'callback', event: string, outcome: string, detail?: unknown) {
  try {
    const admin = createAdminClient()
    await admin.from('payment_events').insert({
      reference,
      source,
      event,
      outcome,
      detail: detail === undefined ? null : (detail as object),
    })
  } catch (err) {
    console.error('[market] failed to write payment_events', err)
  }
}

/**
 * Settle a Paystack reference. We never trust the webhook/callback payload on its own:
 *   1. ask Paystack directly (verify endpoint, using our secret key)
 *   2. require status === 'success'
 *   3. hand Paystack's amount + currency to mark_order_paid, which compares them to the
 *      order's stored total and refuses on any mismatch.
 * Permanent problems return { ok:false }. Transient problems (network, DB) THROW so the
 * webhook can answer 500 and Paystack retries.
 */
export async function settleReference(reference: unknown, source: 'webhook' | 'callback'): Promise<SettleResult> {
  if (typeof reference !== 'string' || !REFERENCE_RE.test(reference)) {
    await audit(typeof reference === 'string' ? reference.slice(0, 80) : null, source, 'charge.success', 'bad_reference')
    return { ok: false, reason: 'bad_reference' }
  }

  const tx = await verifyTransaction(reference)
  if (tx.status !== 'success' || tx.reference !== reference) {
    await audit(reference, source, 'verify', 'not_successful', { paystackStatus: tx.status })
    return { ok: false, reason: 'not_successful', detail: tx.status }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('mark_order_paid', {
    p_reference: reference,
    p_amount_kobo: tx.amount,
    p_currency: tx.currency,
  })

  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('amount_mismatch')) {
      await audit(reference, source, 'verify', 'amount_mismatch', { paystackAmount: tx.amount, currency: tx.currency })
      console.error('[market] AMOUNT MISMATCH for', reference)
      return { ok: false, reason: 'amount_mismatch' }
    }
    if (msg.includes('unknown_reference')) {
      await audit(reference, source, 'verify', 'unknown_reference')
      return { ok: false, reason: 'unknown_reference' }
    }
    throw new Error(`mark_order_paid failed: ${msg}`)
  }

  await audit(reference, source, 'verify', String(data))
  return { ok: true, orderStatus: String(data) }
}
