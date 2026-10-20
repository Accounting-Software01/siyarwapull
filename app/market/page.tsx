import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MarketHeader from '@/components/market/MarketHeader'
import { formatNaira } from '@/lib/market/money'
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_VALUES, productImageUrl } from '@/lib/market/constants'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  title: string
  price_kobo: number
  image_paths: string[]
  stores: { name: string; state: string } | null
}

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').replace(/[%_,()\\]/g, ' ').trim().slice(0, 60)
  const category = PRODUCT_CATEGORY_VALUES.includes(sp.category ?? '') ? sp.category : undefined

  const supabase = await createClient()
  let query = supabase
    .from('products')
    .select('id,title,price_kobo,image_paths,stores(name,state)')
    .eq('status', 'active')
    .gt('stock', 0)
    .order('created_at', { ascending: false })
    .limit(48)
  if (q) query = query.ilike('title', `%${q}%`)
  if (category) query = query.eq('category', category)

  const { data } = await query
  const products = (data as unknown as Row[]) ?? []

  return (
    <div className="min-h-screen bg-white pb-24">
      <MarketHeader title="Market" />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-4">
        <form action="/market" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search products"
            className="h-10 flex-1 rounded-full border border-gray-200 px-4 text-sm outline-none focus:border-black"
          />
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <button className="h-10 rounded-full bg-black px-5 text-sm font-semibold text-white">Search</button>
        </form>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Link href="/market" className={`shrink-0 rounded-full border px-3 py-1 text-sm ${!category ? 'bg-black text-white' : ''}`}>All</Link>
          {PRODUCT_CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={`/market?category=${c.value}`}
              className={`shrink-0 rounded-full border px-3 py-1 text-sm ${category === c.value ? 'bg-black text-white' : ''}`}
            >
              {c.label}
            </Link>
          ))}
        </div>

        {products.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">No products found yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {products.map((p) => (
              <Link key={p.id} href={`/market/${p.id}`} className="group overflow-hidden rounded-2xl border border-gray-100">
                <div className="aspect-square bg-gray-100">
                  {p.image_paths[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={productImageUrl(p.image_paths[0])} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="space-y-0.5 p-3">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-sm font-bold">{formatNaira(p.price_kobo)}</p>
                  <p className="truncate text-xs text-gray-500">{p.stores?.name} · {p.stores?.state}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
