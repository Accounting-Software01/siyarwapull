'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  MessageCircle,
  Share2,
} from 'lucide-react'
import Image from 'next/image'

interface ArticleReaderProps {
  article: {
    id: string
    title: string
    description?: string
    url: string
    urlToImage?: string
    source: { name: string; url?: string }
    publishedAt: string
    content?: string
    author?: string
  }
  onClose: () => void
  onNext?: () => void
  onPrevious?: () => void
  hasNext?: boolean
  hasPrevious?: boolean
  isLiked?: boolean
  commentCount?: number
  onLike?: () => void
  onComment?: () => void
}

function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function ArticleReader({
  article,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  isLiked = false,
  commentCount = 0,
  onLike,
  onComment,
}: ArticleReaderProps) {
  const [loading, setLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [fullContent, setFullContent] = useState('')
  const [copied, setCopied] = useState(false)
  const [localLiked, setLocalLiked] = useState(isLiked)
  const [localCommentCount, setLocalCommentCount] = useState(commentCount)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setLocalLiked(isLiked)
  }, [isLiked])

  useEffect(() => {
    setLocalCommentCount(commentCount)
  }, [commentCount])

  useEffect(() => {
    setLoading(true)
    setFullContent('')
    setShowCommentInput(false)
    setCommentText('')
    setImageLoaded(false)
    setImageError(false)

    const fetchFullContent = async () => {
      try {
        const response = await fetch(`/api/article-content?url=${encodeURIComponent(article.url)}`)
        if (response.ok) {
          const data = await response.json()
          const cleaned = stripHtml(data.content || '')
          if (cleaned.length > 200) {
            setFullContent(cleaned)
            return
          }
        }

        if (article.content && article.content.length > 100) {
          const cleaned = stripHtml(article.content)
          if (cleaned.length > 100) {
            setFullContent(cleaned)
            return
          }
        }

        if (article.description) {
          const cleaned = stripHtml(article.description)
          if (cleaned.length > 30) setFullContent(cleaned)
        }
      } catch (error) {
        console.error('Failed to fetch full content:', error)
        setFullContent(article.description ? stripHtml(article.description) : '')
      } finally {
        setLoading(false)
      }
    }

    fetchFullContent()
  }, [article.url, article.content, article.description])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleLike = () => {
    setLocalLiked((liked) => !liked)
    onLike?.()
  }

  const handleComment = () => {
    setShowCommentInput((visible) => !visible)
    onComment?.()
  }

  const submitComment = () => {
    if (!commentText.trim()) return
    setLocalCommentCount((count) => count + 1)
    setCommentText('')
    setShowCommentInput(false)
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, url: article.url })
      } else {
        await navigator.clipboard.writeText(article.url)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.error('Failed to share:', error)
    }
  }

  const formatContent = (content: string) => {
    const clean = content.includes('<') ? stripHtml(content) : content
    const paragraphs = clean.split(/\n\s*\n/).filter((paragraph) => paragraph.trim())

    if (paragraphs.length === 0) {
      return <p>{clean}</p>
    }

    return paragraphs.map((paragraph, index) => (
      <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph.trim()}</p>
    ))
  }

  const readingTime = Math.max(1, Math.ceil((fullContent.split(/\s+/).filter(Boolean).length || 100) / 200))
  const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white text-[#14181c]">
      <header className="sticky top-0 z-20 border-b border-[#e5e5e0] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close article reader"
            className="inline-flex items-center gap-2 rounded-full p-2 text-[#14181c] transition hover:bg-[#efefea] active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden text-sm font-semibold sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-1">
            {hasPrevious && onPrevious && (
              <button type="button" onClick={onPrevious} aria-label="Previous article" className="rounded-full p-2 text-[#7d8387] transition hover:bg-[#efefea]">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {hasNext && onNext && (
              <button type="button" onClick={onNext} aria-label="Next article" className="rounded-full p-2 text-[#7d8387] transition hover:bg-[#efefea]">
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsSaved((saved) => !saved)}
              aria-label={isSaved ? 'Remove saved article' : 'Save article'}
              aria-pressed={isSaved}
              className={`rounded-full p-2 transition ${isSaved ? 'bg-[#efffc8] text-[#8aae00]' : 'text-[#7d8387] hover:bg-[#efefea]'}`}
            >
              <Bookmark className="h-5 w-5" fill={isSaved ? 'currentColor' : 'none'} />
            </button>
            <button type="button" onClick={handleShare} aria-label="Share article" className="rounded-full p-2 text-[#7d8387] transition hover:bg-[#efefea]">
              {copied ? <Check className="h-5 w-5 text-[#8aae00]" /> : <Share2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-7 sm:px-6 sm:pt-10">
        {article.urlToImage && !imageError && (
          <div className="relative mb-8 w-full overflow-hidden rounded-[22px] bg-[#efefea]">
            <div className="relative aspect-[16/9] w-full">
              {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-[#e5e5e0]" />}
              <Image
                src={article.urlToImage}
                alt={article.title}
                fill
                priority
                unoptimized
                className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </div>
          </div>
        )}

        <div className="mb-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8aae00]">{article.source?.name || 'News'}</p>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-normal leading-[1.08] tracking-[-0.055em] text-[#14181c]">
            {article.title}
          </h1>
        </div>

        <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-[#d9d9d4] pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1f2326] text-sm font-semibold text-[#b7f23a]">
              {article.source?.name?.[0]?.toUpperCase() || 'N'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{article.source?.name || 'News Source'}</p>
              <p className="text-xs text-[#7d8387]">
                {publishedDate} <span className="px-1">•</span> {readingTime} min read{article.author ? ` • By ${article.author}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <button type="button" onClick={handleLike} aria-pressed={localLiked} className={`inline-flex items-center gap-1.5 transition ${localLiked ? 'text-[#9ac500]' : 'text-[#7d8387] hover:text-[#14181c]'}`}>
              <Heart className="h-4 w-4" fill={localLiked ? 'currentColor' : 'none'} />
              <span>{localLiked ? 'Appreciated' : 'Appreciate'}</span>
            </button>
            <button type="button" onClick={handleComment} className="inline-flex items-center gap-1.5 text-[#7d8387] transition hover:text-[#14181c]">
              <MessageCircle className="h-4 w-4" />
              <span>{localCommentCount} comments</span>
            </button>
          </div>
        </div>

        {showCommentInput && (
          <div className="mb-8 rounded-2xl border border-[#deded9] bg-[#fbfaf6] p-4">
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              className="w-full resize-none rounded-xl border border-[#d9d9d4] bg-white p-3 text-sm text-[#14181c] outline-none placeholder:text-[#a0a4a6] focus:border-[#1f2326]"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCommentInput(false)} className="rounded-full px-3 py-2 text-sm font-semibold text-[#7d8387] hover:bg-[#efefea]">Cancel</button>
              <button type="button" onClick={submitComment} disabled={!commentText.trim()} className="rounded-full bg-[#1f2326] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Post comment</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-5" aria-label="Loading article">
            {["w-3/4", "w-full", "w-5/6", "w-2/3"].map((width) => <div key={width} className={`h-4 animate-pulse rounded-full bg-[#e5e5e0] ${width}`} />)}
            <div className="mt-6 h-28 animate-pulse rounded-2xl bg-[#fbfaf6]" />
          </div>
        ) : (
          <article className="article-prose">
            {fullContent ? formatContent(fullContent) : (
              <div className="rounded-2xl border border-dashed border-[#d9d9d4] bg-[#fbfaf6] px-5 py-12 text-center">
                <p className="font-semibold text-[#535a5e]">Content could not be extracted.</p>
                <p className="mt-2 text-sm text-[#7d8387]">This site may block previews or require a subscription.</p>
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1f2326] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black">
                  Read on {article.source?.name || 'source'}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </article>
        )}

        {fullContent && (
          <div className="mt-10 border-t border-[#d9d9d4] pt-6 text-center">
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[#8aae00] transition hover:text-[#6f8f00]">
              Read original article on {article.source?.name || 'source'}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        <div className="mt-12 text-center">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#b7f23a]" />
          <p className="text-xs text-[#a0a4a6]">End of article</p>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#d9d9d4] bg-white/95 py-2 shadow-[0_-8px_24px_rgba(31,35,38,0.06)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-around px-4">
          <ReaderAction active={localLiked} label={localLiked ? 'Appreciated' : 'Appreciate'} onClick={handleLike}>
            <Heart className="h-5 w-5" fill={localLiked ? 'currentColor' : 'none'} />
          </ReaderAction>
          <ReaderAction label="Comment" onClick={handleComment}>
            <MessageCircle className="h-5 w-5" />
          </ReaderAction>
          <ReaderAction active={isSaved} label={isSaved ? 'Saved' : 'Save'} onClick={() => setIsSaved((saved) => !saved)}>
            <Bookmark className="h-5 w-5" fill={isSaved ? 'currentColor' : 'none'} />
          </ReaderAction>
          <ReaderAction label={copied ? 'Copied' : 'Share'} onClick={handleShare}>
            {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
          </ReaderAction>
        </div>
      </nav>

      <style jsx global>{`
        .article-prose {
          color: #535a5e;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 1.125rem;
          line-height: 1.8;
        }
        .article-prose p { margin-bottom: 1.5rem; }
        .article-prose h2 {
          color: #14181c;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.2;
          margin: 2rem 0 1rem;
        }
        .article-prose h3 {
          color: #14181c;
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.3;
          margin: 1.5rem 0 0.75rem;
        }
        .article-prose blockquote {
          border-left: 4px solid #b7f23a;
          color: #535a5e;
          font-style: italic;
          margin: 1.5rem 0;
          padding-left: 1rem;
        }
        .article-prose ul, .article-prose ol { margin: 1rem 0; padding-left: 1.5rem; }
        .article-prose li { margin: 0.35rem 0; }
        .article-prose a { color: #8aae00; text-decoration: none; }
        .article-prose a:hover { text-decoration: underline; }
      `}</style>
    </div>
  )
}

function ReaderAction({
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
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={active} className={`flex min-w-16 flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-xs font-semibold transition hover:bg-[#efefea] ${active ? 'text-[#9ac500]' : 'text-[#7d8387]'}`}>
      {children}
      <span>{label}</span>
    </button>
  )
}
