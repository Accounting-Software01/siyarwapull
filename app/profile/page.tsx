'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthGate } from '@/contexts/AuthGateContext'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const { requireAuth } = useAuthGate()

  useEffect(() => {
    const redirectToProfile = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          // Guest tapped Profile from the nav — show the auth prompt
          // instead of silently bouncing them to a bare login page.
          requireAuth(null, 'view your profile')
          router.push('/dashboard')
          return
        }

        // Get user's username
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', authUser.id)
          .single()

        if (profileData?.username) {
          router.push(`/profile/${profileData.username}`)
        } else {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('[v0] Profile redirect error:', error)
        router.push('/dashboard')
      }
    }

    redirectToProfile()
  }, [supabase, router, requireAuth])

  return null
}

