'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Check, ChevronLeft, Flame, Sparkles, Users, Zap } from 'lucide-react'
import FleexWordmark from '@/components/brand/FleexWordmark'

const slides = [
  {
    eyebrow: 'A new kind of social space',
    title: 'Welcome to Fleex.',
    description: 'A place to express what moves you, discover what matters, and build a digital identity that feels like yours.',
    icon: Flame,
    collage: ['/collage-1.jpg', '/collage-2.jpg', '/collage-3.jpg'],
  },
  {
    eyebrow: 'Make something worth watching',
    title: 'Turn ideas into Forges.',
    description: 'Create, publish, and shape interactive experiences that show the world what you can do.',
    icon: Zap,
    collage: ['/collage-4.jpg', '/collage-5.jpg', '/collage-6.jpg'],
  },
  {
    eyebrow: 'Find your people',
    title: 'Build your circle.',
    description: 'Follow creators, discover new perspectives, and grow alongside the people who inspire you.',
    icon: Users,
    collage: ['/collage-7.jpg', '/collage-8.jpg', '/collage-9.jpg'],
  },
]

const interests = [
  'Technology', 'Art & Design', 'Music', 'Gaming', 'Fitness', 'Food',
  'Travel', 'Fashion', 'Education', 'Business', 'Comedy', 'Sports',
]

function CollageVisual({ images, step }: { images: string[]; step: number }) {
  return (
    <div className="relative mx-auto mb-8 h-52 w-64 sm:h-60 sm:w-72" aria-label={`Onboarding collage ${step + 1}`}>
      <div className="absolute left-1/2 top-1/2 h-44 w-56 -translate-x-1/2 -translate-y-1/2 rotate-[-7deg] overflow-hidden border-[5px] border-white bg-[#eef0ec] shadow-[0_18px_35px_rgba(20,24,28,0.16)] sm:h-48 sm:w-64">
        <Image src={images[0]} alt="" fill sizes="256px" className="object-cover" priority={step === 0} />
      </div>
      <div className="absolute right-0 top-0 h-32 w-40 rotate-[7deg] overflow-hidden border-[5px] border-white bg-[#eef0ec] shadow-[0_14px_28px_rgba(20,24,28,0.14)] sm:h-36 sm:w-44">
        <Image src={images[1]} alt="" fill sizes="176px" className="object-cover" priority={step === 0} />
      </div>
      <div className="absolute bottom-0 right-5 h-28 w-44 rotate-[-3deg] overflow-hidden border-[5px] border-white bg-[#eef0ec] shadow-[0_14px_28px_rgba(20,24,28,0.14)] sm:h-32 sm:w-48">
        <Image src={images[2]} alt="" fill sizes="192px" className="object-cover" priority={step === 0} />
      </div>
      <span className="absolute right-[-4px] top-[-8px] flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-black text-xs font-black text-white shadow-sm">
        {step + 1}
      </span>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace('/auth/login')
        return
      }
      const { data: profile } = await supabase.from('profiles').select('onboarding_completed, profile_setup_completed, interests').eq('id', authUser.id).single()
      if (!profile?.profile_setup_completed) {
        router.replace('/onboarding/profile')
        return
      }
      if (profile?.onboarding_completed) {
        router.replace('/dashboard')
        return
      }
      setUser(authUser)
      if (Array.isArray(profile?.interests)) setSelectedInterests(profile.interests)
      setLoading(false)
    }
    checkUser()
  }, [router, supabase])

  const goToStep = (nextStep: number) => {
    setDirection(nextStep >= step ? 'forward' : 'back')
    setStep(nextStep)
  }

  const toggleInterest = (interest: string) => {
    setSelectedInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : current.length < 6 ? [...current, interest] : current)
  }

  const handleComplete = async () => {
    if (!user || !selectedInterests.length || saving) return
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('profiles').update({ onboarding_completed: true, interests: selectedInterests }).eq('id', user.id)
    if (error) {
      console.error('Onboarding error:', error)
      setSaveError("Couldn't save your interests — try again.")
      setSaving(false)
      return
    }
    router.replace('/dashboard')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
      </div>
    )
  }

  const isInterestStep = step === slides.length
  const currentSlide = slides[Math.min(step, slides.length - 1)]
  const CurrentIcon = currentSlide.icon
  const progress = isInterestStep ? 100 : ((step + 1) / (slides.length + 1)) * 100

  return (
    <main className="relative flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-white text-black">
      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col overflow-hidden px-5 py-5 sm:px-8 sm:py-7">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => step > 0 && goToStep(step - 1)}
            className={`inline-flex items-center gap-2 text-sm font-bold transition ${step > 0 ? 'text-black hover:opacity-60' : 'pointer-events-none opacity-0'}`}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <FleexWordmark height={28} />

          <button
            type="button"
            onClick={() => router.replace('/dashboard')}
            className="text-xs font-bold text-gray-400 transition hover:text-black"
          >
            Skip
          </button>
        </header>

        <div className="mx-auto mt-8 w-full max-w-xl">
          <div className="mb-3 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400">
            <span>{isInterestStep ? 'Personalise your feed' : `Step ${step + 1} of ${slides.length + 1}`}</span>
            <span className="text-black">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-black transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <section
          key={step}
          className={`mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col justify-center overflow-hidden py-6 ${direction === 'forward' ? 'animate-onboard-forward' : 'animate-onboard-back'}`}
        >
          {!isInterestStep ? (
            <div className="text-center">
              <CollageVisual images={currentSlide.collage} step={step} />
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                <CurrentIcon className="h-5 w-5" />
              </div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">{currentSlide.eyebrow}</p>
              <h1 className="text-4xl font-black leading-[0.98] tracking-[-0.07em] sm:text-6xl">{currentSlide.title}</h1>
              <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-gray-600 sm:text-lg">{currentSlide.description}</p>
              <div className="mx-auto mt-8 flex items-center justify-center gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Go to step ${index + 1}`}
                    onClick={() => goToStep(index)}
                    className={`h-2 rounded-full transition-all ${index === step ? 'w-8 bg-black' : 'w-2 bg-gray-300'}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">One last touch</p>
                <h1 className="text-4xl font-black leading-none tracking-[-0.07em] sm:text-5xl">What pulls you in?</h1>
                <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-gray-600">
                  Choose up to six interests. We&rsquo;ll use them to make Fleex feel more like yours.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {interests.map((interest) => {
                  const selected = selectedInterests.includes(interest)
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 text-left text-sm font-bold transition-all active:scale-[0.98] ${
                        selected
                          ? 'border-black bg-black text-white shadow-lg'
                          : 'border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-black'
                      }`}
                    >
                      <span>{interest}</span>
                      {selected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-black">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 flex items-center justify-between text-xs font-bold text-gray-400">
                <span>{selectedInterests.length} of 6 selected</span>
                {selectedInterests.length === 6 && <span className="text-black">Great mix.</span>}
              </div>

              {saveError && (
                <p className="mt-4 text-center text-xs font-bold text-red-600">{saveError}</p>
              )}
            </div>
          )}
        </section>

        <footer className="mx-auto w-full max-w-xl pb-2">
          {!isInterestStep ? (
            <button
              type="button"
              onClick={() => goToStep(step < slides.length - 1 ? step + 1 : slides.length)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-black py-4 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(0,0,0,0.2)] transition hover:opacity-90 active:scale-[0.99]"
            >
              {step === slides.length - 1 ? 'Choose my interests' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={!selectedInterests.length || saving}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-black py-4 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(0,0,0,0.2)] transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {saving ? 'Setting up your Fleex...' : 'Enter Fleex'}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </footer>
      </div>

      <style jsx global>{`
        @keyframes onboard-forward { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes onboard-back { from { opacity: 0; transform: translateX(-18px); } to { opacity: 1; transform: translateX(0); } }
        .animate-onboard-forward { animation: onboard-forward .36s ease-out; }
        .animate-onboard-back { animation: onboard-back .36s ease-out; }
      `}</style>
    </main>
  )
}
