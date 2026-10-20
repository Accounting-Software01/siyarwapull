import { NextResponse } from 'next/server'
import { getUser } from '@/lib/market/auth'
import { listBanks } from '@/lib/market/paystack'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const banks = await listBanks()
    return NextResponse.json({ banks }, { headers: { 'Cache-Control': 'private, max-age=3600' } })
  } catch (err) {
    console.error('[market] list banks failed', err)
    return NextResponse.json({ error: 'Could not load banks.' }, { status: 502 })
  }
}
