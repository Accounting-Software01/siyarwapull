import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

/* =========================================================================
   Limits & allowed types
   ========================================================================= */

const MAX_PDF_BYTES = 50 * 1024 * 1024   // 50 MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB

const PDF_MIME = 'application/pdf'
const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

/* =========================================================================
   Magic-byte checks (client-supplied MIME is not trustworthy)
   ========================================================================= */

function isPdf(buffer: Buffer): boolean {
  return (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  )
}

function isImage(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false

  if (mime === 'image/jpeg') {
    // FF D8 FF
    return (
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    )
  }

  if (mime === 'image/png') {
    // 89 50 4E 47 0D 0A 1A 0A
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    )
  }

  if (mime === 'image/gif') {
    // GIF87a or GIF89a
    const sig = buffer.subarray(0, 6).toString('ascii')
    return sig === 'GIF87a' || sig === 'GIF89a'
  }

  if (mime === 'image/webp') {
    // RIFF .... WEBP
    const riff = buffer.subarray(0, 4).toString('ascii')
    const webp = buffer.subarray(8, 12).toString('ascii')
    return riff === 'RIFF' && webp === 'WEBP'
  }

  return false
}

/* =========================================================================
   Filename sanitization — prevents path traversal
   ========================================================================= */

function safeFilename(name: string, fallbackExt: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
  if (!cleaned) return `file${fallbackExt}`
  // ensure it has an extension
  return /\.[a-zA-Z0-9]{1,8}$/.test(cleaned)
    ? cleaned
    : `${cleaned}${fallbackExt}`
}

/* =========================================================================
   POST handler
   ========================================================================= */

export async function POST(req: NextRequest) {
  try {
    /* ---- 1. Authenticate ---- */
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    /* ---- 2. Parse form data ---- */
    const form = await req.formData()
    const file = form.get('file') as File | null
    const forgeId = form.get('forgeId') as string | null
    const assetKey = form.get('assetKey') as string | null
    const declaredMime = form.get('mime') as string | null

    if (!file || !forgeId || !assetKey) {
      return NextResponse.json(
        { error: 'Missing file, forgeId, or assetKey' },
        { status: 400 }
      )
    }

    /* ---- 3. Classify file ---- */
    const mime = file.type || declaredMime || ''
    const isPdfFile = mime === PDF_MIME
    const isImgFile = IMAGE_MIMES.has(mime)

    if (!isPdfFile && !isImgFile) {
      return NextResponse.json(
        { error: 'Only PDF or image files are allowed' },
        { status: 415 }
      )
    }

    /* ---- 4. Size check ---- */
    if (file.size === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 })
    }
    const limit = isPdfFile ? MAX_PDF_BYTES : MAX_IMAGE_BYTES
    if (file.size > limit) {
      return NextResponse.json(
        { error: `File exceeds ${isPdfFile ? '50' : '10'} MB limit` },
        { status: 413 }
      )
    }

    /* ---- 5. Authorize — user owns this forge ---- */
    const { data: forge, error: forgeError } = await supabase
      .from('forges')
      .select('id, user_id')
      .eq('id', forgeId)
      .single()

    if (forgeError || !forge) {
      return NextResponse.json({ error: 'Forge not found' }, { status: 404 })
    }
    if (forge.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    /* ---- 6. Read bytes + verify magic bytes ---- */
    const buffer = Buffer.from(await file.arrayBuffer())

    if (isPdfFile && !isPdf(buffer)) {
      return NextResponse.json(
        { error: 'File is not a valid PDF' },
        { status: 415 }
      )
    }
    if (isImgFile && !isImage(buffer, mime)) {
      return NextResponse.json(
        { error: 'File is not a valid image' },
        { status: 415 }
      )
    }

    /* ---- 7. Store ---- */
    const fallbackExt = isPdfFile ? '.pdf' : '.img'
    const safeName = safeFilename(file.name, fallbackExt)
    const assetId = randomUUID()
    const dir = join(process.cwd(), 'uploads', 'forges', forgeId)
    await mkdir(dir, { recursive: true })
    const filePath = join(dir, `${assetId}-${safeName}`)
    await writeFile(filePath, buffer)

    const publicUrl = `/uploads/forges/${forgeId}/${assetId}-${safeName}`

    /* ---- 8. Persist asset record ---- */
    const { error: insertError } = await supabase
      .from('forge_assets')
      .insert({
        id: assetId,
        forge_id: forgeId,
        asset_key: assetKey,
        filename: safeName,
        mime,
        size: file.size,
        url: publicUrl,
      })

    if (insertError) {
      console.error('[upload-asset] db insert failed', insertError)
      return NextResponse.json(
        { error: 'Could not save asset record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      assetKey,
      id: assetId,
    })
  } catch (err) {
    console.error('[upload-asset]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
  }
