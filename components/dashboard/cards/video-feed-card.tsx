'use client'

import Link from 'next/link'
import { Eye, Heart, Play, Users, Video } from 'lucide-react'
import { timeAgo } from '@/lib/dashboard/helpers'
import { ACTION_ICON, ActionLink, CardFooter, CardHeader, CardShell } from './feed-shell'

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

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

const count = (v?: number | null) => {
  const x = Math.max(0, v ?? 0)
  if (x < 1000) return String(x)
  if (x < 1_000_000) return `${(x / 1000).toFixed(x >= 10000 ? 0 : 1)}k`
  return `${(x / 1_000_000).toFixed(1)}m`
}

export default function VideoFeedCard({ video }: { video: VideoFeedItem }) {
  const p = one<any>(video.profiles)
  const name = p?.display_name || p?.username || 'Siyarwa Pull member'
  const watch = `/fleex?start=${video.id}`
  return (
    <CardShell>
      <CardHeader
        name={name}
        href={p?.username ? `/profile/${p.username}` : null}
        avatarUrl={p?.avatar_url}
        badge="Clip"
        meta={<><span>{timeAgo(video.created_at)} ago</span><span aria-hidden="true">•</span><Users className="h-5 w-5" aria-hidden="true" /><span>Clip</span></>}
      />
      {video.caption && (
        <Link href={watch} className="mt-6 block px-5 sm:px-7">
          <h2 className="line-clamp-3 text-[clamp(1.35rem,3.6vw,2rem)] font-normal leading-[1.15] tracking-[-0.04em]">{video.caption}</h2>
        </Link>
      )}
      <Link href={watch} className="relative mt-5 block aspect-[4/5] w-full overflow-hidden bg-[#1f2326] sm:aspect-[4/3]" aria-label="Watch clip">
        {video.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnail_url} alt={video.caption || 'Clip'} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <video src={video.video_url} preload="metadata" muted playsInline className="h-full w-full object-cover" />
        )}
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/55 text-white backdrop-blur"><Play className="h-7 w-7 fill-white" /></span>
        </span>
      </Link>
      <CardFooter
        stats={<><span className="flex items-center gap-1"><Eye className="h-4 w-4" />{count(video.view_count)} views</span><span aria-hidden="true">•</span><span className="flex items-center gap-1"><Heart className="h-4 w-4" />{count(video.like_count)}</span></>}
      >
        <ActionLink href={watch} label="Watch this clip"><Video className={ACTION_ICON} aria-hidden="true" /><span className="truncate">Watch clip</span></ActionLink>
      </CardFooter>
    </CardShell>
  )
}
