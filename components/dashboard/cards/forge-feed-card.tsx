'use client'

import Link from 'next/link'
import { Check, Heart, Layers, MessageCircle, Share2, Users } from 'lucide-react'
import { timeAgo } from '@/lib/dashboard/helpers'
import { ACTION_ICON, ActionButton, CardFooter, CardHeader, CardShell } from './feed-shell'

export type ForgeFeedItem = {
  id: string
  name: string
  description?: string | null
  template_type: string
  user_id: string
  created_at: string
  profiles?: any
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

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
    <CardShell>
      <CardHeader
        name={name}
        href={p?.username ? `/profile/${p.username}` : null}
        avatarUrl={p?.avatar_url}
        badge="Forge"
        meta={<><span>{timeAgo(forge.created_at)} ago</span><span aria-hidden="true">•</span><Users className="h-5 w-5" aria-hidden="true" /><span>Forge</span></>}
      />
      <Link href={`/preview/${forge.id}`} className="block px-5 pb-4 pt-6 sm:px-7">
        <div className="flex items-start gap-4 rounded-xl border border-[#deded9] bg-white p-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#1f2326] text-[#b7f23a]"><Layers className="h-6 w-6" /></div>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-[1.35rem] font-normal leading-[1.15] tracking-[-0.04em]">{forge.name}</h2>
            {forge.description && <p className="mt-2 line-clamp-3 text-base leading-relaxed text-[#535a5e]">{forge.description}</p>}
            <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#7d8387]">{forge.template_type}</p>
          </div>
        </div>
      </Link>
      <CardFooter stats={<span>{commentCount} comments</span>}>
        <ActionButton active={isLiked} label={isLiked ? 'Remove appreciation' : 'Appreciate this Forge'} onClick={onLike}>
          <Heart className={ACTION_ICON} fill={isLiked ? 'currentColor' : 'none'} aria-hidden="true" /><span className="truncate">Appreciate</span>
        </ActionButton>
        <ActionButton label="Comment on this Forge" onClick={onComment}>
          <MessageCircle className={ACTION_ICON} aria-hidden="true" /><span className="truncate">Comment</span>
        </ActionButton>
        <ActionButton label="Share this Forge" onClick={onShare}>
          {shareCopied ? <Check className={ACTION_ICON} aria-hidden="true" /> : <Share2 className={ACTION_ICON} aria-hidden="true" />}
          <span className="truncate">{shareCopied ? 'Copied' : 'Share'}</span>
        </ActionButton>
      </CardFooter>
    </CardShell>
  )
}
