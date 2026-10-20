'use client'

import { useEffect, useState } from 'react'
import { Heart, Share2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgeActions({
  forgeId,
  forgeName,
}: {
  forgeId: string
  forgeName: string
}) {
  const supabase = createClient()
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      setUserId(user?.id ?? null)

      const { count } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('forge_id', forgeId)
        .eq('interaction_type', 'like')

      if (cancelled) return
      setLikes(count ?? 0)

      if (user) {
        const { data } = await supabase
          .from('interactions')
          .select('id')
          .eq('forge_id', forgeId)
          .eq('user_id', user.id)
          .eq('interaction_type', 'like')
          .maybeSingle()
        if (!cancelled) setLiked(Boolean(data))
      }
    }
    load().catch((e) => console.error('[ForgeActions]', e))
    return () => {
      cancelled = true
    }
  }, [supabase, forgeId])

  const toggleLike = async () => {
    if (!userId || busy) return
    setBusy(true)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikes((n) => Math.max(0, n + (wasLiked ? -1 : 1)))

    try {
      if (wasLiked) {
        await supabase
          .from('interactions')
          .delete()
          .eq('forge_id', forgeId)
          .eq('user_id', userId)
          .eq('interaction_type', 'like')
      } else {
        await supabase
          .from('interactions')
          .insert({ forge_id: forgeId, user_id: userId, interaction_type: 'like' })
      }
    } catch (e) {
      setLiked(wasLiked)
      setLikes((n) => Math.max(0, n + (wasLiked ? 1 : -1)))
      console.error('[ForgeActions like]', e)
    } finally {
      setBusy(false)
    }
  }

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (!url) return
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as any).share({ title: forgeName, url })
        return
      } catch {
        /* fall through to clipboard */
      }
    }
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 border-y border-[#e7ebe5] bg-white px-5 py-3">
      <button
        type="button"
        onClick={toggleLike}
        disabled={busy}
        aria-pressed={liked}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition active:scale-95 disabled:opacity-50 ${
          liked
            ? 'border-red-200 bg-red-50 text-red-600'
            : 'border-[#e3e2dd] bg-white text-[#5c6360]'
        }`}
      >
        <Heart
          className={`h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : ''}`}
          strokeWidth={2}
        />
        {likes}
      </button>

      <button
        type="button"
        onClick={share}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#e3e2dd] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#5c6360] transition active:scale-95"
      >
        {copied ? (
          <Check className="h-4 w-4 text-[#00a94f]" strokeWidth={2.4} />
        ) : (
          <Share2 className="h-4 w-4" strokeWidth={2} />
        )}
        {copied ? 'Copied' : 'Share'}
      </button>
    </div>
  )
         }
