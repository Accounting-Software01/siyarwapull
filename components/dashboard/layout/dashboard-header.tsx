'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import BrandLogo from '@/components/brand/BrandLogo'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthGate } from '@/contexts/AuthGateContext'
import { Search, Plus, X, ChevronRight, Settings, LogOut, User, Bookmark, CreditCard, HelpCircle, Shield, Gem, WalletCards, Bell } from 'lucide-react'

const drawerMenuItems = [
  { icon: User, label: 'Profile', href: '/profile' },
//  { icon: CreditCard, label: 'Subscription', href: '/dashboard/subscription', badge: 'Pro' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
 // { icon: Gem, label: 'Premium Features', href: '/dashboard/premium' },
  { icon: Bookmark, label: 'Saved', href: '/dashboard/saved' },
  //{ icon: WalletCards, label: 'Earnings', href: '/dashboard/earnings' },
  { icon: HelpCircle, label: 'Help & Support', href: '/dashboard/support' },
  { icon: Shield, label: 'Privacy & Security', href: '/dashboard/privacy' },
]

export default function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { requireAuth } = useAuthGate()
  const [user, setUser] = useState<any>(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTabState] = useState<'forYou' | 'following'>('forYou')
  const profileRef = useRef<HTMLDivElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const isGuest = !user

  useEffect(() => {
    if (pathname !== '/dashboard' || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setActiveTabState(params.get('tab') === 'following' ? 'following' : 'forYou')
  }, [pathname])

  const onTabChange = (tab: 'forYou' | 'following') => {
    if (tab === 'following' && !requireAuth(user, 'see posts from people you follow')) return
    setActiveTabState(tab)
    router.push(tab === 'following' ? '/dashboard?tab=following' : '/dashboard')
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => setUser(currentUser))
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => subscription.subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setProfile(null)
      return
    }
    supabase.from('profiles').select('avatar_url, display_name, username, email').eq('id', user.id).single().then(({ data }) => setProfile(data))
  }, [user?.id, supabase])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (profileRef.current && !profileRef.current.contains(target)) setShowProfileMenu(false)
      if (drawerRef.current && !drawerRef.current.contains(target) && showDrawer) setShowDrawer(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDrawer])

  useEffect(() => {
    document.body.style.overflow = showDrawer ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showDrawer])

  if (pathname !== '/dashboard') return null

  const handleLogout = async () => {
    setShowDrawer(false)
    setShowProfileMenu(false)
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const handleNotificationsClick = () => {
    requireAuth(user, 'see your notifications')
    // No notification backend exists yet — this is a placeholder target
    // until that feature is actually built.
  }

  return (
    <>
      <header className={`fixed left-0 right-0 top-0 z-40 border-b border-gray-200 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4 lg:h-16">
            <button type="button" onClick={() => setShowDrawer(true)} className="-ml-2 flex shrink-0 flex-col gap-1.5 p-2 hover:bg-gray-100 active:bg-gray-200" aria-label="Open menu"><span className="h-0.5 w-5 bg-black" /><span className="h-0.5 w-5 bg-black" /><span className="h-0.5 w-5 bg-black" /></button>

            <div className="hidden max-w-md flex-1 lg:ml-12 lg:block"><div className="relative w-full"><div className="pointer-events-none absolute inset-y-0 left-3 flex items-center"><Search className={`h-4 w-4 ${searchFocused ? 'text-black' : 'text-gray-400'}`} /></div><input type="text" placeholder="Search" onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} className="h-10 w-full border border-transparent bg-gray-100 pl-10 pr-4 text-sm outline-none transition hover:bg-gray-200 focus:border-black focus:bg-white placeholder:text-gray-500" /></div></div>

            <Link href="/dashboard" aria-label="Siyarwa Pull home" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <BrandLogo size={30} />
            </Link>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search — icon-only on mobile/tablet since the full bar is desktop-only above */}
              <Link
                href="/search"
                aria-label="Search"
                className="flex h-9 w-9 items-center justify-center text-gray-700 hover:bg-gray-100 lg:hidden"
              >
                <Search className="h-5 w-5" />
              </Link>

              {/* Notifications — visible at every size; no backend wired up yet */}
              <button
                type="button"
                onClick={handleNotificationsClick}
                aria-label="Notifications"
                className="flex h-9 w-9 items-center justify-center text-gray-700 hover:bg-gray-100"
              >
                <Bell className="h-5 w-5" />
              </button>

              {isGuest ? <Link href="/auth/login" className="hidden h-9 items-center bg-black px-5 text-xs font-extrabold text-white hover:bg-gray-800 lg:flex">Log in</Link> : <div className="hidden items-center gap-3 lg:flex"><Link href="/create-fleex" className="flex h-9 items-center gap-1.5 bg-black px-4 text-xs font-extrabold text-white hover:bg-gray-800 active:scale-95"><Plus className="h-3.5 w-3.5" />Create</Link><div ref={profileRef} className="relative"><button type="button" onClick={() => setShowProfileMenu((visible) => !visible)} className="h-9 w-9 overflow-hidden ring-2 ring-transparent hover:ring-black" aria-label="Open profile menu">{profile?.avatar_url ? <Image src={profile.avatar_url} alt="avatar" width={36} height={36} className="h-full w-full object-cover" unoptimized /> : <div className="flex h-full w-full items-center justify-center bg-black text-sm font-bold text-white">{profile?.display_name?.[0]?.toUpperCase() || 'U'}</div>}</button>{showProfileMenu && <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden border border-gray-200 bg-white shadow-xl"><div className="border-b border-gray-100 p-3"><p className="truncate text-sm font-bold text-black">{profile?.display_name || 'User'}</p><p className="truncate text-xs text-gray-500">@{profile?.username || 'username'}</p></div><div className="py-1"><Link href={`/profile/${profile?.username}`} onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50"><User className="h-4 w-4 text-gray-600" />Profile</Link><Link href="/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50"><Settings className="h-4 w-4 text-gray-600" />Settings</Link><div className="my-1 border-t border-gray-100" /><button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"><LogOut className="h-4 w-4 text-gray-600" />Log out</button></div></div>}</div></div>}
            </div>
          </div>
          <div className="flex items-center">{(['forYou', 'following'] as const).map((tab) => <button type="button" key={tab} onClick={() => onTabChange(tab)} className={`relative flex-1 py-3 text-sm font-extrabold transition-colors lg:flex-none lg:px-6 ${activeTab === tab ? 'text-black' : 'text-gray-400 hover:text-gray-700'}`}>{tab === 'forYou' ? 'For You' : 'Following'}{activeTab === tab && <span className="absolute bottom-0 left-1/2 h-[3px] w-12 -translate-x-1/2 bg-black" />}</button>)}</div>
        </div>
      </header>

      {showDrawer && <div className="fixed inset-0 z-50 bg-black/45" onClick={() => setShowDrawer(false)} />}
      <div ref={drawerRef} className={`fixed left-0 top-0 z-[60] flex h-[100dvh] max-h-[100dvh] w-[82vw] max-w-[340px] flex-col overflow-hidden border-r border-[#dfe3dc] bg-white shadow-2xl transition-transform duration-300 ease-out ${showDrawer ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-[#e5e8e2] px-4 py-3"><Link href="/dashboard" onClick={() => setShowDrawer(false)}><BrandLogo size={28} /></Link><button type="button" onClick={() => setShowDrawer(false)} aria-label="Close menu" className="p-2 text-black hover:bg-[#f3f5f1]"><X className="h-5 w-5" /></button></div>

        {profile && <div className="border-b border-[#e5e8e2] px-4 py-3"><div className="flex items-center gap-2.5"><div className="h-10 w-10 shrink-0 overflow-hidden bg-black">{profile.avatar_url ? <Image src={profile.avatar_url} alt="avatar" width={40} height={40} className="h-full w-full object-cover" unoptimized /> : <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">{profile.display_name?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || 'U'}</div>}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-black">{profile.display_name || profile.email?.split('@')[0] || 'User'}</p><p className="truncate text-[11px] text-gray-500">@{profile.username || 'username'}</p></div></div></div>}

        <nav className="min-h-0 flex-1 overflow-y-auto py-1.5">{drawerMenuItems.map((item) => <Link key={item.label} href={item.href} onClick={() => setShowDrawer(false)} className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-[#f7f9f5]"><span className="flex min-w-0 items-center gap-3"><item.icon className="h-[18px] w-[18px] shrink-0 text-black" /><span className="truncate font-semibold text-black">{item.label}</span></span><span className="flex items-center gap-2">{item.badge && <span className="bg-black px-2 py-0.5 text-[9px] font-extrabold text-white">{item.badge}</span>}<ChevronRight className="h-4 w-4 text-gray-400" /></span></Link>)}</nav>

        <div className="border-t border-[#e5e8e2] px-4 py-3">{isGuest ? <div className="flex flex-col gap-2"><Link href="/auth/sign-up" className="flex h-10 w-full items-center justify-center bg-black text-sm font-extrabold text-white">Create account</Link><Link href="/auth/login" className="flex h-10 w-full items-center justify-center bg-gray-100 text-sm font-extrabold text-black">Log in</Link></div> : <button type="button" onClick={handleLogout} className="flex h-10 w-full items-center gap-3 px-2 text-sm font-semibold text-black hover:bg-gray-50"><LogOut className="h-[18px] w-[18px]" />Sign out</button>}<p className="pt-2 text-center text-[9px] text-gray-400">© 2026 Siyarwa Pull.</p></div>
      </div>
    </>
  )
}
