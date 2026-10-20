'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function AdminStoreActions({ storeId, status }: { storeId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function act(action: 'approve' | 'reject' | 'suspend') {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/market/admin/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, action }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(data.error ?? 'Failed.')
    router.refresh()
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        {status !== 'approved' ? <Button size="sm" disabled={busy} onClick={() => act('approve')}>Approve</Button> : null}
        {status === 'pending' ? <Button size="sm" variant="outline" disabled={busy} onClick={() => act('reject')}>Reject</Button> : null}
        {status === 'approved' ? <Button size="sm" variant="destructive" disabled={busy} onClick={() => act('suspend')}>Suspend</Button> : null}
      </div>
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
