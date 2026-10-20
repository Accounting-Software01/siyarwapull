// lib/server/get-forge-role.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ForgeRole } from '@/lib/forge-permissions'

/**
 * Looks up the caller's role on a given forge. Ownership is tracked on
 * forges.user_id directly (the creator never gets a forge_contributors
 * row — see app/api/forges/route.ts), so that's checked first; anyone
 * else's role comes from forge_contributors (added collaborators/viewers).
 * Returns null if the user has no relationship to the forge at all —
 * callers should treat null as "not found" / "not authorized", not as
 * a default role.
 */
export async function getForgeRole(
  supabase: SupabaseClient,
  forgeId: string,
  userId: string
): Promise<ForgeRole | null> {
  const { data: forge, error: forgeError } = await supabase
    .from('forges')
    .select('user_id')
    .eq('id', forgeId)
    .maybeSingle()

  if (forgeError || !forge) {
    return null
  }

  if (forge.user_id === userId) {
    return 'owner'
  }

  const { data, error } = await supabase
    .from('forge_contributors')
    .select('role')
    .eq('forge_id', forgeId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data.role as ForgeRole
}
