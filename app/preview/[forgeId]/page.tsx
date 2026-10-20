import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  Gamepad2,
  Heart,
  Image as ImageIcon,
  Layers3,
  Mail,
  MessageCircle,
  Play,
  ShoppingBag,
  Sparkles,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import ForgeCommunityPanel from './ForgeCommunityPanel'
import Bookshelf from './Bookshelf'
import ForgeActions from './ForgeActions'

type ForgeTemplate =
  | 'portfolio'
  | 'blog'
  | 'gallery'
  | 'shop'
  | 'donation'
  | 'game'
  | 'custom'

type Forge = {
  id: string
  user_id: string
  name: string
  description: string | null
  template_type: ForgeTemplate
  config: Record<string, any> | null
  is_public_preview: boolean
  is_published: boolean
  join_mode?: 'open' | 'request' | 'invite_only' | null
}

type ForgeFile = {
  id: string
  file_name: string
  file_type: string
  content: string | null
}

type ForgeAsset = {
  id: string
  asset_key: string
  filename: string
  mime: string
  size: number
  url: string
}

type Creator = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  is_verified: boolean | null
  is_official: boolean | null
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ forgeId: string }>
}) {
  const { forgeId } = await params
  const supabase = await createClient()

  const { data: forge, error } = await supabase
    .from('forges')
    .select(
      'id, user_id, name, description, template_type, config, is_public_preview, is_published, join_mode'
    )
    .eq('id', forgeId)
    .maybeSingle<Forge>()

  if (error || !forge) {
    return (
      <PreviewState
        title="Preview unavailable"
        message="This Forge could not be found or is no longer available."
      />
    )
  }
  if (!forge.is_public_preview && !forge.is_published) {
    return (
      <PreviewState
        title="Preview unavailable"
        message="This Forge has not been made public yet."
      />
    )
  }

  const config = forge.config || {}
  const source = config._source
  if (
    source?.mode === 'link' &&
    typeof source.url === 'string' &&
    /^https?:\/\//i.test(source.url)
  ) {
    redirect(source.url)
  }

  const [filesRes, assetsRes, creatorRes] = await Promise.all([
    supabase
      .from('forge_files')
      .select('id, file_name, file_type, content')
      .eq('forge_id', forgeId)
      .order('created_at', { ascending: true }),
    supabase
      .from('forge_assets')
      .select('id, asset_key, filename, mime, size, url')
      .eq('forge_id', forgeId)
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_verified, is_official')
      .eq('id', forge.user_id)
      .maybeSingle<Creator>(),
  ])

  const files: ForgeFile[] = filesRes.data || []
  const assets: ForgeAsset[] = assetsRes.data || []
  const creator = creatorRes.data

  const imageAssets = assets.filter((a) => a.mime.startsWith('image/'))
  const pdfAssets = assets.filter((a) => a.mime === 'application/pdf')

  const hasHtml = Boolean(files.some((f) => f.file_type === 'html'))

  return (
    <main className="min-h-screen bg-[#f6f8f4] text-[#15191b]">
      <div className="mx-auto min-h-screen max-w-xl bg-white shadow-[0_0_60px_rgba(20,25,27,0.08)]">
        <PreviewHeader forge={forge} creator={creator} />

        {hasHtml ? (
          <UploadedForgePreview forge={forge} />
        ) : (
          <TemplatePreview
            forge={forge}
            imageAssets={imageAssets}
            pdfAssets={pdfAssets}
          />
        )}

        <ForgeActions forgeId={forge.id} forgeName={forge.name} />
        <ForgeCommunityPanel forge={forge} />
        <PreviewFooter />
      </div>
    </main>
  )
}

/* =========================================================================
   Header
   ========================================================================= */

function PreviewHeader({
  forge,
  creator,
}: {
  forge: Forge
  creator?: Creator | null
}) {
  const meta = templateMeta[forge.template_type]
  return (
    <header className="border-b border-[#e7ebe5] bg-white">
      {/* Top nav */}
      <div className="flex items-center justify-between px-3 py-3">
        <Link
          href="/discover"
          aria-label="Back to Discover"
          className="grid h-9 w-9 place-items-center rounded-full text-[#15191b] transition active:scale-95 active:bg-black/5"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </Link>
        <div className="flex items-baseline gap-0.5">
          <span className="text-[17px] font-black tracking-[-0.05em]">pull</span>
          <span className="text-[17px] font-black tracking-[-0.05em] text-[#b7f23a]">.</span>
        </div>
        <div className="h-9 w-9" aria-hidden />
      </div>

      {/* Hero */}
      <div className="px-5 pb-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#f0f7df] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#4e6b00]">
            {meta.label}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#697278]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00bd55]" />
            Public Forge
          </span>
        </div>

        {creator && (
          <Link
            href={`/profile/${creator.username || creator.id}`}
            className="mt-4 inline-flex items-center gap-2.5 transition active:opacity-70"
          >
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#15191b] text-[12px] font-semibold text-[#b7f23a]">
              {creator.avatar_url ? (
                <Image
                  src={creator.avatar_url}
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              ) : (
                (creator.display_name || creator.username || '?')
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">
                {creator.display_name || creator.username || 'Creator'}
              </p>
              <p className="truncate text-[11px] text-[#8a9294]">
                @{creator.username || 'member'} · {meta.short}
              </p>
            </div>
          </Link>
        )}

        <h1 className="mt-5 text-[36px] font-black leading-[0.98] tracking-[-0.055em]">
          {forge.name}
        </h1>
        {forge.description && (
          <p className="mt-3 text-[15px] leading-[1.5] text-[#697278]">
            {forge.description}
          </p>
        )}
      </div>
    </header>
  )
}

/* =========================================================================
   Uploaded HTML preview (unchanged shape)
   ========================================================================= */

function UploadedForgePreview({ forge }: { forge: Forge }) {
  return (
    <section className="bg-[#15191b] p-3">
      <div className="mb-3 flex items-center justify-between px-2 text-white">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b7f23a]">
            Live project
          </p>
          <p className="mt-1 text-xs text-white/60">Interactive Forge preview</p>
        </div>
        <a
          href={`/api/forges/preview/${forge.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-white"
        >
          Open <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="h-[calc(100dvh-290px)] min-h-[540px] overflow-hidden bg-white">
        <iframe
          src={`/api/forges/preview/${forge.id}`}
          title={`${forge.name} preview`}
          className="h-full w-full border-0"
          sandbox="allow-scripts"
        />
      </div>
    </section>
  )
}

/* =========================================================================
   Dispatcher
   ========================================================================= */

function TemplatePreview({
  forge,
  imageAssets,
  pdfAssets,
}: {
  forge: Forge
  imageAssets: ForgeAsset[]
  pdfAssets: ForgeAsset[]
}) {
  const config = forge.config || {}
  switch (forge.template_type) {
    case 'portfolio':
      return <PortfolioPreview config={config} imageAssets={imageAssets} />
    case 'blog':
      return <BlogPreview config={config} />
    case 'gallery':
      return (
        <GalleryPreview
          config={config}
          imageAssets={imageAssets}
          pdfAssets={pdfAssets}
        />
      )
    case 'shop':
      return <ShopPreview config={config} imageAssets={imageAssets} />
    case 'donation':
      return <DonationPreview config={config} />
    case 'game':
      return <GamePreview config={config} />
    default:
      return <CustomPreview config={config} />
  }
}

/* =========================================================================
   Portfolio
   ========================================================================= */

function PortfolioPreview({
  config,
  imageAssets,
}: {
  config: Record<string, any>
  imageAssets: ForgeAsset[]
}) {
  const projects = asStringList(config.projects || config.items)
  const cover = imageAssets[0]?.url || config.cover_image || config.image_url

  return (
    <TemplateCanvas>
      {cover && (
        <div className="relative mb-6 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#eef1ec]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <HeroLabel text="Portfolio" />
      <h2 className="mt-3 text-[32px] font-black leading-none tracking-[-0.06em]">
        {config.title || 'My portfolio'}
      </h2>
      <p className="mt-3 max-w-sm text-[15px] leading-[1.5] text-[#697278]">
        {config.subtitle ||
          config.headline ||
          'Selected work, ideas, and projects.'}
      </p>

      {config.bio && (
        <p className="mt-5 border-l-2 border-[#b7f23a] pl-4 text-[14px] leading-[1.6] text-[#4f595d]">
          {config.bio}
        </p>
      )}

      <div className="mt-7 flex flex-wrap gap-2">
        <a
          href={
            config.contactUrl && /^https?:\/\//i.test(config.contactUrl)
              ? config.contactUrl
              : 'mailto:'
          }
          className="inline-flex items-center gap-2 rounded-full bg-[#15191b] px-4 py-2.5 text-[13px] font-bold text-white transition active:scale-95"
        >
          <Mail className="h-4 w-4" />
          Contact
        </a>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#e3e2dd] bg-white px-4 py-2.5 text-[13px] font-bold text-[#15191b]">
          <Layers3 className="h-4 w-4" />
          {projects.length} projects
        </span>
      </div>

      <SectionTitle
        title="Selected work"
        icon={<BriefcaseBusiness className="h-4 w-4" />}
      />
      {projects.length ? (
        <div className="space-y-3">
          {projects.map((project, i) => (
            <ProjectRow key={`${project}-${i}`} text={project} index={i} />
          ))}
        </div>
      ) : (
        <EmptyBlock text="Projects will appear here." />
      )}
    </TemplateCanvas>
  )
}

/* =========================================================================
   Blog
   ========================================================================= */

function BlogPreview({ config }: { config: Record<string, any> }) {
  const featured = String(
    config.featuredArticle || config.article || ''
  ).trim()
  const categories = asStringList(config.categories)

  return (
    <TemplateCanvas>
      <HeroLabel text="Journal" />
      <h2 className="mt-3 text-[32px] font-black leading-none tracking-[-0.06em]">
        {config.title || 'My blog'}
      </h2>
      <p className="mt-3 text-[15px] leading-[1.5] text-[#697278]">
        {config.description || 'Thoughts, stories, and ideas worth sharing.'}
      </p>

      {config.author && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#e7ebe5] bg-[#fbfcf9] p-3.5">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#15191b] text-white">
            <UserRound className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold">{config.author}</p>
            <p className="text-[11.5px] text-[#8a9294]">
              Writer and contributor
            </p>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c}
              className="rounded-full bg-[#f0f7df] px-3 py-1.5 text-[11.5px] font-bold text-[#4e6b00]"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <SectionTitle
        title="Featured article"
        icon={<MessageCircle className="h-4 w-4" />}
      />
      {featured ? (
        <article className="rounded-2xl border border-[#dfe5dc] bg-[#fbfcf9] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#00a94f]">
            Featured
          </p>
          <p className="mt-3 whitespace-pre-line text-[20px] font-bold leading-[1.3] tracking-[-0.03em]">
            {featured}
          </p>
        </article>
      ) : (
        <EmptyBlock text="The featured article will appear here." />
      )}
    </TemplateCanvas>
  )
}

/* =========================================================================
   Gallery — images + bookshelf
   ========================================================================= */

function GalleryPreview({
  config,
  imageAssets,
  pdfAssets,
}: {
  config: Record<string, any>
  imageAssets: ForgeAsset[]
  pdfAssets: ForgeAsset[]
}) {
  const configImages = asStringList(config.images)
  const assetImages = imageAssets
    .filter((a) => a.asset_key.startsWith('image:'))
    .map((a) => a.url)
  const allImages = [...assetImages, ...configImages]

  const bookMeta = Array.isArray(config.books)
    ? (config.books as any[]).map((b) => ({
        title: b.title,
        author: b.author,
        description: b.description,
        coverUrl: b.coverUrl,
      }))
    : []

  const books = pdfAssets
    .filter((a) => a.asset_key.startsWith('book:'))
    .map((a) => ({ id: a.id, filename: a.filename, url: a.url }))

  return (
    <TemplateCanvas>
      <HeroLabel text="Gallery" />
      <h2 className="mt-3 text-[32px] font-black leading-none tracking-[-0.06em]">
        {config.title || 'My gallery'}
      </h2>
      <p className="mt-3 text-[15px] leading-[1.5] text-[#697278]">
        A visual collection of work, moments, and details.
      </p>

      {allImages.length > 0 && (
        <>
          <SectionTitle title="Collection" icon={<ImageIcon className="h-4 w-4" />} />
          <div className="grid grid-cols-2 gap-2">
            {allImages.map((img, i) => (
              <div
                key={`${img}-${i}`}
                className={`overflow-hidden rounded-xl bg-[#eef1ec] ${
                  i % 5 === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`Gallery image ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {books.length > 0 && (
        <>
          <SectionTitle
            title="Reading room"
            icon={<BookOpen className="h-4 w-4" />}
          />
          <Bookshelf books={books} bookMeta={bookMeta} />
        </>
      )}

      {allImages.length === 0 && books.length === 0 && (
        <EmptyBlock text="Images and books will appear here." />
      )}
    </TemplateCanvas>
  )
}

/* =========================================================================
   Shop — structured products + asset images
   ========================================================================= */

type Product = { name: string; price: number; image?: string }

function ShopPreview({
  config,
  imageAssets,
}: {
  config: Record<string, any>
  imageAssets: ForgeAsset[]
}) {
  const raw = config.products
  const parsed: Product[] = Array.isArray(raw)
    ? raw
        .map((p: any, i: number) => {
          if (typeof p === 'string') {
            const [name, priceStr] = p.split(' — ')
            const price = Number(priceStr?.replace(/[^0-9.]/g, '')) || 0
            return { name: name || `Product ${i + 1}`, price }
          }
          return {
            name: p.name || `Product ${i + 1}`,
            price: Number(p.price) || 0,
            image: p.image || p.imageUrl,
          }
        })
        .filter((p) => p.name)
    : []

  const productImageAssets = imageAssets.filter((a) =>
    a.asset_key.startsWith('shop-image:')
  )
  const withImages: Product[] = parsed.map((p, i) => ({
    ...p,
    image: p.image || productImageAssets[i]?.url,
  }))

  const currency = config.currency || 'NGN'

  return (
    <TemplateCanvas>
      <HeroLabel text="Storefront" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="mt-3 text-[32px] font-black leading-none tracking-[-0.06em]">
            {config.storeName || config.title || 'My store'}
          </h2>
          <p className="mt-3 text-[15px] leading-[1.5] text-[#697278]">
            {config.businessDescription ||
              'Products and services from this creator.'}
          </p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#b7f23a] text-[#15191b]">
          <ShoppingBag className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-[#e7ebe5] bg-[#fbfcf9] px-4 py-3 text-[12.5px]">
        <span className="font-bold">{withImages.length} products</span>
        <span className="text-[#697278]">Currency: {currency}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {withImages.length ? (
          withImages.map((product, i) => (
            <ProductCard
              key={`${product.name}-${i}`}
              product={product}
              currency={currency}
            />
          ))
        ) : (
          <div className="col-span-2">
            <EmptyBlock text="Products will appear here." />
          </div>
        )}
      </div>
    </TemplateCanvas>
  )
}

/* =========================================================================
   Donation
   ========================================================================= */

function DonationPreview({ config }: { config: Record<string, any> }) {
  const target = Number(config.targetAmount) || 0
  const tiers = Array.isArray(config.tiers)
    ? config.tiers
    : [
        { amount: 5, label: 'Support' },
        { amount: 25, label: 'Contribute' },
        { amount: 100, label: 'Champion' },
      ]

  return (
    <TemplateCanvas>
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#fff0ef] text-[#d34e47]">
        <Heart className="h-6 w-6 fill-current" />
      </div>
      <HeroLabel text="Support campaign" />
      <h2 className="mt-3 text-[32px] font-black leading-none tracking-[-0.06em]">
        {config.title || 'Support this work'}
      </h2>
      <p className="mt-4 text-[15px] leading-[1.5] text-[#697278]">
        {config.message || 'Help bring this idea to life.'}
      </p>

      {config.cause && (
        <p className="mt-5 text-[13.5px] font-bold">
          Cause:{' '}
          <span className="font-normal text-[#697278]">{config.cause}</span>
        </p>
      )}
      {config.beneficiary && (
        <p className="mt-1 text-[13.5px] font-bold">
          For:{' '}
          <span className="font-normal text-[#697278]">
            {config.beneficiary}
          </span>
        </p>
      )}

      <div className="mt-7 rounded-2xl border border-[#dfe5dc] p-4">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-black">₦0</span>
          <span className="text-[12px] text-[#697278]">
            of {target ? formatMoney(target, config.currency) : 'target'}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf0eb]">
          <div className="h-full w-0 bg-[#b7f23a]" />
        </div>
      </div>

      <SectionTitle
        title="Choose support"
        icon={<CircleDollarSign className="h-4 w-4" />}
      />
      <div className="space-y-2">
        {tiers.map((tier: any, i: number) => (
          <div
            key={i}
            className="flex w-full items-center justify-between rounded-2xl border border-[#dfe5dc] px-4 py-3"
          >
            <span>
              <span className="block text-[13.5px] font-bold">
                {tier.label || 'Support'}
              </span>
              <span className="text-[11.5px] text-[#697278]">
                Make an impact
              </span>
            </span>
            <span className="font-black">
              {formatMoney(Number(tier.amount) || 0, config.currency)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-[11.5px] text-[#8a9294]">
        Contributions are not yet enabled in this preview.
      </p>
    </TemplateCanvas>
  )
}

/* =========================================================================
   Game
   ========================================================================= */

function GamePreview({ config }: { config: Record<string, any> }) {
  return (
    <TemplateCanvas>
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf1ff] text-[#315fbd]">
        <Gamepad2 className="h-7 w-7" />
      </div>
      <HeroLabel text="Mini game" />
      <h2 className="mt-3 text-[32px] font-black leading-none tracking-[-0.06em]">
        {config.title || 'My game'}
      </h2>
      <p className="mt-4 text-[15px] leading-[1.5] text-[#697278]">
        {config.instructions || 'A small interactive experience built in Siyarwa Pull.'}
      </p>
      <div className="mt-7 grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-[#cbd5e1] bg-[#f8fbff] text-center">
        <div>
          <Play className="mx-auto h-10 w-10 text-[#315fbd]" />
          <p className="mt-3 text-[13.5px] font-bold">Game canvas ready</p>
          <p className="mt-1 text-[11.5px] text-[#697278]">
            Add an uploaded project to play here.
          </p>
        </div>
      </div>
    </TemplateCanvas>
  )
}

/* =========================================================================
   Custom
   ========================================================================= */

function CustomPreview({ config }: { config: Record<string, any> }) {
  return (
    <TemplateCanvas>
      <HeroLabel text="Custom Forge" />
      <h2 className="mt-3 text-[32px] font-black leading-none tracking-[-0.06em]">
        {config.title || 'Built on Siyarwa Pull'}
      </h2>
      <p className="mt-4 text-[15px] leading-[1.5] text-[#697278]">
        {config.description ||
          config.environment ||
          'A custom project with its own identity and direction.'}
      </p>
      <div className="mt-8 rounded-2xl border border-[#dfe5dc] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#00a94f]">
          Project details
        </p>
        <div className="mt-4 space-y-3 text-[13.5px]">
          {[
            ['Runtime', config.runtime],
            ['Environment', config.environment],
            ['Start command', config.startCommand],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div
                key={String(label)}
                className="flex justify-between gap-4 border-b border-[#edf0eb] pb-3"
              >
                <span className="text-[#697278]">{label}</span>
                <span className="text-right font-semibold">{value}</span>
              </div>
            ))}
        </div>
      </div>
    </TemplateCanvas>
  )
}

/* =========================================================================
   Shared pieces
   ========================================================================= */

function TemplateCanvas({ children }: { children: ReactNode }) {
  return <section className="px-5 pb-10 pt-7">{children}</section>
}

function HeroLabel({ text }: { text: string }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00a94f]">
      {text}
    </p>
  )
}

function SectionTitle({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="mb-4 mt-9 flex items-center gap-2 border-b border-[#e7ebe5] pb-3 text-[13px] font-black">
      <span className="text-[#00a94f]">{icon}</span>
      {title}
    </div>
  )
}

function ProjectRow({ text, index }: { text: string; index: number }) {
  const [name, ...rest] = text.split(' — ')
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#dfe5dc] p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef7d1] text-[13px] font-black text-[#668500]">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold">{name}</p>
        {rest.length > 0 && (
          <p className="mt-1 truncate text-[12px] text-[#697278]">
            {rest.join(' — ')}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-[#8a9294]" />
    </div>
  )
}

function ProductCard({
  product,
  currency,
}: {
  product: Product
  currency: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#dfe5dc] bg-white">
      <div className="relative aspect-square bg-[#f0f3ee]">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <ShoppingBag className="h-8 w-8 text-[#c1c7c2]" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-[13.5px] font-bold">{product.name}</p>
        <p className="mt-1 text-[13.5px] font-black text-[#00a94f]">
          {formatMoney(product.price, currency)}
        </p>
      </div>
    </div>
  )
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cbd5c9] px-5 py-8 text-center text-[13px] text-[#697278]">
      {text}
    </div>
  )
}

function PreviewState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8f4] px-5">
      <section className="w-full max-w-md rounded-2xl border border-[#dfe5dc] bg-white p-7 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#15191b] text-3xl font-black text-[#b7f23a]">
          p
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-[-0.05em]">{title}</h1>
        <p className="mt-3 text-[13.5px] leading-[1.6] text-[#697278]">
          {message}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#15191b] px-4 py-3 text-[13px] font-bold text-white"
        >
          Go to Siyarwa Pull <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  )
}

function PreviewFooter() {
  return (
    <footer className="flex items-center justify-between border-t border-[#e7ebe5] px-5 py-5 text-[11px] text-[#8a9294]">
      <span>
        Built with <strong className="text-[#15191b]">pull.</strong>
      </span>
      <span className="inline-flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-[#00a94f]" /> Open to collaborate
      </span>
    </footer>
  )
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        typeof item === 'string'
          ? [item]
          : item && typeof item === 'object'
            ? [Object.values(item).filter(Boolean).join(' — ')]
            : []
      )
      .filter(Boolean) as string[]
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function formatMoney(amount: number, currency?: string) {
  const code = String(currency || 'NGN').toUpperCase()
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${code} ${amount.toLocaleString()}`
  }
}

const templateMeta: Record<
  ForgeTemplate,
  { label: string; short: string }
> = {
  portfolio: { label: 'Portfolio', short: 'Selected work' },
  blog: { label: 'Blog', short: 'Stories & ideas' },
  gallery: { label: 'Gallery', short: 'Visual collection' },
  shop: { label: 'Shop', short: 'Products & services' },
  donation: { label: 'Campaign', short: 'Support a cause' },
  game: { label: 'Game', short: 'Interactive experience' },
  custom: { label: 'Custom', short: 'Original project' },
}
