'use client'

import Link from 'next/link'
import { ShoppingBag, MapPin } from 'lucide-react'
import { formatNaira } from '@/lib/market/money'
import { productImageUrl } from '@/lib/market/constants'

export type ProductFeedItem = {
  id: string
  title: string
  price_kobo: number
  stock: number
  image_paths: string[] | null
  created_at: string
  stores?: any
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

export default function ProductFeedCard({ product }: { product: ProductFeedItem }) {
  const store = one<any>(product.stores)
  const img = product.image_paths?.[0]
  const soldOut = product.stock <= 0
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-black text-[#b7f23a]"><ShoppingBag className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          {store?.slug ? <Link href={`/market/store/${store.slug}`} className="block truncate text-sm font-bold text-black">{store.name}</Link> : <p className="truncate text-sm font-bold text-black">Seller</p>}
          {store?.state && <p className="flex items-center gap-1 text-[11px] text-gray-500"><MapPin className="h-3 w-3" />{store.state}</p>}
        </div>
        <span className="rounded-full bg-[#b7f23a] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-black">Marketplace</span>
      </div>
      <Link href={`/market/${product.id}`} className="mt-3 block">
        <div className="aspect-square w-full bg-gray-100 sm:aspect-[4/3]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={productImageUrl(img)} alt={product.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="grid h-full w-full place-items-center text-gray-300"><ShoppingBag className="h-12 w-12" /></div>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-bold text-black">{product.title}</h3>
          <p className="text-lg font-extrabold text-black">{formatNaira(product.price_kobo)}</p>
          {!soldOut && product.stock <= 5 && <p className="text-[11px] font-semibold text-orange-600">Only {product.stock} left</p>}
        </div>
        {soldOut ? (
          <span className="rounded-full bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-400">Sold out</span>
        ) : (
          <Link href={`/market/${product.id}`} className="rounded-full bg-black px-5 py-2.5 text-sm font-extrabold text-white active:scale-95">Buy now</Link>
        )}
      </div>
    </article>
  )
}
