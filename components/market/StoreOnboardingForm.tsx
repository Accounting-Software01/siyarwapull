'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NIGERIAN_STATES } from '@/lib/market/constants'

type Bank = { name: string; code: string }

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

export default function StoreOnboardingForm() {
  const router = useRouter()
  const [banks, setBanks] = useState<Bank[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [state, setState] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('0')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/market/banks')
      .then((r) => r.json())
      .then((d) => setBanks(d.banks ?? []))
      .catch(() => setError('Could not load the bank list. Refresh the page.'))
  }, [])

  // Verify the account as soon as bank + 10 digits are entered.
  useEffect(() => {
    setAccountName(null)
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) return
    let cancelled = false
    setResolving(true)
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
      const res = await fetch('/api/market/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, description, state, deliveryFee, bankCode, accountNumber }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not create your store.')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  const ready = name.trim().length >= 2 && slug.length >= 3 && state && bankCode && accountName

  return (
    <div className="space-y-3">
      <Input
        placeholder="Store name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          if (!slugTouched) setSlug(slugify(e.target.value))
        }}
        maxLength={60}
      />
      <div>
        <Input
          placeholder="store-link"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(slugify(e.target.value))
          }}
          maxLength={40}
        />
        <p className="mt-1 text-xs text-gray-500">Your store link: /market/store/{slug || 'your-store'}</p>
      </div>
      <Textarea placeholder="What do you sell? (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
      <select value={state} onChange={(e) => setState(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" aria-label="Your state">
        <option value="">Where are you based?</option>
        {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <div>
        <Input placeholder="Delivery fee in ₦ (0 = free)" inputMode="decimal" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
        <p className="mt-1 text-xs text-gray-500">A flat fee added to every order from your store.</p>
      </div>

      <div className="space-y-3 rounded-xl bg-gray-50 p-3">
        <p className="text-sm font-semibold">Where should your money go?</p>
        <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" aria-label="Bank">
          <option value="">Choose your bank…</option>
          {banks.map((b) => <option key={`${b.code}-${b.name}`} value={b.code}>{b.name}</option>)}
        </select>
        <Input placeholder="10-digit account number" inputMode="numeric" maxLength={10} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} />
        {resolving ? <p className="flex items-center gap-1.5 text-xs text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking account…</p> : null}
        {accountName ? <p className="flex items-center gap-1.5 text-sm font-medium text-green-700"><CheckCircle2 className="h-4 w-4" /> {accountName}</p> : null}
        <p className="text-xs text-gray-500">Payments are sent to this account by Paystack after each sale. We never store your full account number.</p>
      </div>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <Button onClick={submit} disabled={busy || !ready} className="w-full" size="lg">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit store for review
      </Button>
    </div>
  )
}
