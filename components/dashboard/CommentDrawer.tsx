'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Heart, Loader2, Send, Smile, X } from 'lucide-react'
import { timeAgo } from '@/lib/dashboard/helpers'

type Comment = {
  id: string
  content: string
  user_id: string
  likes_count: number
  created_at: string
  profiles?: {
    id: string
    username: string
    display_name: string
    avatar_url: string
  } | null
}

type CommentDrawerProps = {
  isOpen: boolean
  onClose: () => void
  postId: string
  postType: 'news' | 'feed'
  currentUserId: string
  onCommentAdded?: () => void
}

export default function CommentDrawer({
  isOpen,
  onClose,
  postId,
  postType,
  currentUserId,
  onCommentAdded,
}: CommentDrawerProps) {
  const supabase = useMemo(() => createClient(), [])
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const difference = window.innerHeight - viewportHeight
      setKeyboardHeight(difference > 150 ? difference : 0)
    }

    window.visualViewport?.addEventListener('resize', handleResize)
    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !postId) return

    let cancelled = false

    const loadComments = async () => {
      setLoading(true)
      setErrorMessage(null)

      try {
        const table = postType === 'news' ? 'news_comments' : 'post_comments'
        const foreignKey = postType === 'news' ? 'article_id' : 'post_id'
        const { data, error } = await supabase
          .from(table)
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq(foreignKey, postId)
          .order('created_at', { ascending: true })

        if (error) throw error
        if (cancelled) return

        const nextComments = (data ?? []) as Comment[]
        setComments(nextComments)

        if (currentUserId && nextComments.length > 0) {
          const likeTable = postType === 'news' ? 'news_comment_likes' : 'comment_likes'
          const { data: likedData, error: likesError } = await supabase
            .from(likeTable)
            .select('comment_id')
            .eq('user_id', currentUserId)
            .in('comment_id', nextComments.map((comment) => comment.id))

          if (likesError) throw likesError
          setLikedComments(new Set((likedData ?? []).map((like) => like.comment_id)))
        } else {
          setLikedComments(new Set())
        }

        window.setTimeout(() => inputRef.current?.focus(), 250)
      } catch (error) {
        console.error('Error loading comments:', error)
        if (!cancelled) setErrorMessage('Comments could not be loaded.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadComments()
    return () => {
      cancelled = true
    }
  }, [currentUserId, isOpen, postId, postType, supabase])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments, isOpen])

  useEffect(() => {
    if (!currentUserId) return

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, display_name, username')
        .eq('id', currentUserId)
        .single()

      if (!error) setCurrentUserProfile(data as Profile)
    }

    void loadProfile()
  }, [currentUserId, supabase])

  const handleCommentLike = async (commentId: string) => {
    if (!currentUserId) return

    const isLiked = likedComments.has(commentId)
    const likeTable = postType === 'news' ? 'news_comment_likes' : 'comment_likes'
    const previousComments = comments

    setLikedComments((previous) => {
      const next = new Set(previous)
      isLiked ? next.delete(commentId) : next.add(commentId)
      return next
    })
    setComments((previous) =>
      previous.map((comment) =>
        comment.id === commentId
          ? { ...comment, likes_count: Math.max(0, (comment.likes_count || 0) + (isLiked ? -1 : 1)) }
          : comment,
      ),
    )

    const result = isLiked
      ? await supabase.from(likeTable).delete().eq('comment_id', commentId).eq('user_id', currentUserId)
      : await supabase.from(likeTable).insert({ comment_id: commentId, user_id: currentUserId })

    if (result.error) {
      setComments(previousComments)
      setLikedComments((previous) => {
        const next = new Set(previous)
        isLiked ? next.add(commentId) : next.delete(commentId)
        return next
      })
    }
  }

  const handleSubmitComment = async () => {
    const content = commentText.trim()
    if (!content || !postId || !currentUserId || submitting) return

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const table = postType === 'news' ? 'news_comments' : 'post_comments'
      const foreignKey = postType === 'news' ? 'article_id' : 'post_id'
      const { data, error } = await supabase
        .from(table)
        .insert({ [foreignKey]: postId, user_id: currentUserId, content })
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      if (!data) return

      setComments((previous) => [...previous, data as Comment])
      setCommentText('')
      onCommentAdded?.()
      window.setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (error) {
      console.error('Error posting comment:', error)
      setErrorMessage('Your comment could not be posted. Please try again.')
    } finally {
      setSubmitting(false)
      window.setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSubmitComment()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden="true" />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Comments"
        className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl"
        style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex shrink-0 justify-center pb-2 pt-3">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2">
          <h3 className="font-semibold text-gray-900">Comments ({comments.length})</h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-gray-100" aria-label="Close comments">
            <X className="h-5 w-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto p-4">
          {errorMessage && <p className="text-center text-sm text-red-600" role="alert">{errorMessage}</p>}
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#8aae00]" /></div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <MessageCircleIcon className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p className="text-sm font-medium">No comments yet</p>
              <p className="mt-1 text-xs">Be the first to comment.</p>
            </div>
          ) : (
            comments.map((comment) => <CommentRow key={comment.id} comment={comment} isLiked={likedComments.has(comment.id)} onLike={() => void handleCommentLike(comment.id)} />)
          )}
          <div ref={commentsEndRef} />
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white p-3">
          <div className="flex items-center gap-2">
            <ProfileAvatar profile={currentUserProfile} size={32} />
            <div className="flex min-w-0 flex-1 items-center rounded-full bg-gray-100 px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#b7f23a]">
              <input
                ref={inputRef}
                type="text"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a comment..."
                className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none"
                disabled={!currentUserId || submitting}
              />
              <button type="button" aria-label="Add emoji" className="shrink-0 p-1 text-gray-400 hover:text-gray-600">
                <Smile className="h-5 w-5" aria-hidden="true" />
              </button>
              {commentText.trim() && (
                <button type="button" onClick={() => void handleSubmitComment()} disabled={submitting} aria-label="Post comment" className="ml-1 shrink-0 p-1 text-[#8aae00] hover:text-[#6f8d00]">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

type Profile = {
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
}

function ProfileAvatar({ profile, size }: { profile: Profile | null; size: number }) {
  const name = profile?.display_name || profile?.username || 'U'
  if (profile?.avatar_url) {
    return <Image src={profile.avatar_url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" unoptimized />
  }
  return <div className="flex shrink-0 items-center justify-center rounded-full bg-[#1f2326] text-xs font-bold text-[#b7f23a]" style={{ width: size, height: size }}>{name[0]?.toUpperCase() || 'U'}</div>
}

function CommentRow({ comment, isLiked, onLike }: { comment: Comment; isLiked: boolean; onLike: () => void }) {
  const profile = comment.profiles
  return (
    <div className="flex gap-3">
      <Link href={`/profile/${profile?.username || '#'}`}>
        <ProfileAvatar profile={profile || null} size={36} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-gray-100 px-3 py-2">
          <Link href={`/profile/${profile?.username || '#'}`}>
            <p className="text-xs font-semibold text-gray-900 hover:text-[#8aae00]">{profile?.display_name || 'Fleex member'}</p>
          </Link>
          <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{comment.content}</p>
        </div>
        <div className="ml-2 mt-1 flex items-center gap-3">
          <button type="button" onClick={onLike} className={`flex items-center gap-1 text-xs transition ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
            <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} aria-hidden="true" />
            <span>{comment.likes_count || 0}</span>
          </button>
          <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

function MessageCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
