'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

/**
 * Shared building blocks so every card in the feed looks like the news card:
 * edge-to-edge on phones (the dashboard column has px-5, so we pull out by 1.25rem),
 * same colours, border, shadow and typography.
 */

export function CardShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <article
      className={`relative isolate -mx-5 mb-4 block w-[calc(100%+2.5rem)] max-w-none min-w-0 overflow-hidden rounded-[14px] border border-[#deded9] bg-[#fbfaf6] text-[#14181c] shadow-[0_14px_35px_rgba(31,35,38,0.08)] sm:mx-auto sm:w-full sm:max-w-full sm:rounded-[18px] ${className}`}
    >
      {children}
    </article>
  )
}

const initials = (value: string) =>
  value.split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'S'

export function CardHeader({
  name, href, avatarUrl, icon, meta, badge,
}: {
  name: string
  href?: string | null
  avatarUrl?: string | null
  icon?: ReactNode
  meta: ReactNode
  badge?: string
}) {
  const title = (
    <div className="truncate text-[1.06rem] font-semibold leading-tight tracking-[-0.02em]">{name}</div>
  )
  return (
    <div className="flex items-start gap-4 px-5 pt-5 sm:px-7 sm:pt-7">
      {icon ? (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1f2326] text-[#b7f23a]" aria-hidden="true">{icon}</div>
      ) : avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1f2326] text-sm font-semibold text-[#b7f23a]" aria-hidden="true">{initials(name)}</div>
      )}
      <div className="min-w-0 flex-1 pt-0.5">
        {href ? <Link href={href}>{title}</Link> : title}
        <div className="mt-1 flex items-center gap-2 text-[0.98rem] text-[#7d8387]">{meta}</div>
      </div>
      {badge && (
        <span className="mt-1 shrink-0 rounded-full bg-[#b7f23a] px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-wider text-[#14181c]">{badge}</span>
      )}
      <button type="button" aria-label="More options" className="rounded-full p-1.5 text-[#7d8387] transition-colors hover:bg-[#efefea]">
        <MoreHorizontal className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  )
}

/** Compact stats line + action bar (smaller than before). */
export function CardFooter({ stats, children }: { stats?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-5 pb-1.5 pt-3 sm:px-7 sm:pb-2 sm:pt-4">
      {stats && <div className="flex items-center gap-2 text-[0.8rem] text-[#7d8387]">{stats}</div>}
      <div className="mt-2.5 flex min-w-0 items-center border-t border-[#d9d9d4] pt-1">{children}</div>
    </div>
  )
}

const actionClass = (active: boolean) =>
  `inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden border-r border-[#d9d9d4] px-1 text-[0.78rem] font-semibold transition-colors last:border-r-0 ${
    active ? 'text-[#9ac500]' : 'text-[#14181c] hover:bg-[#efefea]'
  }`

export function ActionButton({
  active = false, label, onClick, children,
}: { active?: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} aria-pressed={active} onClick={onClick} className={actionClass(active)}>
      {children}
    </button>
  )
}

export function ActionLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link href={href} aria-label={label} className={actionClass(false)}>
      {children}
    </Link>
  )
}

/** Icon size used inside action buttons. */
export const ACTION_ICON = 'h-[18px] w-[18px]'
