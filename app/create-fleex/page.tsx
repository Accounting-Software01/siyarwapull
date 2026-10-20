'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Camera,
  Check,
  Flashlight,
  Loader2,
  Mic,
  Music,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

const MAX_VIDEO_SIZE = 50 * 1024 * 1024

export default function CreateFleexPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [musicName, setMusicName] = useState('Original Sound')
  const [uploading, setUploading] = useState(false)
  const [duration, setDuration] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)

  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user')
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [cameraZoom, setCameraZoom] = useState(1)
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 3, step: 0.1 })

  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraPreviewRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyBackground = document.body.style.backgroundColor
    const previousHtmlBackground = document.documentElement.style.backgroundColor

    document.body.style.overflow = 'hidden'
    document.body.style.backgroundColor = '#1f2326'
    document.documentElement.style.backgroundColor = '#1f2326'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.body.style.backgroundColor = previousBodyBackground
      document.documentElement.style.backgroundColor = previousHtmlBackground
    }
  }, [])

  useEffect(() => {
    if (!videoPreview || !videoRef.current) return
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
  }, [videoPreview])

  useEffect(() => {
    if (cameraPreviewRef.current && cameraStream) {
      cameraPreviewRef.current.srcObject = cameraStream
      cameraPreviewRef.current.play().catch(() => undefined)
      const track = cameraStream.getVideoTracks()[0]
      const capabilities = track?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean; zoom?: number; }
      setTorchSupported(Boolean(capabilities?.torch))
      if (capabilities?.zoom) {
        const zoomCapabilities = capabilities as MediaTrackCapabilities & { zoom?: { min?: number; max?: number; step?: number } }
        const min = zoomCapabilities.zoom?.min ?? 1
        const max = zoomCapabilities.zoom?.max ?? 3
        const step = zoomCapabilities.zoom?.step ?? 0.1
        setZoomRange({ min, max, step })
        setCameraZoom(min)
      } else {
        setZoomRange({ min: 1, max: 3, step: 0.1 })
        setCameraZoom(1)
      }
    }
  }, [cameraStream])

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop())
      if (videoPreview) URL.revokeObjectURL(videoPreview)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }, [cameraStream, videoPreview])

  const resetSelectedVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideo(null)
    setVideoPreview(null)
    setDuration(0)
    setIsPlaying(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const setSelectedVideo = (file: File, preview = URL.createObjectURL(file)) => {
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setVideo(file)
    setVideoPreview(preview)
    setIsPlaying(true)

    const metadataVideo = document.createElement('video')
    metadataVideo.preload = 'metadata'
    metadataVideo.onloadedmetadata = () => {
      setDuration(Math.floor(metadataVideo.duration || 0))
      URL.revokeObjectURL(metadataVideo.src)
    }
    metadataVideo.src = preview
  }

  const handleVideoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) return alert('Please select a valid video file.')
    if (file.size > MAX_VIDEO_SIZE) return alert('Video must be less than 50MB.')
    setSelectedVideo(file)
  }

  const openCamera = async () => {
    setCameraError(null)
    try {
      cameraStream?.getTracks().forEach((track) => track.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      })
      setCameraStream(stream)
      setCameraOpen(true)
    } catch (error) {
      console.error('[Camera] error:', error)
      setCameraError('Camera access was blocked. Check your browser permissions and try again.')
      setCameraOpen(true)
    }
  }

  const closeCamera = () => {
    if (isRecording) stopRecording()
    cameraStream?.getTracks().forEach((track) => track.stop())
    setCameraStream(null)
    setCameraOpen(false)
    setCameraError(null)
    setTorchEnabled(false)
    setCameraZoom(1)
  }

  const toggleTorch = async () => {
    const track = cameraStream?.getVideoTracks()[0]
    if (!track || !torchSupported) return
    const nextValue = !torchEnabled
    try {
      await track.applyConstraints({ advanced: [{ torch: nextValue }] } as MediaTrackConstraints)
      setTorchEnabled(nextValue)
    } catch (error) {
      console.warn('[Camera] torch unavailable:', error)
    }
  }

  const setZoom = async (value: number) => {
    const track = cameraStream?.getVideoTracks()[0]
    if (!track) return
    const nextZoom = Math.min(zoomRange.max, Math.max(zoomRange.min, value))
    try {
      await track.applyConstraints({ advanced: [{ zoom: nextZoom }] } as MediaTrackConstraints)
      setCameraZoom(nextZoom)
    } catch (error) {
      console.warn('[Camera] zoom unavailable:', error)
    }
  }

  const switchCamera = async () => {
    const nextFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user'
    setCameraFacingMode(nextFacingMode)
    if (cameraOpen) {
      cameraStream?.getTracks().forEach((track) => track.stop())
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: true,
        })
        setCameraStream(stream)
      } catch {
        setCameraError('Unable to switch cameras on this device.')
      }
    }
  }

  const startRecording = () => {
    if (!cameraStream) return
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : ''

    recordedChunksRef.current = []
    const recorder = new MediaRecorder(cameraStream, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' })
      const extension = blob.type.includes('mp4') ? 'mp4' : 'webm'
      const recordedFile = new File([blob], `fleex-${Date.now()}.${extension}`, { type: blob.type })
      setSelectedVideo(recordedFile)
      closeCamera()
    }
    recorder.start()
    setRecordingSeconds(0)
    setIsRecording(true)
    recordingTimerRef.current = setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000)
  }

  const stopRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = null
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    setIsRecording(false)
  }

  const togglePlay = () => {
    const player = videoRef.current
    if (!player) return
    if (player.paused) {
      player.play().then(() => setIsPlaying(true)).catch(() => undefined)
    } else {
      player.pause()
      setIsPlaying(false)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted((muted) => !muted)
  }

  const generateThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const source = document.createElement('video')
      source.preload = 'metadata'
      source.muted = true
      source.onloadeddata = () => {
        source.currentTime = Math.min(1, source.duration || 1)
      }
      source.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = source.videoWidth
        canvas.height = source.videoHeight
        const context = canvas.getContext('2d')
        if (!context) return reject(new Error('Could not create thumbnail canvas'))
        context.drawImage(source, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.86))
      }
      source.onerror = () => reject(new Error('Failed to load video for thumbnail'))
      source.src = videoUrl
    })
  }

  const uploadVideo = async () => {
    if (!video) return alert('Please choose a video or record one first.')
    setUploading(true)
    setUploadProgress(5)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated. Please log in again.')

      const extension = video.name.split('.').pop() || 'webm'
      const fileName = `${user.id}/${Date.now()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('fleex_videos').upload(fileName, video, { contentType: video.type || 'video/webm' })
      if (uploadError) throw uploadError

      setUploadProgress(50)
      const { data: { publicUrl } } = supabase.storage.from('fleex_videos').getPublicUrl(fileName)
      let thumbnailUrl: string | null = null

      if (videoPreview) {
        try {
          thumbnailUrl = await generateThumbnail(videoPreview)
        } catch (error) {
          console.warn('[Thumbnail] generation failed:', error)
        }
      }

      setUploadProgress(85)
      const { error: dbError } = await supabase.from('user_fleex').insert({
        user_id: user.id,
        video_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        caption: caption.trim() || null,
        music_name: musicName.trim() || 'Original Sound',
        duration: Math.floor(duration),
        is_private: false,
      })
      if (dbError) throw dbError

      setUploadProgress(100)
      router.push('/fleex')
    } catch (error) {
      console.error('[Fleex upload] error:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload Fleex. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] min-h-screen w-full overflow-hidden overscroll-none bg-[#1f2326] text-white">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[#1f2326]/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <button type="button" onClick={() => router.push('/fleex')} aria-label="Back to Fleex" className="rounded-full p-2 text-white transition hover:bg-white/10 active:scale-95"><ArrowLeft className="h-5 w-5" /></button>
          <div className="text-center"><p className="text-sm font-semibold tracking-[-0.02em]">Create <span className="text-[#b7f23a]">Fleex</span></p><p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Make something worth watching</p></div>
          <button type="button" onClick={uploadVideo} disabled={!video || uploading} className="rounded-full bg-[#b7f23a] px-4 py-2 text-xs font-bold text-[#14181c] transition hover:bg-[#caff62] disabled:cursor-not-allowed disabled:opacity-40 active:scale-95">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}</button>
        </div>
        {uploading && <div className="h-0.5 bg-white/10"><div className="h-full bg-[#b7f23a] transition-all" style={{ width: `${uploadProgress}%` }} /></div>}
      </header>

      <main className="mx-auto box-border h-full min-h-0 w-full max-w-2xl overflow-y-auto overscroll-contain bg-[#1f2326] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-24 [scrollbar-width:none] sm:px-6">
        {videoPreview ? (
          <section className="w-full max-w-md">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <video ref={videoRef} src={videoPreview} className="aspect-[9/16] w-full object-cover" loop muted={isMuted} playsInline onClick={togglePlay} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
              <button type="button" onClick={togglePlay} aria-label={isPlaying ? 'Pause preview' : 'Play preview'} className="absolute inset-0 flex items-center justify-center text-white opacity-0 transition hover:opacity-100">{isPlaying ? <Pause className="h-12 w-12" /> : <Play className="h-12 w-12 fill-white" />}</button>
              <div className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold backdrop-blur-md">{formatDuration(duration)}</div>
              <button type="button" onClick={toggleMute} aria-label={isMuted ? 'Unmute preview' : 'Mute preview'} className="absolute bottom-3 right-3 rounded-full bg-black/50 p-2 backdrop-blur-md">{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
              <button type="button" onClick={resetSelectedVideo} aria-label="Remove selected video" className="absolute right-3 top-3 rounded-full bg-black/55 p-2 backdrop-blur-md transition hover:bg-black/80"><Trash2 className="h-4 w-4" /></button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 focus-within:border-[#b7f23a]/60">
                <textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Write a caption..." rows={3} maxLength={150} className="w-full resize-none bg-transparent text-sm leading-relaxed text-white outline-none placeholder:text-white/35" />
                <div className="text-right text-[10px] text-white/35">{caption.length}/150</div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 focus-within:border-[#b7f23a]/60"><Music className="h-4 w-4 shrink-0 text-[#b7f23a]" /><input type="text" value={musicName} onChange={(event) => setMusicName(event.target.value)} maxLength={50} placeholder="Add music or original sound" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" /></div>
            </div>
          </section>
        ) : (
          <section className="flex w-full max-w-md flex-1 flex-col justify-center">
            <div className="mb-8 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#b7f23a] text-[#14181c] shadow-[0_0_38px_rgba(183,242,58,0.18)]"><Sparkles className="h-7 w-7" /></div><h1 className="text-2xl font-semibold tracking-[-0.05em]">Create your next Fleex</h1><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/50">Record something now or bring a video from your library.</p></div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={openCamera} className="group rounded-[24px] border border-[#b7f23a]/40 bg-[#b7f23a] p-5 text-left text-[#14181c] transition hover:bg-[#caff62] active:scale-[0.98]"><div className="mb-12 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f2326] text-[#b7f23a]"><Camera className="h-5 w-5" /></div><p className="text-sm font-bold">Open camera</p><p className="mt-1 text-xs text-[#14181c]/60">Record a new video</p></button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="group rounded-[24px] border border-white/10 bg-white/[0.07] p-5 text-left transition hover:bg-white/10 active:scale-[0.98]"><div className="mb-12 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white"><Upload className="h-5 w-5" /></div><p className="text-sm font-bold">Choose file</p><p className="mt-1 text-xs text-white/45">From your device</p></button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-white/35"><Video className="h-3.5 w-3.5 text-[#b7f23a]" />Vertical 9:16 videos work best</div>
          </section>
        )}
        <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
      </main>

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          {cameraStream ? <video ref={cameraPreviewRef} autoPlay muted playsInline className="h-full w-full object-cover" /> : <div className="px-8 text-center text-white"><Camera className="mx-auto mb-4 h-10 w-10 text-[#b7f23a]" /><p className="text-sm">{cameraError}</p></div>}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5"><button type="button" onClick={closeCamera} aria-label="Close camera" className="pointer-events-auto rounded-full bg-black/40 p-2.5 backdrop-blur-md"><X className="h-5 w-5" /></button><div className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">{isRecording ? <span className="inline-flex items-center gap-2 text-[#ff7777]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#ff7777]" />{formatDuration(recordingSeconds)}</span> : 'Camera'}</div><button type="button" onClick={switchCamera} disabled={isRecording} aria-label="Switch camera" className="pointer-events-auto rounded-full bg-black/40 p-2.5 backdrop-blur-md disabled:opacity-40"><RotateCcw className="h-5 w-5" /></button></div>
          <div className="absolute right-5 top-24 flex flex-col items-center gap-3">
            <button type="button" onClick={toggleTorch} disabled={!torchSupported || isRecording} aria-label={torchEnabled ? 'Turn light off' : 'Turn light on'} className={`pointer-events-auto rounded-full p-3 backdrop-blur-md transition disabled:opacity-35 ${torchEnabled ? 'bg-[#b7f23a] text-[#14181c]' : 'bg-black/45 text-white'}`}><Flashlight className="h-5 w-5" /></button>
            {zoomRange.max > zoomRange.min && <div className="pointer-events-auto flex h-32 flex-col items-center justify-between rounded-full bg-black/45 px-2 py-3 backdrop-blur-md"><button type="button" onClick={() => setZoom(cameraZoom + zoomRange.step)} disabled={isRecording} aria-label="Zoom in" className="text-white disabled:opacity-35"><ZoomIn className="h-4 w-4" /></button><input aria-label="Camera zoom" type="range" min={zoomRange.min} max={zoomRange.max} step={zoomRange.step} value={cameraZoom} onChange={(event) => setZoom(Number(event.target.value))} className="h-14 w-1 accent-[#b7f23a] [writing-mode:vertical-lr]" /><button type="button" onClick={() => setZoom(cameraZoom - zoomRange.step)} disabled={isRecording} aria-label="Zoom out" className="text-white disabled:opacity-35"><ZoomOut className="h-4 w-4" /></button></div>}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-8 p-8"><button type="button" onClick={() => { const track = cameraStream?.getAudioTracks()[0]; if (track) track.enabled = !track.enabled }} disabled={isRecording} aria-label="Toggle microphone" className="rounded-full bg-black/40 p-3 backdrop-blur-md disabled:opacity-40"><Mic className="h-5 w-5" /></button><button type="button" onClick={isRecording ? stopRecording : startRecording} disabled={!cameraStream || Boolean(cameraError)} aria-label={isRecording ? 'Stop recording' : 'Start recording'} className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/80 transition active:scale-90 disabled:opacity-40 ${isRecording ? 'bg-[#ff5f5f]' : 'bg-white'}`}>{isRecording ? <div className="h-7 w-7 rounded-md bg-white" /> : <div className="h-14 w-14 rounded-full bg-[#ff5f5f]" />}</button><button type="button" onClick={closeCamera} aria-label="Use recorded video" className="rounded-full bg-black/40 p-3 backdrop-blur-md"><Check className="h-5 w-5 text-[#b7f23a]" /></button></div>
        </div>
      )}
    </div>
  )
}
