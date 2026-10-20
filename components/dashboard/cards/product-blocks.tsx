'use client'

import Link from 'next/link'
import { MapPin, ShoppingBag, ArrowRight } from 'lucide-react'
import { formatNaira } from '@/lib/market/money'
import { productImageUrl } from '@/lib/market/constants'
import { CardHeader, CardShell } from './feed-shell'

export type ProductFeedItem = {
  id: string
  title: string
  price_kobo: number
  stock: number
  image_paths: string[] | null
  created_at: string
  stores?: any
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

function Photo({ product, className }: { product: ProductFeedItem; className: string }) {
  const img = product.image_paths?.[0]
  return (
    <div className={`overflow-hidden bg-[#efefea] ${className}`}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={productImageUrl(img)} alt={product.title} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="grid h-full w-full place-items-center text-[#c9c9c2]"><ShoppingBag className="h-10 w-10" /></div>
      )}
    </div>
  )
}

function Header({ title, strip }: { title: string; strip?: boolean }) {
  return (
    <CardHeader
      name={title}
      icon={<ShoppingBag className="h-6 w-6" />}
      badge="Marketplace"
      meta={<span>{strip ? 'Swipe to browse' : 'Fresh listings'} • Siyarwa Pull</span>}
    />
  )
}

/** Horizontal strip: swipe sideways through products. */
export function ProductStrip({ products }: { products: ProductFeedItem[] }) {
  return (
    <CardShell>
      <Header title="Shop on Siyarwa Pull" strip />
      <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-5 [scrollbar-width:none] sm:px-7 [&::-webkit-scrollbar]:hidden">
        {products.map((p) => {
          const store = one<any>(p.stores)
          return (
            <Link key={p.id} href={`/market/${p.id}`} className="w-[9.5rem] shrink-0 snap-start">
              <Photo product={p} className="aspect-square w-full rounded-xl" />
              <p className="mt-2 line-clamp-1 text-sm font-semibold">{p.title}</p>
              <p className="text-base font-extrabold">{formatNaira(p.price_kobo)}</p>
              {store?.name && <p className="truncate text-[0.72rem] text-[#7d8387]">{store.name}</p>}
            </Link>
          )
        })}
        <Link href="/market" className="grid w-[9.5rem] shrink-0 snap-start place-items-center rounded-xl border border-dashed border-[#c9c9c2] text-center text-sm font-semibold text-[#535a5e]">
          <span className="flex flex-col items-center gap-1">See all<ArrowRight className="h-4 w-4" /></span>
        </Link>
      </div>
    </CardShell>
  )
}

/** Grid: products shown two (or three) across with a Buy button. */
export function ProductGrid({ products }: { products: ProductFeedItem[] }) {
  return (
    <CardShell>
      <Header title="Fresh in the marketplace" />
      <div className="mt-5 grid grid-cols-2 gap-3 px-5 sm:grid-cols-4 sm:px-7">
        {products.map((p) => {
          const store = one<any>(p.stores)
          return (
            <div key={p.id} className="min-w-0">
              <Link href={`/market/${p.id}`} className="block">
                <Photo product={p} className="aspect-square w-full rounded-xl" />
                <p className="mt-2 line-clamp-1 text-sm font-semibold">{p.title}</p>
                <p className="text-base font-extrabold">{formatNaira(p.price_kobo)}</p>
                {store?.state && <p className="flex items-center gap-1 truncate text-[0.72rem] text-[#7d8387]"><MapPin className="h-3 w-3 shrink-0" />{store.state}</p>}
              </Link>
              <Link href={`/market/${p.id}`} className="mt-2 block rounded-full bg-[#14181c] py-2 text-center text-[0.8rem] font-extrabold text-white active:scale-95">Buy now</Link>
            </div>
          )
        })}
      </div>
      <div className="px-5 pb-5 pt-4 sm:px-7">
        <Link href="/market" className="flex items-center justify-center gap-1.5 border-t border-[#d9d9d4] pt-3 text-sm font-semibold text-[#14181c]">Browse the marketplace<ArrowRight className="h-4 w-4" /></Link>
      </div>
    </CardShell>
  )
}
