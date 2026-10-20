'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Bookmark,
  Check,
  ChevronLeft,
  Crown,
  Flame,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music,
  Pause,
  Play,
  RefreshCw,
  Share2,
  Sparkles,
  TrendingUp,
  User,
  Verified,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuthGate } from '@/contexts/AuthGateContext'

const VIDEO_CATEGORIES = [
  'For You', 'Trending', 'Technology', 'Health', 'Entertainment', 'Gaming',
  'Sports', 'Business', 'Music', 'Lifestyle', 'Fitness', 'Comedy',
  'Education', 'Travel', 'Food', 'Art', 'Nature',
]

interface Fleex {
  id: string
  user_id: string
  video_url: string
  thumbnail_url: string
  caption: string
  music_name: string
  music_artist: string
  view_count: number
  like_count: number
  comment_count: number
  share_count: number
  duration: number
  created_at: string
  display_name?: string | null
  username?: string | null
  avatar_url?: string | null
  is_official?: boolean
  is_verified?: boolean
  profiles?: {
    display_name: string
    username: string
    avatar_url: string
    is_official: boolean
    is_verified: boolean
  } | null
}

export default function FleexPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { requireAuth } = useAuthGate()
  const currentUserRef = useRef<any>(null)

  const [fleex, setFleex] = useState<Fleex[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [savedFleex, setSavedFleex] = useState<Set<string>>(new Set())
  const [likedFleex, setLikedFleex] = useState<Set<string>>(new Set())
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('For You')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [tempCategory, setTempCategory] = useState('For You')
  const [hasSetInterest, setHasSetInterest] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [shareCopied, setShareCopied] = useState<string | null>(null)

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const observerTarget = useRef<HTMLDivElement>(null)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousBodyBackground = document.body.style.backgroundColor
    const previousHtmlBackground = document.documentElement.style.backgroundColor

    document.body.style.overflow = 'hidden'
    document.body.style.backgroundColor = '#1f2326'
    document.documentElement.style.backgroundColor = '#1f2326'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.backgroundColor = previousBodyBackground
      document.documentElement.style.backgroundColor = previousHtmlBackground
    }
  }, [])

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  const fetchFleex = useCallback(async (pageNum: number, category: string, refresh = false) => {
    if (refresh) setRefreshing(true)
    if (pageNum === 1) setLoading(true)
    if (pageNum > 1) setIsLoadingMore(true)

    try {
      const { data: officialAccounts } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_official', true)
      const officialIds = officialAccounts?.map((account) => account.id) || []

      let query = supabase
        .from('user_fleex')
        .select(`*, profiles:user_id (display_name, username, avatar_url, is_official, is_verified)`)
        .eq('is_private', false)
        .range((pageNum - 1) * ITEMS_PER_PAGE, pageNum * ITEMS_PER_PAGE - 1)

      query = category === 'Trending'
        ? query.order('view_count', { ascending: false })
        : query.order('created_at', { ascending: false })

      if (category !== 'For You' && category !== 'Trending') {
        query = query.ilike('caption', `%${category}%`)
      }

      const { data: videosData, error } = await query
      if (error) throw error

      if (!videosData || videosData.length === 0) {
        if (pageNum === 1) setFleex([])
        setHasMore(false)
        return
      }

      const videos: Fleex[] = videosData.map((video: any) => ({
        ...video,
        like_count: Number(video.like_count) || 0,
        comment_count: Number(video.comment_count) || 0,
        display_name: video.profiles?.display_name,
        username: video.profiles?.username,
        avatar_url: video.profiles?.avatar_url,
        is_official: video.profiles?.is_official,
        is_verified: video.profiles?.is_verified,
      }))

      // The counters on user_fleex can be stale or null. The source-of-truth
      // rows are fleex_likes and fleex_comments, so hydrate the feed from them.
      const videoIds = videos.map((video) => video.id)
      const [{ data: likeRows, error: likesError }, { data: commentRows, error: commentsError }] = await Promise.all([
        supabase.from('fleex_likes').select('fleex_id').in('fleex_id', videoIds),
        supabase.from('fleex_comments').select('fleex_id').in('fleex_id', videoIds),
      ])

      if (likesError) console.warn('[Fleex] Could not load reaction counts:', likesError.message)
      if (commentsError) console.warn('[Fleex] Could not load comment counts:', commentsError.message)

      const likeCounts = new Map<string, number>()
      const commentCounts = new Map<string, number>()
      likeRows?.forEach((row: { fleex_id: string }) => likeCounts.set(row.fleex_id, (likeCounts.get(row.fleex_id) || 0) + 1))
      commentRows?.forEach((row: { fleex_id: string }) => commentCounts.set(row.fleex_id, (commentCounts.get(row.fleex_id) || 0) + 1))

      const hydratedVideos = videos.map((video) => ({
        ...video,
        like_count: likeCounts.has(video.id) ? likeCounts.get(video.id)! : video.like_count,
        comment_count: commentCounts.has(video.id) ? commentCounts.get(video.id)! : video.comment_count,
      }))

      hydratedVideos.sort((a, b) => {
        const officialDifference = Number(officialIds.includes(b.user_id)) - Number(officialIds.includes(a.user_id))
        return officialDifference || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      if (pageNum === 1 || refresh) {
        setFleex(hydratedVideos)
        setPage(1)
        setCurrentIndex(0)
        setIsPlaying(true)
        if (containerRef.current && refresh) containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setFleex((previous) => [...previous, ...hydratedVideos])
      }

      setHasMore(videosData.length === ITEMS_PER_PAGE)

      const user = currentUserRef.current
      if (user && hydratedVideos.length) {
        const ids = hydratedVideos.map((video) => video.id)
        const [{ data: likes }, { data: saves }] = await Promise.all([
          supabase.from('fleex_likes').select('fleex_id').eq('user_id', user.id).in('fleex_id', ids),
          supabase.from('fleex_saves').select('fleex_id').eq('user_id', user.id).in('fleex_id', ids),
        ])
        setLikedFleex((previous) => new Set([...previous, ...(likes?.map((like) => like.fleex_id) || [])]))
        setSavedFleex((previous) => new Set([...previous, ...(saves?.map((save) => save.fleex_id) || [])]))
      }
    } catch (error) {
      console.error('Error fetching fleex:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setIsLoadingMore(false)
    }
  }, [supabase])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return

      if (!user) {
        setCurrentUser(null)
        setSelectedCategory('For You')
        setHasSetInterest(true)
        await fetchFleex(1, 'For You')
        return
      }

      setCurrentUser(user)
      currentUserRef.current = user
      const { data: interests } = await supabase
        .from('user_interests')
        .select('category')
        .eq('user_id', user.id)
        .single()

      if (interests?.category) {
        setSelectedCategory(interests.category)
        setHasSetInterest(true)
        await fetchFleex(1, interests.category)
      } else {
        setShowCategoryModal(true)
        setLoading(false)
      }
    }

    initialize()
    return () => { cancelled = true }
  }, [fetchFleex, supabase])

  const saveUserInterest = async () => {
    if (!currentUser) return
    await supabase.from('user_interests').upsert({
      user_id: currentUser.id,
      category: tempCategory,
      updated_at: new Date().toISOString(),
    })
    setSelectedCategory(tempCategory)
    setHasSetInterest(true)
    setShowCategoryModal(false)
    await fetchFleex(1, tempCategory)
  }

  useEffect(() => {
    if (!hasSetInterest) return
    const observer = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting && hasMore && !loading && !refreshing && !isLoadingMore && fleex.length) {
        const nextPage = page + 1
        setPage(nextPage)
        await fetchFleex(nextPage, selectedCategory)
      }
    }, { threshold: 0.1, rootMargin: '300px' })

    if (observerTarget.current) observer.observe(observerTarget.current)
    return () => observer.disconnect()
  }, [fetchFleex, fleex.length, hasMore, hasSetInterest, isLoadingMore, loading, page, refreshing, selectedCategory])

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const nextIndex = Math.round(containerRef.current.scrollTop / window.innerHeight)
    if (nextIndex === currentIndex || nextIndex < 0 || nextIndex >= fleex.length) return
    videoRefs.current[currentIndex]?.pause()
    setCurrentIndex(nextIndex)
    setIsPlaying(true)
  }, [currentIndex, fleex.length])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    const video = videoRefs.current[currentIndex]
    if (!video) return
    if (isPlaying) video.play().catch(() => undefined)
    else video.pause()
  }, [currentIndex, isPlaying])

  const togglePlayback = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, a')) return
    const video = videoRefs.current[currentIndex]
    if (!video) return
    if (video.paused) {
      video.play().catch(() => undefined)
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const toggleLike = async (id: string) => {
    if (!requireAuth(currentUser, 'like this video')) return
    const liked = likedFleex.has(id)
    if (liked) {
      await supabase.from('fleex_likes').delete().eq('fleex_id', id).eq('user_id', currentUser.id)
      setLikedFleex((previous) => {
        const next = new Set(previous)
        next.delete(id)
        return next
      })
      setFleex((previous) => previous.map((video) => video.id === id ? { ...video, like_count: Math.max(0, video.like_count - 1) } : video))
    } else {
      await supabase.from('fleex_likes').insert({ fleex_id: id, user_id: currentUser.id })
      setLikedFleex((previous) => new Set(previous).add(id))
      setFleex((previous) => previous.map((video) => video.id === id ? { ...video, like_count: video.like_count + 1 } : video))
    }
  }

  const toggleSave = async (id: string) => {
    if (!requireAuth(currentUser, 'save this video')) return
    const saved = savedFleex.has(id)
    if (saved) {
      await supabase.from('fleex_saves').delete().eq('fleex_id', id).eq('user_id', currentUser.id)
      setSavedFleex((previous) => {
        const next = new Set(previous)
        next.delete(id)
        return next
      })
    } else {
      await supabase.from('fleex_saves').insert({ fleex_id: id, user_id: currentUser.id })
      setSavedFleex((previous) => new Set(previous).add(id))
    }
  }

  const fetchComments = async (id: string) => {
    setCommentsLoading(true)
    setCommentsError(null)
    try {
      const { data: commentRows, error } = await supabase
        .from('fleex_comments')
        .select('*')
        .eq('fleex_id', id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const userIds = [...new Set((commentRows || []).map((comment: any) => comment.user_id).filter(Boolean))]
      let profileMap = new Map<string, any>()

      if (userIds.length) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', userIds)
        if (profileError) console.warn('[Fleex] Could not load comment profiles:', profileError.message)
        profileMap = new Map((profileRows || []).map((profile: any) => [profile.id, profile]))
      }

      setComments((commentRows || []).map((comment: any) => ({
        ...comment,
        profiles: profileMap.get(comment.user_id) || null,
        displayText: comment.comment ?? comment.comment_text ?? comment.content ?? comment.body ?? '',
      })))
    } catch (error) {
      console.error('[Fleex] Could not load comments:', error)
      setComments([])
      setCommentsError('Comments could not be loaded right now.')
    } finally {
      setCommentsLoading(false)
    }
  }

  const addComment = async () => {
    if (!requireAuth(currentUser, 'comment')) return
    if (!commentText.trim()) return
    const video = fleex[currentIndex]
    if (!video) return

    const { error } = await supabase.from('fleex_comments').insert({
      fleex_id: video.id,
      user_id: currentUser.id,
      comment: commentText.trim(),
    })
    if (error) {
      console.error('[Fleex] Could not post comment:', error)
      return
    }
    setCommentText('')
    await fetchComments(video.id)
    setFleex((previous) => previous.map((item) => item.id === video.id ? { ...item, comment_count: item.comment_count + 1 } : item))
  }

  const shareVideo = async (video: Fleex) => {
    const url = `${window.location.origin}/fleex/${video.id}`
    await navigator.clipboard.writeText(url).catch(() => undefined)
    setShareCopied(video.id)
    window.setTimeout(() => setShareCopied(null), 2000)
  }

  const formatNumber = (value: number | null | undefined) => {
    const safeValue = Number(value) || 0
    if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}m`
    if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}k`
    return String(safeValue)
  }

  const handleVideoEnded = (index: number) => {
    const video = videoRefs.current[index]
    if (!video) return
    video.currentTime = 0
    video.play().catch(() => undefined)
  }

  const openComments = (index: number) => {
    setCurrentIndex(index)
    setShowComments(true)
    fetchComments(fleex[index].id)
  }

  if (showCategoryModal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-5 py-10 text-[#14181c]">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1f2326] text-[#b7f23a]">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold tracking-[-0.04em]">Choose your interests</h1>
            <p className="text-sm text-[#7d8387]">Select a category to shape your video feed.</p>
          </div>
          <div className="mb-8 flex max-h-96 flex-wrap justify-center gap-2 overflow-y-auto">
            {VIDEO_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setTempCategory(category)}
                className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${tempCategory === category ? 'border-[#1f2326] bg-[#1f2326] text-white' : 'border-[#d9d9d4] bg-[#fbfaf6] text-[#14181c] hover:bg-[#efefea]'}`}
              >
                {category}
              </button>
            ))}
          </div>
          <button type="button" onClick={saveUserInterest} className="w-full rounded-full bg-[#1f2326] px-5 py-3 font-semibold text-white transition hover:bg-black">
            Start watching
          </button>
        </div>
      </div>
    )
  }

  if (loading && fleex.length === 0) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#1f2326] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-[#b7f23a]" />
          <p className="text-sm text-white/70">Loading videos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 h-[100svh] min-h-0 w-full overflow-hidden overscroll-none bg-[#1f2326] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-28 bg-gradient-to-b from-black/65 to-transparent" />
      <header className="fixed inset-x-0 top-0 z-40 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <button type="button" onClick={() => router.back()} aria-label="Go back" className="rounded-full bg-black/35 p-2 text-white backdrop-blur-md transition hover:bg-black/60 active:scale-95">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-[-0.02em]">Fleex</p>
            <p className="truncate text-xs text-white/65">Ideas in motion</p>
          </div>
          <button
            type="button"
            onClick={() => { setTempCategory(selectedCategory); setShowCategoryModal(true) }}
            className="max-w-[42%] truncate rounded-full border border-white/20 bg-black/35 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/60"
          >
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[#b7f23a]" />{selectedCategory}</span>
          </button>
          <button type="button" onClick={() => fetchFleex(1, selectedCategory, true)} disabled={refreshing} aria-label="Refresh videos" className="rounded-full bg-black/35 p-2 text-white backdrop-blur-md transition hover:bg-black/60 disabled:opacity-50">
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main ref={containerRef} className="h-full min-h-0 snap-y snap-mandatory overflow-y-scroll overscroll-contain scroll-smooth bg-[#1f2326]" style={{ scrollbarWidth: 'none' }}>
        {fleex.length === 0 && !loading ? (
          <div className="flex h-[100dvh] flex-col items-center justify-center bg-[#1f2326] px-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10"><Flame className="h-8 w-8 text-white/60" /></div>
            <h2 className="mb-2 text-xl font-semibold">No videos found</h2>
            <p className="mb-6 text-sm text-white/60">Try a different category.</p>
            <button type="button" onClick={() => setShowCategoryModal(true)} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#14181c]">Change category</button>
          </div>
        ) : (
          fleex.map((item, index) => (
            <section key={item.id} className="relative h-[100svh] min-h-0 w-full snap-start snap-always bg-[#1f2326]" onClick={togglePlayback}>
              <video
                ref={(element) => { videoRefs.current[index] = element }}
                src={item.video_url}
                className="absolute inset-0 h-full w-full object-cover"
                muted={isMuted}
                playsInline
                autoPlay={index === 0}
                poster={item.thumbnail_url}
                onEnded={() => handleVideoEnded(index)}
                preload={index === currentIndex ? 'auto' : 'metadata'}
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              {index === currentIndex && !isPlaying && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-black/45 p-5 backdrop-blur-sm"><Play className="h-8 w-8 fill-white text-white" /></div>
                </div>
              )}

              {item.view_count > 50000 && (
                <div className="absolute left-4 top-[25%] z-10 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#14181c] shadow-lg">
                  <TrendingUp className="h-3.5 w-3.5 text-[#8aae00]" /> Trending
                </div>
              )}

              {index === currentIndex && videoRefs.current[currentIndex]?.readyState < 2 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/40 border-t-[#b7f23a]" /></div>
              )}

              <button type="button" onClick={(event) => { event.stopPropagation(); setIsMuted((muted) => !muted) }} aria-label={isMuted ? 'Unmute video' : 'Mute video'} className="absolute right-4 top-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] z-20 rounded-full bg-black/45 p-2.5 text-white backdrop-blur-md transition hover:bg-black/70 active:scale-95">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>

              <div className="absolute bottom-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] right-3 z-20 flex flex-col items-center gap-4 sm:right-6 sm:gap-5">
                <ReelActionButton label="Appreciate this video" active={likedFleex.has(item.id)} onClick={() => toggleLike(item.id)} count={formatNumber(item.like_count)}>
                  <Heart className="h-6 w-6" fill={likedFleex.has(item.id) ? 'currentColor' : 'none'} />
                </ReelActionButton>
                <ReelActionButton label="Open comments" onClick={() => openComments(index)} count={formatNumber(item.comment_count)}>
                  <MessageCircle className="h-6 w-6" />
                </ReelActionButton>
                <ReelActionButton label="Save this video" active={savedFleex.has(item.id)} onClick={() => toggleSave(item.id)} text="Save">
                  <Bookmark className="h-6 w-6" fill={savedFleex.has(item.id) ? 'currentColor' : 'none'} />
                </ReelActionButton>
                <ReelActionButton label="Share this video" onClick={() => shareVideo(item)} text={shareCopied === item.id ? 'Copied' : 'Share'}>
                  {shareCopied === item.id ? <Check className="h-6 w-6" /> : <Share2 className="h-6 w-6" />}
                </ReelActionButton>
              </div>

              <div className="absolute bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] left-4 z-20 max-w-[calc(100%-6rem)] sm:left-6 sm:max-w-[min(65%,34rem)]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/75 bg-[#1f2326] text-[#b7f23a]">
                    {item.avatar_url ? <Image src={item.avatar_url} alt={item.display_name || 'Creator'} width={44} height={44} className="h-full w-full object-cover" /> : <User className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-white">{item.display_name || 'Creator'}</p>
                      {item.is_official && <Crown className="h-4 w-4 shrink-0 text-[#b7f23a]" aria-label="Official creator" />}
                      {item.is_verified && !item.is_official && <Verified className="h-4 w-4 shrink-0 text-white" aria-label="Verified creator" />}
                    </div>
                    <p className="text-xs text-white/60">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
                  </div>
                  <button type="button" onClick={(event) => event.stopPropagation()} aria-label="More creator options" className="rounded-full bg-black/35 p-2 text-white/75 backdrop-blur-md"><MoreHorizontal className="h-5 w-5" /></button>
                </div>

                {item.caption && <p className="mb-3 line-clamp-3 break-words text-sm font-medium leading-relaxed text-white sm:text-base">{item.caption}</p>}
                <div className="flex min-w-0 items-center gap-2 text-xs text-white/70">
                  <Music className="h-3.5 w-3.5 shrink-0 text-[#b7f23a]" />
                  <span className="truncate">{item.music_name || 'Original Sound'}</span>
                  {item.music_artist && <span className="truncate">· {item.music_artist}</span>}
                </div>
              </div>
            </section>
          ))
        )}

        {hasMore && !loading && fleex.length > 0 && (
          <div ref={observerTarget} className="flex h-24 snap-start items-center justify-center bg-[#1f2326] text-white/60">
            <div className="flex items-center gap-2 text-sm"><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-[#b7f23a]" />Loading more...</div>
          </div>
        )}
      </main>

      {showComments && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowComments(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
          <div className="relative flex max-h-[86svh] w-full flex-col overflow-hidden rounded-t-[30px] bg-white text-[#14181c] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#d9d9d4]" />
            <div className="flex items-center justify-between border-b border-[#e5e5e0] px-5 py-4 sm:px-7">
              <div><div className="flex items-center gap-2"><h3 className="font-semibold tracking-[-0.02em]">Comments</h3><span className="rounded-full bg-[#efffc8] px-2 py-0.5 text-[11px] font-bold text-[#8aae00]">{formatNumber(fleex[currentIndex]?.comment_count)}</span></div><p className="mt-1 text-xs text-[#7d8387]">What do you think?</p></div>
              <button type="button" onClick={() => setShowComments(false)} aria-label="Close comments" className="rounded-full bg-[#fbfaf6] p-2 text-[#7d8387] transition hover:bg-[#efefea]"><X className="h-5 w-5" /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-7">
              {commentsLoading ? (
                <div className="space-y-4 py-5"><div className="h-12 animate-pulse rounded-2xl bg-[#fbfaf6]" /><div className="h-12 animate-pulse rounded-2xl bg-[#fbfaf6]" /><div className="h-12 animate-pulse rounded-2xl bg-[#fbfaf6]" /></div>
              ) : commentsError ? (
                <div className="py-12 text-center"><MessageCircle className="mx-auto mb-3 h-10 w-10 text-[#d9d9d4]" /><p className="text-sm font-semibold text-[#535a5e]">{commentsError}</p><button type="button" onClick={() => { const currentVideo = fleex[currentIndex]; if (currentVideo) fetchComments(currentVideo.id) }} className="mt-4 rounded-full bg-[#1f2326] px-4 py-2 text-xs font-semibold text-white">Try again</button></div>
              ) : comments.length === 0 ? (
                <div className="py-12 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#efffc8] text-[#8aae00]"><MessageCircle className="h-6 w-6" /></div><p className="text-sm font-semibold text-[#535a5e]">No comments yet</p><p className="mt-1 text-xs text-[#a0a4a6]">Start the conversation.</p></div>
              ) : comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 rounded-2xl bg-[#fbfaf6] p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1f2326] text-[#b7f23a]">
                    {comment.profiles?.avatar_url ? <Image src={comment.profiles.avatar_url} alt="" width={36} height={36} className="h-full w-full object-cover" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{comment.profiles?.display_name || comment.profiles?.username || 'Fleex user'}</p><p className="shrink-0 text-[10px] text-[#a0a4a6]">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</p></div><p className="mt-1 break-words text-sm leading-relaxed text-[#535a5e]">{comment.displayText || 'Comment'}</p></div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#e5e5e0] bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7">
              <div className="flex gap-2 rounded-full border border-[#d9d9d4] bg-[#fbfaf6] p-1.5 focus-within:border-[#b7f23a]">
                <input type="text" value={commentText} onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addComment() }} placeholder="Add a comment..." className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#a0a4a6]" />
                <button type="button" onClick={addComment} disabled={!commentText.trim()} className="shrink-0 rounded-full bg-[#1f2326] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-40">Post</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReelActionButton({
  label,
  active = false,
  count,
  text,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  count?: string
  text?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" aria-label={label} aria-pressed={active} onClick={(event) => { event.stopPropagation(); onClick() }} className={`flex flex-col items-center gap-1 text-xs font-semibold transition active:scale-90 ${active ? 'text-[#b7f23a]' : 'text-white'}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur-md transition hover:bg-black/70">{children}</span>
      <span className="max-w-16 truncate drop-shadow">{count || text}</span>
    </button>
  )
}
