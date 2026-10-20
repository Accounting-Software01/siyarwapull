import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getForgeAccess } from '@/lib/forge-access'
import { canEditFiles, canManageTeam } from '@/lib/forge-permissions'
import { getForgeRole } from '@/lib/server/get-forge-role'

export async function GET(request: Request) {
  const supabase = await createClient()
  const forgeId = new URL(request.url).searchParams.get('forge_id')
  const status = new URL(request.url).searchParams.get('status')
  if (!forgeId) return NextResponse.json({ error: 'Missing forge_id' }, { status: 400 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!await getForgeAccess(supabase, forgeId, user?.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let query = supabase.from('forge_contributions').select('*, profiles:contributor_id(id, username, avatar_url, display_name), forge_files(file_name, file_type)').eq('forge_id', forgeId)
  if (status) query = query.eq('status', status)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contributions: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { forge_id, file_id, new_content, description } = await request.json()
  if (!forge_id || typeof new_content !== 'string' || !new_content) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  const role = await getForgeRole(supabase, forge_id, user.id)
  if (!canEditFiles(role)) return NextResponse.json({ error: 'Only owners and contributors can submit changes' }, { status: 403 })
  if (file_id) {
    const { data: file } = await supabase.from('forge_files').select('id').eq('id', file_id).eq('forge_id', forge_id).maybeSingle()
    if (!file) return NextResponse.json({ error: 'File does not belong to this Forge' }, { status: 400 })
  }
  const { data, error } = await supabase.from('forge_contributions').insert({ forge_id, contributor_id: user.id, file_id: file_id || null, new_content, description: description || null }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contribution: data }, { status: 201 })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { contribution_id, status, forge_id } = await request.json()
  if (!contribution_id || !forge_id || !['pending', 'approved', 'rejected'].includes(status)) return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  const role = await getForgeRole(supabase, forge_id, user.id)
  if (!canManageTeam(role)) return NextResponse.json({ error: 'Only the owner can review contributions' }, { status: 403 })
  const { data, error } = await supabase.from('forge_contributions').update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', contribution_id).eq('forge_id', forge_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (status === 'approved' && data.file_id) {
    const { error: fileError } = await supabase.from('forge_files').update({ content: data.new_content, updated_at: new Date().toISOString() }).eq('id', data.file_id).eq('forge_id', forge_id)
    if (fileError) return NextResponse.json({ error: fileError.message }, { status: 500 })
  }
  return NextResponse.json({ contribution: data })
}
