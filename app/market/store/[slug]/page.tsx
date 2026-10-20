import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MarketHeader from '@/components/market/MarketHeader'
import { formatNaira } from '@/lib/market/money'
import { productImageUrl } from '@/lib/market/constants'

export const dynamic = 'force-dynamic'

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)) notFound()

  const supabase = await createClient()
  const { data: store } = await supabase
    .from('stores')
    .select('id,name,description,state,delivery_fee_kobo')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()
  if (!store) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('id,title,price_kobo,image_paths')
    .eq('store_id', store.id)
    .eq('status', 'active')
    .gt('stock', 0)
    .order('created_at', { ascending: false })
    .limit(60)

  return (
    <div className="min-h-screen bg-white pb-24">
      <MarketHeader title={store.name} back="/market" />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-4">
        <div>
          <p className="text-sm text-gray-500">{store.state} · Delivery {store.delivery_fee_kobo === 0 ? 'free' : formatNaira(store.delivery_fee_kobo)}</p>
          {store.description ? <p className="mt-1 text-sm">{store.description}</p> : null}
        </div>
        {!products || products.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No products listed yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {products.map((p) => (
              <Link key={p.id} href={`/market/${p.id}`} className="overflow-hidden rounded-2xl border border-gray-100">
                <div className="aspect-square bg-gray-100">
                  {p.image_paths?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={productImageUrl(p.image_paths[0])} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-sm font-bold">{formatNaira(p.price_kobo)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
