'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Camera, Check, Image as ImageIcon, Loader2, Save, User, X } from 'lucide-react'

type UploadField = 'avatar' | 'cover' | null
type Notice = { type: 'error' | 'success' | 'info'; message: string } | null

type FormErrors = {
  displayName?: string
  username?: string
  bio?: string
}

const USERNAME_PATTERN = /^[a-z0-9_]+$/
const MAX_BIO_LENGTH = 150

export default function SettingsProfilePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<UploadField>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [notice, setNotice] = useState<Notice>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let active = true
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, bio, avatar_url, cover_url')
        .eq('id', user.id)
        .single()

      if (!active) return
      if (error) {
        setNotice({ type: 'error', message: 'We could not load your profile. Please try again.' })
      } else if (data) {
        const nextUsername = data.username || ''
        setProfileId(data.id)
        setDisplayName(data.display_name || '')
        setUsername(nextUsername)
        setOriginalUsername(nextUsername)
        setBio(data.bio || '')
        setAvatarUrl(data.avatar_url || null)
        setCoverUrl(data.cover_url || null)
      }
      setLoading(false)
    }

    loadProfile()
    return () => { active = false }
  }, [router, supabase])

  const markDirty = () => {
    setDirty(true)
    if (notice?.type === 'success') setNotice(null)
  }

  const validate = (): FormErrors => {
    const next: FormErrors = {}
    const cleanDisplayName = displayName.trim()
    const cleanUsername = username.trim().toLowerCase()

    if (cleanDisplayName.length < 2) next.displayName = 'Use at least 2 characters.'
    if (cleanDisplayName.length > 60) next.displayName = 'Keep your display name under 60 characters.'
    if (cleanUsername.length < 3) next.username = 'Use at least 3 characters.'
    else if (cleanUsername.length > 24) next.username = 'Keep your username under 24 characters.'
    else if (!USERNAME_PATTERN.test(cleanUsername)) next.username = 'Use lowercase letters, numbers, and underscores only.'
    if (bio.length > MAX_BIO_LENGTH) next.bio = `Keep your bio under ${MAX_BIO_LENGTH} characters.`

    setErrors(next)
    return next
  }

  const uploadImage = async (file: File, type: Exclude<UploadField, null>) => {
    if (!profileId) return
    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', message: 'Please choose an image file.' })
      return
    }
    const maxBytes = type === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxBytes) {
      setNotice({ type: 'error', message: `${type === 'avatar' ? 'Profile' : 'Cover'} image must be smaller than ${type === 'avatar' ? '5MB' : '10MB'}.` })
      return
    }

    setUploading(type)
    setNotice({ type: 'info', message: `Uploading ${type === 'avatar' ? 'profile photo' : 'cover photo'}…` })
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${profileId}/${type}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('profiles').upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('profiles').getPublicUrl(path)
      if (type === 'avatar') setAvatarUrl(data.publicUrl)
      else setCoverUrl(data.publicUrl)
      markDirty()
      setNotice({ type: 'success', message: `${type === 'avatar' ? 'Profile photo' : 'Cover photo'} uploaded.` })
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      setNotice({ type: 'error', message: 'Upload failed. Please try another image.' })
    } finally {
      setUploading(null)
    }
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>, type: Exclude<UploadField, null>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) uploadImage(file, type)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!profileId || saving || uploading) return
    const validationErrors = validate()
    if (Object.keys(validationErrors).length) {
      setNotice({ type: 'error', message: 'Review the highlighted fields before saving.' })
      return
    }

    const cleanUsername = username.trim().toLowerCase()
    if (cleanUsername !== originalUsername) {
      const { data: duplicate } = await supabase.from('profiles').select('id').eq('username', cleanUsername).neq('id', profileId).maybeSingle()
      if (duplicate) {
        setErrors({ username: 'That username is already in use.' })
        setNotice({ type: 'error', message: 'Choose a different username.' })
        return
      }
    }

    setSaving(true)
    setNotice({ type: 'info', message: 'Saving your profile…' })
    const { error } = await supabase.from('profiles').update({
      display_name: displayName.trim(),
      username: cleanUsername,
      bio: bio.trim(),
      avatar_url: avatarUrl,
      cover_url: coverUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', profileId)

    if (error) {
      console.error('Error saving profile:', error)
      setNotice({ type: 'error', message: error.message || 'Could not save your changes.' })
    } else {
      setOriginalUsername(cleanUsername)
      setUsername(cleanUsername)
      setDirty(false)
      setNotice({ type: 'success', message: 'Profile updated successfully.' })
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f8f5]"><Loader2 className="h-7 w-7 animate-spin text-[#14181c]" /></div>
  }

  return (
    <main className="min-h-[100dvh] bg-[#f7f8f5] text-[#14181c]">
      <header className="sticky top-0 z-20 border-b border-[#dfe3dc] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-semibold text-[#687074] transition hover:text-[#14181c]"><ArrowLeft className="h-4 w-4" /> Back</button>
          <h1 className="text-sm font-bold tracking-tight">Edit profile</h1>
          <button type="submit" form="profile-form" disabled={saving || !!uploading || !dirty} className="inline-flex items-center gap-2 border border-[#14181c] bg-[#14181c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b7f23a] hover:text-[#14181c] disabled:cursor-not-allowed disabled:border-[#dfe3dc] disabled:bg-[#dfe3dc] disabled:text-[#8a9092]">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</button>
        </div>
      </header>

      <form id="profile-form" onSubmit={handleSubmit} className="mx-auto max-w-3xl px-5 pb-20 pt-7 sm:px-8">
        {notice && <div role="status" className={`mb-6 flex items-center justify-between border-l-4 px-4 py-3 text-sm font-medium ${notice.type === 'error' ? 'border-[#b33b3b] bg-[#fff7f7] text-[#8c2e2e]' : notice.type === 'success' ? 'border-[#4d9b6b] bg-[#f1f8f3] text-[#237041]' : 'border-[#b7f23a] bg-[#f6faec] text-[#557500]'}`}><span>{notice.message}</span>{notice.type !== 'info' && <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>}</div>}

        <section className="border border-[#dfe3dc] bg-white">
          <div className="relative h-48 border-b border-[#dfe3dc] bg-[#eef0ec] sm:h-56">
            {coverUrl ? <Image src={coverUrl} alt="Profile cover" fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-[#a1a7a8]"><ImageIcon className="h-8 w-8" /></div>}
            <button type="button" onClick={() => coverInputRef.current?.click()} disabled={!!uploading} className="absolute bottom-4 right-4 inline-flex items-center gap-2 border border-white/70 bg-[#14181c]/85 px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#14181c] disabled:opacity-50"><Camera className="h-3.5 w-3.5" /> {uploading === 'cover' ? 'Uploading…' : 'Change cover'}</button>
            <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleImageChange(event, 'cover')} className="hidden" />
          </div>
          <div className="border-b border-[#dfe3dc] px-5 pb-6 sm:px-7">
            <div className="-mt-12 flex items-end justify-between gap-4">
              <div className="relative h-24 w-24 overflow-hidden border-4 border-white bg-[#eef0ec]">
                {avatarUrl ? <Image src={avatarUrl} alt="Profile" fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center"><User className="h-9 w-9 text-[#a1a7a8]" /></div>}
                <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={!!uploading} aria-label="Change profile photo" className="absolute bottom-0 right-0 bg-[#14181c] p-2 text-white transition hover:bg-[#b7f23a] hover:text-[#14181c]"><Camera className="h-3.5 w-3.5" /></button>
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleImageChange(event, 'avatar')} className="hidden" />
              </div>
              <p className="pb-1 text-right text-xs text-[#8a9092]">JPG, PNG, or WebP<br />Max 5MB avatar · 10MB cover</p>
            </div>
          </div>

          <div className="space-y-6 px-5 py-7 sm:px-7">
            <div><label htmlFor="display-name" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#687074]">Display name</label><input id="display-name" value={displayName} onChange={(event) => { setDisplayName(event.target.value); markDirty() }} maxLength={60} className={`w-full border bg-white px-3 py-3 text-sm outline-none transition focus:border-[#14181c] ${errors.displayName ? 'border-[#b33b3b]' : 'border-[#dfe3dc]'}`} placeholder="Your name" />{errors.displayName && <p className="mt-1.5 text-xs text-[#b33b3b]">{errors.displayName}</p>}</div>
            <div><label htmlFor="username" className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#687074]">Username</label><div className="flex border border-[#dfe3dc] focus-within:border-[#14181c]"><span className="border-r border-[#dfe3dc] px-3 py-3 text-sm text-[#8a9092]">@</span><input id="username" value={username} onChange={(event) => { setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); markDirty() }} maxLength={24} className="min-w-0 flex-1 px-3 py-3 text-sm outline-none" placeholder="username" /></div>{errors.username ? <p className="mt-1.5 text-xs text-[#b33b3b]">{errors.username}</p> : <p className="mt-1.5 text-xs text-[#8a9092]">Lowercase letters, numbers, and underscores only.</p>}</div>
            <div><div className="mb-2 flex items-center justify-between"><label htmlFor="bio" className="text-xs font-bold uppercase tracking-[0.16em] text-[#687074]">Bio</label><span className={`text-xs ${bio.length > MAX_BIO_LENGTH ? 'text-[#b33b3b]' : 'text-[#8a9092]'}`}>{bio.length}/{MAX_BIO_LENGTH}</span></div><textarea id="bio" value={bio} onChange={(event) => { setBio(event.target.value); markDirty() }} maxLength={MAX_BIO_LENGTH} rows={4} className={`w-full resize-none border bg-white px-3 py-3 text-sm leading-relaxed outline-none transition focus:border-[#14181c] ${errors.bio ? 'border-[#b33b3b]' : 'border-[#dfe3dc]'}`} placeholder="Tell people what you create, care about, or explore." />{errors.bio && <p className="mt-1.5 text-xs text-[#b33b3b]">{errors.bio}</p>}</div>
          </div>
        </section>

        <div className="mt-5 flex items-center gap-2 text-xs text-[#8a9092]"><Check className="h-3.5 w-3.5 text-[#779f00]" /> Your profile changes are saved securely to your account.</div>
      </form>
    </main>
  )
}
