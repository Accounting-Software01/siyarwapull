import { NextResponse } from 'next/server'
import { getUser } from '@/lib/market/auth'
import { resolveAccount } from '@/lib/market/paystack'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Best-effort limiter (per server instance). Stops casual abuse of the name-lookup endpoint.
const hits = new Map<string, number[]>()
function tooMany(userId: string): boolean {
  const now = Date.now()
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(userId, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > 8
}

export async function GET(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (tooMany(user.id)) return NextResponse.json({ error: 'Too many lookups. Wait a minute.' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const accountNumber = searchParams.get('account_number') ?? ''
  const bankCode = searchParams.get('bank_code') ?? ''
  if (!/^\d{10}$/.test(accountNumber) || !/^\d{3,6}$/.test(bankCode)) {
    return NextResponse.json({ error: 'Enter a 10-digit account number and choose a bank.' }, { status: 400 })
  }
  try {
    const data = await resolveAccount(accountNumber, bankCode)
    return NextResponse.json({ accountName: data.account_name })
  } catch {
    return NextResponse.json({ error: 'We could not verify that account.' }, { status: 422 })
  }
}
