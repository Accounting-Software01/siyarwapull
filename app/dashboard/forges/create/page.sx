'use client'

import { useState } from 'react'
import { ArrowRight, BookOpen, Camera, HeartHandshake, Image, ShoppingBag, Sparkles, UserRound, Gamepad2, Code2 } from 'lucide-react'
import { BlogForgeForm } from '@/components/forges/create/BlogForgeForm'
import { CustomForgeForm } from '@/components/forges/create/CustomForgeForm'
import { DonationForgeForm } from '@/components/forges/create/DonationForgeForm'
import { GalleryForgeForm } from '@/components/forges/create/GalleryForgeForm'
import { GameForgeForm } from '@/components/forges/create/GameForgeForm'
import { PortfolioForgeForm } from '@/components/forges/create/PortfolioForgeForm'
import { ShopForgeForm } from '@/components/forges/create/ShopForgeForm'
import type { ForgeDraft, ForgeFormProps } from '@/components/forges/create/types'
import type { ForgeTemplate } from '@/lib/forge-templates'

const templates: Array<{
  key: ForgeTemplate
  name: string
  description: string
  bestFor: string
  input: string
  icon: typeof UserRound
}> = [
  { key: 'portfolio', name: 'Portfolio', description: 'Showcase your work and projects', bestFor: 'Creators, professionals, and freelancers', input: 'Profile, projects, link or ZIP', icon: UserRound },
  { key: 'blog', name: 'Blog', description: 'Write and share articles', bestFor: 'Writers, publications, and thinkers', input: 'Articles, author, link or ZIP', icon: BookOpen },
  { key: 'gallery', name: 'Gallery', description: 'Display images and artwork', bestFor: 'Photographers, designers, and artists', input: 'Images, captions, and layout', icon: Image },
  { key: 'shop', name: 'Shop', description: 'Sell products and services', bestFor: 'Businesses and independent sellers', input: 'Products, prices, and storefront details', icon: ShoppingBag },
  { key: 'donation', name: 'Donation', description: 'Collect donations or tips', bestFor: 'Causes, campaigns, and community support', input: 'Story, goal, beneficiary, and cause', icon: HeartHandshake },
  { key: 'game', name: 'Game', description: 'Create mini-games', bestFor: 'Interactive experiences and playable projects', input: 'Game details, link or ZIP', icon: Gamepad2 },
  { key: 'custom', name: 'Custom', description: 'Code your own Forge', bestFor: 'Developers and advanced projects', input: 'Runtime details, link or ZIP', icon: Code2 },
]

export default function CreateForgePage() {
  const [selected, setSelected] = useState<ForgeTemplate | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onBack = () => setSelected(null)
  const onSubmit = async (draft: ForgeDraft) => {
    if (!draft.name.trim()) throw new Error('A name is required')
    if (draft.sourceMode === 'link' && !draft.sourceUrl?.trim()) throw new Error('Add the public project link')
    if (draft.sourceMode === 'zip' && !draft.zipFile) throw new Error('Choose a ZIP file first')
    setSubmitting(true)
    try {
      const response = await fetch('/api/forges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          template_type: draft.template_type,
          config: draft.config,
          source_mode: draft.sourceMode,
          source_url: draft.sourceUrl || null,
          is_collaborative: Boolean(draft.isCollaborative),
          is_public_preview: Boolean(draft.isPublicPreview),
        }),
      })
      const created = await response.json()
      if (!response.ok) throw new Error(created.error || 'Could not create Forge')

      if (draft.sourceMode === 'zip' && draft.zipFile) {
        const formData = new FormData()
        formData.append('file', draft.zipFile)
        formData.append('forgeId', created.id)
        const uploadResponse = await fetch('/api/forges/upload', { method: 'POST', body: formData })
        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json().catch(() => null)
          throw new Error(uploadError?.error || 'Forge created, but ZIP upload failed')
        }
      }
      window.location.assign(`/dashboard/forges/${created.id}/edit`)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not create Forge')
    } finally {
      setSubmitting(false)
    }
  }

  if (selected) {
    const props: ForgeFormProps = { onBack, onSubmit, submitting }
    switch (selected) {
      case 'portfolio': return <PortfolioForgeForm {...props} />
      case 'blog': return <BlogForgeForm {...props} />
      case 'gallery': return <GalleryForgeForm {...props} />
      case 'shop': return <ShopForgeForm {...props} />
      case 'donation': return <DonationForgeForm {...props} />
      case 'game': return <GameForgeForm {...props} />
      case 'custom': return <CustomForgeForm {...props} />
    }
  }

  return <main className="min-h-[100dvh] bg-[#f7f8f5]"><div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
    <header className="mb-8 max-w-3xl"><p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#6f9000]">pull. forge studio</p><h1 className="text-4xl font-black tracking-[-0.06em] text-[#14181c] md:text-6xl">What are you bringing into Pull?</h1><p className="mt-4 text-base leading-7 text-gray-600">Choose the shape that fits your work. Each Forge type has its own creation flow, inputs, and preview—no generic form pretending every project is the same.</p></header>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => { const Icon = template.icon; return <button key={template.key} type="button" onClick={() => setSelected(template.key)} className="group rounded-3xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#b7f23a] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#b7f23a]">
        <div className="mb-7 flex items-start justify-between"><div className="rounded-2xl bg-[#eef8c9] p-3 text-[#6f9000]"><Icon className="h-5 w-5" /></div><ArrowRight className="h-5 w-5 text-gray-300 transition group-hover:translate-x-1 group-hover:text-[#6f9000]" /></div>
        <h2 className="text-xl font-black tracking-[-0.03em] text-[#14181c]">{template.name}</h2><p className="mt-1 text-sm leading-5 text-gray-600">{template.description}</p><p className="mt-5 text-xs font-semibold text-gray-500">Best for {template.bestFor}</p><p className="mt-2 border-t border-gray-100 pt-3 text-xs text-gray-400">You’ll add: {template.input}</p>
      </button> })}
    </div>
    <div className="mt-8 flex items-center gap-2 text-xs text-gray-500"><Sparkles className="h-4 w-4 text-[#6f9000]" />Start with the format that matches the experience you want people to have.</div>
  </div></main>
}
