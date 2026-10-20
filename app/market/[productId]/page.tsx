import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MarketHeader from '@/components/market/MarketHeader'
import BuyBox from '@/components/market/BuyBox'
import { formatNaira } from '@/lib/market/money'
import { productImageUrl } from '@/lib/market/constants'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Row = {
  id: string
  title: string
  description: string
  price_kobo: number
  stock: number
  image_paths: string[]
  stores: { id: string; owner_id: string; name: string; slug: string; state: string; delivery_fee_kobo: number } | null
}

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  if (!UUID_RE.test(productId)) notFound()

  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('id,title,description,price_kobo,stock,image_paths,stores(id,owner_id,name,slug,state,delivery_fee_kobo)')
    .eq('id', productId)
    .eq('status', 'active')
    .maybeSingle()

  const product = data as unknown as Row | null
  if (!product || !product.stores) notFound()
  const store = product.stores

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOwner = user?.id === store.owner_id

  return (
    <div className="min-h-screen bg-white pb-24">
      <MarketHeader title="Product" back="/market" />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
            {product.image_paths[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={productImageUrl(product.image_paths[0])} alt={product.title} className="h-full w-full object-cover" />
            ) : null}
          </div>
          {product.image_paths.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {product.image_paths.slice(1).map((p) => (
                <div key={p} className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImageUrl(p)} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{product.title}</h2>
            <p className="mt-1 text-2xl font-extrabold">{formatNaira(product.price_kobo)}</p>
            <p className="text-sm text-gray-500">{product.stock} in stock</p>
          </div>
          <p className="text-sm text-gray-600">
            Sold by{' '}
            <Link href={`/market/store/${store.slug}`} className="font-semibold underline">{store.name}</Link> · {store.state}
          </p>
          {product.description ? <p className="whitespace-pre-line text-sm text-gray-800">{product.description}</p> : null}

          {isOwner ? (
            <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">This is your product.</p>
          ) : !user ? (
            <Link href="/auth/login" className="block rounded-xl bg-black py-3 text-center font-semibold text-white">
              Sign in to buy
            </Link>
          ) : (
            <BuyBox
              productId={product.id}
              priceKobo={product.price_kobo}
              deliveryFeeKobo={store.delivery_fee_kobo}
              maxQuantity={Math.min(product.stock, 20)}
              needsEmail={!user.email}
            />
          )}
        </div>
      </main>
    </div>
  )
}
