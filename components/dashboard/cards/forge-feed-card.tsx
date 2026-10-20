'use client'

import Link from 'next/link'
import { Layers, Heart, MessageCircle, Share2 } from 'lucide-react'

export type ForgeFeedItem = {
  id: string
  name: string
  description?: string | null
  template_type: string
  user_id: string
  created_at: string
  profiles?: any
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

export default function ForgeFeedCard({
  forge, isLiked, commentCount, shareCopied, onLike, onComment, onShare,
}: {
  forge: ForgeFeedItem
  isLiked: boolean
  commentCount: number
  shareCopied: boolean
  onLike: () => void
  onComment: () => void
  onShare: () => void
}) {
  const p = one<any>(forge.profiles)
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
          <p className="text-[11px] text-gray-500">shared a Forge</p>
        </div>
        <span className="rounded-full bg-[#b7f23a] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-black">Forge</span>
      </div>
      <Link href={`/preview/${forge.id}`} className="block px-4 pb-3 pt-3">
        <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black text-[#b7f23a]"><Layers className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-black">{forge.name}</h3>
            {forge.description && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{forge.description}</p>}
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{forge.template_type}</p>
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-5 border-t border-gray-100 px-4 py-2.5 text-gray-600">
        <button type="button" onClick={onLike} aria-label="Like" className={`flex items-center gap-1.5 text-sm ${isLiked ? 'text-black' : ''}`}><Heart className={`h-5 w-5 ${isLiked ? 'fill-black' : ''}`} /></button>
        <button type="button" onClick={onComment} aria-label="Comments" className="flex items-center gap-1.5 text-sm"><MessageCircle className="h-5 w-5" />{commentCount > 0 && commentCount}</button>
        <button type="button" onClick={onShare} aria-label="Share" className="ml-auto flex items-center gap-1.5 text-sm"><Share2 className="h-5 w-5" />{shareCopied && <span className="text-xs">Copied</span>}</button>
      </div>
    </article>
  )
}
