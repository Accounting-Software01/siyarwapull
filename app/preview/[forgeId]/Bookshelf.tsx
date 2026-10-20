'use client'

import { useEffect, useState } from 'react'
import { X, BookOpen, ArrowLeft } from 'lucide-react'

type PDF = {
  id: string
  filename: string
  url: string
}

type BookMeta = {
  title?: string
  author?: string
  description?: string
  coverUrl?: string
}

export default function Bookshelf({
  books,
  bookMeta = [],
}: {
  books: PDF[]
  bookMeta?: BookMeta[]
}) {
  const [open, setOpen] = useState<PDF | null>(null)
  const [meta, setMeta] = useState<BookMeta | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  if (books.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {books.map((book, i) => {
          const m = bookMeta[i] || {}
          return (
            <button
              key={book.id}
              type="button"
              onClick={() => {
                setOpen(book)
                setMeta(m)
              }}
              className="group text-left transition active:scale-[0.98]"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#eef7d1] to-[#dfe9b8] shadow-[0_2px_10px_rgba(20,25,27,0.06)]">
                {m.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.coverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <BookOpen className="h-9 w-9 text-[#668500]" strokeWidth={1.6} />
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur">
                  Read
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[13.5px] font-bold leading-[1.25] text-[#15191b]">
                {m.title || book.filename.replace(/\.pdf$/i, '')}
              </p>
              {m.author && (
                <p className="mt-0.5 truncate text-[11.5px] text-[#697278]">
                  {m.author}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* Reader modal */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm">
          <div className="flex h-full flex-col">
            {/* Reader header */}
            <header
              className="flex items-center justify-between gap-3 bg-[#15191b] px-3 py-3 text-white"
              style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
            >
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold transition active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
                Close
              </button>
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-[13.5px] font-semibold">
                  {meta?.title || open.filename}
                </p>
                {meta?.author && (
                  <p className="truncate text-[11px] text-white/60">
                    {meta.author}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Close reader"
                className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition active:scale-95"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </header>

            {/* Reader body */}
            <iframe
              src={`${open.url}#toolbar=1&navpanes=0&view=FitH`}
              title={open.filename}
              className="h-full w-full flex-1 border-0 bg-white"
            />
          </div>
        </div>
      )}
    </>
  )
              }
