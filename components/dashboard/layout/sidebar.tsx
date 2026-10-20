'use client'

import Link from 'next/link'
import { ArrowUpRight, Bookmark, Check, ChevronRight, Sparkles, Users, Zap } from 'lucide-react'
import AvatarCircle from '@/components/dashboard/shared/avatar-circle'

type SuggestedUser = {
  id: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  bio?: string | null
}

type SidebarProps = {
  suggestedUsers: SuggestedUser[]
  followingSet: Set<string>
  onFollow: (userId: string) => void
  savedCount?: number
}

export default function Sidebar({ suggestedUsers, followingSet, onFollow, savedCount = 0 }: SidebarProps) {
  return (
    <aside className="sticky top-5 hidden h-[calc(100dvh-2.5rem)] w-[clamp(220px,23vw,285px)] min-w-0 shrink-0 flex-col gap-3 overflow-y-auto overscroll-contain pb-5 pr-1 lg:flex">
      {suggestedUsers.length > 0 && (
        <section className="border border-[#dfe3dc] bg-white">
          <div className="flex items-center justify-between border-b border-[#e9ece6] px-3.5 py-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#779f00]"><Sparkles className="h-3 w-3" /> For you</div>
              <h3 className="truncate text-sm font-bold tracking-[-0.02em] text-[#14181c]">Creators to discover</h3>
              <p className="mt-0.5 truncate text-[10px] text-[#7d8387]">Fresh voices worth knowing.</p>
            </div>
            <Link href="/search" className="inline-flex shrink-0 items-center gap-1 border border-[#dfe3dc] px-2 py-1 text-[10px] font-bold text-[#535a5e] transition hover:border-[#b7f23a] hover:bg-[#f6faec] hover:text-[#14181c]">See all<ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-[#f0f2ee]">
            {suggestedUsers.slice(0, 4).map((user) => {
              const isFollowing = followingSet.has(user.id)
              const name = user.display_name || user.username || 'Fleex creator'
              return (
                <div key={user.id} className="group flex items-center gap-2.5 px-3.5 py-2.5 transition hover:bg-[#fbfcf9]">
                  <Link href={`/profile/${user.username || user.id}`} className="shrink-0"><AvatarCircle src={user.avatar_url} name={name} size={32} /></Link>
                  <Link href={`/profile/${user.username || user.id}`} className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#14181c] group-hover:text-[#779f00]">{name}</p><p className="truncate text-[10px] text-[#8a9092]">@{user.username || 'creator'}</p></Link>
                  <button type="button" onClick={() => onFollow(user.id)} aria-label={isFollowing ? `Following ${name}` : `Follow ${name}`} className={`flex h-7 shrink-0 items-center justify-center border px-2.5 text-[10px] font-bold transition active:scale-95 ${isFollowing ? 'border-[#dfe3dc] bg-white text-[#687074] hover:border-[#b7f23a]' : 'border-[#14181c] bg-[#14181c] text-white hover:bg-[#b7f23a] hover:text-[#14181c]'}`}>{isFollowing ? <Check className="h-3 w-3 text-[#779f00]" /> : 'Follow'}</button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="border border-[#dfe3dc] bg-white p-3.5">
        <div className="mb-3 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#779f00]">Your space</p><h3 className="mt-0.5 text-sm font-bold tracking-[-0.02em] text-[#14181c]">Activity overview</h3></div><Users className="h-4 w-4 text-[#8a9092]" /></div>
        <div className="grid grid-cols-2 gap-2"><div className="border border-[#e7ebe4] bg-[#fbfcf9] px-2.5 py-2"><p className="text-xl font-black tracking-[-0.05em] text-[#14181c]">{followingSet.size}</p><div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-[#7d8387]"><Users className="h-3 w-3" />Following</div></div><div className="border border-[#e7ebe4] bg-[#fbfcf9] px-2.5 py-2"><p className="text-xl font-black tracking-[-0.05em] text-[#14181c]">{savedCount}</p><div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-[#7d8387]"><Bookmark className="h-3 w-3" />Saved</div></div></div>
      </section>

      <Link href="/spark" className="group relative overflow-hidden border border-[#1f2326] bg-[#1f2326] p-3.5 text-white transition hover:border-[#b7f23a]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#b7f23a]/15 blur-2xl" />
        <div className="relative"><div className="mb-4 flex items-center justify-between"><div className="flex h-8 w-8 items-center justify-center bg-[#b7f23a] text-[#14181c]"><Zap className="h-4 w-4 fill-current" /></div><span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#b7f23a]">Discover</span></div><h3 className="text-sm font-bold tracking-[-0.02em]">Explore Spark</h3><p className="mt-1 text-[10px] leading-relaxed text-white/60">Find rising Forges, sharp ideas, and creators shaping what comes next.</p><span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-[#b7f23a]">Browse Spark <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" /></span></div>
      </Link>

      <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[9px] font-medium text-[#a0a4a6]"><span>© 2026 Fleex</span><a href="#" className="hover:text-[#14181c]">Terms</a><a href="#" className="hover:text-[#14181c]">Privacy</a><span className="text-[#779f00]">● Built for discovery</span></footer>
    </aside>
  )
}
