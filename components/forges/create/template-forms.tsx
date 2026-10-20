"use client"

import { useEffect, useRef, useState } from 'react'
import { BookOpen, FileText, Upload, Image as ImageIcon, X } from 'lucide-react'
import { ForgeCreationShell, TextField, Card } from './ForgeCreationShell'
import { ForgeSourcePicker } from './ForgeSourcePicker'
import type { ForgeDraft, ForgeFormProps } from './types'

/* =========================================================================
   Helpers
   ========================================================================= */

function useSource() {
  const [mode, setMode] = useState<'link' | 'zip'>('link')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  return { mode, setMode, url, setUrl, file, setFile }
}

function useCommon(type: ForgeDraft['template_type']) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const source = useSource()
  return {
    name,
    setName,
    description,
    setDescription,
    source,
    draft: (config: Record<string, unknown>): ForgeDraft => ({
      name,
      description,
      template_type: type,
      config,
      ...(source.mode === 'link'
        ? { sourceMode: 'link' as const, sourceUrl: source.url }
        : { sourceMode: 'zip' as const, zipFile: source.file }),
    }),
  }
}

function SubmitIntro({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <p className="mb-4 text-sm font-bold text-gray-900">Shape the details</p>
      <div className="space-y-4">{children}</div>
    </Card>
  )
}

/* =========================================================================
   BookUploader — PDFs for Gallery (reading) and Shop (digital products)
   ========================================================================= */

type Book = {
  id: string
  title: string
  author: string
  description: string
  coverUrl: string
  pdfFile: File | null
}

function BookUploader({
  books,
  onChange,
}: {
  books: Book[]
  onChange: (b: Book[]) => void
}) {
  const add = () =>
    onChange([
      ...books,
      {
        id: Math.random().toString(36).slice(2),
        title: '',
        author: '',
        description: '',
        coverUrl: '',
        pdfFile: null,
      },
    ])

  const update = (id: string, patch: Partial<Book>) =>
    onChange(books.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const remove = (id: string) => onChange(books.filter((b) => b.id !== id))

  const pickPdf = (id: string, file: File | null) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('PDF is too large. Max 50 MB.')
      return
    }
    update(id, { pdfFile: file })
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">Books &amp; PDFs</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Upload PDFs and let visitors read them directly in Siyarwa Pull.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-full bg-[#f5f9e6] px-3 py-1.5 text-xs font-bold text-[#14181c] ring-1 ring-[#b7f23a] hover:bg-[#efffc0]"
        >
          + Add book
        </button>
      </div>

      {books.length === 0 && (
        <button
          type="button"
          onClick={add}
          className="mt-4 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center hover:border-[#b7f23a]"
        >
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[#efffc0]">
            <BookOpen className="h-5 w-5 text-[#6f9000]" strokeWidth={2.2} />
          </div>
          <p className="text-sm font-semibold text-gray-900">
            Upload your first book
          </p>
          <p className="max-w-[220px] text-xs leading-5 text-gray-500">
            PDF, up to 50 MB per file
          </p>
        </button>
      )}

      {books.length > 0 && (
        <div className="mt-4 space-y-3">
          {books.map((b, i) => (
            <div
              key={b.id}
              className="space-y-3 rounded-2xl border border-gray-300 bg-white p-3.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">
                  {b.title || `Book ${i + 1}`}
                </p>
                <button
                  type="button"
                  onClick={() => remove(b.id)}
                  className="text-xs font-semibold text-red-600"
                >
                  Remove
                </button>
              </div>

              <TextField
                label="Title"
                value={b.title}
                onChange={(v) => update(b.id, { title: v })}
                placeholder="The Art of Kano Indigo"
              />
              <TextField
                label="Author"
                value={b.author}
                onChange={(v) => update(b.id, { author: v })}
                placeholder="Your name"
              />
              <TextField
                label="Description"
                value={b.description}
                onChange={(v) => update(b.id, { description: v })}
                placeholder="Short summary"
                multiline
              />
              <TextField
                label="Cover image URL"
                value={b.coverUrl}
                onChange={(v) => update(b.id, { coverUrl: v })}
                placeholder="https://…"
              />

              {b.pdfFile ? (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
                  <FileText
                    className="h-4 w-4 shrink-0 text-green-700"
                    strokeWidth={2}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {b.pdfFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => update(b.id, { pdfFile: null })}
                    className="text-xs font-semibold text-red-600"
                  >
                    Remove PDF
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-semibold hover:border-[#b7f23a]">
                  <Upload className="h-4 w-4 text-[#6f9000]" strokeWidth={2.2} />
                  Choose PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) =>
                      pickPdf(b.id, e.target.files?.[0] ?? null)
                    }
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/* =========================================================================
   ImageUploader — used by Gallery and Shop for photo uploads
   ========================================================================= */

type GalleryImage = {
  id: string
  file: File
  previewUrl: string
  caption: string
}

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const IMAGE_MAX_MB = 10

function ImageUploader({
  images,
  onChange,
  maxImages = 20,
}: {
  images: GalleryImage[]
  onChange: (imgs: GalleryImage[]) => void
  maxImages?: number
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const imagesRef = useRef(images)
  imagesRef.current = images

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    }
  }, [])

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return
    const incoming = Array.from(fileList)

    const valid: File[] = []
    for (const f of incoming) {
      if (!IMAGE_MIME.includes(f.type)) {
        alert(`"${f.name}" is not a supported image (JPG, PNG, WebP, GIF)`)
        continue
      }
      if (f.size > IMAGE_MAX_MB * 1024 * 1024) {
        alert(`"${f.name}" exceeds ${IMAGE_MAX_MB} MB`)
        continue
      }
      valid.push(f)
    }

    const remaining = maxImages - images.length
    if (remaining <= 0) {
      alert(`Maximum ${maxImages} images`)
      return
    }

    const next = valid.slice(0, remaining).map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
    }))

    onChange([...images, ...next])
  }

  const updateCaption = (id: string, caption: string) =>
    onChange(images.map((img) => (img.id === id ? { ...img, caption } : img)))

  const remove = (id: string) => {
    const target = images.find((i) => i.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    onChange(images.filter((i) => i.id !== id))
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">Images</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Upload photos from your device. {images.length}/{maxImages} added.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={images.length >= maxImages}
          className="shrink-0 rounded-full bg-[#f5f9e6] px-3 py-1.5 text-xs font-bold text-[#14181c] ring-1 ring-[#b7f23a] hover:bg-[#efffc0] disabled:opacity-50"
        >
          + Add images
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center hover:border-[#b7f23a]"
        >
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[#efffc0]">
            <ImageIcon className="h-5 w-5 text-[#6f9000]" strokeWidth={2.2} />
          </div>
          <p className="text-sm font-semibold text-gray-900">
            Add your first image
          </p>
          <p className="max-w-[240px] text-xs leading-5 text-gray-500">
            JPG, PNG, WebP or GIF. Up to {IMAGE_MAX_MB} MB each.
          </p>
        </button>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {images.map((img) => (
            <li
              key={img.id}
              className="space-y-2 rounded-2xl border border-gray-300 bg-white p-2"
            >
              <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  aria-label="Remove image"
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm transition active:scale-95"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </div>
              <input
                value={img.caption}
                onChange={(e) => updateCaption(img.id, e.target.value)}
                placeholder="Caption (optional)"
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#b7f23a]"
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* =========================================================================
   Forms
   ========================================================================= */

export function PortfolioForgeForm(p: ForgeFormProps) {
  const x = useCommon('portfolio')
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState('')

  return (
    <ForgeCreationShell
      {...p}
      title="Portfolio"
      eyebrow="pull. portfolio studio"
      description="Turn your work into a considered personal space that people can remember."
      draft={x.draft({
        title: x.name,
        subtitle: headline,
        bio,
        skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })}
    >
      <SubmitIntro>
        <TextField
          label="Portfolio name"
          value={x.name}
          onChange={x.setName}
          placeholder="Your name or studio"
          required
        />
        <TextField
          label="Short description"
          value={x.description}
          onChange={x.setDescription}
          placeholder="A one-line summary"
          multiline
        />
        <TextField
          label="Headline"
          value={headline}
          onChange={setHeadline}
          placeholder="Product designer · Lagos"
        />
        <TextField
          label="About you"
          value={bio}
          onChange={setBio}
          placeholder="Tell people what you make"
          multiline
        />
        <TextField
          label="Skills"
          value={skills}
          onChange={setSkills}
          placeholder="Design, writing, strategy"
          hint="Comma-separated"
        />
      </SubmitIntro>

      <ForgeSourcePicker
        mode={x.source.mode}
        url={x.source.url}
        file={x.source.file}
        onModeChange={x.source.setMode}
        onUrlChange={x.source.setUrl}
        onFileChange={x.source.setFile}
      />
    </ForgeCreationShell>
  )
}

export function BlogForgeForm(p: ForgeFormProps) {
  const x = useCommon('blog')
  const [author, setAuthor] = useState('')
  const [categories, setCategories] = useState('')
  const [first, setFirst] = useState('')

  return (
    <ForgeCreationShell
      {...p}
      title="Blog"
      eyebrow="pull. publishing studio"
      description="Give your ideas a home with a sharp editorial identity and a clear reading experience."
      draft={x.draft({
        title: x.name,
        author,
        categories: categories
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        firstArticle: first,
      })}
    >
      <SubmitIntro>
        <TextField
          label="Blog name"
          value={x.name}
          onChange={x.setName}
          placeholder="The Sunday note"
          required
        />
        <TextField
          label="Blog description"
          value={x.description}
          onChange={x.setDescription}
          placeholder="What will readers find here?"
          multiline
        />
        <TextField
          label="Author name"
          value={author}
          onChange={setAuthor}
          placeholder="Your name or publication"
        />
        <TextField
          label="Categories"
          value={categories}
          onChange={setCategories}
          placeholder="Culture, technology, ideas"
          hint="Comma-separated"
        />
        <TextField
          label="Optional first article"
          value={first}
          onChange={setFirst}
          placeholder="Paste a short opening draft"
          multiline
        />
      </SubmitIntro>

      <ForgeSourcePicker
        mode={x.source.mode}
        url={x.source.url}
        file={x.source.file}
        onModeChange={x.source.setMode}
        onUrlChange={x.source.setUrl}
        onFileChange={x.source.setFile}
      />
    </ForgeCreationShell>
  )
}

export function GalleryForgeForm(p: ForgeFormProps) {
  const x = useCommon('gallery')
  const [layout, setLayout] = useState('masonry')
  const [images, setImages] = useState<GalleryImage[]>([])
  const [books, setBooks] = useState<Book[]>([])

  return (
    <ForgeCreationShell
      {...p}
      title="Gallery"
      eyebrow="pull. visual space"
      description="Build a calm, image-first collection for photographs, artwork, and visual stories."
      draft={{
        ...x.draft({
          title: x.name,
          layout,
          images: images.map((img) => ({
            id: img.id,
            caption: img.caption,
          })),
          books: books.map((b) => ({
            id: b.id,
            title: b.title,
            author: b.author,
            description: b.description,
            coverUrl: b.coverUrl,
          })),
        }),
        sourceMode: undefined,
        extraAssets: [
          ...images.map((img) => ({
            key: `image:${img.id}`,
            file: img.file,
            mime: img.file.type,
          })),
          ...books
            .filter((b) => b.pdfFile)
            .map((b) => ({
              key: `book:${b.id}`,
              file: b.pdfFile!,
              mime: 'application/pdf',
            })),
        ],
      }}
    >
      <SubmitIntro>
        <TextField
          label="Gallery name"
          value={x.name}
          onChange={x.setName}
          placeholder="Selected works"
          required
        />
        <TextField
          label="Description"
          value={x.description}
          onChange={x.setDescription}
          placeholder="The story behind this collection"
          multiline
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Layout</span>
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
          >
            <option value="masonry">Masonry</option>
            <option value="grid">Grid</option>
            <option value="featured">Featured image</option>
          </select>
        </label>
      </SubmitIntro>

      <ImageUploader images={images} onChange={setImages} />

      <BookUploader books={books} onChange={setBooks} />
    </ForgeCreationShell>
  )
}

export function ShopForgeForm(p: ForgeFormProps) {
  const x = useCommon('shop')
  const [currency, setCurrency] = useState('NGN')
  const [products, setProducts] = useState('')
  const [physical, setPhysical] = useState(true)
  const [digital, setDigital] = useState(false)
  const [shipping, setShipping] = useState('')
  const [images, setImages] = useState<GalleryImage[]>([])
  const [books, setBooks] = useState<Book[]>([])

  return (
    <ForgeCreationShell
      {...p}
      title="Shop"
      eyebrow="pull. commerce studio"
      description="Create a focused storefront for products, services, and digital goods."
      draft={{
        ...x.draft({
          storeName: x.name,
          businessDescription: x.description,
          currency,
          sellsPhysical: physical,
          sellsDigital: digital,
          shippingNote: shipping,
          products: products
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          productImages: images.map((img) => ({
            id: img.id,
            caption: img.caption,
          })),
          digitalProducts: books.map((b) => ({
            id: b.id,
            title: b.title,
            author: b.author,
            description: b.description,
            coverUrl: b.coverUrl,
          })),
        }),
        sourceMode: undefined,
        extraAssets: [
          ...images.map((img) => ({
            key: `shop-image:${img.id}`,
            file: img.file,
            mime: img.file.type,
          })),
          ...books
            .filter((b) => b.pdfFile)
            .map((b) => ({
              key: `book:${b.id}`,
              file: b.pdfFile!,
              mime: 'application/pdf',
            })),
        ],
      }}
    >
      <SubmitIntro>
        <TextField
          label="Store name"
          value={x.name}
          onChange={x.setName}
          placeholder="Your store"
          required
        />
        <TextField
          label="Business description"
          value={x.description}
          onChange={x.setDescription}
          placeholder="What do you sell?"
          multiline
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Currency</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
          >
            <option>NGN</option>
            <option>USD</option>
            <option>GBP</option>
          </select>
        </label>
      </SubmitIntro>

      <Card>
        <p className="mb-3 text-sm font-bold text-gray-900">What you sell</p>

        <label className="flex items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-3">
          <span className="text-sm font-semibold">Physical products</span>
          <input
            type="checkbox"
            checked={physical}
            onChange={(e) => setPhysical(e.target.checked)}
            className="h-5 w-5 accent-[#b7f23a]"
          />
        </label>

        {physical && (
          <div className="mt-4 space-y-4">
            <TextField
              label="Products (one per line: name — price)"
              value={products}
              onChange={setProducts}
              placeholder={'Handmade notebook — 12000\nKano leather bag — 45000'}
              multiline
            />
            <TextField
              label="Shipping note"
              value={shipping}
              onChange={setShipping}
              placeholder="Ships within 3 days · Nationwide delivery"
              multiline
            />
          </div>
        )}

        <label className="mt-4 flex items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-3">
          <span className="text-sm font-semibold">Digital products</span>
          <input
            type="checkbox"
            checked={digital}
            onChange={(e) => setDigital(e.target.checked)}
            className="h-5 w-5 accent-[#b7f23a]"
          />
        </label>
      </Card>

      {physical && <ImageUploader images={images} onChange={setImages} />}

      {digital && <BookUploader books={books} onChange={setBooks} />}

      <Card>
        <p className="text-sm text-gray-600">
          Payment activation can be completed after your storefront is reviewed.
          Creating the Shop does not activate charges.
        </p>
      </Card>
    </ForgeCreationShell>
  )
}

export function DonationForgeForm(p: ForgeFormProps) {
  const x = useCommon('donation')
  const [cause, setCause] = useState('')
  const [target, setTarget] = useState('')
  const [beneficiary, setBeneficiary] = useState('')
  const [endDate, setEndDate] = useState('')

  return (
    <ForgeCreationShell
      {...p}
      title="Donation"
      eyebrow="pull. giving studio"
      description="Tell a trustworthy story, define the goal clearly, and make support feel simple."
      draft={{
        name: x.name,
        description: x.description,
        template_type: 'donation',
        config: {
          title: x.name,
          message: x.description,
          cause,
          targetAmount: Number(target),
          currency: 'NGN',
          beneficiary,
          endDate,
          verificationStatus: 'pending',
        },
      }}
    >
      <SubmitIntro>
        <TextField
          label="Campaign title"
          value={x.name}
          onChange={x.setName}
          placeholder="Help us build…"
          required
        />
        <TextField
          label="Cause or category"
          value={cause}
          onChange={setCause}
          placeholder="Education, health, community"
        />
        <TextField
          label="Story"
          value={x.description}
          onChange={x.setDescription}
          placeholder="Explain who this helps and why"
          multiline
        />
        <TextField
          label="Target amount (NGN)"
          value={target}
          onChange={setTarget}
          placeholder="500000"
          type="number"
          inputMode="numeric"
          min={1}
          step={100}
        />
        <TextField
          label="Beneficiary"
          value={beneficiary}
          onChange={setBeneficiary}
          placeholder="Person or registered organisation"
        />
        <TextField
          label="Campaign end date"
          value={endDate}
          onChange={setEndDate}
          type="date"
        />
      </SubmitIntro>

      <Card>
        <p className="text-sm text-gray-600">
          Donation Forges enter verification before public publishing. Payment
          collection is not enabled at creation.
        </p>
      </Card>
    </ForgeCreationShell>
  )
}

export function GameForgeForm(p: ForgeFormProps) {
  const x = useCommon('game')
  const [gameType, setGameType] = useState('')
  const [instructions, setInstructions] = useState('')
  const [rating, setRating] = useState('Everyone')

  return (
    <ForgeCreationShell
      {...p}
      title="Game"
      eyebrow="pull. play lab"
      description="Ship a playable experience with clear instructions, a fast launch, and a safe preview."
      draft={x.draft({
        title: x.name,
        description: x.description,
        gameType,
        instructions,
        ageRating: rating,
      })}
    >
      <SubmitIntro>
        <TextField
          label="Game title"
          value={x.name}
          onChange={x.setName}
          placeholder="A small game"
          required
        />
        <TextField
          label="Description"
          value={x.description}
          onChange={x.setDescription}
          placeholder="What will players do?"
          multiline
        />
        <TextField
          label="Game type"
          value={gameType}
          onChange={setGameType}
          placeholder="Puzzle, arcade, story"
        />
        <TextField
          label="Controls and instructions"
          value={instructions}
          onChange={setInstructions}
          placeholder="Arrow keys to move…"
          multiline
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Age rating</span>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
          >
            <option>Everyone</option>
            <option>10+</option>
            <option>13+</option>
            <option>16+</option>
          </select>
        </label>
      </SubmitIntro>

      <ForgeSourcePicker
        mode={x.source.mode}
        url={x.source.url}
        file={x.source.file}
        onModeChange={x.source.setMode}
        onUrlChange={x.source.setUrl}
        onFileChange={x.source.setFile}
        label="How should players open the game?"
      />
    </ForgeCreationShell>
  )
}

export function CustomForgeForm(p: ForgeFormProps) {
  const x = useCommon('custom')
  const [runtime, setRuntime] = useState('')
  const [build, setBuild] = useState('')
  const [start, setStart] = useState('')

  return (
    <ForgeCreationShell
      {...p}
      title="Custom"
      eyebrow="pull. build lab"
      description="Bring an advanced project into Siyarwa Pull with the runtime details it needs to run reliably."
      draft={x.draft({
        title: x.name,
        runtime,
        buildCommand: build,
        startCommand: start,
      })}
    >
      <SubmitIntro>
        <TextField
          label="Forge name"
          value={x.name}
          onChange={x.setName}
          placeholder="My app"
          required
        />
        <TextField
          label="Description"
          value={x.description}
          onChange={x.setDescription}
          placeholder="What are you building?"
          multiline
        />
        <TextField
          label="Framework or runtime"
          value={runtime}
          onChange={setRuntime}
          placeholder="Next.js, React, static HTML"
        />
        <TextField
          label="Build command (optional)"
          value={build}
          onChange={setBuild}
          placeholder="npm run build"
        />
        <TextField
          label="Start command (optional)"
          value={start}
          onChange={setStart}
          placeholder="npm start"
        />
      </SubmitIntro>

      <ForgeSourcePicker
        mode={x.source.mode === 'link' ? 'link' : 'zip'}
        url={x.source.url}
        file={x.source.file}
        onModeChange={x.source.setMode}
        onUrlChange={x.source.setUrl}
        onFileChange={x.source.setFile}
        label="Bring the project into Siyarwa Pull"
      />
    </ForgeCreationShell>
  )
}
