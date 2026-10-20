'use client'

import { use, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ElementType, MouseEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FaceCanvas from '@/components/profile/FaceCanvas'
import { format, formatDistanceToNow } from 'date-fns'
import { useAuthGate } from '@/contexts/AuthGateContext'
import {
  ArrowLeft,
  Award,
  Bookmark,
  Calendar,
  Camera,
  Check,
  Film,
  Grid3X3,
  Heart,
  Link2,
  Loader2,
  MapPin,
  MoreHorizontal,
  Music,
  Play,
  Plus,
  Save,
  Share2,
  Settings,
  User,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'

type TabType = 'forges' | 'videos' | 'fleex'

type FleexVideo = {
  id: string
  user_id: string
  video_url: string
  thumbnail_url: string
  caption: string
  music_name: string
  music_artist?: string
  view_count: number
  like_count: number
  comment_count: number
  created_at: string
}

type ProfilePageProps = {
  params: Promise<{ username: string }>
}

export default function ProfilePage({ params: paramsPromise }: ProfilePageProps) {
  const params = use(paramsPromise)
  const router = useRouter()
  const { requireAuth } = useAuthGate()
  const supabase = useMemo(() => createClient(), [])

  const [profile, setProfile] = useState<any>(null)
  const [layout, setLayout] = useState<any[]>([])
  const [fleexVideos, setFleexVideos] = useState<FleexVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('forges')
  const optionsRef = useRef<HTMLDivElement>(null)

  const [isEditingCover, setIsEditingCover] = useState(false)
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)
  const [tempAvatarPreview, setTempAvatarPreview] = useState<string | null>(null)
  const [tempCoverPreview, setTempCoverPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [selectedVideo, setSelectedVideo] = useState<FleexVideo | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [forgeCount, setForgeCount] = useState(0)
  const [fleexCount, setFleexCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!selectedVideo || !videoRef.current) return
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
  }, [selectedVideo])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedVideo) closeVideoModal()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedVideo])

  useEffect(() => {
    if (!params?.username) return
    let cancelled = false

    const loadProfile = async () => {
      setLoading(true)
      try {
        const { data: profilesData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', params.username)

        if (profileError) throw profileError
        if (!profilesData?.length) return

        const profileData = profilesData[0]
        const { data: userData } = await supabase.auth.getUser()
        const uid = userData.user?.id ?? null
        if (cancelled) return

        setProfile(profileData)
        setCurrentUserId(uid)
        setIsOwnProfile(uid === profileData.id)

        const [
          { data: layoutData },
          { count: forgesCountResult },
          { count: fleexCountResult },
          { data: fleexData },
          { count: followers },
          { count: following },
        ] = await Promise.all([
          supabase.from('face_layout').select('*').eq('user_id', profileData.id).order('created_at', { ascending: true }),
          supabase.from('forges').select('*', { count: 'exact', head: true }).eq('user_id', profileData.id),
          supabase.from('user_fleex').select('*', { count: 'exact', head: true }).eq('user_id', profileData.id),
          supabase.from('user_fleex').select('*').eq('user_id', profileData.id).order('created_at', { ascending: false }).limit(12),
          supabase.from('allies').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),
          supabase.from('allies').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),
        ])

        setLayout(layoutData || [])
        setForgeCount(forgesCountResult ?? 0)
        setFleexCount(fleexCountResult ?? 0)
        setFleexVideos(fleexData || [])
        setFollowerCount(followers ?? 0)
        setFollowingCount(following ?? 0)

        if (uid && uid !== profileData.id) {
          const { data: allyData } = await supabase
            .from('allies')
            .select('id')
            .eq('follower_id', uid)
            .eq('following_id', profileData.id)
            .maybeSingle()
          setIsFollowing(Boolean(allyData))
        }
      } catch (error) {
        console.error('[ProfilePage] Error:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()
    return () => { cancelled = true }
  }, [params?.username, supabase])

  const handleFollow = async () => {
    if (!requireAuth(currentUserId, 'follow this creator')) return
    if (!profile || followLoading) return

    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    setFollowerCount((count) => wasFollowing ? Math.max(0, count - 1) : count + 1)
    setFollowLoading(true)

    try {
      const response = await fetch('/api/allies', {
        method: wasFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: profile.id }),
      })
      if (!response.ok) throw new Error('Follow update failed')
    } catch (error) {
      console.error('[Follow error]', error)
      setIsFollowing(wasFollowing)
      setFollowerCount((count) => wasFollowing ? count + 1 : Math.max(0, count - 1))
    } finally {
      setFollowLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
    return String(value)
  }

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return alert('Please select an image file')
    if (file.size > 5 * 1024 * 1024) return alert('Image must be less than 5MB')
    setTempAvatarPreview(URL.createObjectURL(file))
    setIsEditingAvatar(true)
  }

  const handleCoverUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return alert('Please select an image file')
    if (file.size > 10 * 1024 * 1024) return alert('Cover image must be less than 10MB')
    setTempCoverPreview(URL.createObjectURL(file))
    setIsEditingCover(true)
  }

  const saveImage = async (preview: string | null, field: 'avatar_url' | 'cover_url', folder: 'avatar' | 'cover') => {
    if (!preview || !profile) return
    setUploading(true)
    try {
      const response = await fetch(preview)
      const blob = await response.blob()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const fileName = `${user.id}/${folder}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('profiles').upload(fileName, new File([blob], `${folder}.jpg`, { type: 'image/jpeg' }))
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(fileName)
      const { error: updateError } = await supabase.from('profiles').update({ [field]: publicUrl }).eq('id', user.id)
      if (updateError) throw updateError

      setProfile((previous: any) => ({ ...previous, [field]: publicUrl }))
      if (field === 'avatar_url') {
        setIsEditingAvatar(false)
        setTempAvatarPreview(null)
      } else {
        setIsEditingCover(false)
        setTempCoverPreview(null)
      }
    } catch (error) {
      console.error(`Failed to save ${folder}`, error)
      alert(`Failed to save ${folder}`)
    } finally {
      setUploading(false)
    }
  }

  const cancelEdit = () => {
    setIsEditingAvatar(false)
    setIsEditingCover(false)
    setTempAvatarPreview(null)
    setTempCoverPreview(null)
  }

  const openVideoModal = (video: FleexVideo) => {
    setSelectedVideo(video)
    setLiked(false)
    setSaved(false)
    document.body.style.overflow = 'hidden'
  }

  const closeVideoModal = () => {
    videoRef.current?.pause()
    setSelectedVideo(null)
    document.body.style.overflow = ''
  }

  const toggleModalPlayback = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => undefined)
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const shareVideo = async () => {
    if (!selectedVideo) return
    await navigator.clipboard.writeText(`${window.location.origin}/fleex/${selectedVideo.id}`).catch(() => undefined)
  }

  if (loading) return <ProfileSkeleton />

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-[#14181c]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1f2326] text-2xl font-bold text-[#b7f23a]">?</div>
          <h1 className="mb-2 text-2xl font-semibold tracking-[-0.04em]">Profile not found</h1>
          <p className="mb-6 text-sm text-[#7d8387]">This profile may have moved or no longer exists.</p>
          <button type="button" onClick={() => router.push('/dashboard')} className="rounded-full bg-[#1f2326] px-5 py-3 text-sm font-semibold text-white">Back to home</button>
        </div>
      </div>
    )
  }

  const displayName = profile.display_name || profile.username || 'Unknown'
  const avatarUrl = profile.avatar_url || null
  const coverUrl = profile.cover_url || null
  const joinedDate = profile.created_at ? new Date(profile.created_at) : null
  const tabs: { key: TabType; label: string; icon: ElementType; count: number }[] = [
    { key: 'forges', label: 'Forges', icon: Grid3X3, count: forgeCount },
    { key: 'videos', label: 'Videos', icon: Video, count: fleexCount },
    { key: 'fleex', label: 'Fleex', icon: Film, count: fleexCount },
  ]

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white pb-20 text-[#14181c]">
      <header className="sticky top-0 z-30 border-b border-[#e5e5e0] bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <button type="button" onClick={() => router.replace('/dashboard')} aria-label="Go back" className="rounded-full p-2 text-[#14181c] transition hover:bg-[#efefea] active:scale-95">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 px-3">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs text-[#7d8387]">@{profile.username}</p>
          </div>
          <div className="relative" ref={optionsRef}>
            <button type="button" onClick={() => setShowOptions((visible) => !visible)} aria-label="Profile options" className="rounded-full p-2 text-[#7d8387] transition hover:bg-[#efefea]"><MoreHorizontal className="h-5 w-5" /></button>
            {showOptions && (
              <div className="absolute right-0 top-11 z-40 w-48 overflow-hidden rounded-2xl border border-[#deded9] bg-white shadow-xl">
                {isOwnProfile && <Link href="/settings/profile" className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[#efefea]"><Settings className="h-4 w-4" />Settings</Link>}
                {isOwnProfile && <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-600 hover:bg-[#efefea]"><Save className="h-4 w-4" />Log out</button>}
                {!isOwnProfile && <button type="button" onClick={() => setShowOptions(false)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[#efefea]"><Award className="h-4 w-4" />About this creator</button>}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl min-w-0">
        <section className="relative h-44 w-full overflow-hidden bg-[#deded9] sm:h-56">
          {tempCoverPreview || coverUrl ? (
            <Image src={tempCoverPreview || coverUrl!} alt={`${displayName} cover`} fill priority unoptimized className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#b7f23a_0%,transparent_30%),linear-gradient(120deg,#1f2326,#70766e)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          {isOwnProfile && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              {isEditingCover ? (
                <><button type="button" onClick={() => saveImage(tempCoverPreview, 'cover_url', 'cover')} disabled={uploading} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#14181c]"><Check className="h-4 w-4" />Save</button><button type="button" onClick={cancelEdit} className="rounded-full bg-black/55 p-2 text-white"><X className="h-4 w-4" /></button></>
              ) : <button type="button" onClick={() => coverInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md"><Camera className="h-4 w-4" />Edit cover</button>}
            </div>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
        </section>

        <section className="px-5 sm:px-7">
          <div className="relative -mt-12 flex items-end justify-between gap-4 sm:-mt-14">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#1f2326] text-3xl font-semibold text-[#b7f23a] shadow-lg sm:h-28 sm:w-28">
                {tempAvatarPreview || avatarUrl ? <Image src={tempAvatarPreview || avatarUrl!} alt={displayName} width={112} height={112} unoptimized className="h-full w-full object-cover" /> : displayName.charAt(0).toUpperCase()}
              </div>
              {isOwnProfile && (
                <div className="absolute -bottom-1 -right-1">
                  {isEditingAvatar ? (
                    <div className="flex gap-1"><button type="button" onClick={() => saveImage(tempAvatarPreview, 'avatar_url', 'avatar')} disabled={uploading} className="rounded-full bg-[#1f2326] p-2 text-[#b7f23a] shadow-lg"><Check className="h-3.5 w-3.5" /></button><button type="button" onClick={cancelEdit} className="rounded-full bg-white p-2 text-[#14181c] shadow-lg"><X className="h-3.5 w-3.5" /></button></div>
                  ) : <button type="button" onClick={() => avatarInputRef.current?.click()} aria-label="Edit profile photo" className="rounded-full bg-[#b7f23a] p-2 text-[#14181c] shadow-lg"><Camera className="h-3.5 w-3.5" /></button>}
                </div>
              )}
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <div className="flex gap-2 pb-1">
              {isOwnProfile ? <Link href="/settings/profile" className="rounded-full border border-[#d9d9d4] px-4 py-2 text-sm font-semibold transition hover:bg-[#efefea]">Edit profile</Link> : <button type="button" onClick={handleFollow} disabled={followLoading} className={`rounded-full px-5 py-2 text-sm font-semibold transition active:scale-95 ${isFollowing ? 'border border-[#d9d9d4] bg-white text-[#14181c] hover:bg-[#efefea]' : 'bg-[#1f2326] text-white hover:bg-black'}`}>{followLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isFollowing ? 'Following' : 'Follow'}</button>}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{displayName}</h1>
              {profile.is_verified && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1f2326] text-[#b7f23a]"><Check className="h-3 w-3" /></span>}
              {profile.is_official && <span className="rounded-full bg-[#b7f23a] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#14181c]">Official</span>}
            </div>
            <p className="mt-0.5 text-sm text-[#7d8387]">@{profile.username}</p>
            {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#535a5e]">{profile.bio}</p>}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#7d8387]">
            {profile.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{profile.location}</span>}
            {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-[#8aae00]"><Link2 className="h-3.5 w-3.5" />{profile.website.replace(/^https?:\/\//, '')}</a>}
            {joinedDate && <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Joined {format(joinedDate, 'MMMM yyyy')}</span>}
          </div>

          <div className="mt-6 grid grid-cols-3 divide-x divide-[#d9d9d4] rounded-2xl border border-[#deded9] bg-[#fbfaf6] py-4">
            <ProfileStat value={followerCount} label="Allies" formatNumber={formatNumber} />
            <ProfileStat value={followingCount} label="Following" formatNumber={formatNumber} />
            <ProfileStat value={forgeCount} label="Forges" formatNumber={formatNumber} />
          </div>
        </section>

        <section className="mt-7">
          <div className="flex border-b border-[#d9d9d4] px-5 sm:px-7">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`relative flex min-w-0 flex-1 items-center justify-center gap-1.5 py-4 text-sm font-semibold transition ${active ? 'text-[#14181c]' : 'text-[#a0a4a6] hover:text-[#535a5e]'}`}><Icon className="h-4 w-4" /><span className="truncate">{tab.label}</span>{tab.count > 0 && <span className="text-xs text-[#7d8387]">{formatNumber(tab.count)}</span>}{active && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-[#b7f23a]" />}</button>
            })}
          </div>

          <div className="px-5 pb-10 pt-6 sm:px-7">
            {activeTab === 'forges' && <div className="overflow-hidden rounded-2xl border border-[#deded9] bg-[#fbfaf6] p-2"><FaceCanvas layout={layout} profile={profile} isEditable={isOwnProfile} /></div>}

            {(activeTab === 'videos' || activeTab === 'fleex') && (
              <div>
                {activeTab === 'videos' && isOwnProfile && <Link href="/create-fleex" className="mb-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#1f2326] py-3 text-sm font-semibold text-white transition hover:bg-black"><Plus className="h-4 w-4" />Create Fleex</Link>}
                {fleexVideos.length === 0 ? <EmptyTab icon={activeTab === 'videos' ? Video : Film} label={activeTab === 'videos' ? 'No videos yet' : 'No Fleex videos yet'} action={isOwnProfile ? { href: '/create-fleex', label: 'Create your first Fleex' } : undefined} /> : <div className="grid grid-cols-3 gap-1.5 sm:gap-2">{fleexVideos.map((video) => <MediaTile key={video.id} video={video} onClick={() => openVideoModal(video)} formatNumber={formatNumber} />)}</div>}
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-0 sm:p-5" onClick={closeVideoModal}>
          <div className="relative h-full w-full max-w-lg overflow-hidden bg-[#1f2326] sm:h-[min(92vh,850px)] sm:rounded-[28px]" onClick={(event) => event.stopPropagation()} onMouseDown={toggleModalPlayback}>
            <video ref={videoRef} src={selectedVideo.video_url} className="h-full w-full object-contain" loop muted={isMuted} playsInline poster={selectedVideo.thumbnail_url} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25" />
            {!isPlaying && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="rounded-full bg-black/45 p-5"><Play className="h-8 w-8 fill-white text-white" /></span></div>}
            <button type="button" onClick={closeVideoModal} aria-label="Close video" className="absolute right-4 top-4 rounded-full bg-black/45 p-2.5 text-white backdrop-blur-md"><X className="h-5 w-5" /></button>
            <button type="button" onClick={() => setIsMuted((value) => !value)} aria-label={isMuted ? 'Unmute video' : 'Mute video'} className="absolute right-4 top-16 rounded-full bg-black/45 p-2.5 text-white backdrop-blur-md">{isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
            <div className="absolute bottom-6 left-4 right-20 text-white sm:left-6"><p className="text-sm font-semibold">{displayName}</p>{selectedVideo.caption && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/85">{selectedVideo.caption}</p>}<div className="mt-3 flex items-center gap-2 text-xs text-white/70"><Music className="h-3.5 w-3.5 text-[#b7f23a]" />{selectedVideo.music_name || 'Original Sound'}</div></div>
            <div className="absolute bottom-7 right-4 flex flex-col gap-4 text-white"><ModalAction label="Appreciate" active={liked} onClick={() => { if (requireAuth(currentUserId, 'like this video')) setLiked((value) => !value) }}><Heart className="h-6 w-6" fill={liked ? 'currentColor' : 'none'} /></ModalAction><ModalAction label="Save" active={saved} onClick={() => { if (requireAuth(currentUserId, 'save this video')) setSaved((value) => !value) }}><Bookmark className="h-6 w-6" fill={saved ? 'currentColor' : 'none'} /></ModalAction><ModalAction label="Share" onClick={shareVideo}><Share2 className="h-6 w-6" /></ModalAction></div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileStat({ value, label, formatNumber }: { value: number; label: string; formatNumber: (value: number) => string }) {
  return <div className="text-center"><p className="text-lg font-semibold tracking-[-0.03em]">{formatNumber(value)}</p><p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#7d8387]">{label}</p></div>
}

function MediaTile({ video, onClick, formatNumber }: { video: FleexVideo; onClick: () => void; formatNumber: (value: number) => string }) {
  return <button type="button" onClick={onClick} className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-[#efefea] text-left transition hover:-translate-y-0.5 active:scale-[0.98]"><div className="absolute inset-0">{video.thumbnail_url ? <Image src={video.thumbnail_url} alt={video.caption || 'Video'} fill unoptimized className="object-cover transition duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><Play className="h-8 w-8 text-[#7d8387]" /></div>}</div><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /><span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#14181c]"><Play className="mr-1 inline h-3 w-3 fill-current" />Video</span><span className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-medium text-white"><Heart className="h-3.5 w-3.5" />{formatNumber(video.like_count)}</span></button>
}

function EmptyTab({ icon: Icon, label, action }: { icon: ElementType; label: string; action?: { href: string; label: string } }) {
  return <div className="rounded-2xl border border-dashed border-[#d9d9d4] bg-[#fbfaf6] py-16 text-center"><Icon className="mx-auto mb-3 h-10 w-10 text-[#a0a4a6]" /><p className="text-sm text-[#7d8387]">{label}</p>{action && <Link href={action.href} className="mt-4 inline-flex rounded-full bg-[#1f2326] px-4 py-2 text-sm font-semibold text-white">{action.label}</Link>}</div>
}

function ModalAction({ label, active = false, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} onClick={(event) => { event.stopPropagation(); onClick() }} className={`rounded-full bg-black/45 p-3 backdrop-blur-md transition active:scale-90 ${active ? 'text-[#b7f23a]' : 'text-white'}`}>{children}</button>
}

function ProfileSkeleton() {
  return <div className="min-h-screen bg-white"><div className="h-12 border-b border-[#e5e5e0]" /><div className="h-52 animate-pulse bg-[#e5e5e0]" /><div className="mx-auto max-w-3xl px-5 py-6"><div className="-mt-14 h-28 w-28 animate-pulse rounded-full border-4 border-white bg-[#d9d9d4]" /><div className="mt-5 h-7 w-48 animate-pulse rounded-full bg-[#e5e5e0]" /><div className="mt-3 h-4 w-32 animate-pulse rounded-full bg-[#efefea]" /><div className="mt-6 h-20 animate-pulse rounded-2xl bg-[#fbfaf6]" /><div className="mt-6 grid grid-cols-3 gap-2">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-[#fbfaf6]" />)}</div></div></div>
}
