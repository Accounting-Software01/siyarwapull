import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getForgeAccess } from '@/lib/forge-access'

export async function GET(request: NextRequest, { params }: { params: Promise<{ forgeId: string }> }) {
  const supabase = await createClient()
  const { forgeId } = await params
  const { data: { user } } = await supabase.auth.getUser()
  if (!await getForgeAccess(supabase, forgeId, user?.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: files, error } = await supabase.from('forge_files').select('*').eq('forge_id', forgeId).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!files?.length) return NextResponse.json({ error: 'No files found' }, { status: 404 })
  const htmlFile = files.find((file) => file.file_type === 'html')
  if (!htmlFile) return NextResponse.json({ error: 'No HTML file found' }, { status: 400 })
  let html = String(htmlFile.content || '')
  for (const file of files.filter((item) => item.file_type === 'css')) html = html.replace('</head>', `<style>${String(file.content || '')}</style></head>`)
  for (const file of files.filter((item) => item.file_type === 'js')) html = html.replace('</body>', `<script>${String(file.content || '')}</script></body>`)
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Uploaded HTML is untrusted. The sandbox gives it an opaque origin so
      // its scripts cannot access Pull cookies, localStorage, or same-origin APIs.
      'Content-Security-Policy': "sandbox allow-scripts; default-src 'self' data: blob:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; frame-ancestors 'self'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}
