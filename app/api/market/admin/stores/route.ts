import { NextResponse } from 'next/server'
import { getUser, isMarketAdmin } from '@/lib/market/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIONS: Record<string, string> = {
  approve: 'approved',
  reject: 'rejected',
  suspend: 'suspended',
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user || !(await isMarketAdmin(user.id))) {
    // Same response for "not signed in" and "not an admin": reveal nothing.
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: { storeId?: string; action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const status = ACTIONS[String(body.action)]
  if (!status || !/^[0-9a-f-]{36}$/i.test(String(body.storeId))) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (status === 'approved') {
    const { data: store } = await admin
      .from('stores')
      .select('paystack_subaccount_code')
      .eq('id', body.storeId)
      .maybeSingle()
    if (!store?.paystack_subaccount_code) {
      return NextResponse.json({ error: 'This store has no payout account yet.' }, { status: 409 })
    }
  }

  const { error } = await admin.from('stores').update({ status }).eq('id', body.storeId)
  if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 })
  return NextResponse.json({ ok: true, status })
}
