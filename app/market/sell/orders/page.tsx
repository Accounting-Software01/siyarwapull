import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MarketHeader from '@/components/market/MarketHeader'
import { SellerOrders } from '@/components/market/OrderLists'

export const dynamic = 'force-dynamic'

export default async function SellerOrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: store } = await supabase.from('stores').select('id,status').eq('owner_id', user.id).maybeSingle()
  if (!store || store.status !== 'approved') redirect('/market/sell')

  return (
    <div className="min-h-screen bg-white pb-24">
      <MarketHeader title="Orders to fulfil" back="/market/sell" />
      <main className="mx-auto max-w-lg px-4 py-4">
        <SellerOrders storeId={store.id} />
      </main>
    </div>
  )
}
