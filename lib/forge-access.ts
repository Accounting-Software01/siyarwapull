import { getForgeRole } from '@/lib/server/get-forge-role'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ForgeRole } from '@/lib/forge-permissions'

export async function getForgeAccess(
  supabase: SupabaseClient,
  forgeId: string,
  userId?: string | null,
) {
  const { data: forge, error } = await supabase
    .from('forges')
    .select('id, user_id, is_published, is_public_preview, is_collaborative')
    .eq('id', forgeId)
    .maybeSingle()

  if (error || !forge) return null

  const isPublic = Boolean(forge.is_published || forge.is_public_preview)
  if (isPublic) {
    return {
      forge,
      role: forge.user_id === userId ? 'owner' as ForgeRole : userId ? 'viewer' as ForgeRole : null,
      isPublic,
    }
  }

  if (!userId) return null
  const role = await getForgeRole(supabase, forgeId, userId)
  if (!role) return null

  return { forge, role: role as ForgeRole, isPublic }
}

export function canAccessForge(
  access: Awaited<ReturnType<typeof getForgeAccess>>,
): access is NonNullable<Awaited<ReturnType<typeof getForgeAccess>>> {
  return Boolean(access)
}
