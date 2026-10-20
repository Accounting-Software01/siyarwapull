'use client'

import { useRouter } from 'next/navigation'
import { X, Heart, Users, Sparkles, MessageCircle } from 'lucide-react'
import FleexWordmark from '@/components/brand/FleexWordmark'

interface AuthPromptModalProps {
  open: boolean
  onClose: () => void
  /** What the person was trying to do, shown as a light contextual hint (e.g. "like this post"). */
  actionLabel?: string
}

const BENEFITS = [
  { icon: Heart, text: 'Like, comment, and react to what you find' },
  { icon: Users, text: 'Follow creators and build your own Face' },
  { icon: Sparkles, text: 'Forge portfolios, blogs, shops, and Flips' },
  { icon: MessageCircle, text: 'Message and collaborate with builders' },
]

export default function AuthPromptModal({ open, onClose, actionLabel }: AuthPromptModalProps) {
  const router = useRouter()

  if (!open) return null

  const returnTo = typeof window !== 'undefined' ? window.location.pathname : '/dashboard'

  const goTo = (path: string) => {
    router.push(`${path}?returnTo=${encodeURIComponent(returnTo)}`)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center mb-5 mt-2">
          <FleexWordmark height={32} />
          <p className="text-sm text-gray-500 mt-2">
            {actionLabel
              ? `Sign up or log in to ${actionLabel}.`
              : 'Sign up or log in to keep going.'}
          </p>
        </div>

        <ul className="space-y-3 mb-6">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-gray-700">
              <span className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-red-600" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => goTo('/auth/sign-up')}
            className="w-full h-12 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
          >
            Create account
          </button>
          <button
            onClick={() => goTo('/auth/login')}
            className="w-full h-12 rounded-full bg-gray-100 text-gray-900 font-bold hover:bg-gray-200 transition-colors"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  )
}
