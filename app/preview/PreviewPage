import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
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
} from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import ForgeCommunityPanel from "./ForgeCommunityPanel";

type ForgeTemplate =
  "portfolio" | "blog" | "gallery" | "shop" | "donation" | "game" | "custom";

type Forge = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  template_type: ForgeTemplate;
  config: Record<string, any> | null;
  is_public_preview: boolean;
  is_published: boolean;
  join_mode?: "open" | "request" | "invite_only" | null;
};

type ForgeFile = {
  id: string;
  file_name: string;
  file_type: string;
  content: string | null;
};

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ forgeId: string }>;
}) {
  const { forgeId } = await params;
  const supabase = await createClient();

  const { data: forge, error } = await supabase
    .from("forges")
    .select(
      "id, user_id, name, description, template_type, config, is_public_preview, is_published, join_mode",
    )
    .eq("id", forgeId)
    .maybeSingle<Forge>();

  if (error || !forge)
    return (
      <PreviewState
        title="Preview unavailable"
        message="This Forge could not be found or is no longer available."
      />
    );
  if (!forge.is_public_preview && !forge.is_published)
    return (
      <PreviewState
        title="Preview unavailable"
        message="This Forge has not been made public yet."
      />
    );

  const config = forge.config || {};
  const source = config._source;
  if (
    source?.mode === "link" &&
    typeof source.url === "string" &&
    /^https?:\/\//i.test(source.url)
  ) {
    redirect(source.url);
  }

  const { data: files } = await supabase
    .from("forge_files")
    .select("id, file_name, file_type, content")
    .eq("forge_id", forgeId)
    .order("created_at", { ascending: true });

  const hasHtml = Boolean(
    (files || []).some((file: ForgeFile) => file.file_type === "html"),
  );

  return (
    <main className="min-h-screen bg-[#f6f8f4] text-[#15191b]">
      <div className="mx-auto min-h-screen max-w-xl bg-white shadow-[0_0_60px_rgba(20,25,27,0.08)]">
        <PreviewHeader forge={forge} />
        {hasHtml ? (
          <UploadedForgePreview forge={forge} />
        ) : (
          <TemplatePreview forge={forge} />
        )}
        <ForgeCommunityPanel forge={forge} />
        <PreviewFooter />
      </div>
    </main>
  );
}

function PreviewHeader({ forge }: { forge: Forge }) {
  const meta = templateMeta[forge.template_type];
  return (
    <header className="border-b border-[#e7ebe5] bg-white px-5 pb-5 pt-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center bg-[#15191b] text-white">
            <span className="text-2xl font-black leading-none">p</span>
            <span className="sr-only">Pull</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#00a94f]">
              pull. preview
            </p>
            <p className="truncate text-sm font-bold">{forge.name}</p>
          </div>
        </div>
        <span className="shrink-0 border border-[#dfe5dc] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#697278]">
          {meta.label}
        </span>
      </div>
      <div className="mt-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#697278]">
          <span className="h-2 w-2 rounded-full bg-[#00bd55]" />
          Public Forge <span className="text-[#c1c7c2]">·</span> {meta.short}
        </div>
        <h1 className="mt-3 text-[38px] font-black leading-[0.97] tracking-[-0.075em]">
          {forge.name}
        </h1>
        {forge.description && (
          <p className="mt-3 text-[15px] leading-6 text-[#697278]">
            {forge.description}
          </p>
        )}
      </div>
    </header>
  );
}

function UploadedForgePreview({ forge }: { forge: Forge }) {
  return (
    <section className="bg-[#15191b] p-3">
      <div className="mb-3 flex items-center justify-between px-2 text-white">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b7f23a]">
            Live project
          </p>
          <p className="mt-1 text-xs text-white/60">
            Interactive Forge preview
          </p>
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
  );
}

function TemplatePreview({ forge }: { forge: Forge }) {
  const config = forge.config || {};
  switch (forge.template_type) {
    case "portfolio":
      return <PortfolioPreview config={config} />;
    case "blog":
      return <BlogPreview config={config} />;
    case "gallery":
      return <GalleryPreview config={config} />;
    case "shop":
      return <ShopPreview config={config} />;
    case "donation":
      return <DonationPreview config={config} />;
    case "game":
      return <GamePreview config={config} />;
    default:
      return <CustomPreview config={config} />;
  }
}

function PortfolioPreview({ config }: { config: Record<string, any> }) {
  const projects = asStringList(config.projects || config.items);
  return (
    <TemplateCanvas>
      <HeroLabel text="Portfolio" />
      <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.07em]">
        {config.title || "My portfolio"}
      </h2>
      <p className="mt-3 max-w-sm text-base leading-6 text-[#697278]">
        {config.subtitle ||
          config.headline ||
          "Selected work, ideas, and projects."}
      </p>
      {config.bio && (
        <p className="mt-5 border-l-2 border-[#b7f23a] pl-4 text-sm leading-6 text-[#4f595d]">
          {config.bio}
        </p>
      )}
      <div className="mt-8 flex gap-2">
        <ActionButton label="Contact" icon={<Mail className="h-4 w-4" />} />
        <ActionButton
          label="Projects"
          icon={<Layers3 className="h-4 w-4" />}
          subtle
        />
      </div>
      <SectionTitle
        title="Selected work"
        icon={<BriefcaseBusiness className="h-4 w-4" />}
      />
      {projects.length ? (
        <div className="space-y-3">
          {projects.map((project, index) => (
            <ProjectRow
              key={`${project}-${index}`}
              text={project}
              index={index}
            />
          ))}
        </div>
      ) : (
        <EmptyBlock text="Projects will appear here." />
      )}
    </TemplateCanvas>
  );
}

function BlogPreview({ config }: { config: Record<string, any> }) {
  const featured = String(
    config.featuredArticle || config.article || "",
  ).trim();
  const categories = asStringList(config.categories);
  return (
    <TemplateCanvas>
      <HeroLabel text="Journal" />
      <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.07em]">
        {config.title || "My blog"}
      </h2>
      <p className="mt-3 text-base leading-6 text-[#697278]">
        {config.description || "Thoughts, stories, and ideas worth sharing."}
      </p>
      {config.author && (
        <div className="mt-5 flex items-center gap-3 border-y border-[#e7ebe5] py-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#15191b] text-white">
            <UserRound className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold">{config.author}</p>
            <p className="text-[11px] text-[#8a9294]">Writer and contributor</p>
          </div>
        </div>
      )}
      {categories.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category}
              className="bg-[#f0f7df] px-3 py-1.5 text-xs font-bold text-[#4e6b00]"
            >
              {category}
            </span>
          ))}
        </div>
      )}
      <SectionTitle
        title="Featured article"
        icon={<MessageCircle className="h-4 w-4" />}
      />
      {featured ? (
        <article className="border border-[#dfe5dc] bg-[#fbfcf9] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#00a94f]">
            Featured
          </p>
          <p className="mt-3 whitespace-pre-line text-[21px] font-bold leading-7 tracking-[-0.04em]">
            {featured}
          </p>
          <button className="mt-5 inline-flex items-center gap-1 text-sm font-bold">
            Read article <ArrowUpRight className="h-4 w-4" />
          </button>
        </article>
      ) : (
        <EmptyBlock text="The featured article will appear here." />
      )}
    </TemplateCanvas>
  );
}

function GalleryPreview({ config }: { config: Record<string, any> }) {
  const images = asStringList(config.images);
  return (
    <TemplateCanvas>
      <HeroLabel text="Gallery" />
      <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.07em]">
        {config.title || "My gallery"}
      </h2>
      <p className="mt-3 text-base leading-6 text-[#697278]">
        A visual collection of work, moments, and details.
      </p>
      <SectionTitle
        title="Collection"
        icon={<ImageIcon className="h-4 w-4" />}
      />
      {images.length ? (
        <div className="grid grid-cols-2 gap-2">
          {images.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className={`overflow-hidden bg-[#eef1ec] ${index % 3 === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"}`}
            >
              <img
                src={image}
                alt={`Gallery image ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyBlock text="Images will appear here." />
      )}
    </TemplateCanvas>
  );
}

function ShopPreview({ config }: { config: Record<string, any> }) {
  const products = asStringList(config.products);
  return (
    <TemplateCanvas>
      <HeroLabel text="Storefront" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.07em]">
            {config.storeName || config.title || "My store"}
          </h2>
          <p className="mt-3 text-base leading-6 text-[#697278]">
            {config.businessDescription ||
              "Products and services from this creator."}
          </p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center bg-[#b7f23a] text-[#15191b]">
          <ShoppingBag className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between border-y border-[#e7ebe5] py-3 text-xs">
        <span className="font-bold">{products.length} products</span>
        <span className="text-[#697278]">
          Currency: {config.currency || "NGN"}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {products.length ? (
          products.map((product, index) => (
            <ProductCard
              key={`${product}-${index}`}
              text={product}
              currency={config.currency || "NGN"}
            />
          ))
        ) : (
          <div className="col-span-2">
            <EmptyBlock text="Products will appear here." />
          </div>
        )}
      </div>
    </TemplateCanvas>
  );
}

function DonationPreview({ config }: { config: Record<string, any> }) {
  const target = Number(config.targetAmount) || 0;
  const tiers = Array.isArray(config.tiers)
    ? config.tiers
    : [
        { amount: 5, label: "Support" },
        { amount: 25, label: "Contribute" },
        { amount: 100, label: "Champion" },
      ];
  return (
    <TemplateCanvas>
      <div className="grid h-14 w-14 place-items-center bg-[#fff0ef] text-[#d34e47]">
        <Heart className="h-6 w-6 fill-current" />
      </div>
      <HeroLabel text="Support campaign" />
      <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.07em]">
        {config.title || "Support this work"}
      </h2>
      <p className="mt-4 text-base leading-6 text-[#697278]">
        {config.message || "Help bring this idea to life."}
      </p>
      {config.cause && (
        <p className="mt-5 text-sm font-bold">
          Cause:{" "}
          <span className="font-normal text-[#697278]">{config.cause}</span>
        </p>
      )}
      {config.beneficiary && (
        <p className="mt-1 text-sm font-bold">
          For:{" "}
          <span className="font-normal text-[#697278]">
            {config.beneficiary}
          </span>
        </p>
      )}
      <div className="mt-7 border border-[#dfe5dc] p-4">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-black">₦0</span>
          <span className="text-xs text-[#697278]">
            of {target ? formatMoney(target, config.currency) : "target"}
          </span>
        </div>
        <div className="mt-3 h-2 bg-[#edf0eb]">
          <div className="h-full w-0 bg-[#b7f23a]" />
        </div>
      </div>
      <SectionTitle
        title="Choose support"
        icon={<CircleDollarSign className="h-4 w-4" />}
      />
      <div className="space-y-2">
        {tiers.map((tier: any, index: number) => (
          <button
            key={index}
            type="button"
            className="flex w-full items-center justify-between border border-[#dfe5dc] px-4 py-3 text-left hover:border-[#15191b]"
          >
            <span>
              <span className="block text-sm font-bold">
                {tier.label || "Support"}
              </span>
              <span className="text-xs text-[#697278]">Make an impact</span>
            </span>
            <span className="font-black">
              {formatMoney(Number(tier.amount) || 0, config.currency)}
            </span>
          </button>
        ))}
      </div>
    </TemplateCanvas>
  );
}

function GamePreview({ config }: { config: Record<string, any> }) {
  return (
    <TemplateCanvas>
      <div className="grid h-14 w-14 place-items-center bg-[#eaf1ff] text-[#315fbd]">
        <Gamepad2 className="h-7 w-7" />
      </div>
      <HeroLabel text="Mini game" />
      <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.07em]">
        {config.title || "My game"}
      </h2>
      <p className="mt-4 text-base leading-6 text-[#697278]">
        {config.instructions || "A small interactive experience built in Pull."}
      </p>
      <div className="mt-7 grid aspect-square place-items-center border-2 border-dashed border-[#cbd5e1] bg-[#f8fbff] text-center">
        <div>
          <Play className="mx-auto h-10 w-10 text-[#315fbd]" />
          <p className="mt-3 text-sm font-bold">Game canvas ready</p>
          <p className="mt-1 text-xs text-[#697278]">
            Add an uploaded project to play here.
          </p>
        </div>
      </div>
    </TemplateCanvas>
  );
}

function CustomPreview({ config }: { config: Record<string, any> }) {
  return (
    <TemplateCanvas>
      <HeroLabel text="Custom Forge" />
      <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.07em]">
        {config.title || "Built on Pull"}
      </h2>
      <p className="mt-4 text-base leading-6 text-[#697278]">
        {config.description ||
          config.environment ||
          "A custom project with its own identity and direction."}
      </p>
      <div className="mt-8 border border-[#dfe5dc] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#00a94f]">
          Project details
        </p>
        <div className="mt-4 space-y-3 text-sm">
          {[
            ["Runtime", config.runtime],
            ["Environment", config.environment],
            ["Start command", config.startCommand],
          ]
            .filter(([, value]) => value)
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
  );
}

function TemplateCanvas({ children }: { children: ReactNode }) {
  return <section className="px-5 pb-10 pt-7">{children}</section>;
}
function HeroLabel({ text }: { text: string }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00a94f]">
      {text}
    </p>
  );
}
function SectionTitle({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="mt-9 mb-4 flex items-center gap-2 border-b border-[#e7ebe5] pb-3 text-sm font-black">
      <span className="text-[#00a94f]">{icon}</span>
      {title}
    </div>
  );
}
function ActionButton({
  label,
  icon,
  subtle = false,
}: {
  label: string;
  icon: ReactNode;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-bold ${subtle ? "border border-[#dfe5dc] bg-white" : "bg-[#15191b] text-white"}`}
    >
      {icon}
      {label}
    </button>
  );
}
function ProjectRow({ text, index }: { text: string; index: number }) {
  const [name, ...rest] = text.split(" — ");
  return (
    <div className="flex items-center gap-3 border border-[#dfe5dc] p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#eef7d1] text-sm font-black text-[#668500]">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{name}</p>
        {rest.length > 0 && (
          <p className="mt-1 truncate text-xs text-[#697278]">
            {rest.join(" — ")}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-[#8a9294]" />
    </div>
  );
}
function ProductCard({ text, currency }: { text: string; currency: string }) {
  const parts = text.split(" — ");
  return (
    <div className="border border-[#dfe5dc] bg-white p-3">
      <div className="aspect-square bg-[#f0f3ee]" />
      <p className="mt-3 line-clamp-2 text-sm font-bold">{parts[0]}</p>
      <p className="mt-1 text-sm font-black text-[#00a94f]">
        {parts[1]
          ? formatMoney(Number(parts[1].replace(/[^0-9.]/g, "")) || 0, currency)
          : "View details"}
      </p>
      <button
        type="button"
        className="mt-3 w-full border border-[#15191b] py-2 text-xs font-bold"
      >
        Inquire
      </button>
    </div>
  );
}
function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-[#cbd5c9] px-5 py-8 text-center text-sm text-[#697278]">
      {text}
    </div>
  );
}
function PreviewState({ title, message }: { title: string; message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8f4] px-5">
      <section className="w-full max-w-md border border-[#dfe5dc] bg-white p-7 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center bg-[#15191b] text-3xl font-black text-[#b7f23a]">
          p
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-[-0.05em]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#697278]">{message}</p>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2 bg-[#15191b] px-4 py-3 text-sm font-bold text-white"
        >
          Go to Pull <ArrowUpRight className="h-4 w-4" />
        </a>
      </section>
    </main>
  );
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
  );
}
function asStringList(value: unknown): string[] {
  if (Array.isArray(value))
    return value
      .flatMap((item) =>
        typeof item === "string"
          ? [item]
          : item && typeof item === "object"
            ? [Object.values(item).filter(Boolean).join(" — ")]
            : [],
      )
      .filter(Boolean) as string[];
  if (typeof value === "string")
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  return [];
}
function formatMoney(amount: number, currency?: string) {
  const code = String(currency || "NGN").toUpperCase();
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString()}`;
  }
}
const templateMeta: Record<ForgeTemplate, { label: string; short: string }> = {
  portfolio: { label: "Portfolio", short: "Selected work" },
  blog: { label: "Blog", short: "Stories & ideas" },
  gallery: { label: "Gallery", short: "Visual collection" },
  shop: { label: "Shop", short: "Products & services" },
  donation: { label: "Campaign", short: "Support a cause" },
  game: { label: "Game", short: "Interactive experience" },
  custom: { label: "Custom", short: "Original project" },
};
