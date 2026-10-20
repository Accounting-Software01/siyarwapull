import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getForgeRole } from '@/lib/server/get-forge-role'
import { canDeleteForge, canPublish } from '@/lib/forge-permissions'
import { FORGE_TEMPLATES, type ForgeTemplate } from '@/lib/forge-templates'

const TEMPLATE_KEYS = Object.keys(FORGE_TEMPLATES) as ForgeTemplate[]
const LINK_TEMPLATES = new Set<ForgeTemplate>(['portfolio', 'blog', 'game', 'custom'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validHttpUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateTemplate(template: ForgeTemplate, config: Record<string, unknown>, sourceMode?: unknown, sourceUrl?: unknown) {
  const required = template === 'portfolio' || template === 'blog' || template === 'gallery' || template === 'shop' || template === 'donation' || template === 'game'
  if (required && !String(config.title ?? config.storeName ?? '').trim()) {
    return 'A title or store name is required'
  }
  if (template === 'donation') {
    if (!String(config.message ?? '').trim()) return 'A donation story is required'
    if (!String(config.cause ?? '').trim()) return 'A donation cause is required'
    if (!String(config.beneficiary ?? '').trim()) return 'A beneficiary is required'
    if (typeof config.targetAmount !== 'number' || !Number.isFinite(config.targetAmount) || config.targetAmount <= 0) return 'A valid donation target is required'
  }
  if (template === 'shop') {
    if (!String(config.currency ?? '').trim()) return 'A currency is required'
    if (!Array.isArray(config.products) || config.products.length === 0) return 'Add at least one product'
  }
  if (template === 'gallery' && (!Array.isArray(config.images) || config.images.length === 0)) return 'Add at least one image URL'
  if (sourceMode !== undefined && sourceMode !== 'link' && sourceMode !== 'zip') return 'source_mode must be link or zip'
  if (sourceMode === 'link' && !LINK_TEMPLATES.has(template)) return 'This template does not support an external link'
  if (sourceMode === 'link' && !validHttpUrl(sourceUrl)) return 'A valid http:// or https:// source_url is required'
  return null
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, template_type, description, config, is_collaborative, is_public_preview, preview_token, source_mode, source_url } = body
    if (typeof name !== 'string' || !name.trim() || typeof template_type !== 'string') {
      return NextResponse.json({ error: 'A name and template_type are required' }, { status: 400 })
    }
    if (!TEMPLATE_KEYS.includes(template_type as ForgeTemplate)) {
      return NextResponse.json({ error: 'Unsupported template type' }, { status: 400 })
    }
    const safeConfig = isRecord(config) ? config : {}
    const validationError = validateTemplate(template_type as ForgeTemplate, safeConfig, source_mode, source_url)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const persistedConfig = {
      ...safeConfig,
      _source: {
        mode: source_mode === 'link' ? 'link' : 'zip',
        url: source_mode === 'link' ? String(source_url).trim() : null,
      },
    }

    const { data, error } = await supabase.from('forges').insert({
      user_id: user.id,
      name: name.trim(),
      template_type,
      description: typeof description === 'string' ? description.trim() || null : null,
      config: persistedConfig,
      is_published: false,
      is_collaborative: Boolean(is_collaborative),
      is_public_preview: Boolean(is_public_preview),
      preview_token: preview_token || null,
    }).select().single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[Forge POST]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const forgeId = new URL(req.url).searchParams.get('id')
  if (!forgeId) return NextResponse.json({ error: 'Missing forgeId' }, { status: 400 })
  const supabase = await createClient()
  const { data: forge, error } = await supabase.from('forges').select('*').eq('id', forgeId).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!forge) return NextResponse.json({ error: 'Forge not found' }, { status: 404 })
  if (forge.is_public_preview || forge.is_published) return NextResponse.json(forge)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Forge not found' }, { status: 404 })
  const role = await getForgeRole(supabase, forgeId, user.id)
  if (!role) return NextResponse.json({ error: 'Forge not found' }, { status: 404 })
  return NextResponse.json(forge)
}

export async function PUT(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, name, description, config, is_published, is_public_preview, custom_code } = body
    if (!id) return NextResponse.json({ error: 'Missing forge id' }, { status: 400 })
    const role = await getForgeRole(supabase, id, user.id)
    if (role !== 'owner') return NextResponse.json({ error: 'Only the owner can update Forge settings' }, { status: 403 })

    const { data: current } = await supabase.from('forges').select('template_type, config').eq('id', id).single()
    const nextConfig = config !== undefined ? (isRecord(config) ? config : null) : current?.config
    if (!nextConfig) return NextResponse.json({ error: 'config must be an object' }, { status: 400 })
    const validationError = validateTemplate(current.template_type as ForgeTemplate, nextConfig)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    if ((is_published !== undefined || is_public_preview !== undefined) && !canPublish(role)) {
      return NextResponse.json({ error: 'Only the owner can publish a Forge' }, { status: 403 })
    }

    const { data, error } = await supabase.from('forges').update({
      ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(config !== undefined ? { config: nextConfig } : {}),
      ...(is_published !== undefined ? { is_published: Boolean(is_published) } : {}),
      ...(is_public_preview !== undefined ? { is_public_preview: Boolean(is_public_preview) } : {}),
      ...(typeof custom_code === 'string' ? { custom_code } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', id).eq('user_id', user.id).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing forge id' }, { status: 400 })
  const role = await getForgeRole(supabase, id, user.id)
  if (!canDeleteForge(role)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const { error, count } = await supabase.from('forges').delete({ count: 'exact' }).eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ error: 'Forge not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
