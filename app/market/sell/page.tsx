import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MarketHeader from '@/components/market/MarketHeader'
import StoreOnboardingForm from '@/components/market/StoreOnboardingForm'
import PayoutForm from '@/components/market/PayoutForm'

export const dynamic = 'force-dynamic'

const STEP = 'text-xs font-semibold uppercase tracking-wide text-gray-500'

export default async function SellPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <MarketHeader title="Sell on Siyarwa Pull" back="/market" />
        <main className="mx-auto max-w-lg space-y-4 px-4 py-10 text-center">
          <p className="text-gray-600">Sign in with your Siyarwa Pull account to start selling.</p>
          <Link href="/auth/login" className="inline-block rounded-xl bg-black px-6 py-3 font-semibold text-white">Sign in</Link>
        </main>
      </div>
    )
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id,name,slug,status,payout_ready')
    .eq('owner_id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-white pb-24">
      <MarketHeader title="Sell on Siyarwa Pull" back="/market" />
      <main className="mx-auto max-w-lg space-y-4 px-4 py-4">
        {!store ? (
          <>
            <p className="text-sm text-gray-600">Open your store in two quick steps: your store details, then your payout account. We review every new store before it goes live.</p>
            <StoreOnboardingForm />
          </>
        ) : store.status === 'rejected' ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">Your store application was not approved. Please contact support.</div>
        ) : store.status === 'suspended' ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">Your store is suspended. Please contact support.</div>
        ) : (
          <div className="space-y-4">
            <p className={STEP}>Step 1 · Your store</p>
            <div className="rounded-2xl bg-green-50 p-4">
              <p className="font-semibold">{store.name}</p>
              <p className="text-sm text-gray-700">Store details saved.</p>
            </div>

            <p className={STEP}>Step 2 · Payout account</p>
            <PayoutForm ready={Boolean(store.payout_ready)} />

            <p className={STEP}>Step 3 · Review</p>
            {store.status === 'pending' ? (
              <div className="space-y-1 rounded-2xl bg-amber-50 p-4">
                <p className="font-semibold">{store.name} is under review</p>
                <p className="text-sm text-gray-700">We will approve your store shortly. You can come back here any time to check.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl bg-green-50 p-4">
                  <p className="font-semibold">{store.name} is approved</p>
                  <Link href={`/market/store/${store.slug}`} className="text-sm underline">View your storefront</Link>
                  {!store.payout_ready ? <p className="mt-1 text-sm text-amber-800">Add your payout account (step 2) so buyers can pay you.</p> : null}
                </div>
                <Link href="/market/sell/products" className="block rounded-2xl border p-4 font-semibold">Manage products</Link>
                <Link href="/market/sell/orders" className="block rounded-2xl border p-4 font-semibold">Orders to fulfil</Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
