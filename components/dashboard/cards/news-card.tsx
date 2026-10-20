'use client'

import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode, TouchEvent as ReactTouchEvent } from 'react'
import Image from 'next/image'
import {
  Bookmark,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Users,
  X,
} from 'lucide-react'
import { timeAgo } from '@/lib/dashboard/helpers'
import { getArticleImage } from '@/lib/dashboard/image-helper'

interface NewsArticle {
  id: string
  title: string
  description?: string
  url: string
  urlToImage?: string | null
  source?: { name?: string | null } | null
  publishedAt: string
  caption?: string
  media_url?: string | null
  likes_count?: number | null
  shares_count?: number | null
}

type NewsCardProps = {
  article: NewsArticle
  isLiked: boolean
  isSaved: boolean
  commentCount: number
  shareCopied: boolean
  onLike: () => void
  onSave: () => void
  onComment: () => void
  onShare: () => void
  onReadInside: () => void
}

const formatCount = (value: number) => {
  if (value < 1000) return String(value)
  if (value < 1000000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  return `${(value / 1000000).toFixed(1)}m`
}

const getInitials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'N'

export default function NewsCard({
  article,
  isLiked,
  isSaved,
  commentCount,
  shareCopied,
  onLike,
  onSave,
  onComment,
  onShare,
  onReadInside,
}: NewsCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)
  const localCommentCount = commentCount || 0
  const [showLongPressMenu, setShowLongPressMenu] = useState(false)
  const [longPressPosition, setLongPressPosition] = useState({ x: 0, y: 0 })
  const [longPressDownloading, setLongPressDownloading] = useState(false)
  const [longPressCopied, setLongPressCopied] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const title = article.caption || article.title || 'Untitled'
  const sourceName = article.source?.name || 'News Source'
  const originalImage = article.media_url || article.urlToImage
  const likesCount = Math.max(0, article.likes_count ?? 0)
  const sharesCount = Math.max(0, article.shares_count ?? 0)

  const rawSummary = (article.description || '').replace(/\s+/g, ' ').trim()
  const titleKey = title.toLowerCase().slice(0, 30)
  const summary =
    rawSummary.length >= 60 && !rawSummary.toLowerCase().startsWith(titleKey)
      ? rawSummary
      : null


  useEffect(() => {
    let cancelled = false

    const loadImage = async () => {
      setImageLoading(true)
      const url = await getArticleImage(title, originalImage || undefined)
      if (!cancelled) {
        setImageUrl(url)
        setImageLoading(false)
      }
    }

    loadImage()
    return () => {
      cancelled = true
    }
  }, [title, originalImage])

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowImageMenu(false)
        setShowLongPressMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [])


  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const startLongPress = (x: number, y: number) => {
    clearLongPress()
    setLongPressPosition({ x, y })
    longPressTimer.current = setTimeout(() => {
      setShowLongPressMenu(true)
    }, 500)
  }

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    startLongPress(touch.clientX, touch.clientY)
  }

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    startLongPress(event.clientX, event.clientY)
  }

  const handleLongPressDownload = async () => {
    if (!imageUrl || imageUrl.startsWith('data:')) return

    setLongPressDownloading(true)
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `news-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      setShowLongPressMenu(false)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setLongPressDownloading(false)
    }
  }

  const handleCopyImage = async (closeLongPressMenu = false) => {
    if (!imageUrl || imageUrl.startsWith('data:')) return

    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || 'image/jpeg']: blob }),
      ])
      setCopiedImage(true)
      setLongPressCopied(true)
      window.setTimeout(() => {
        setCopiedImage(false)
        setLongPressCopied(false)
      }, 2000)
      setShowImageMenu(false)
      if (closeLongPressMenu) window.setTimeout(() => setShowLongPressMenu(false), 500)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const handleLongPressShare = async () => {
    if (!imageUrl || imageUrl.startsWith('data:')) return

    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], `news-${Date.now()}.jpg`, {
        type: blob.type || 'image/jpeg',
      })

      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: 'Check out this news image',
          files: [file],
        })
      } else {
        await navigator.clipboard.writeText(imageUrl)
        setLongPressCopied(true)
        window.setTimeout(() => setLongPressCopied(false), 2000)
      }
      setShowLongPressMenu(false)
    } catch (error) {
      // Browsers throw AbortError when the user dismisses the share sheet.
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.error('Share failed:', error)
    }
  }

  const handleDownloadImage = () => {
    if (!imageUrl || imageUrl.startsWith('data:')) return
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `news-${Date.now()}.jpg`
    link.click()
    setShowImageMenu(false)
  }


  return (
    <>
      <article className="relative isolate -mx-5 mb-4 block w-[calc(100%+2.5rem)] max-w-none min-w-0 overflow-hidden rounded-[14px] border border-[#deded9] bg-[#fbfaf6] text-[#14181c] shadow-[0_14px_35px_rgba(31,35,38,0.08)] sm:mx-auto sm:w-full sm:max-w-full sm:rounded-[18px]">
        <div className="px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-7">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1f2326] text-sm font-semibold text-[#b7f23a]"
              aria-hidden="true"
            >
              {getInitials(sourceName)}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="truncate text-[1.06rem] font-semibold leading-tight tracking-[-0.02em]">
                {sourceName}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[0.98rem] text-[#7d8387]">
                <span>{timeAgo(article.publishedAt)} ago</span>
                <span aria-hidden="true">•</span>
                <Users className="h-5 w-5" aria-hidden="true" />
                <span>News</span>
              </div>
            </div>

            <button
              type="button"
              aria-label="More news options"
              className="rounded-full p-1.5 text-[#7d8387] transition-colors hover:bg-[#efefea]"
            >
              <MoreHorizontal className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <button type="button" onClick={onReadInside} className="mt-8 block w-full text-left">
            <h2 className="text-[clamp(1.7rem,4.3vw,2.55rem)] font-normal leading-[1.12] tracking-[-0.045em]">
              {title}
            </h2>
          </button>

          {summary && (
            <p className="mt-4 text-base leading-relaxed text-[#535a5e]">{summary}</p>
          )}
        </div>

        <div
          
          className="relative w-full overflow-hidden bg-[#efefea]"
            
          onTouchStart={handleTouchStart}
          onTouchEnd={clearLongPress}
          onTouchCancel={clearLongPress}
          onMouseDown={handleMouseDown}
          onMouseUp={clearLongPress}
          onMouseLeave={clearLongPress}
          onContextMenu={(event) => {
            event.preventDefault()
            setLongPressPosition({ x: event.clientX, y: event.clientY })
            setShowLongPressMenu(true)
          }}
        >
          <div className="relative aspect-[4/3] w-full">
            {imageLoading ? (
              <div className="absolute inset-0 animate-pulse bg-[#e5e5df]" aria-label="Loading image" />
            ) : imageUrl ? (
              imageUrl.startsWith('data:') ? (
                <img
                  src={imageUrl}
                  alt={title}
                  className="h-full w-full cursor-pointer object-cover"
                  onClick={onReadInside}
                />
              ) : (
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  unoptimized
                  priority={false}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 672px"
                  className="cursor-pointer object-cover"
                  onClick={onReadInside}
                />
              )
            ) : (
              <button
                type="button"
                className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#efefea] to-[#deded9] text-[#7d8387]"
                onClick={onReadInside}
              >
                <span className="text-4xl" aria-hidden="true">News</span>
                <span className="mt-2 text-sm">Image unavailable</span>
              </button>
            )}

            {imageUrl && !imageLoading && (
              <div className="absolute right-3 top-3" ref={menuRef}>
                <button
                  type="button"
                  aria-label="Image options"
                  onClick={(event) => {
                    event.stopPropagation()
                    setShowImageMenu((visible) => !visible)
                  }}
                  className="rounded-full bg-[#1f2326]/85 p-2 text-white transition-colors hover:bg-[#1f2326]"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>

                {showImageMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-[#deded9] bg-[#fbfaf6] shadow-lg">
                    <button
                      type="button"
                      onClick={() => handleCopyImage()}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#14181c] transition hover:bg-[#efefea]"
                    >
                      {copiedImage ? <Check className="h-3.5 w-3.5 text-[#9ac500]" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedImage ? 'Copied!' : 'Copy image'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#14181c] transition hover:bg-[#efefea]"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Save image
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="pointer-events-none absolute bottom-5 left-5 text-[0.65rem] font-medium uppercase tracking-[0.28em] text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
              <span className="mb-3 block h-0.5 w-8 bg-white" />
              Read
              <br />
              inside
            </div>

            <button
              type="button"
              onClick={onReadInside}
              className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-[#fbfaf6] px-4 py-2 text-sm font-semibold text-[#14181c] shadow-lg">
                <Eye className="h-4 w-4" aria-hidden="true" />
                Read inside
              </span>
            </button>
          </div>
        </div>

        <div className="px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
          <div className="flex items-center gap-2 text-[0.98rem] text-[#7d8387]">
            <span>{formatCount(likesCount)} appreciates</span>
            <span aria-hidden="true">•</span>
            <span>{formatCount(localCommentCount)} comments</span>
            <span aria-hidden="true">•</span>
            <span>{formatCount(sharesCount)} shares</span>
          </div>

          <div className="mt-5 flex min-w-0 items-center border-t border-[#d9d9d4] pt-4">
            <ActionButton
              active={isLiked}
              label={isLiked ? 'Remove appreciation' : 'Appreciate this news'}
              onClick={onLike}
            >
              <Heart className="h-6 w-6" fill={isLiked ? 'currentColor' : 'none'} aria-hidden="true" />
              <span className="min-w-0 truncate">Appreciate</span>
            </ActionButton>

            <ActionButton label="Comment on this news" onClick={onComment}>
              <MessageCircle className="h-6 w-6" aria-hidden="true" />
              <span className="min-w-0 truncate">Comment</span>
            </ActionButton>

            <ActionButton label="Share this news" onClick={onShare}>
              {shareCopied ? <Check className="h-6 w-6" aria-hidden="true" /> : <Share2 className="h-6 w-6" aria-hidden="true" />}
              <span className="min-w-0 truncate">{shareCopied ? 'Copied' : 'Share'}</span>
            </ActionButton>

            <ActionButton active={isSaved} label={isSaved ? 'Remove saved article' : 'Save this article'} onClick={onSave}>
              <Bookmark className="h-6 w-6" fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
              <span className="min-w-0 truncate">{isSaved ? 'Saved' : 'Save'}</span>
            </ActionButton>

            <button
              type="button"
              aria-label="Read this news inside the app"
              onClick={onReadInside}
              className="ml-1 shrink-0 rounded-xl p-2.5 text-[#14181c] transition-colors hover:bg-[#efefea]"
            >
              <ExternalLink className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>

      {showLongPressMenu && imageUrl && !imageUrl.startsWith('data:') && (
        <div
          ref={menuRef}
          className="fixed z-50 overflow-hidden rounded-xl border border-[#deded9] bg-[#fbfaf6] shadow-2xl"
          style={{
            top: Math.min(longPressPosition.y, window.innerHeight - 200),
            left: Math.min(longPressPosition.x, window.innerWidth - 180),
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="py-1">
            <ContextButton onClick={handleLongPressDownload} disabled={longPressDownloading}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {longPressDownloading ? 'Downloading...' : 'Save image'}
            </ContextButton>
            <ContextButton onClick={() => handleCopyImage(true)}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              {longPressCopied ? 'Copied!' : 'Copy image'}
            </ContextButton>
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <ContextButton onClick={handleLongPressShare}>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Share
              </ContextButton>
            )}
            <div className="my-1 border-t border-[#deded9]" />
            <ContextButton onClick={() => setShowLongPressMenu(false)} muted>
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel
            </ContextButton>
          </div>
        </div>
      )}

    </>
  )
}

function ActionButton({
  active = false,
  label,
  onClick,
  children,
}: {
  active?: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden border-r border-[#d9d9d4] px-1 text-[0.95rem] font-semibold transition-colors last:border-r-0 ${
        active ? 'text-[#9ac500]' : 'text-[#14181c] hover:bg-[#efefea]'
      }`}
    >
      {children}
    </button>
  )
}

function ContextButton({
  children,
  onClick,
  disabled = false,
  muted = false,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  muted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-w-[160px] w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[#efefea] disabled:opacity-50 ${
        muted ? 'text-[#7d8387]' : 'text-[#14181c]'
      }`}
    >
      {children}
    </button>
  )
}
