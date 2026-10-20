'use client'

import { useEffect, useState } from 'react'
import type { ForgeTemplate } from '@/lib/forge-templates'

const labels: Record<ForgeTemplate, { title: string; description: string }> = {
  portfolio: { title: 'Portfolio content', description: 'Keep the story, selected work, and contact details current.' },
  blog: { title: 'Editorial content', description: 'Manage your author profile, categories, and featured article.' },
  gallery: { title: 'Gallery content', description: 'Add image URLs and captions as one visual collection.' },
  shop: { title: 'Storefront content', description: 'Manage products, prices, and stock before activating payments.' },
  donation: { title: 'Campaign content', description: 'Keep the campaign story and supporter updates trustworthy.' },
  game: { title: 'Game content', description: 'Explain how the game works and what players should expect.' },
  custom: { title: 'Build settings', description: 'Keep the runtime and deployment settings beside the project.' },
}

function Field({ label, value, onChange, placeholder, multiline = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-gray-900">{label}</span>{multiline ? <textarea value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} rows={5} className="w-full resize-y rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#b7f23a]" /> : <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#b7f23a]" />}</label>
}

export default function TemplateContentPanel({ templateType, config, canEdit, onSave }: { templateType: ForgeTemplate; config: Record<string, unknown>; canEdit: boolean; onSave: (config: Record<string, unknown>) => Promise<void> }) {
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const meta = labels[templateType]

  useEffect(() => {
    const list = (value: unknown) => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join('\n') : ''
    setDraft({
      headline: String(config.subtitle ?? config.headline ?? ''),
      bio: String(config.bio ?? config.message ?? config.businessDescription ?? ''),
      author: String(config.author ?? ''),
      categories: Array.isArray(config.categories) ? config.categories.join(', ') : String(config.categories ?? ''),
      items: list(config.projects ?? config.images ?? config.products ?? config.articles ?? config.updates),
      cause: String(config.cause ?? ''),
      beneficiary: String(config.beneficiary ?? ''),
      targetAmount: String(config.targetAmount ?? ''),
      instructions: String(config.instructions ?? ''),
      runtime: String(config.runtime ?? ''),
      buildCommand: String(config.buildCommand ?? ''),
      startCommand: String(config.startCommand ?? ''),
      environment: String(config.environment ?? ''),
    })
  }, [config, templateType])

  const set = (key: string, value: string) => setDraft(current => ({ ...current, [key]: value }))
  const lines = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean)

  const save = async () => {
    setSaving(true)
    try {
      const next = { ...config }
      if (templateType === 'portfolio') Object.assign(next, { subtitle: draft.headline, bio: draft.bio, projects: lines(draft.items) })
      if (templateType === 'blog') Object.assign(next, { author: draft.author, categories: draft.categories.split(',').map(value => value.trim()).filter(Boolean), featuredArticle: draft.items })
      if (templateType === 'gallery') Object.assign(next, { images: lines(draft.items) })
      if (templateType === 'shop') Object.assign(next, { businessDescription: draft.bio, products: lines(draft.items) })
      if (templateType === 'donation') Object.assign(next, { message: draft.bio, cause: draft.cause, beneficiary: draft.beneficiary, targetAmount: Number(draft.targetAmount) })
      if (templateType === 'game') Object.assign(next, { instructions: draft.instructions })
      if (templateType === 'custom') Object.assign(next, { runtime: draft.runtime, buildCommand: draft.buildCommand, startCommand: draft.startCommand, environment: draft.environment })
      await onSave(next)
    } finally { setSaving(false) }
  }

  return <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
    <div className="mb-5"><p className="text-lg font-black tracking-[-0.03em] text-gray-900">{meta.title}</p><p className="mt-1 text-sm text-gray-500">{meta.description}</p></div>
    <div className="space-y-4">
      {templateType === 'portfolio' && <><Field label="Headline" value={draft.headline || ''} onChange={value => set('headline', value)} placeholder="Product designer · Lagos" /><Field label="Bio" value={draft.bio || ''} onChange={value => set('bio', value)} multiline /><Field label="Projects (one per line)" value={draft.items || ''} onChange={value => set('items', value)} placeholder="Project name — https://…" multiline /></>}
      {templateType === 'blog' && <><Field label="Author" value={draft.author || ''} onChange={value => set('author', value)} /><Field label="Categories" value={draft.categories || ''} onChange={value => set('categories', value)} placeholder="Culture, ideas, technology" /><Field label="Featured article" value={draft.items || ''} onChange={value => set('items', value)} multiline /></>}
      {templateType === 'gallery' && <><Field label="Image URLs (one per line)" value={draft.items || ''} onChange={value => set('items', value)} placeholder="https://cdn.example.com/image.jpg" multiline /></>}
      {templateType === 'shop' && <><Field label="Business description" value={draft.bio || ''} onChange={value => set('bio', value)} multiline /><Field label="Products (one per line)" value={draft.items || ''} onChange={value => set('items', value)} placeholder="Notebook — 12000 — 10 in stock" multiline /></>}
      {templateType === 'donation' && <><Field label="Campaign story" value={draft.bio || ''} onChange={value => set('bio', value)} multiline /><Field label="Cause" value={draft.cause || ''} onChange={value => set('cause', value)} /><Field label="Beneficiary" value={draft.beneficiary || ''} onChange={value => set('beneficiary', value)} /><Field label="Target amount" value={draft.targetAmount || ''} onChange={value => set('targetAmount', value)} /></>}
      {templateType === 'game' && <><Field label="Controls and instructions" value={draft.instructions || ''} onChange={value => set('instructions', value)} multiline /></>}
      {templateType === 'custom' && <><Field label="Framework or runtime" value={draft.runtime || ''} onChange={value => set('runtime', value)} placeholder="Next.js, React, static HTML" /><Field label="Build command" value={draft.buildCommand || ''} onChange={value => set('buildCommand', value)} placeholder="npm run build" /><Field label="Start command" value={draft.startCommand || ''} onChange={value => set('startCommand', value)} placeholder="npm start" /><Field label="Environment notes" value={draft.environment || ''} onChange={value => set('environment', value)} multiline /></>}
    </div>
    {canEdit && <button type="button" onClick={() => void save()} disabled={saving} className="mt-5 rounded-xl bg-[#14181c] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save content'}</button>}
  </section>
}
