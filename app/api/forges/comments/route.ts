import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getForgeAccess } from '@/lib/forge-access'
import { canComment } from '@/lib/forge-permissions'

export async function GET(request: Request) {
  const supabase = await createClient()
  const forgeId = new URL(request.url).searchParams.get('forge_id')
  if (!forgeId) return NextResponse.json({ error: 'Missing forge_id' }, { status: 400 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!await getForgeAccess(supabase, forgeId, user?.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, error } = await supabase.from('forge_comments').select('*, profiles:user_id(id, username, avatar_url, display_name)').eq('forge_id', forgeId).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { forge_id, content, parent_comment_id } = await request.json()
  if (!forge_id || typeof content !== 'string' || !content.trim()) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  const access = await getForgeAccess(supabase, forge_id, user.id)
  if (!access || !canComment(access.role || (access.isPublic ? 'viewer' : null))) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  if (parent_comment_id) {
    const { data: parent } = await supabase.from('forge_comments').select('id').eq('id', parent_comment_id).eq('forge_id', forge_id).maybeSingle()
    if (!parent) return NextResponse.json({ error: 'Parent comment not found' }, { status: 400 })
  }
  const { data, error } = await supabase.from('forge_comments').insert({ forge_id, user_id: user.id, content: content.trim(), parent_comment_id: parent_comment_id || null }).select('*, profiles:user_id(id, username, avatar_url, display_name)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data }, { status: 201 })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { comment_id } = await request.json()
  if (!comment_id) return NextResponse.json({ error: 'Missing comment_id' }, { status: 400 })
  const { error } = await supabase.from('forge_comments').delete().eq('id', comment_id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
