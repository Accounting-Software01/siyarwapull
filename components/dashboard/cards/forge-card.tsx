'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bookmark, ChevronLeft, ChevronRight, Heart, Loader2, MessageCircle, MoreHorizontal, Share2, Users } from 'lucide-react'

export type FeedPost = {
  id: string
  user_id: string
  content?: string | null
  image_url?: string | null
  image?: string | null
  media_url?: string | null
  media_type?: 'image' | 'video' | null
  media_urls?: string[] | null
  attachments?: unknown
  media?: unknown
  created_at: string
  likes_count?: number | null
  shares_count?: number | null
  profiles?: Profile | Profile[] | null
}

type Profile = {
  id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
}

type FeedCardProps = {
  post: FeedPost
  isFollowing: boolean
  isLiked: boolean
  currentUserId: string
  commentCount: number
  onFollow: () => void
  onLike: () => void
  onComment: () => void
  onShare: () => void
  onTagClick?: (tag: string) => void
  isLikePending?: boolean
  isFollowPending?: boolean
}

const formatRelativeTime = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

const formatCount = (value: number) => {
  if (value < 1000) return String(value)
  if (value < 1000000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  return `${(value / 1000000).toFixed(1)}m`
}

const getProfile = (profiles: FeedPost['profiles'], userId: string): Profile => {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles
  return profile ?? { id: userId, display_name: 'Fleex member', username: null, avatar_url: null }
}

const getInitials = (profile: Profile) => {
  const label = profile.display_name || profile.username || 'F'
  return label.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

const isUsableImageUrl = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const extractUrl = (value: unknown): string | null => {
  if (isUsableImageUrl(value)) return value.trim()
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return [record.url, record.publicUrl, record.public_url, record.path].find(isUsableImageUrl) || null
  }
  return null
}

const getPostMediaUrls = (post: FeedPost): string[] => {
  const candidate = post as FeedPost & Record<string, unknown>
  const values: unknown[] = []

  if (Array.isArray(candidate.media_urls)) values.push(...candidate.media_urls)
  values.push(candidate.image_url, candidate.image)
  if (candidate.media_type !== 'video') values.push(candidate.media_url)

  const attachmentSource = candidate.attachments ?? candidate.media
  if (Array.isArray(attachmentSource)) values.push(...attachmentSource)
  else if (attachmentSource) values.push(attachmentSource)

  return [...new Set(values.map(extractUrl).filter((url): url is string => Boolean(url)))]
}

export default function FeedCard({ post, isFollowing, isLiked, commentCount, onFollow, onLike, onComment, onShare, isLikePending = false, isFollowPending = false }: FeedCardProps) {
  const profile = getProfile(post.profiles, post.user_id)
  const authorName = profile.display_name || profile.username || 'Fleex member'
  const likesCount = Math.max(0, post.likes_count ?? 0)
  const sharesCount = Math.max(0, post.shares_count ?? 0)
  const mediaUrls = getPostMediaUrls(post)
  const mediaUrl = post.media_url || mediaUrls[0] || null
  const mediaType = post.media_type || (mediaUrl ? 'image' : null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoMuted, setVideoMuted] = useState(true)
  const [textExpanded, setTextExpanded] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    if (mediaType !== 'video' || !mediaUrl || !videoRef.current) return
    const video = videoRef.current
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => undefined)
      else video.pause()
    }, { threshold: 0.3 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [mediaType, mediaUrl])

  const hasLongText = Boolean(post.content && post.content.trim().length > 180)

  return (
    <>
    <article className="relative isolate box-border mx-0 mb-4 block w-full max-w-none overflow-hidden rounded-none border-y border-[#deded9] bg-[#fbfaf6] text-[#14181c] shadow-[0_14px_35px_rgba(31,35,38,0.08)]">
      <div className="px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-7">
        <div className="flex items-start gap-4">
          <Avatar profile={profile} />
          <div className="min-w-0 flex-1 pt-0.5"><div className="truncate text-[1.06rem] font-semibold leading-tight tracking-[-0.02em]">{authorName}</div><div className="mt-1 flex items-center gap-2 text-[0.98rem] text-[#7d8387]"><span>{formatRelativeTime(post.created_at)}</span><span aria-hidden="true">•</span><Users className="h-5 w-5" aria-hidden="true" /><span>Friends</span></div></div>
          {!isFollowing && profile.id !== '' && <button type="button" onClick={onFollow} disabled={isFollowPending} className="mr-1 mt-1 hidden rounded-full px-3 py-1.5 text-sm font-semibold text-[#8aae00] transition-colors hover:bg-[#efffc8] disabled:opacity-50 sm:block">{isFollowPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Follow'}</button>}
          <button type="button" aria-label="More post options" className="rounded-full p-1.5 text-[#7d8387] transition-colors hover:bg-[#efefea]"><MoreHorizontal className="h-6 w-6" aria-hidden="true" /></button>
        </div>

        {post.content && <div className="mt-6"><p className={`whitespace-pre-wrap text-[clamp(1.15rem,3.2vw,1.65rem)] font-normal leading-[1.22] tracking-[-0.025em] ${!textExpanded ? 'line-clamp-2' : ''}`}>{post.content}</p>{hasLongText && <button type="button" onClick={() => setTextExpanded((expanded) => !expanded)} className="mt-2 text-sm font-bold text-[#779f00] hover:text-[#5f7e00]">{textExpanded ? 'Less' : 'More'}</button>}</div>}
      </div>

      {mediaType === 'image' && mediaUrls.length > 0 && <MediaGallery urls={mediaUrls} activeImage={activeImage} setActiveImage={setActiveImage} onOpen={() => setLightboxOpen(true)} />}
      {mediaType === 'video' && mediaUrl && <div className="relative mx-0 overflow-hidden rounded-none bg-[#1f2326]"><video ref={videoRef} src={mediaUrl} className="max-h-[600px] min-h-[280px] w-full object-contain" autoPlay muted={videoMuted} loop playsInline /><button type="button" onClick={() => setVideoMuted((muted) => !muted)} className="absolute bottom-3 right-3 rounded-full bg-[#1f2326] px-3 py-1.5 text-xs font-semibold text-white">{videoMuted ? 'Unmute' : 'Mute'}</button></div>}

      <div className="px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6"><div className="flex items-center gap-2 text-[0.98rem] text-[#7d8387]"><span>{formatCount(likesCount)} appreciates</span><span aria-hidden="true">•</span><span>{formatCount(commentCount)} comments</span><span aria-hidden="true">•</span><span>{formatCount(sharesCount)} shares</span></div><div className="mt-5 flex min-w-0 items-center border-t border-[#d9d9d4] pt-4"><ActionButton active={isLiked} disabled={isLikePending} label={isLiked ? 'Remove appreciation' : 'Appreciate this post'} onClick={onLike}>{isLikePending ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> : <Heart className="h-6 w-6" fill={isLiked ? 'currentColor' : 'none'} aria-hidden="true" />}<span className="min-w-0 truncate">Appreciate</span></ActionButton><ActionButton label="Comment on this post" onClick={onComment}><MessageCircle className="h-6 w-6" aria-hidden="true" /><span className="min-w-0 truncate">Comment</span></ActionButton><ActionButton label="Share this post" onClick={onShare}><Share2 className="h-6 w-6" aria-hidden="true" /><span className="min-w-0 truncate">Share</span></ActionButton><button type="button" aria-label="Save post" className="ml-1 shrink-0 rounded-xl p-2.5 text-[#14181c] transition-colors hover:bg-[#efefea]"><Bookmark className="h-6 w-6" aria-hidden="true" /></button></div></div>
    </article>
    {lightboxOpen && mediaUrls.length > 0 && (
      <ImageLightbox
        urls={mediaUrls}
        activeImage={activeImage}
        setActiveImage={setActiveImage}
        onClose={() => setLightboxOpen(false)}
      />
    )}
    </>
  )
}

function MediaGallery({ urls, activeImage, setActiveImage, onOpen }: { urls: string[]; activeImage: number; setActiveImage: (index: number) => void; onOpen: () => void }) {
  const visibleUrls = urls.slice(0, 4)
  const remainingCount = urls.length - visibleUrls.length

  if (urls.length === 1) return <button type="button" onClick={onOpen} className="relative block w-full overflow-hidden rounded-none" aria-label="View image"><img src={urls[0]} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" /></button>

  return <div className="relative mx-0 overflow-hidden rounded-none"><div className={`grid gap-1 bg-[#eef0ec] ${visibleUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>{visibleUrls.map((url, index) => <button type="button" key={`${url}-${index}`} onClick={() => { setActiveImage(index); onOpen() }} className={`relative min-h-[150px] overflow-hidden ${visibleUrls.length === 3 && index === 0 ? 'row-span-2' : ''}`} aria-label={`View image ${index + 1} of ${urls.length}`}><img src={url} alt="" className="h-full min-h-[150px] w-full object-cover transition-transform hover:scale-[1.02]" loading="lazy" />{index === visibleUrls.length - 1 && remainingCount > 0 && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xl font-bold text-white">+{remainingCount}</span>}</button>)}</div>{urls.length > 1 && <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/45 px-2 py-1">{urls.map((url, index) => <button type="button" key={`${url}-dot`} onClick={() => setActiveImage(index)} aria-label={`Select image ${index + 1}`} className={`h-1.5 w-1.5 rounded-full ${activeImage === index ? 'bg-[#b7f23a]' : 'bg-white/60'}`} />)}</div>}{activeImage > 0 && <button type="button" onClick={() => setActiveImage(activeImage - 1)} className="absolute left-3 top-1/2 rounded-full bg-black/45 p-2 text-white" aria-label="Previous image"><ChevronLeft className="h-5 w-5" /></button>}{activeImage < urls.length - 1 && <button type="button" onClick={() => setActiveImage(activeImage + 1)} className="absolute right-3 top-1/2 rounded-full bg-black/45 p-2 text-white" aria-label="Next image"><ChevronRight className="h-5 w-5" /></button>}</div>
}

function ImageLightbox({ urls, activeImage, setActiveImage, onClose }: { urls: string[]; activeImage: number; setActiveImage: (index: number) => void; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') setActiveImage(Math.max(0, activeImage - 1))
      if (event.key === 'ArrowRight') setActiveImage(Math.min(urls.length - 1, activeImage + 1))
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [activeImage, onClose, setActiveImage, urls.length])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={onClose}>
      <button type="button" onClick={onClose} aria-label="Close image viewer" className="absolute right-4 top-4 z-10 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">Close</button>
      <img src={urls[activeImage]} alt="" className="max-h-[88dvh] max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
      {activeImage > 0 && <button type="button" onClick={(event) => { event.stopPropagation(); setActiveImage(activeImage - 1) }} aria-label="Previous image" className="absolute left-4 rounded-full bg-white/15 px-4 py-3 text-2xl text-white hover:bg-white/25">‹</button>}
      {activeImage < urls.length - 1 && <button type="button" onClick={(event) => { event.stopPropagation(); setActiveImage(activeImage + 1) }} aria-label="Next image" className="absolute right-4 rounded-full bg-white/15 px-4 py-3 text-2xl text-white hover:bg-white/25">›</button>}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">{activeImage + 1} / {urls.length}</div>
    </div>
  )
}

function Avatar({ profile }: { profile: Profile }) { return profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1f2326] text-sm font-semibold text-[#b7f23a]" aria-hidden="true">{getInitials(profile)}</div> }

function ActionButton({ active = false, disabled = false, label, onClick, children }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; children: ReactNode }) { return <button type="button" aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick} className={`inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden border-r border-[#d9d9d4] px-1 text-[0.95rem] font-semibold transition-colors last:border-r-0 disabled:opacity-50 ${active ? 'text-[#9ac500]' : 'text-[#14181c] hover:bg-[#efefea]'}`}>{children}</button> }
