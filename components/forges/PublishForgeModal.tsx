'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Globe2, LockKeyhole, Share2, X } from 'lucide-react'

type Visibility = 'private' | 'public'

type PublishForgeModalProps = {
  forgeId: string
  forgeName: string
  templateType?: string
  isOpen: boolean
  onClose: () => void
  onPublish: (visibility: Visibility) => Promise<void>
}

const templateNames: Record<string, string> = {
  portfolio: 'portfolio', blog: 'blog', gallery: 'gallery', shop: 'shop', donation: 'campaign', game: 'game', custom: 'Forge',
}

export default function PublishForgeModal({ forgeId, forgeName, templateType = 'custom', isOpen, onClose, onPublish }: PublishForgeModalProps) {
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/preview/${forgeId}` : `/preview/${forgeId}`
  const templateLabel = templateNames[templateType] || 'Forge'

  useEffect(() => {
    if (!isOpen) {
      setPublished(false); setPublishing(false); setCopied(false); setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const publish = async () => {
    setPublishing(true); setError(null)
    try { await onPublish(visibility); setPublished(true) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Publishing failed. Please try again.') }
    finally { setPublishing(false) }
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#101416]/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="publish-forge-title">
    <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-[#fbfcfa] shadow-2xl sm:max-w-[520px] sm:rounded-[28px]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-[#fbfcfa]/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#eef8c9] text-[#6f9000]"><Share2 className="h-4 w-4" /></span><span className="text-sm font-black">Publish {templateLabel}</span></div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-gray-500 hover:bg-gray-100" aria-label="Close publish dialog"><X className="h-5 w-5" /></button>
      </div>

      <div className="space-y-5 px-5 pb-7 pt-6 sm:px-7">
        {!published ? <>
          <div><p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6f9000]">pull. publish studio</p><h2 id="publish-forge-title" className="mt-2 text-3xl font-black tracking-[-0.06em] text-[#14181c]">Make {forgeName} ready to share.</h2><p className="mt-2 text-sm leading-6 text-gray-600">Choose who can view this {templateLabel}. You can change this later from the edit workspace.</p></div>
          <div className="space-y-3">
            <button type="button" onClick={() => setVisibility('public')} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${visibility === 'public' ? 'border-[#14181c] bg-[#f1f9d4] ring-2 ring-[#b7f23a]' : 'border-gray-200 bg-white'}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#6f9000]"><Globe2 className="h-5 w-5" /></span><span><strong className="block text-sm">Public on Siyarwa Pull</strong><span className="mt-1 block text-xs leading-5 text-gray-600">Anyone with your Siyarwa Pull link can view the published {templateLabel}.</span></span><span className={`ml-auto mt-1 h-4 w-4 rounded-full border-2 ${visibility === 'public' ? 'border-[#6f9000] bg-[#6f9000] ring-2 ring-white ring-inset' : 'border-gray-300'}`} /></button>
            <button type="button" onClick={() => setVisibility('private')} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${visibility === 'private' ? 'border-[#14181c] bg-[#f5f6f4] ring-2 ring-[#b7f23a]' : 'border-gray-200 bg-white'}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-gray-600"><LockKeyhole className="h-5 w-5" /></span><span><strong className="block text-sm">Keep it private</strong><span className="mt-1 block text-xs leading-5 text-gray-600">Only you and permitted collaborators can view it.</span></span><span className={`ml-auto mt-1 h-4 w-4 rounded-full border-2 ${visibility === 'private' ? 'border-[#6f9000] bg-[#6f9000] ring-2 ring-white ring-inset' : 'border-gray-300'}`} /></button>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Your Siyarwa Pull link</p><div className="mt-2 flex items-center gap-2"><div className="min-w-0 flex-1 truncate rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-600">{shareUrl}</div><button type="button" onClick={copyLink} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#14181c] text-white" aria-label="Copy Siyarwa Pull link">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div><p className="mt-2 text-[11px] text-gray-500">The link stays the same if you update this Forge later.</p></div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
          <button type="button" onClick={() => void publish()} disabled={publishing} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#14181c] px-4 py-3 font-bold text-white transition hover:bg-black disabled:opacity-50">{publishing ? 'Publishing…' : visibility === 'public' ? 'Publish publicly' : 'Publish privately'}</button>
        </> : <div className="py-7 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#b7f23a] text-[#14181c]"><Check className="h-8 w-8" /></div><h2 id="publish-forge-title" className="mt-5 text-3xl font-black tracking-[-0.06em]">{visibility === 'public' ? 'You’re live.' : 'Published privately.'}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-600">{forgeName} is now published. {visibility === 'public' ? 'Share the Siyarwa Pull link whenever you’re ready.' : 'You can make it public later.'}</p><div className="mt-5 flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 text-left"><div className="min-w-0 flex-1 truncate px-2 text-xs text-gray-600">{shareUrl}</div><button type="button" onClick={copyLink} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#14181c] px-3 py-2 text-xs font-bold text-white">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}</button></div><button type="button" onClick={onClose} className="mt-5 min-h-12 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-[#14181c]">Back to edit</button></div>}
      </div>
    </div>
  </div>
}
