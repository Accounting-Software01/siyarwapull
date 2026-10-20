'use client'

import { useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NIGERIAN_STATES } from '@/lib/market/constants'
import { formatNaira } from '@/lib/market/money'

type Props = {
  productId: string
  priceKobo: number
  deliveryFeeKobo: number
  maxQuantity: number
  needsEmail: boolean
}

export default function BuyBox({ productId, priceKobo, deliveryFeeKobo, maxQuantity, needsEmail }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [state, setState] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Display only. The server recalculates everything from the database.
  const estimatedTotal = priceKobo * quantity + deliveryFeeKobo

  async function pay() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/market/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity, name, phone, address, state, email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.')
      const url = String(data.authorizationUrl ?? '')
      if (!url.startsWith('https://checkout.paystack.com/')) throw new Error('Unexpected payment response.')
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="qty" className="text-sm font-medium">Quantity</label>
        <Input
          id="qty"
          type="number"
          inputMode="numeric"
          min={1}
          max={maxQuantity}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, Math.floor(Number(e.target.value) || 1))))}
          className="w-24 text-center"
        />
      </div>

      <Input placeholder="Receiver’s full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <Input placeholder="Phone number" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      {needsEmail ? (
        <Input placeholder="Email for your receipt" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      ) : null}
      <select
        value={state}
        onChange={(e) => setState(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        aria-label="Delivery state"
      >
        <option value="">Delivery state…</option>
        {NIGERIAN_STATES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <Textarea placeholder="Full delivery address" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />

      <dl className="space-y-1 border-t pt-3 text-sm">
        <div className="flex justify-between"><dt className="text-gray-500">Items</dt><dd>{formatNaira(priceKobo * quantity)}</dd></div>
        <div className="flex justify-between"><dt className="text-gray-500">Delivery</dt><dd>{deliveryFeeKobo === 0 ? 'Free' : formatNaira(deliveryFeeKobo)}</dd></div>
        <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatNaira(estimatedTotal)}</dd></div>
      </dl>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

      <Button onClick={pay} disabled={busy} className="w-full" size="lg">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? 'Opening secure checkout…' : `Pay ${formatNaira(estimatedTotal)}`}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
        <ShieldCheck className="h-3.5 w-3.5" /> Secure payment by Paystack
      </p>
    </div>
  )
}
