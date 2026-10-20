import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MarketHeader from '@/components/market/MarketHeader'
import { BuyerOrders } from '@/components/market/OrderLists'

export const dynamic = 'force-dynamic'

const BANNERS: Record<string, { tone: string; text: string }> = {
  success: { tone: 'bg-green-50 text-green-800', text: 'Payment received. The seller has been notified.' },
  pending: { tone: 'bg-amber-50 text-amber-800', text: 'We are still confirming your payment. This page will update shortly — please do not pay twice.' },
  refund: { tone: 'bg-amber-50 text-amber-800', text: 'Your payment arrived after the item sold out. A refund is required and will be processed by the marketplace team.' },
  failed: { tone: 'bg-red-50 text-red-800', text: 'We could not confirm that payment. If you were charged, do not pay again; contact support with your payment reference and we will check it.' },
}

export default async function BuyerOrdersPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const { payment } = await searchParams
  const banner = payment ? BANNERS[payment] : undefined

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white pb-24">
      <MarketHeader title="My orders" back="/market" />
      <main className="mx-auto max-w-lg space-y-4 px-4 py-4">
        {banner ? <p className={`rounded-xl p-3 text-sm ${banner.tone}`}>{banner.text}</p> : null}
        {user ? (
          <BuyerOrders userId={user.id} />
        ) : (
          <div className="space-y-3 py-10 text-center">
            <p className="text-gray-600">Sign in to see your orders.</p>
            <Link href="/auth/login" className="inline-block rounded-xl bg-black px-6 py-3 font-semibold text-white">Sign in</Link>
          </div>
        )}
      </main>
    </div>
  )
}
