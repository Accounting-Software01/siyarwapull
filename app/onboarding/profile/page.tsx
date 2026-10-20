'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Check, ChevronLeft, Loader2, UserRound } from 'lucide-react'

const STEPS = [
  { label: 'Date of birth', eyebrow: 'Your age helps us keep Siyarwa Pull safe.' },
  { label: 'Phone number', eyebrow: 'Add a number for account recovery.' },
  { label: 'Username', eyebrow: 'Choose the name people will find you by.' },
  { label: 'Display name', eyebrow: 'This is how you’ll appear across Siyarwa Pull.' },
]

const USERNAME_PATTERN = /^[a-z0-9_]+$/
const PHONE_PATTERN = /^\+?[0-9\s().-]{7,20}$/

export default function ProfileSetupPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }
      const { data: profile } = await supabase.from('profiles').select('profile_setup_completed, date_of_birth, phone_number, username, display_name').eq('id', user.id).single()
      if (profile?.profile_setup_completed) {
        router.replace('/onboarding')
        return
      }
      setUserId(user.id)
      setDateOfBirth(profile?.date_of_birth || '')
      setPhoneNumber(profile?.phone_number || '')
      setUsername(profile?.username || '')
      setDisplayName(profile?.display_name || '')
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const validateStep = () => {
    setError('')
    if (step === 0) {
      if (!dateOfBirth) return setError('Select your date of birth.'), false
      const date = new Date(`${dateOfBirth}T00:00:00`)
      const age = new Date().getFullYear() - date.getFullYear() - (new Date() < new Date(new Date().getFullYear(), date.getMonth(), date.getDate()) ? 1 : 0)
      if (Number.isNaN(date.getTime()) || date > new Date() || age < 13) return setError('You must be at least 13 years old.'), false
    }
    if (step === 1 && !PHONE_PATTERN.test(phoneNumber.trim())) return setError('Enter a valid phone number.'), false
    if (step === 2) {
      if (username.length < 3 || username.length > 24 || !USERNAME_PATTERN.test(username)) return setError('Use 3–24 lowercase letters, numbers, or underscores.'), false
    }
    if (step === 3 && (displayName.trim().length < 2 || displayName.trim().length > 60)) return setError('Use a display name between 2 and 60 characters.'), false
    return true
  }

  const next = async () => {
    if (!validateStep()) return
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1)
      return
    }
    if (!userId || saving) return
    setSaving(true)
    const { data: duplicate } = await supabase.from('profiles').select('id').eq('username', username).neq('id', userId).maybeSingle()
    if (duplicate) {
      setError('That username is already in use.')
      setSaving(false)
      setStep(2)
      return
    }
    const { error: updateError } = await supabase.from('profiles').update({
      date_of_birth: dateOfBirth,
      phone_number: phoneNumber.trim(),
      username,
      display_name: displayName.trim(),
      profile_setup_completed: true,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)
    if (updateError) {
      setError(updateError.message || 'Could not save your profile details.')
      setSaving(false)
      return
    }
    router.replace('/onboarding')
  }

  if (loading) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f8f5]"><Loader2 className="h-7 w-7 animate-spin text-[#14181c]" /></div>

  const current = STEPS[step]
  const value = [dateOfBirth, phoneNumber, username, displayName][step]

  return (
    <main className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#f7f8f5] text-[#14181c]">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col overflow-hidden px-5 py-6 sm:px-8">
       
        
      <header className="flex items-center justify-between">
  <button
    type="button"
    onClick={() =>
      step > 0 && setStep((currentStep) => currentStep - 1)
    }
    className={`inline-flex items-center gap-2 text-sm font-bold ${
      step
        ? 'text-[#14181c]'
        : 'pointer-events-none opacity-0'
    }`}
  >
    <ChevronLeft className="h-4 w-4" />
    Back
  </button>

  <div
    className="flex items-center gap-2 text-lg font-black tracking-[-0.07em]"
    aria-label="Siyarwa Pull"
  >
    Siyarwa Pull
  </div>

  <span className="text-xs font-bold text-[#8a9092]">
    Profile setup
  </span>
</header>

        
        
        <div className="mt-8"><div className="mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-[#8a9092]"><span>Step {step + 1} of {STEPS.length}</span><span className="text-[#779f00]">{Math.round(((step + 1) / STEPS.length) * 100)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#dfe3dc]"><div className="h-full rounded-full bg-[#14181c] transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div></div>

        <section className="flex min-h-0 flex-1 flex-col justify-center py-8"><div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#14181c] text-[#b7f23a]"><UserRound className="h-6 w-6" /></div><p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#779f00]">{current.eyebrow}</p><h1 className="text-4xl font-black leading-none tracking-[-0.07em] sm:text-5xl">{current.label}</h1><p className="mt-5 max-w-md text-sm leading-relaxed text-[#687074]">This takes less than a minute. You can refine the rest of your profile later in settings.</p><div className="mt-8 max-w-md">{step === 0 && <input autoFocus type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} className="w-full border-b-2 border-[#cfd5ce] bg-transparent px-0 py-4 text-xl font-semibold outline-none focus:border-[#14181c]" />}{step === 1 && <input autoFocus type="tel" inputMode="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+234 800 000 0000" className="w-full border-b-2 border-[#cfd5ce] bg-transparent px-0 py-4 text-xl font-semibold outline-none placeholder:text-[#b0b5b2] focus:border-[#14181c]" />}{step === 2 && <div className="flex items-center border-b-2 border-[#cfd5ce] focus-within:border-[#14181c]"><span className="py-4 text-xl font-semibold text-[#8a9092]">@</span><input autoFocus value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} maxLength={24} placeholder="username" className="min-w-0 flex-1 bg-transparent px-2 py-4 text-xl font-semibold outline-none placeholder:text-[#b0b5b2]" /></div>}{step === 3 && <input autoFocus value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} placeholder="Your name" className="w-full border-b-2 border-[#cfd5ce] bg-transparent px-0 py-4 text-xl font-semibold outline-none placeholder:text-[#b0b5b2] focus:border-[#14181c]" />}</div>{error && <p className="mt-3 text-sm font-semibold text-[#b33b3b]">{error}</p>}{step === 3 && <p className="mt-3 text-xs text-[#8a9092]">{displayName.length}/60 characters</p>}</section>

        <footer><button type="button" onClick={next} disabled={saving || !value} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#14181c] py-4 text-sm font-extrabold text-white transition hover:bg-[#b7f23a] hover:text-[#14181c] disabled:cursor-not-allowed disabled:opacity-40">{saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving details...</> : <>{step === STEPS.length - 1 ? 'Continue to onboarding' : 'Continue'}<ArrowRight className="h-4 w-4" /></>}</button></footer>
      </div>
    </main>
  )
}
