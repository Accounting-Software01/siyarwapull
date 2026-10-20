export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-black text-white px-6 text-center">
      <h1 className="text-xl font-semibold">You're offline</h1>
      <p className="text-white/60 text-sm max-w-sm">
        Siyarwa Pull needs a connection to load your Face, Forges, and Spark feed.
        Reconnect and try again.
      </p>
    </div>
  )
}
