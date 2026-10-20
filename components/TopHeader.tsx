'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Search,
  Bell,
  Plus,
  X,
  User,
  CreditCard,
  Settings,
  LogOut,
  HelpCircle,
  Shield,
  Sparkles,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TopHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Hooks must run before the conditional route return on every render.
  useEffect(() => {
    let cancelled = false

    const getUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!cancelled) setUser(currentUser)
    }

    getUser().catch((error) => {
      console.error('Unable to load header user:', error)
    })

    return () => {
      cancelled = true
    }
  }, [supabase])

  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? 'hidden' : 'unset'

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isDrawerOpen])

  // Hide on auth pages and onboarding.
  if (pathname?.startsWith('/auth/') || pathname?.startsWith('/onboarding') || pathname === '/') {
    return null
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsDrawerOpen(false)
    router.push('/')
  }

  const menuItems = [
    { icon: User, label: 'Profile', href: '/dashboard/profile' },
    { icon: CreditCard, label: 'Subscription', href: '/dashboard/subscription' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
    { icon: Flame, label: 'Siyarwa Pull Studio', href: '/create-fleex' },
    { icon: Sparkles, label: 'Premium Features', href: '/dashboard/premium' },
    { icon: HelpCircle, label: 'Help & Support', href: '/dashboard/support' },
    { icon: Shield, label: 'Privacy', href: '/dashboard/privacy' },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 shadow-lg backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-full items-center justify-between px-4 py-3">
          {/* Left: menu */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="-ml-2 flex flex-col gap-1.5 rounded-lg p-2 transition-all duration-200 hover:bg-white/10 active:bg-white/20"
            aria-label="Open menu"
          >
            <span className="h-0.5 w-5 rounded-full bg-[#b7f23a]" />
            <span className="h-0.5 w-5 rounded-full bg-[#b7f23a]" />
            <span className="h-0.5 w-5 rounded-full bg-[#b7f23a]" />
          </button>

          {/* Center: Pull. mark */}
          <div className="absolute left-1/2 -translate-x-1/2 lg:relative lg:left-0 lg:ml-2 lg:translate-x-0">
            <Link href="/dashboard" aria-label="Siyarwa Pull home">
              <span className="text-xl font-black tracking-[-0.04em] text-white">
                Siyarwa Pull
              </span>
            </Link>
          </div>

          {/* Center desktop: search */}
          <div className="mx-4 hidden max-w-md flex-1 lg:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b7f23a]" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search Siyarwa Pull, creators..."
                className="w-full rounded-full bg-white/5 py-2 pl-10 pr-4 text-sm text-white transition placeholder:text-white/30 focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-[#b7f23a]"
              />
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0 hover:bg-white/10" aria-label="Notifications">
              <Bell className="h-5 w-5 text-[#b7f23a]" aria-hidden="true" />
            </Button>
            <Link href="/create-fleex">
              <Button size="sm" className="gap-2 bg-[#b7f23a] text-black shadow-lg shadow-[#b7f23a]/20 hover:bg-[#c9ff62]">
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile search */}
      <div className="sticky top-[57px] z-30 border-b border-white/10 bg-black/80 px-4 py-2 backdrop-blur-xl lg:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b7f23a]" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search Siyarwa Pull, creators..."
            className="w-full rounded-full bg-white/5 py-2 pl-10 pr-4 text-sm text-white transition placeholder:text-white/30 focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-[#b7f23a]"
          />
        </div>
      </div>

      {/* Drawer overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        aria-label="Main menu"
        className={`fixed left-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-gradient-to-b from-gray-900 to-black shadow-2xl transition-transform duration-300 ease-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-[#b7f23a]/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b7f23a] shadow-lg">
              <span className="text-xl font-black text-black">P</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Siyarwa Pull</h2>
              <p className="text-xs text-white/50">create, share &amp; discover</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="rounded-lg p-2 transition-colors hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-white/70" aria-hidden="true" />
          </button>
        </div>

        {user && (
          <div className="border-b border-white/10 bg-[#b7f23a]/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#b7f23a] text-lg font-semibold text-black">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                </p>
                <p className="truncate text-xs text-white/50">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsDrawerOpen(false)}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
              >
                <Icon className="h-5 w-5 text-[#b7f23a] transition-transform group-hover:scale-110" aria-hidden="true" />
                <span className="font-medium text-white/80 group-hover:text-white">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={handleSignOut}
            className="group flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5 text-red-400 transition-transform group-hover:scale-110" aria-hidden="true" />
            <span className="font-medium text-red-400">Sign Out</span>
          </button>
          <p className="pt-2 text-center text-xs text-white/30">Siyarwa Pull • Create, share &amp; discover</p>
        </div>
      </aside>
    </>
  )
}
