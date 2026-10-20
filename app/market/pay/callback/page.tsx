import { redirect } from 'next/navigation'
import { settleReference } from '@/lib/market/settle'

export const dynamic = 'force-dynamic'

/**
 * Paystack sends the buyer back here after checkout. We do NOT trust the URL:
 * the reference is re-verified with Paystack and checked against the order total.
 * (The webhook does the same, whichever arrives first wins; settlement is idempotent.)
 */
export default async function PayCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>
}) {
  const sp = await searchParams
  const reference = sp.reference ?? sp.trxref

  let outcome: 'success' | 'pending' | 'refund' | 'failed' = 'failed'
  try {
    const result = await settleReference(reference, 'callback')
    if (result.ok) outcome = result.orderStatus === 'refund_required' ? 'refund' : 'success'
    else if (result.reason === 'not_successful') outcome = 'pending'
  } catch {
    outcome = 'pending' // transient error: the webhook will finish the job
  }

  redirect(`/market/orders?payment=${outcome}`)
}
