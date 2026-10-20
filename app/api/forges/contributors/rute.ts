import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getForgeRole } from '@/lib/server/get-forge-role'
import { canManageTeam } from '@/lib/forge-permissions'

/**
 * GET /api/forge-contributors?forge_id=xxx
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const forgeId = request.nextUrl.searchParams.get('forge_id')

  if (!forgeId) {
    return NextResponse.json(
      { error: 'Missing forge_id' },
      { status: 400 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('forge_contributors')
      .select(`
        id,
        forge_id,
        user_id,
        role,
        joined_at,
        profiles (
          id,
          username,
          avatar_url,
          display_name
        )
      `)
      .eq('forge_id', forgeId)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('[Forge Contributors GET] Query Error:', error)

      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      contributors: data || [],
    })
  } catch (error) {
    console.error('[Forge Contributors GET] Server Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch contributors',
        details:
          error instanceof Error
            ? error.message
            : 'Unknown server error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/forge-contributors
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()

    const {
      forge_id,
      user_id,
      role = 'contributor',
    } = body

    if (!forge_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Forge Contributors POST] Request:', {
      forge_id,
      user_id,
      role,
      auth_user: user.id,
    })

    /**
     * Only the forge owner can add contributors. getForgeRole recognizes
     * the creator as 'owner' immediately via forges.user_id, so this holds
     * even right after forge creation — no bypass flag needed.
     *
     * NOTE: this endpoint previously accepted a client-supplied
     * `is_initial: true` flag that skipped this check entirely, letting
     * anyone add themselves as owner/contributor to any forge. Removed.
     */
    const requesterRole = await getForgeRole(supabase, forge_id, user.id)
    if (!canManageTeam(requesterRole)) {
      return NextResponse.json(
        { error: 'Only the owner can add contributors' },
        { status: 403 }
      )
    }

    // 'owner' on this table should only ever be the display row the real
    // owner creates for themself (ownership itself is tracked on
    // forges.user_id) — never assigned to someone else, or it would grant
    // that person owner-equivalent permissions via getForgeRole().
    if (role === 'owner' && user_id !== user.id) {
      return NextResponse.json(
        { error: "Only 'contributor' or 'viewer' can be assigned to other users" },
        { status: 400 }
      )
    }
    if (role !== 'owner' && role !== 'contributor' && role !== 'viewer') {
      return NextResponse.json(
        { error: "Role must be 'contributor' or 'viewer'" },
        { status: 400 }
      )
    }

    /**
     * Prevent duplicate contributor
     */
    const { data: existingContributor } = await supabase
      .from('forge_contributors')
      .select('id')
      .eq('forge_id', forge_id)
      .eq('user_id', user_id)
      .maybeSingle()

    if (existingContributor) {
      return NextResponse.json(
        { error: 'User is already a contributor' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('forge_contributors')
      .insert({
        forge_id,
        user_id,
        role,
      })
      .select(`
        id,
        forge_id,
        user_id,
        role,
        joined_at,
        profiles (
          id,
          username,
          avatar_url,
          display_name
        )
      `)
      .single()

    if (error) {
      console.error(
        '[Forge Contributors POST] Insert Error:',
        error
      )

      return NextResponse.json(
        {
          error: 'Failed to add contributor',
          details: error.message,
          hint: error.hint,
        },
        { status: 500 }
      )
    }

    console.log(
      '[Forge Contributors POST] Contributor added:',
      data.id
    )

    return NextResponse.json(
      {
        contributor: data,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Forge Contributors POST] Server Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to add contributor',
        details:
          error instanceof Error
            ? error.message
            : 'Unknown server error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/forge-contributors
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()

    const { forge_id, user_id } = body

    if (!forge_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    /**
     * Verify owner permissions — via getForgeRole, which correctly
     * recognizes the true owner through forges.user_id (this table alone
     * doesn't contain a row for the owner unless they self-added one).
     */
    const requesterRole = await getForgeRole(supabase, forge_id, user.id)
    if (!canManageTeam(requesterRole)) {
      return NextResponse.json(
        { error: 'Only the owner can remove contributors' },
        { status: 403 }
      )
    }

    /**
     * Prevent removing the true owner
     */
    const { data: forge } = await supabase
      .from('forges')
      .select('user_id')
      .eq('id', forge_id)
      .single()

    if (forge?.user_id === user_id) {
      return NextResponse.json(
        { error: 'Cannot remove the forge owner' },
        { status: 400 }
      )
    }

    if (targetContributor?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove forge owner' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('forge_contributors')
      .delete()
      .eq('forge_id', forge_id)
      .eq('user_id', user_id)

    if (error) {
      console.error(
        '[Forge Contributors DELETE] Delete Error:',
        error
      )

      return NextResponse.json(
        {
          error: 'Failed to remove contributor',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('[Forge Contributors DELETE] Server Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to remove contributor',
        details:
          error instanceof Error
            ? error.message
            : 'Unknown server error',
      },
      { status: 500 }
    )
  }
}
