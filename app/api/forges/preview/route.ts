import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getForgeAccess } from '@/lib/forge-access'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const forgeId = request.nextUrl.searchParams.get('forge_id')
  if (!forgeId) return NextResponse.json({ error: 'Missing forge_id' }, { status: 400 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!await getForgeAccess(supabase, forgeId, user?.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: files, error } = await supabase.from('forge_files').select('*').eq('forge_id', forgeId).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const filesByType: Record<string, any[]> = {}
  for (const file of files || []) (filesByType[file.file_type] ||= []).push(file)
  return NextResponse.json({ forge_id: forgeId, files: files || [], filesByType, preview_url: `/api/forges/preview/${forgeId}` })
}
