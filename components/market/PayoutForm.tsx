'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Bank = { name: string; code: string }

/** Step 2 of selling: where the seller's money goes. Shown after the store exists. */
export default function PayoutForm({ ready }: { ready: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState(!ready)
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) return
    fetch('/api/market/banks')
      .then((r) => r.json())
      .then((d) => setBanks(d.banks ?? []))
      .catch(() => setError('Could not load the bank list. Refresh the page.'))
  }, [editing])

  // Show the account holder's name as soon as bank + 10 digits are entered.
  useEffect(() => {
    setAccountName(null)
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) return
    let cancelled = false
    setResolving(true)
    setError(null)
    fetch(`/api/market/banks/resolve?account_number=${accountNumber}&bank_code=${bankCode}`)
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (cancelled) return
        if (ok) setAccountName(data.accountName)
        else setError(data.error ?? 'We could not verify that account.')
      })
      .finally(() => !cancelled && setResolving(false))
    return () => {
      cancelled = true
    }
  }, [bankCode, accountNumber])

  async function submit() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/market/stores/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankCode, accountNumber }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not save your payout account.')
      setEditing(false)
      setBankCode('')
      setAccountNumber('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-green-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-green-800"><CheckCircle2 className="h-4 w-4" /> Payout account added</p>
        <button type="button" onClick={() => setEditing(true)} className="text-sm underline">Change</button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border p-4">
      <div>
        <p className="font-semibold">Where should your money go?</p>
        <p className="mt-0.5 text-xs text-gray-500">Buyers can pay your store only after you add a payout account.</p>
      </div>
      <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" aria-label="Bank">
        <option value="">Choose your bank…</option>
        {banks.map((b) => <option key={`${b.code}-${b.name}`} value={b.code}>{b.name}</option>)}
      </select>
      <Input placeholder="10-digit account number" inputMode="numeric" maxLength={10} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} />
      {resolving ? <p className="flex items-center gap-1.5 text-xs text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking account…</p> : null}
      {accountName ? <p className="flex items-center gap-1.5 text-sm font-medium text-green-700"><CheckCircle2 className="h-4 w-4" /> {accountName}</p> : null}
      <p className="text-xs text-gray-500">Paystack sends your sales to this account. We never store your full account number.</p>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy || !bankCode || !accountName} className="flex-1" size="lg">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save payout account
        </Button>
        {ready ? <Button type="button" variant="outline" size="lg" onClick={() => setEditing(false)}>Cancel</Button> : null}
      </div>
    </div>
  )
}
