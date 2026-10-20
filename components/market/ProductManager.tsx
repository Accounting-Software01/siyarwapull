'use client'

import { useCallback, useEffect, useState } from 'react'
import { ImagePlus, Loader2, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/market/image'
import { formatNaira, nairaToKobo } from '@/lib/market/money'
import { PRODUCT_CATEGORIES, PRODUCT_IMAGE_BUCKET, productImageUrl } from '@/lib/market/constants'

type Product = {
  id: string
  title: string
  description: string
  category: string
  price_kobo: number
  stock: number
  status: 'draft' | 'active' | 'archived'
  image_paths: string[]
}

type FormState = {
  id: string | null
  title: string
  description: string
  category: string
  price: string
  stock: string
  status: Product['status']
  imagePaths: string[]
}

const emptyForm: FormState = {
  id: null, title: '', description: '', category: 'other', price: '', stock: '1', status: 'draft', imagePaths: [],
}

const PRODUCT_COLUMNS = 'id,title,description,category,price_kobo,stock,status,image_paths'
const MAX_IMAGES = 4

export default function ProductManager({ storeId, ownerId }: { storeId: string; ownerId: string }) {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState | null>(null)
  const [removed, setRemoved] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    if (err) setError('Could not load your products.')
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }, [supabase, storeId])

  useEffect(() => {
    load()
  }, [load])

  function startNew() {
    setError(null)
    setRemoved([])
    setForm({ ...emptyForm })
  }

  function startEdit(p: Product) {
    setError(null)
    setRemoved([])
    setForm({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      price: String(p.price_kobo / 100),
      stock: String(p.stock),
      status: p.status,
      imagePaths: p.image_paths,
    })
  }

  async function addImages(files: FileList | null) {
    if (!files || !form) return
    setError(null)
    setUploading(true)
    try {
      const next = [...form.imagePaths]
      for (const file of Array.from(files)) {
        if (next.length >= MAX_IMAGES) break
        const blob = await compressImage(file)
        const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
        const path = `${ownerId}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(path, blob, { contentType: blob.type, upsert: false })
        if (upErr) throw new Error('Upload failed. Check your connection and try again.')
        next.push(path)
      }
      setForm({ ...form, imagePaths: next })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function removeImage(path: string) {
    if (!form) return
    setForm({ ...form, imagePaths: form.imagePaths.filter((p) => p !== path) })
    setRemoved((r) => [...r, path])
  }

  async function save() {
    if (!form) return
    setError(null)

    const priceKobo = nairaToKobo(form.price)
    const stock = Number(form.stock)
    if (form.title.trim().length < 2) return setError('Give your product a title.')
    if (priceKobo === null || priceKobo < 10000) return setError('Enter a price of at least ₦100.')
    if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return setError('Stock must be a whole number.')
    if (form.status === 'active' && form.imagePaths.length === 0) return setError('Add at least one photo before publishing.')

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      price_kobo: priceKobo,
      stock,
      status: form.status,
      image_paths: form.imagePaths,
    }

    setSaving(true)
    const { error: saveErr } = form.id
      ? await supabase.from('products').update(payload).eq('id', form.id)
      : await supabase.from('products').insert({ ...payload, store_id: storeId })
    setSaving(false)

    if (saveErr) return setError('Could not save this product. Please check the details.')

    // Clean up photos the seller removed (best effort).
    const toDelete = removed.filter((p) => !form.imagePaths.includes(p))
    if (toDelete.length) await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(toDelete)

    setForm(null)
    setRemoved([])
    load()
  }

  if (form) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{form.id ? 'Edit product' : 'New product'}</h2>
          <button onClick={() => setForm(null)} className="rounded-full p-1.5 hover:bg-gray-100" aria-label="Cancel">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {form.imagePaths.map((p) => (
            <div key={p} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={productImageUrl(p)} alt="" className="h-full w-full object-cover" />
              <button onClick={() => removeImage(p)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" aria-label="Remove photo">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {form.imagePaths.length < MAX_IMAGES ? (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              <span className="mt-1">{uploading ? 'Uploading' : 'Add photo'}</span>
              <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => addImages(e.target.files)} />
            </label>
          ) : null}
        </div>

        <Input placeholder="Product title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
        <Textarea placeholder="Describe your product" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} maxLength={2000} />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" aria-label="Category">
          {PRODUCT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Price in ₦" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <Input placeholder="Stock" inputMode="numeric" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value.replace(/\D/g, '') })} />
        </div>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Product['status'] })} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" aria-label="Status">
          <option value="draft">Draft — only you can see it</option>
          <option value="active">Published — visible in the Market</option>
          <option value="archived">Archived — hidden</option>
        </select>

        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <Button onClick={save} disabled={saving || uploading} className="w-full" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save product
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button onClick={startNew} className="w-full" size="lg">Add a product</Button>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Loading…</p> : null}
      {!loading && products.length === 0 ? <p className="text-sm text-gray-500">No products yet. Add your first one.</p> : null}
      <ul className="divide-y rounded-2xl border">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {p.image_paths[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={productImageUrl(p.image_paths[0])} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.title}</p>
              <p className="text-sm text-gray-500">{formatNaira(p.price_kobo)} · {p.stock} in stock · {p.status}</p>
            </div>
            <button onClick={() => startEdit(p)} className="rounded-full p-2 hover:bg-gray-100" aria-label={`Edit ${p.title}`}>
              <Pencil className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
