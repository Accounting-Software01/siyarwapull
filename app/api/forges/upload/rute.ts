import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getForgeRole } from '@/lib/server/get-forge-role'
import { canUpload } from '@/lib/forge-permissions'

// Hard caps to prevent zip-bomb / storage-abuse uploads.
const MAX_ZIP_BYTES = 25 * 1024 * 1024 // 25MB compressed upload
const MAX_FILE_COUNT = 500
const MAX_TOTAL_EXTRACTED_BYTES = 100 * 1024 * 1024 // 100MB decompressed
const MAX_SINGLE_FILE_BYTES = 20 * 1024 * 1024 // 20MB per file
const BLOCKED_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.msi', '.dll', '.php', '.phtml']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const forgeId = formData.get('forgeId') as string

    if (!file || !forgeId) {
      return NextResponse.json({ error: 'Missing file or forgeId' }, { status: 400 })
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Only .zip files are supported' }, { status: 400 })
    }

    if (file.size > MAX_ZIP_BYTES) {
      return NextResponse.json({ error: `Zip file too large (max ${MAX_ZIP_BYTES / 1024 / 1024}MB)` }, { status: 400 })
    }

    // Ownership/contributor check — this was previously missing entirely,
    // meaning any logged-in user could overwrite any forge's files by ID.
    const role = await getForgeRole(supabase, forgeId, user.id)
    if (!canUpload(role)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Get existing forge config
    const { data: existingForge } = await supabase
      .from('forges')
      .select('config')
      .eq('id', forgeId)
      .single()

    // Try unzipit first
    const arrayBuffer = await file.arrayBuffer()
    
    let files: { path: string; url: string }[] = []

    try {
      const { unzip } = await import('unzipit')
      const { entries } = await unzip(arrayBuffer)

      const entryList = Object.entries(entries).filter(
        ([path]) => !path.startsWith('__MACOSX') && !path.startsWith('.') && !path.endsWith('/')
      )

      if (entryList.length > MAX_FILE_COUNT) {
        return NextResponse.json({ error: `Too many files in zip (max ${MAX_FILE_COUNT})` }, { status: 400 })
      }

      let totalExtractedBytes = 0

      for (const [path, entry] of entryList) {
        // Reject path traversal — strip the top-level folder, then make sure
        // nothing in what's left can escape the forge's storage prefix.
        const cleanPath = path
          .replace(/^[^/]+\//, '')
          .split('/')
          .filter((seg) => seg !== '' && seg !== '.' && seg !== '..')
          .join('/')

        if (!cleanPath) continue

        const ext = cleanPath.slice(cleanPath.lastIndexOf('.')).toLowerCase()
        if (BLOCKED_EXTENSIONS.includes(ext)) {
          continue
        }

        if (entry.size > MAX_SINGLE_FILE_BYTES) {
          return NextResponse.json({ error: `File "${cleanPath}" exceeds the ${MAX_SINGLE_FILE_BYTES / 1024 / 1024}MB per-file limit` }, { status: 400 })
        }

        totalExtractedBytes += entry.size
        if (totalExtractedBytes > MAX_TOTAL_EXTRACTED_BYTES) {
          return NextResponse.json({ error: `Extracted contents exceed the ${MAX_TOTAL_EXTRACTED_BYTES / 1024 / 1024}MB limit` }, { status: 400 })
        }

        const content = await entry.arrayBuffer()
        const blob = new Blob([content])

        const storagePath = `forges/${forgeId}/${cleanPath}`
        const { error: uploadError } = await supabase.storage
          .from('forge-files')
          .upload(storagePath, blob, {
            contentType: 'application/octet-stream',
            upsert: true,
          })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('forge-files')
            .getPublicUrl(storagePath)
          files.push({ path: cleanPath, url: publicUrl })
        }
      }
    } catch (e) {
      console.error('unzipit failed, trying manual extraction:', e)
      
      // Fallback: read the file listing from storage if unzip fails
      const { data: storageFiles } = await supabase.storage
        .from('forge-files')
        .list(`forges/${forgeId}`)
      
      if (storageFiles) {
        files = storageFiles
          .filter(f => !f.name.startsWith('.') && f.name !== '')
          .map(f => {
            const { data: { publicUrl } } = supabase.storage
              .from('forge-files')
              .getPublicUrl(`forges/${forgeId}/${f.name}`)
            return { path: f.name, url: publicUrl }
          })
      }
    }

    // MERGE files into existing config
    const existingConfig = existingForge?.config || {}
    const updatedConfig = { ...existingConfig, files }

    // Save merged config back to forge
    const { error: updateError } = await supabase
      .from('forges')
      .update({ config: updatedConfig })
      .eq('id', forgeId)

    if (updateError) {
      console.error('Failed to update forge config:', updateError)
      return NextResponse.json({ error: 'Failed to save files to forge' }, { status: 500 })
    }

    const indexFile = files.find((f: any) =>
      f.path === 'index.html' ||
      f.path.endsWith('/index.html') ||
      f.path === 'index.htm'
    )

    return NextResponse.json({
      success: true,
      files,
      entryPoint: indexFile?.path || null,
      previewUrl: `/preview/${forgeId}`,
    })
  } catch (error) {
    console.error('Upload failed:', error)
    return NextResponse.json({ error: 'Failed to extract and upload files' }, { status: 500 })
  }
}
