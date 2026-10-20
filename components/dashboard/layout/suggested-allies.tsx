'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Check, Plus } from 'lucide-react'
import AvatarCircle from '@/components/dashboard/shared/avatar-circle'

interface SuggestedUser {
  id: string
  display_name: string
  username: string
  avatar_url?: string | null
  bio?: string | null
}

/**
 * "People to follow" carousel, shown inline while scrolling the feed.
 * Follow taps go through onFollow, which is already auth-gated by the
 * page (guests get the sign-up prompt).
 */
export default function SuggestedAllies({
  users,
  followingSet,
  onFollow,
  title = 'People to follow',
  subtitle = 'Follow creators to build a feed you actually care about.',
}: {
  users: SuggestedUser[]
  followingSet: Set<string>
  onFollow: (userId: string) => void
  title?: string
  subtitle?: string
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const visible = users.filter((u) => !dismissed.has(u.id))

  if (visible.length === 0) return null

  return (
    <section className="bg-white rounded-3xl border border-gray-200 shadow-sm py-5 overflow-hidden">
      <div className="flex items-start justify-between px-5 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-black">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <Link href="/search" className="text-xs font-bold text-black underline underline-offset-2 flex-shrink-0 ml-3 mt-1">
          See all
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto px-5 pb-1 snap-x snap-mandatory scrollbar-hide">
        {visible.map((u) => {
          const isFollowing = followingSet.has(u.id)
          return (
            <div
              key={u.id}
              className="relative snap-start flex-shrink-0 w-40 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center text-center"
            >
              <button
                onClick={() => setDismissed((s) => new Set(s).add(u.id))}
                aria-label={`Dismiss ${u.display_name}`}
                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <Link href={`/profile/${u.username}`} className="flex flex-col items-center min-w-0 w-full">
                <AvatarCircle src={u.avatar_url} name={u.display_name} size={64} />
                <p className="mt-3 text-sm font-extrabold text-black truncate w-full">{u.display_name}</p>
                <p className="text-xs text-gray-500 truncate w-full">@{u.username}</p>
                <p className="mt-2 text-xs text-gray-600 leading-snug line-clamp-2 min-h-[2rem]">
                  {u.bio || ''}
                </p>
              </Link>

              <button
                onClick={() => onFollow(u.id)}
                className={`mt-3 w-full h-9 rounded-full text-xs font-extrabold flex items-center justify-center gap-1 transition active:scale-95 ${
                  isFollowing
                    ? 'bg-white text-black border border-gray-300'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {isFollowing ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Following
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Follow
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
