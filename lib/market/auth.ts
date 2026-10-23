import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** Returns the verified signed-in user (validated with Supabase Auth), or null. */
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function isMarketAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('marketplace_admins').select('user_id').eq('user_id', userId).maybeSingle()
  if (error) console.error('[market] admin check failed (is SUPABASE_SERVICE_ROLE_KEY valid and the migration run?)', error.message)
  return Boolean(data)
}
