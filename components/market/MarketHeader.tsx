import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function MarketHeader({ title, back }: { title: string; back?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        {back ? (
          <Link href={back} aria-label="Back" className="rounded-full p-1.5 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          <p className="truncate text-[11px] font-medium leading-tight text-gray-500">Siyarwa Pull Marketplace</p>
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
          <Link href="/market" className="hover:text-black">Shop</Link>
          <Link href="/market/orders" className="hover:text-black">Orders</Link>
          <Link href="/market/sell" className="hover:text-black">Sell</Link>
        </nav>
      </div>
    </header>
  )
}
