'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { formatNaira } from '@/lib/market/money'
import { ORDER_STATUS_LABEL } from '@/lib/market/constants'

type OrderRow = {
  id: string
  status: string
  total_kobo: number
  seller_amount_kobo: number
  created_at: string
  delivery_name: string
  delivery_phone: string
  delivery_address: string
  delivery_state: string
  seller_note: string | null
  stores: { name: string } | null
  order_items: { title: string; quantity: number; unit_price_kobo: number }[]
}

const COLUMNS =
  'id,status,total_kobo,seller_amount_kobo,created_at,delivery_name,delivery_phone,delivery_address,delivery_state,seller_note,stores(name),order_items(title,quantity,unit_price_kobo)'

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'delivered' ? 'bg-green-100 text-green-800'
    : status === 'shipped' || status === 'paid' ? 'bg-blue-100 text-blue-800'
    : status === 'refund_required' || status === 'refunded' ? 'bg-amber-100 text-amber-800'
    : 'bg-gray-100 text-gray-700'
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{ORDER_STATUS_LABEL[status] ?? status}</span>
}

function useOrders(filter: { column: 'buyer_id' | 'store_id'; value: string }) {
  const supabase = createClient()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('orders')
      .select(COLUMNS)
      .eq(filter.column, filter.value)
      .order('created_at', { ascending: false })
      .limit(100)
    if (err) setError('Could not load orders.')
    setOrders((data as unknown as OrderRow[]) ?? [])
    setLoading(false)
  }, [supabase, filter.column, filter.value])

  useEffect(() => {
    load()
  }, [load])

  return { supabase, orders, loading, error, setError, reload: load }
}

export function BuyerOrders({ userId }: { userId: string }) {
  const { supabase, orders, loading, error, setError, reload } = useOrders({ column: 'buyer_id', value: userId })
  const [busyId, setBusyId] = useState<string | null>(null)

  async function confirm(id: string) {
    setBusyId(id)
    setError(null)
    const { error: err } = await supabase.rpc('buyer_confirm_delivery', { p_order: id })
    if (err) setError('Could not confirm delivery.')
    setBusyId(null)
    reload()
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>
  return (
    <div className="space-y-3">
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {orders.length === 0 ? <p className="text-sm text-gray-500">You have no orders yet.</p> : null}
      {orders.map((o) => (
        <article key={o.id} className="space-y-2 rounded-2xl border p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{o.stores?.name ?? 'Store'}</p>
              <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString('en-NG')}</p>
            </div>
            <StatusPill status={o.status} />
          </div>
          <ul className="text-sm text-gray-700">
            {o.order_items.map((i, idx) => (
              <li key={idx}>{i.quantity} × {i.title}</li>
            ))}
          </ul>
          <p className="text-sm font-bold">{formatNaira(o.total_kobo)}</p>
          {o.seller_note ? <p className="text-sm text-gray-600">Seller note: {o.seller_note}</p> : null}
          {o.status === 'refund_required' ? (
            <p className="text-sm text-amber-700">Your payment arrived after the item sold out. A refund is required and will be processed by the marketplace team.</p>
          ) : null}
          {o.status === 'shipped' ? (
            <Button onClick={() => confirm(o.id)} disabled={busyId === o.id} size="sm">
              {busyId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null} I received this order
            </Button>
          ) : null}
        </article>
      ))}
    </div>
  )
}

export function SellerOrders({ storeId }: { storeId: string }) {
  const { supabase, orders, loading, error, setError, reload } = useOrders({ column: 'store_id', value: storeId })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  async function ship(id: string) {
    setBusyId(id)
    setError(null)
    const { error: err } = await supabase.rpc('seller_mark_shipped', { p_order: id, p_note: notes[id] ?? null })
    if (err) setError('Could not mark this order as shipped.')
    setBusyId(null)
    reload()
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>
  return (
    <div className="space-y-3">
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {orders.length === 0 ? <p className="text-sm text-gray-500">No paid orders yet.</p> : null}
      {orders.map((o) => (
        <article key={o.id} className="space-y-2 rounded-2xl border p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{o.delivery_name} · {o.delivery_phone}</p>
              <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString('en-NG')}</p>
            </div>
            <StatusPill status={o.status} />
          </div>
          <ul className="text-sm text-gray-700">
            {o.order_items.map((i, idx) => (
              <li key={idx}>{i.quantity} × {i.title}</li>
            ))}
          </ul>
          <p className="text-sm text-gray-600">{o.delivery_address}, {o.delivery_state}</p>
          <p className="text-sm">
            Order total {formatNaira(o.total_kobo)} · <span className="font-bold">You receive {formatNaira(o.seller_amount_kobo)}</span>
          </p>
          {o.status === 'paid' ? (
            <div className="flex gap-2">
              <Input placeholder="Tracking note (optional)" value={notes[o.id] ?? ''} maxLength={300} onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })} />
              <Button onClick={() => ship(o.id)} disabled={busyId === o.id}>
                {busyId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Shipped
              </Button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}
