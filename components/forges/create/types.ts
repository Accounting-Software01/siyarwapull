import type { ForgeTemplate } from '@/lib/forge-templates'

export type ForgeAsset = {
  key: string          // e.g. "book:abc123"
  file: File
  mime: string         // 'application/pdf'
}

export type ForgeDraft = {
  name: string
  description: string
  template_type: ForgeTemplate
  config: Record<string, unknown>
  sourceMode?: 'link' | 'zip'
  sourceUrl?: string
  zipFile?: File | null
  extraAssets?: ForgeAsset[]     // ← NEW
  isCollaborative?: boolean
  isPublicPreview?: boolean
}

export type ForgeFormProps = {
  onBack: () => void
  onSubmit: (draft: ForgeDraft) => Promise<void>
  submitting?: boolean
}
