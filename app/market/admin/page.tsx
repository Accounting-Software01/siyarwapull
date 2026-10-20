import { notFound } from 'next/navigation'
import { getUser, isMarketAdmin } from '@/lib/market/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import MarketHeader from '@/components/market/MarketHeader'
import AdminStoreActions from '@/components/market/AdminStoreActions'

export const dynamic = 'force-dynamic'

export default async function MarketAdminPage() {
  const user = await getUser()
  if (!user || !(await isMarketAdmin(user.id))) notFound()

  const admin = createAdminClient()
  const { data: stores } = await admin
    .from('stores')
    .select('id,name,slug,state,status,account_name,account_last4,bank_code,payout_ready,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: refunds } = await admin
    .from('orders')
    .select('id,paystack_reference,total_kobo,created_at')
    .eq('status', 'refund_required')

  const rank: Record<string, number> = { pending: 0, approved: 1, suspended: 2, rejected: 3 }
  const sorted = [...(stores ?? [])].sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))

  return (
    <div className="min-h-screen bg-white pb-24">
      <MarketHeader title="Market admin" back="/market" />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        {refunds && refunds.length > 0 ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm">
            <p className="font-semibold">{refunds.length} order(s) need a manual refund in the Paystack dashboard:</p>
            <ul className="mt-1 list-disc pl-5">
              {refunds.map((r) => <li key={r.id} className="font-mono text-xs">{r.paystack_reference}</li>)}
            </ul>
          </div>
        ) : null}

        {sorted.map((s) => (
          <article key={s.id} className="space-y-2 rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{s.name} <span className="text-xs text-gray-500">/{s.slug}</span></p>
                <p className="text-xs text-gray-500">{s.state} · {new Date(s.created_at).toLocaleDateString('en-NG')}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold">{s.status}</span>
            </div>
            <p className="text-sm text-gray-700">
              Payout: {s.account_name ?? '—'} · ••••{s.account_last4 ?? '----'} · bank {s.bank_code ?? '—'} ·{' '}
              {s.payout_ready ? 'subaccount ready' : <span className="text-red-600">no subaccount</span>}
            </p>
            <AdminStoreActions storeId={s.id} status={s.status} />
          </article>
        ))}
      </main>
    </div>
  )
}
