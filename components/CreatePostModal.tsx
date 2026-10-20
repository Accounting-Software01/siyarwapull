'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle, Image as ImageIcon, Loader2, MapPin, Send,
  Trash2, Video, X, XCircle, Smile, Heart, ThumbsUp, Frown, Meh,
  Zap, Coffee, PartyPopper,
} from 'lucide-react'

const FEELINGS = [
  { emoji: '😊', label: 'Happy', icon: Smile },
  { emoji: '❤️', label: 'Loving', icon: Heart },
  { emoji: '👍', label: 'Grateful', icon: ThumbsUp },
  { emoji: '😢', label: 'Sad', icon: Frown },
  { emoji: '😐', label: 'Okay', icon: Meh },
  { emoji: '⚡', label: 'Excited', icon: Zap },
  { emoji: '☕', label: 'Chilling', icon: Coffee },
  { emoji: '🎉', label: 'Celebrating', icon: PartyPopper },
]

type PostStatus = 'idle' | 'uploading' | 'success' | 'error'
type MediaItem = { file: File; preview: string }

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated: () => void
  userId: string
}

const MAX_IMAGES = 10
const MAX_FILE_SIZE = 50 * 1024 * 1024

export default function CreatePostModal({ isOpen, onClose, onPostCreated, userId }: CreatePostModalProps) {
  const supabase = createClient()
  const [content, setContent] = useState('')
  const [selectedFeeling, setSelectedFeeling] = useState<typeof FEELINGS[number] | null>(null)
  const [images, setImages] = useState<MediaItem[]>([])
  const [video, setVideo] = useState<MediaItem | null>(null)
  const [postStatus, setPostStatus] = useState<PostStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showFeelingPicker, setShowFeelingPicker] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [content, isOpen])

  useEffect(() => {
    if (!isOpen) resetForm()
    // The modal intentionally resets when it closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const resetForm = () => {
    images.forEach((item) => URL.revokeObjectURL(item.preview))
    if (video) URL.revokeObjectURL(video.preview)
    setContent('')
    setSelectedFeeling(null)
    setImages([])
    setVideo(null)
    setPostStatus('idle')
    setStatusMessage('')
    setUploadProgress(0)
    setShowFeelingPicker(false)
    if (imageInputRef.current) imageInputRef.current.value = ''
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const showError = (message: string) => {
    setStatusMessage(message)
    setPostStatus('error')
    window.setTimeout(() => {
      setPostStatus((current) => current === 'error' ? 'idle' : current)
      setStatusMessage('')
    }, 3000)
  }

  const handleImagesSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    if (video) {
      showError('Remove the video before adding images.')
      return
    }
    if (images.length + files.length > MAX_IMAGES) {
      showError(`You can add up to ${MAX_IMAGES} images per post.`)
      return
    }

    const invalid = files.find((file) => !file.type.startsWith('image/') || file.size > MAX_FILE_SIZE)
    if (invalid) {
      showError(`${invalid.name} must be an image smaller than 50MB.`)
      return
    }
    setImages((current) => [...current, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))])
    event.target.value = ''
  }

  const handleVideoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (images.length) {
      showError('Remove the images before adding a video.')
      return
    }
    if (!file.type.startsWith('video/')) {
      showError('Please choose a valid video file.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      showError('Video files must be smaller than 50MB.')
      return
    }
    if (video) URL.revokeObjectURL(video.preview)
    setVideo({ file, preview: URL.createObjectURL(file) })
    event.target.value = ''
  }

  const removeImage = (index: number) => {
    const item = images[index]
    if (item) URL.revokeObjectURL(item.preview)
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const removeVideo = () => {
    if (video) URL.revokeObjectURL(video.preview)
    setVideo(null)
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const uploadFile = async (file: File, index: number, total: number) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const path = `feeds/${userId}/${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}.${extension}`
    const { error } = await supabase.storage.from('feed-media').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('feed-media').getPublicUrl(path)
    setUploadProgress(25 + Math.round(((index + 1) / total) * 50))
    return data.publicUrl
  }

  const handleSubmit = async () => {
    if (!content.trim() && !images.length && !video) {
      showError('Write something or add media before posting.')
      return
    }
    setPostStatus('uploading')
    setStatusMessage('Preparing your post...')
    setUploadProgress(10)

    try {
      const files = video ? [video.file] : images.map((item) => item.file)
      const urls: string[] = []
      if (files.length) {
        setStatusMessage(`Uploading ${files.length > 1 ? `${files.length} images` : 'media'}...`)
        for (let index = 0; index < files.length; index += 1) urls.push(await uploadFile(files[index], index, files.length))
      }

      setStatusMessage('Creating your post...')
      setUploadProgress(85)
      const finalContent = selectedFeeling
        ? `Feeling ${selectedFeeling.label} ${selectedFeeling.emoji}\n\n${content}`
        : content
      const mediaType = video ? 'video' : urls.length ? 'image' : null
      const { data, error } = await supabase.from('user_feeds').insert({
        user_id: userId,
        content: finalContent.trim(),
        media_url: urls[0] || null,
        media_urls: urls.length ? urls : null,
        media_type: mediaType,
        feeling: selectedFeeling?.label,
        feeling_emoji: selectedFeeling?.emoji,
        created_at: new Date().toISOString(),
      }).select().single()
      if (error) throw new Error(error.message)

      setUploadProgress(100)
      setStatusMessage('Your post is live')
      setPostStatus('success')
      setShowSuccessToast(true)
      window.dispatchEvent(new CustomEvent('postCreated', { detail: { success: true, post: data } }))
      onPostCreated()
      window.setTimeout(() => { setShowSuccessToast(false); onClose() }, 1200)
    } catch (error) {
      console.error('Error creating post:', error)
      showError(error instanceof Error ? error.message : 'Failed to create post')
    }
  }

  if (!isOpen) return null
  const mediaCount = images.length + (video ? 1 : 0)

  return (
    <>
      {showSuccessToast && <div className="fixed left-1/2 top-5 z-[70] -translate-x-1/2"><div className="flex items-center gap-2 rounded-none bg-[#b7f23a] px-4 py-2.5 text-sm font-bold text-[#14181c] shadow-xl"><CheckCircle className="h-4 w-4" /> Post created successfully</div></div>}
      <div className="fixed inset-0 z-50 bg-[#14181c]/45 backdrop-blur-sm" onClick={postStatus === 'uploading' ? undefined : onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100%-24px)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-none border border-[#d7dcd5] bg-white text-[#14181c] shadow-[0_18px_50px_rgba(20,24,28,0.16)]">
        <header className="flex items-center justify-between border-b border-[#e2e5df] bg-white px-5 py-4 ">
          <div><h2 className="text-base font-semibold tracking-[-0.02em]">Create post</h2><p className="mt-1 text-xs text-[#687074]">Share an update with your community</p></div>
          {postStatus !== 'uploading' && <button type="button" onClick={onClose} aria-label="Close" className="rounded-none p-2 text-[#7d8387] hover:bg-[#eef0eb] hover:text-[#14181c]"><X className="h-5 w-5" /></button>}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {postStatus !== 'idle' && <div className={`mb-4 flex items-center gap-3 rounded-none px-4 py-3 text-sm font-semibold ${postStatus === 'uploading' ? 'border-l-4 border-[#b7f23a] bg-[#f6faec] text-[#557500]' : postStatus === 'success' ? 'border-l-4 border-[#4d9b6b] bg-[#f1f8f3] text-[#237041]' : 'border-l-4 border-[#b33b3b] bg-[#fff7f7] text-[#b33b3b]'}`}>{postStatus === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}{postStatus === 'success' && <CheckCircle className="h-4 w-4" />}{postStatus === 'error' && <XCircle className="h-4 w-4" />}{statusMessage}</div>}
          {postStatus === 'uploading' && <div className="mb-5"><div className="h-1.5 overflow-hidden rounded-none bg-[#e1e4de]"><div className="h-full rounded-none bg-[#b7f23a] transition-all" style={{ width: `${uploadProgress}%` }} /></div><p className="mt-1 text-center text-[11px] font-semibold text-[#7d8387]">{uploadProgress < 85 ? 'Uploading media...' : 'Almost done...'}</p></div>}

          <button type="button" onClick={() => setShowFeelingPicker((value) => !value)} disabled={postStatus === 'uploading'} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#7d8387] hover:text-[#557500]">{selectedFeeling ? <><span className="text-xl">{selectedFeeling.emoji}</span> Feeling {selectedFeeling.label}<XCircle className="ml-1 h-4 w-4" onClick={(event) => { event.stopPropagation(); setSelectedFeeling(null) }} /></> : <><Smile className="h-4 w-4" /> How are you feeling?</>}</button>
          {showFeelingPicker && <div className="mb-4 flex flex-wrap gap-2 rounded-none border border-[#e2e5df] bg-white p-3">{FEELINGS.map((feeling) => <button type="button" key={feeling.label} onClick={() => { setSelectedFeeling(feeling); setShowFeelingPicker(false) }} className={`rounded-none px-3 py-2 text-sm font-semibold ${selectedFeeling?.label === feeling.label ? 'border border-[#14181c] bg-white text-[#14181c]' : 'border border-[#dfe3dc] bg-white text-[#687074]'}`}>{feeling.emoji} {feeling.label}</button>)}</div>}

          <textarea ref={textareaRef} value={content} onChange={(event) => setContent(event.target.value.slice(0, 1000))} placeholder="What's on your mind?" rows={4} autoFocus className="min-h-[120px] w-full resize-none rounded-none border-0 bg-transparent text-base outline-none placeholder:text-[#a1a7a8] focus:ring-0" disabled={postStatus === 'uploading'} />

          {mediaCount > 0 && <div className={`mt-4 grid gap-2 ${video ? 'grid-cols-1' : images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>{video ? <div className="relative overflow-hidden rounded-none bg-[#14181c]"><video src={video.preview} controls className="max-h-80 w-full object-contain" /><button type="button" onClick={removeVideo} className="absolute right-2 top-2 rounded-none bg-[#14181c]/90 p-2 text-white"><Trash2 className="h-4 w-4" /></button></div> : images.map((item, index) => <div key={item.preview} className="group relative min-h-[150px] overflow-hidden rounded-none bg-[#eef0ec]"><img src={item.preview} alt={`Selected image ${index + 1}`} className="h-full min-h-[150px] w-full object-cover" /><div className="absolute left-2 top-2 rounded-none bg-[#14181c]/75 px-2 py-1 text-[10px] font-bold text-white">{index + 1}</div><button type="button" onClick={() => removeImage(index)} className="absolute right-2 top-2 rounded-none bg-[#14181c]/90 p-2 text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button></div>)}</div>}
          {images.length > 1 && <p className="mt-2 text-xs font-semibold text-[#7d8387]">{images.length} images selected</p>}
        </div>

        <footer className="border-t border-[#e2e5df] bg-white px-5 py-4">
          <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-1"><button type="button" onClick={() => imageInputRef.current?.click()} disabled={postStatus === 'uploading' || images.length >= MAX_IMAGES || !!video} className="inline-flex items-center gap-2 rounded-none px-3 py-2 text-xs font-bold text-[#557500] transition hover:bg-[#eef8d6] disabled:opacity-40"><ImageIcon className="h-4 w-4" /> Images {images.length ? `(${images.length}/${MAX_IMAGES})` : ''}</button><button type="button" onClick={() => videoInputRef.current?.click()} disabled={postStatus === 'uploading' || images.length > 0 || !!video} className="inline-flex items-center gap-2 rounded-none px-3 py-2 text-xs font-bold text-[#687074] transition hover:bg-[#f1f3ee] disabled:opacity-40"><Video className="h-4 w-4" /> Video</button><button type="button" disabled className="hidden rounded-none p-2 text-[#a1a7a8] sm:block" title="Location coming soon"><MapPin className="h-4 w-4" /></button><input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagesSelect} /><input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} /></div><span className="text-xs font-semibold text-[#9aa0a1]">{content.length}/1000</span></div>
          <button type="button" onClick={handleSubmit} disabled={(!content.trim() && !mediaCount) || postStatus === 'uploading'} className="flex w-full items-center justify-center gap-2 rounded-none bg-[#14181c] py-3 text-sm font-semibold text-white transition hover:bg-[#b7f23a] hover:text-[#14181c] disabled:cursor-not-allowed disabled:bg-[#dfe3dc] disabled:text-[#8a9092]">{postStatus === 'uploading' ? <><Loader2 className="h-4 w-4 animate-spin" /> Posting...</> : postStatus === 'success' ? <><CheckCircle className="h-4 w-4" /> Posted</> : <><Send className="h-4 w-4" /> Post to Feed</>}</button>
        </footer>
      </div>
    </>
    )}
