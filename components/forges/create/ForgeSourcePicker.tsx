"use client"

import { FileArchive, Link2, Upload } from 'lucide-react'

export function ForgeSourcePicker({
  mode,
  url,
  file,
  onModeChange,
  onUrlChange,
  onFileChange,
  allowLink = true,
  label = 'How should Siyarwa Pull open this project?',
}: {
  mode: 'link' | 'zip'
  url: string
  file: File | null
  onModeChange: (mode: 'link' | 'zip') => void
  onUrlChange: (url: string) => void
  onFileChange: (file: File | null) => void
  allowLink?: boolean
  label?: string
}) {
  return <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
    <div><h3 className="font-bold text-gray-900">{label}</h3><p className="mt-1 text-xs leading-5 text-gray-500">Use a public link if the project already exists, or bring the complete project ZIP.</p></div>
    <div className={`grid gap-3 ${allowLink ? 'sm:grid-cols-2' : ''}`}>
      {allowLink && <button type="button" onClick={() => onModeChange('link')} className={`rounded-2xl border p-4 text-left ${mode==='link' ? 'border-[#14181c] bg-[#f5f9e6] ring-2 ring-[#b7f23a]' : 'border-gray-200'}`}><Link2 className="mb-3 h-5 w-5 text-[#6f9000]" /><p className="font-bold">Use an external link</p><p className="mt-1 text-xs text-gray-500">Point people to the live project.</p></button>}
      <button type="button" onClick={() => onModeChange('zip')} className={`rounded-2xl border p-4 text-left ${mode==='zip' ? 'border-[#14181c] bg-[#f5f9e6] ring-2 ring-[#b7f23a]' : 'border-gray-200'}`}><FileArchive className="mb-3 h-5 w-5 text-[#6f9000]" /><p className="font-bold">Upload a complete ZIP</p><p className="mt-1 text-xs text-gray-500">HTML, CSS, JS, and assets.</p></button>
    </div>
    {allowLink && mode === 'link' && <input type="url" value={url} onChange={e=>onUrlChange(e.target.value)} placeholder="https://your-site.com" className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#b7f23a]" />}
    {mode === 'zip' && <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-4 hover:border-[#b7f23a]"><Upload className="h-5 w-5 text-[#6f9000]" /><span className="min-w-0 flex-1 truncate text-sm text-gray-600">{file?.name || 'Choose a .zip file'}</span><input type="file" accept=".zip" className="hidden" onChange={e=>onFileChange(e.target.files?.[0] || null)} /></label>}
  </div>
}
