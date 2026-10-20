import Link from 'next/link'
import { Compass, Zap } from 'lucide-react'

export default function EmptyFeed({
  title = 'Discover Forges on Spark',
  description = "Follow creators to see their forges here, or explore what's trending in Spark",
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black flex items-center justify-center">
        <Compass className="h-8 w-8 text-white" />
      </div>
      <h3 className="font-extrabold text-lg mb-1.5 text-black">{title}</h3>
      <p className="text-sm text-gray-500 mb-5 leading-relaxed max-w-xs mx-auto">{description}</p>
      <Link href="/spark">
        <button className="inline-flex items-center gap-2 px-6 h-11 rounded-full text-sm font-extrabold text-white bg-black hover:bg-gray-800 transition">
          <Zap className="h-4 w-4" /> Explore Spark
        </button>
      </Link>
    </div>
  )
}
