'use client'

import Link from 'next/link'
import { Play, Eye, Heart } from 'lucide-react'

export type VideoFeedItem = {
  id: string
  user_id: string
  video_url: string
  thumbnail_url?: string | null
  caption?: string | null
  view_count?: number | null
  like_count?: number | null
  created_at: string
  profiles?: any
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

const n = (v?: number | null) => {
  const x = v ?? 0
  return x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}K` : String(x)
}

export default function VideoFeedCard({ video }: { video: VideoFeedItem }) {
  const p = one<any>(video.profiles)
  const name = p?.display_name || p?.username || 'Siyarwa Pull member'
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-4 pt-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : (
          <div className="grid h-9 w-9 place-items-center rounded-full bg-black text-sm font-bold text-white">{name[0]?.toUpperCase()}</div>
        )}
        <div className="min-w-0 flex-1">
          {p?.username ? <Link href={`/profile/${p.username}`} className="block truncate text-sm font-bold text-black">{name}</Link> : <p className="truncate text-sm font-bold text-black">{name}</p>}
          <p className="text-[11px] text-gray-500">posted a clip</p>
        </div>
        <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#b7f23a]">Clip</span>
      </div>
      <Link href={`/fleex?start=${video.id}`} className="relative mt-3 block aspect-[4/5] w-full overflow-hidden bg-black sm:aspect-video">
        {video.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnail_url} alt={video.caption || 'Clip'} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <video src={video.video_url} preload="metadata" muted playsInline className="h-full w-full object-cover" />
        )}
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-black/55 text-white backdrop-blur"><Play className="h-6 w-6 fill-white" /></span>
        </span>
      </Link>
      <div className="px-4 py-3">
        {video.caption && <p className="line-clamp-2 text-sm text-gray-800">{video.caption}</p>}
        <div className="mt-1.5 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{n(video.view_count)}</span>
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{n(video.like_count)}</span>
        </div>
      </div>
    </article>
  )
}
