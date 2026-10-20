import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MarketHeader from '@/components/market/MarketHeader'
import ProductManager from '@/components/market/ProductManager'

export const dynamic = 'force-dynamic'

export default async function SellerProductsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id,status')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!store || store.status !== 'approved') redirect('/market/sell')

  return (
    <div className="min-h-screen bg-white pb-24">
      <MarketHeader title="My products" back="/market/sell" />
      <main className="mx-auto max-w-lg px-4 py-4">
        <ProductManager storeId={store.id} ownerId={user.id} />
      </main>
    </div>
  )
}
