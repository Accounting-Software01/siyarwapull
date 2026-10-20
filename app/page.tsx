'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // Guests browse straight into the app — no login wall.
        // /dashboard shows public content and only prompts for
        // an account when they try to interact.
        router.push('/dashboard')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      if (!profile?.onboarding_completed) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
    }

    checkAuthAndRedirect()
  }, [router, supabase])

  // Return null to show nothing while redirecting
  return null
}
