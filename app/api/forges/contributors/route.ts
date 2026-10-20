import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getForgeRole } from '@/lib/server/get-forge-role'
import { canManageTeam } from '@/lib/forge-permissions'
import { getForgeAccess } from '@/lib/forge-access'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const forgeId = request.nextUrl.searchParams.get('forge_id')
  if (!forgeId) return NextResponse.json({ error: 'Missing forge_id' }, { status: 400 })
  const { data: { user } } = await supabase.auth.getUser()
  const access = await getForgeAccess(supabase, forgeId, user?.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, error } = await supabase.from('forge_contributors').select('id, forge_id, user_id, role, joined_at, profiles(id, username, avatar_url, display_name)').eq('forge_id', forgeId).order('joined_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contributors: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { forge_id, user_id, role = 'contributor' } = await request.json()
  if (!forge_id || !user_id) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  if (role !== 'contributor' && role !== 'viewer') return NextResponse.json({ error: 'Role must be contributor or viewer' }, { status: 400 })
  const requesterRole = await getForgeRole(supabase, forge_id, user.id)
  if (!canManageTeam(requesterRole)) return NextResponse.json({ error: 'Only the owner can add contributors' }, { status: 403 })
  const { data: existing } = await supabase.from('forge_contributors').select('id').eq('forge_id', forge_id).eq('user_id', user_id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'User is already a contributor' }, { status: 409 })
  const { data, error } = await supabase.from('forge_contributors').insert({ forge_id, user_id, role }).select('id, forge_id, user_id, role, joined_at, profiles(id, username, avatar_url, display_name)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contributor: data }, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { forge_id, user_id, role } = await request.json()
  if (!forge_id || !user_id || (role !== 'contributor' && role !== 'viewer')) {
    return NextResponse.json({ error: 'forge_id, user_id, and a valid role are required' }, { status: 400 })
  }
  const requesterRole = await getForgeRole(supabase, forge_id, user.id)
  if (!canManageTeam(requesterRole)) return NextResponse.json({ error: 'Only the owner can change contributor roles' }, { status: 403 })
  const { data, error } = await supabase
    .from('forge_contributors')
    .update({ role })
    .eq('forge_id', forge_id)
    .eq('user_id', user_id)
    .select('id, forge_id, user_id, role, joined_at, profiles(id, username, avatar_url, display_name)')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Contributor not found' }, { status: 404 })
  return NextResponse.json({ contributor: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { forge_id, user_id } = await request.json()
  if (!forge_id || !user_id) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  const requesterRole = await getForgeRole(supabase, forge_id, user.id)
  if (!canManageTeam(requesterRole)) return NextResponse.json({ error: 'Only the owner can remove contributors' }, { status: 403 })
  const { data: forge } = await supabase.from('forges').select('user_id').eq('id', forge_id).maybeSingle()
  if (!forge) return NextResponse.json({ error: 'Forge not found' }, { status: 404 })
  if (forge.user_id === user_id) return NextResponse.json({ error: 'Cannot remove the forge owner' }, { status: 400 })
  const { error } = await supabase.from('forge_contributors').delete().eq('forge_id', forge_id).eq('user_id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
