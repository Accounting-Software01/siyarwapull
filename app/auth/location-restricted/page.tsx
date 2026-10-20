'use client'

import Link from 'next/link'

export default function LocationRestrictedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-[#14181c]">
      <section className="w-full max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#14181c] text-2xl font-black text-[#b7f23a]">
          P<span className="text-white">.</span>
        </div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#8aae00]">Siyarwa Pull</p>
        <h1 className="text-3xl font-black tracking-[-0.04em]">Siyarwa Pull is not available in this location.</h1>
        <p className="mt-4 text-sm leading-6 text-[#687076]">
          Siyarwa Pull is currently available only in Abuja/FCT, Kano, Kaduna, Zamfara, Jos, Niger, Lagos, and Sokoto, Nigeria.
        </p>
        <Link href="/dashboard" className="mt-8 inline-flex rounded-full bg-[#14181c] px-5 py-3 text-sm font-bold text-white hover:bg-black">
          Return to public feed
        </Link>
      </section>
    </main>
  )
}
