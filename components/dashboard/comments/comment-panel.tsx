'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Loader2, MessageCircle, Send, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AvatarCircle from '@/components/dashboard/shared/avatar-circle'
import CommentItem from '@/components/dashboard/comments/comment-item'
import type { Comment } from '@/lib/dashboard/types'
import { useAuthGate } from '@/contexts/AuthGateContext'

type CommentPanelProps = {
  articleId?: string
  forgeId?: string
  feedId?: string
  currentUser: any
  onClose: () => void
}

type CommentRow = Comment & {
  parent_id?: string | null
  replies?: CommentRow[]
  likes_count?: number
  liked_by_user?: boolean
}

type Target = {
  table: 'news_comments' | 'forge_comments' | 'post_comments'
  idColumn: 'article_id' | 'forge_id' | 'post_id'
  idValue: string
  likeTable: 'news_comment_likes' | 'forge_comment_likes' | 'comment_likes'
}

export default function CommentPanel({ articleId, forgeId, feedId, currentUser, onClose }: CommentPanelProps) {
  const supabase = useMemo(() => createClient(), [])
  const { requireAuth } = useAuthGate()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const requestId = useRef(0)

  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const target = useMemo<Target | null>(() => {
    if (articleId && !forgeId && !feedId) return { table: 'news_comments', idColumn: 'article_id', idValue: articleId, likeTable: 'news_comment_likes' }
    if (forgeId && !articleId && !feedId) return { table: 'forge_comments', idColumn: 'forge_id', idValue: forgeId, likeTable: 'forge_comment_likes' }
    if (feedId && !articleId && !forgeId) return { table: 'post_comments', idColumn: 'post_id', idValue: feedId, likeTable: 'comment_likes' }
    return null
  }, [articleId, feedId, forgeId])

  const loadComments = useCallback(async () => {
    if (!target) {
      setComments([])
      setLoading(false)
      setLoadError(articleId && forgeId ? 'Choose one comment target.' : 'No comment target was provided.')
      return
    }

    const currentRequest = ++requestId.current
    setLoading(true)
    setLoadError(null)

    try {
      // This is intentionally the same query shape as the working drawer.
      const { data, error } = await supabase
        .from(target.table)
        .select(`*, profiles:user_id (id, username, display_name, avatar_url)`)
        .eq(target.idColumn, target.idValue)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (currentRequest !== requestId.current) return

      const rows = (data ?? []) as CommentRow[]
      const ids = rows.map((comment) => comment.id).filter(Boolean)
      const likeCounts: Record<string, number> = {}
      const likedIds = new Set<string>()

      if (ids.length) {
        const { data: likes, error: likesError } = await supabase
          .from(target.likeTable)
          .select('comment_id, user_id')
          .in('comment_id', ids)

        // Likes are supplementary; never hide working comments because of a
        // missing like-table policy or an unavailable like table.
        if (likesError) {
          console.warn('[Comments] Could not load comment likes:', likesError.message)
        } else {
          for (const like of likes ?? []) {
            likeCounts[like.comment_id] = (likeCounts[like.comment_id] ?? 0) + 1
            if (like.user_id === currentUser?.id) likedIds.add(like.comment_id)
          }
        }
      }

      const byId = new Map<string, CommentRow>()
      for (const row of rows) {
        byId.set(row.id, {
          ...row,
          content: row.content ?? '',
          replies: [],
          likes_count: ids.length ? (likeCounts[row.id] ?? (Number(row.likes_count) || 0)) : (Number(row.likes_count) || 0),
          liked_by_user: likedIds.has(row.id),
        })
      }

      const roots: CommentRow[] = []
      for (const comment of byId.values()) {
        const parent = comment.parent_id ? byId.get(comment.parent_id) : undefined
        if (parent) parent.replies!.push(comment)
        else roots.push(comment)
      }

      setComments(roots)
      window.setTimeout(() => inputRef.current?.focus(), 150)
    } catch (error) {
      if (currentRequest === requestId.current) {
        console.error('[Comments] Error loading comments:', error)
        setComments([])
        setLoadError('Comments could not be loaded.')
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [articleId, currentUser?.id, supabase, target])

  useEffect(() => { void loadComments() }, [loadComments])

  useEffect(() => {
    if (!target) return
    const channel = supabase
      .channel(`comments-${target.table}-${target.idValue}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: target.table, filter: `${target.idColumn}=eq.${target.idValue}` }, () => void loadComments())
      .on('postgres_changes', { event: '*', schema: 'public', table: target.likeTable }, () => void loadComments())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loadComments, supabase, target])

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
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  useEffect(() => {
    const element = inputRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`
  }, [text])

  const handleLike = async (commentId: string) => {
    if (!requireAuth(currentUser, 'like this comment') || !target) return
    const targetComment = findComment(comments, commentId)
    if (!targetComment) return

    const wasLiked = Boolean(targetComment.liked_by_user)
    const snapshot = comments
    setComments((previous) => applyLikeLocally(previous, commentId, wasLiked))
    setActionError(null)

    try {
      const result = wasLiked
        ? await supabase.from(target.likeTable).delete().eq('comment_id', commentId).eq('user_id', currentUser.id)
        : await supabase.from(target.likeTable).insert({ comment_id: commentId, user_id: currentUser.id })
      if (result.error) throw result.error
    } catch (error) {
      console.error('[Comments] Error updating comment like:', error)
      setComments(snapshot)
      setActionError('Could not update like. Please try again.')
    }
  }

  const handleReply = (id: string, username: string) => {
    if (!requireAuth(currentUser, 'reply to a comment')) return
    setReplyTo({ id, username })
    setText(`@${username} `)
    window.setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleDelete = async (commentId: string) => {
    if (!requireAuth(currentUser, 'delete this comment') || !target) return
    const snapshot = comments
    setComments((previous) => removeCommentLocally(previous, commentId))
    try {
      const { error } = await supabase.from(target.table).delete().eq('id', commentId).eq('user_id', currentUser.id)
      if (error) throw error
    } catch (error) {
      console.error('[Comments] Error deleting comment:', error)
      setComments(snapshot)
      setActionError('Could not delete that comment. Please try again.')
    }
  }

  const submit = async () => {
    const content = text.trim()
    if (!content || submitting || !target || !currentUser?.id) return
    if (!requireAuth(currentUser, replyTo ? 'reply to a comment' : 'comment')) return

    setSubmitting(true)
    setActionError(null)

    try {
      const payload: Record<string, unknown> = {
        [target.idColumn]: target.idValue,
        user_id: currentUser.id,
        content,
      }
      // Normal comments use exactly the working drawer payload. Only replies
      // add the new optional field after the SQL migration is applied.
      if (replyTo?.id) payload.parent_id = replyTo.id

      const { data, error } = await supabase
        .from(target.table)
        .insert(payload)
        .select(`*, profiles:user_id (id, username, display_name, avatar_url)`)
        .single()

      if (error) throw error
      if (!data) throw new Error('The comment was not returned after posting.')

      const inserted = { ...(data as CommentRow), replies: [], likes_count: 0, liked_by_user: false }
      setComments((previous) => {
        if (!inserted.parent_id) return [...previous, inserted]
        return appendReply(previous, inserted.parent_id, inserted)
      })
      setText('')
      setReplyTo(null)
      window.setTimeout(() => inputRef.current?.focus(), 100)
    } catch (error) {
      console.error('[Comments] Error posting comment:', error)
      setActionError('Your comment could not be posted. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalCount = countComments(comments)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <section role="dialog" aria-modal="true" aria-label="Comments" className="relative flex max-h-[85svh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl" style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 'env(safe-area-inset-bottom, 0px)' }} onClick={(event) => event.stopPropagation()}>
        <div className="flex shrink-0 justify-center pb-2 pt-3 sm:hidden"><div className="h-1.5 w-12 rounded-full bg-[#d9d9d4]" /></div>
        <div className="flex shrink-0 items-center justify-between border-b border-[#e5e5e0] px-4 py-3"><h3 className="text-sm font-extrabold text-[#14181c]">Comments{totalCount > 0 && <span className="ml-1 font-semibold text-[#8aae00]">({totalCount})</span>}</h3><button type="button" onClick={onClose} className="rounded-full bg-[#fbfaf6] p-1.5 text-[#7d8387] hover:bg-[#efefea]" aria-label="Close comments"><X className="h-4 w-4" /></button></div>
        <div className="min-h-[200px] flex-1 space-y-1 overflow-y-auto p-4">
          {loadError && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600" role="alert"><AlertCircle className="mr-1 inline h-3.5 w-3.5" />{loadError}<button type="button" onClick={() => void loadComments()} className="ml-2 font-bold underline">Retry</button></div>}
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#8aae00]" /></div> : !loadError && comments.length === 0 ? <div className="py-8 text-center text-[#7d8387]"><MessageCircle className="mx-auto mb-3 h-10 w-10 opacity-50" /><p className="text-sm font-medium">No comments yet</p><p className="mt-1 text-xs">Be the first to comment.</p></div> : comments.map((comment) => <CommentItem key={comment.id} comment={comment} currentUserId={currentUser?.id} onLike={(id) => void handleLike(id)} onReply={handleReply} onDelete={(id) => void handleDelete(id)} />)}
        </div>
        <div className="shrink-0 border-t border-[#e5e5e0] bg-white p-3">
          {actionError && <p className="mb-2 px-1 text-[11px] font-semibold text-red-600" role="alert">{actionError}</p>}
          {replyTo && <div className="mb-2 flex items-center justify-between rounded-xl bg-[#efffc8] px-3 py-1.5"><span className="text-xs font-semibold text-[#14181c]">Replying to @{replyTo.username}</span><button type="button" aria-label="Cancel reply" onClick={() => { setReplyTo(null); setText('') }}><X className="h-3 w-3 text-[#8aae00]" /></button></div>}
          <div className="flex items-end gap-2"><AvatarCircle src={currentUser?.user_metadata?.avatar_url} name={currentUser?.email} size={32} /><div className="relative min-w-0 flex-1"><textarea ref={inputRef} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit() } }} placeholder={replyTo ? 'Write a reply...' : 'Write a comment...'} rows={1} disabled={!currentUser?.id || submitting} className="w-full resize-none rounded-2xl border border-[#d9d9d4] bg-[#fbfaf6] px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-[#b7f23a] focus:ring-2 focus:ring-[#efffc8]" style={{ minHeight: 40, maxHeight: 120 }} /><button type="button" onClick={() => void submit()} disabled={!text.trim() || !currentUser?.id || submitting} aria-label="Post comment" className="absolute bottom-2.5 right-2.5 text-[#14181c] disabled:text-[#d9d9d4]">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div></div>
        </div>
      </section>
    </div>
  )
}

function findComment(list: CommentRow[], id: string): CommentRow | undefined {
  for (const comment of list) {
    if (comment.id === id) return comment
    const nested = findComment(comment.replies ?? [], id)
    if (nested) return nested
  }
  return undefined
}

function applyLikeLocally(list: CommentRow[], id: string, wasLiked: boolean): CommentRow[] {
  return list.map((comment) => ({ ...comment, likes_count: Math.max(0, (comment.likes_count ?? 0) + (comment.id === id ? (wasLiked ? -1 : 1) : 0)), liked_by_user: comment.id === id ? !wasLiked : comment.liked_by_user, replies: applyLikeLocally(comment.replies ?? [], id, wasLiked) }))
}

function removeCommentLocally(list: CommentRow[], id: string): CommentRow[] {
  return list.filter((comment) => comment.id !== id).map((comment) => ({ ...comment, replies: removeCommentLocally(comment.replies ?? [], id) }))
}

function appendReply(list: CommentRow[], parentId: string, reply: CommentRow): CommentRow[] {
  return list.map((comment) => comment.id === parentId ? { ...comment, replies: [...(comment.replies ?? []), reply] } : { ...comment, replies: appendReply(comment.replies ?? [], parentId, reply) })
}

function countComments(list: CommentRow[]): number {
  return list.reduce((total, comment) => total + 1 + countComments(comment.replies ?? []), 0)
}
