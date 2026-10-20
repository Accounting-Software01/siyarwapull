'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import AuthPromptModal from '@/components/auth/AuthPromptModal'

interface AuthGateContextValue {
  /**
   * Guards an interactive action behind auth. Pass the current user
   * (or null/undefined) and, optionally, a short label describing the
   * action for the modal copy (e.g. "like this post").
   *
   * Returns true if the user is authenticated (action already ran via
   * the runIfAuthed callback you pass in), false if the auth prompt
   * was shown instead.
   */
  requireAuth: (user: unknown, actionLabel?: string) => boolean
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null)

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [actionLabel, setActionLabel] = useState<string | undefined>(undefined)

  const requireAuth = useCallback((user: unknown, label?: string) => {
    if (user) return true
    setActionLabel(label)
    setOpen(true)
    return false
  }, [])

  return (
    <AuthGateContext.Provider value={{ requireAuth }}>
      {children}
      <AuthPromptModal open={open} onClose={() => setOpen(false)} actionLabel={actionLabel} />
    </AuthGateContext.Provider>
  )
}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext)
  if (!ctx) {
    throw new Error('useAuthGate must be used within an AuthGateProvider')
  }
  return ctx
}
