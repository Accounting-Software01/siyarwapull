'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NIGERIAN_STATES } from '@/lib/market/constants'

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

export default function StoreOnboardingForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [state, setState] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/market/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, description, state, deliveryFee }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not create your store.')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  const ready = name.trim().length >= 2 && slug.length >= 3 && state

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

      <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">Next step: you will add your payout account (where your money goes) right after your store is created.</p>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <Button onClick={submit} disabled={busy || !ready} className="w-full" size="lg">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create my store
      </Button>
    </div>
  )
}
