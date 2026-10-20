"use client"

import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useId, useRef, useState, type ReactNode, type FormEvent } from 'react'
import type { ForgeDraft, ForgeFormProps } from './types'

export function ForgeCreationShell({
  title,
  eyebrow,
  description,
  onBack,
  onSubmit,
  submitting = false,
  children,
  draft,
}: ForgeFormProps & {
  title: string
  eyebrow: string
  description: string
  children: ReactNode
  draft: ForgeDraft
}) {
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting || submittingRef.current) return

    submittingRef.current = true
    setError(null)

    try {
      await onSubmit(draft)
    } catch (err) {
      // Log full details for debugging; show friendly message to the user.
      console.error('[ForgeCreationShell]', err)

      const raw = err instanceof Error ? err.message : ''
      const friendly =
        raw.includes('upload') || raw.includes('Upload')
          ? 'Your Forge was created, but some files failed to upload. Open the Forge to retry.'
          : raw || 'Something went wrong. Please try again.'
      setError(friendly)
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <div
      className="min-h-[100dvh] bg-[#f7f8f5] pt-[env(safe-area-inset-top)]"
    >
      <div className="mx-auto max-w-5xl px-4 py-4 pb-4 md:py-8">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to all Forge types"
          className="mb-4 inline-flex h-10 items-center gap-1.5 rounded-full pr-3 text-sm font-semibold text-gray-600 transition active:scale-[0.97] active:bg-black/5"
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.2} />
          All Forge types
        </button>

        <header className="mb-5 rounded-3xl bg-[#14181c] p-5 text-white md:p-8">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#b7f23a]">
            {eyebrow}
          </p>
          <h1 className="text-[28px] font-black leading-[1.05] tracking-[-0.04em] md:text-5xl">
            {title}
          </h1>
          <p className="mt-2.5 max-w-2xl text-[14px] leading-[1.5] text-white/65 md:text-base">
            {description}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {children}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" strokeWidth={2.2} />
              <p className="text-[13px] leading-[1.5] text-red-800">{error}</p>
            </div>
          )}

          {/* Sticky on mobile, static on desktop. Safe-area padding only on mobile. */}
          <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-gray-200/70 bg-white/90 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl md:static md:mx-0 md:mt-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#14181c] px-5 text-[16px] font-bold text-white transition active:scale-[0.99] hover:bg-black disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Creating Forge…' : `Create ${title}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  hint,
  error,
  required = false,
  type = 'text',
  maxLength,
  minLength,
  min,
  max,
  step,
  inputMode,
  autoComplete,
  autoFocus = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
  hint?: string
  error?: string
  required?: boolean
  type?: 'text' | 'url' | 'email' | 'number' | 'date' | 'tel'
  maxLength?: number
  minLength?: number
  min?: number | string
  max?: number | string
  step?: number | string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'url' | 'tel'
  autoComplete?: string
  autoFocus?: boolean
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const invalid = Boolean(error)

  const base =
    'w-full rounded-xl border bg-white px-4 text-[16px] text-gray-900 placeholder:text-gray-400 outline-none transition'
  const border = invalid
    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
    : 'border-gray-300 focus:border-[#b7f23a] focus:ring-2 focus:ring-[#b7f23a]/25'

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-gray-900">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`${base} ${border} resize-none py-3 leading-[1.5]`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          min={min}
          max={max}
          step={step}
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`${base} ${border} h-12`}
        />
      )}

      {hint && !error && (
        <p id={hintId} className="mt-1 text-[12px] leading-[1.4] text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-[12px] leading-[1.4] text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white p-5 md:p-6">
      {children}
    </section>
  )
}
