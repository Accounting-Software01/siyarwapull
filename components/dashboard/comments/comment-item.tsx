'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, CornerDownRight, Heart, Trash2 } from 'lucide-react'
import AvatarCircle from '@/components/dashboard/shared/avatar-circle'
import { timeAgo } from '@/lib/dashboard/helpers'
import type { Comment } from '@/lib/dashboard/types'

type CommentWithReplies = Comment & {
  parent_id?: string | null
  replies?: CommentWithReplies[]
  likes_count?: number
  liked_by_user?: boolean
}

type CommentItemProps = {
  comment: CommentWithReplies
  depth?: number
  currentUserId?: string
  onLike: (id: string) => void
  onReply: (id: string, username: string) => void
  onDelete: (id: string) => void
}

export default function CommentItem({ comment, depth = 0, currentUserId, onLike, onReply, onDelete }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(depth < 1)
  const replies = comment.replies ?? []
  const visualDepth = Math.min(Math.max(depth, 0), 1)
  const isOwnComment = Boolean(currentUserId && comment.user_id === currentUserId)
  const username = comment.profiles?.username || 'user'
  const displayName = comment.profiles?.display_name || 'User'
  const likeCount = Math.max(0, Number(comment.likes_count) || 0)

  return (
    <div className={visualDepth > 0 ? 'ml-8 mt-2' : 'mt-3'}>
      <div className="flex min-w-0 gap-2.5">
        <AvatarCircle src={comment.profiles?.avatar_url} name={displayName} size={visualDepth > 0 ? 26 : 32} />
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-[#fbfaf6] px-3 py-2">
            <div className="mb-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="max-w-full truncate text-xs font-extrabold text-[#14181c]">{displayName}</span>
              <span className="shrink-0 text-[10px] text-[#7d8387]">@{username} · {timeAgo(comment.created_at)}</span>
            </div>
            <p className="break-words whitespace-pre-wrap text-xs leading-relaxed text-[#535a5e]">{comment.content}</p>
          </div>

          <div className="ml-2 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button type="button" onClick={() => onLike(comment.id)} aria-label={comment.liked_by_user ? 'Unlike comment' : 'Like comment'} aria-pressed={Boolean(comment.liked_by_user)} className={`inline-flex items-center gap-1 text-[11px] font-bold transition ${comment.liked_by_user ? 'text-[#8aae00]' : 'text-[#a0a4a6] hover:text-[#14181c]'}`}>
              <Heart className={`h-3 w-3 ${comment.liked_by_user ? 'fill-current' : ''}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            <button type="button" onClick={() => onReply(comment.id, username)} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#a0a4a6] transition hover:text-[#14181c]"><CornerDownRight className="h-3 w-3" />Reply</button>
            {isOwnComment && <button type="button" onClick={() => onDelete(comment.id)} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#a0a4a6] transition hover:text-red-600"><Trash2 className="h-3 w-3" />Delete</button>}
            {replies.length > 0 && <button type="button" onClick={() => setShowReplies((visible) => !visible)} aria-expanded={showReplies} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#a0a4a6] transition hover:text-[#14181c]">{showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}{showReplies ? 'Hide' : `${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}`}</button>}
          </div>

          {showReplies && replies.length > 0 && <div aria-label={`Replies to ${displayName}`}>{replies.map((reply) => <CommentItem key={reply.id} comment={reply} depth={depth + 1} currentUserId={currentUserId} onLike={onLike} onReply={onReply} onDelete={onDelete} />)}</div>}
        </div>
      </div>
    </div>
  )
}
