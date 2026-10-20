"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Search, Play } from "lucide-react";

/* =========================================================================
   Topic meta
   ========================================================================= */

type TopicMeta = {
  label: string;
  emoji: string;
  gradient: string;
  description: string;
};

const TOPICS: Record<string, TopicMeta> = {
  tech: { label: "Tech", emoji: "⚡", gradient: "from-[#1e3a8a] to-[#312e81]", description: "Building, breaking, and rethinking tomorrow." },
  ai: { label: "AI", emoji: "🧠", gradient: "from-[#065f46] to-[#064e3b]", description: "Exploring intelligence, ethics, and what comes next." },
  design: { label: "Design", emoji: "🎨", gradient: "from-[#d97706] to-[#be123c]", description: "Form, function, and the craft of making things." },
  photography: { label: "Photography", emoji: "📷", gradient: "from-[#78350f] to-[#451a03]", description: "Framing the world one shot at a time." },
  music: { label: "Music", emoji: "🎵", gradient: "from-[#4c1d95] to-[#3b0764]", description: "Sounds, scenes, and the artists behind them." },
  gaming: { label: "Gaming", emoji: "🎮", gradient: "from-[#0c4a6e] to-[#075985]", description: "Play, worlds, and the culture around them." },
  food: { label: "Food", emoji: "🍜", gradient: "from-[#991b1b] to-[#7f1d1d]", description: "Recipes, restaurants, and culinary journeys." },
  books: { label: "Books", emoji: "📚", gradient: "from-[#7c2d12] to-[#431407]", description: "Reading, writing, and the stories we tell." },
  art: { label: "Art", emoji: "🖼", gradient: "from-[#9d174d] to-[#831843]", description: "Visual expression across styles and eras." },
  film: { label: "Film", emoji: "🎬", gradient: "from-[#111827] to-[#030712]", description: "Cinema, storytelling, and the moving image." },
  travel: { label: "Travel", emoji: "✈️", gradient: "from-[#0369a1] to-[#075985]", description: "Places, journeys, and the people you meet." },
  sports: { label: "Sports", emoji: "⚽", gradient: "from-[#15803d] to-[#14532d]", description: "Athletes, teams, and the stories of the game." },
  news: { label: "News", emoji: "📰", gradient: "from-[#334155] to-[#1e293b]", description: "What's happening now, across the world." },
  business: { label: "Business", emoji: "💼", gradient: "from-[#78350f] to-[#422006]", description: "Ideas, founders, and how things get built." },
  culture: { label: "Culture", emoji: "🌍", gradient: "from-[#9f1239] to-[#881337]", description: "Stories, people and ideas shaping our world." },
  science: { label: "Science", emoji: "🔬", gradient: "from-[#0e7490] to-[#164e63]", description: "Discovery, research, and how we understand reality." },
  health: { label: "Health", emoji: "💚", gradient: "from-[#166534] to-[#14532d]", description: "Wellness, medicine, and how we take care." },
  nature: { label: "Nature", emoji: "🌿", gradient: "from-[#14532d] to-[#052e16]", description: "Wildlife, landscapes, and the living world." },
  fashion: { label: "Fashion", emoji: "👗", gradient: "from-[#701a75] to-[#4a044e]", description: "Style, textiles, and what we wear." },
  heritage: { label: "Heritage", emoji: "🏛", gradient: "from-[#7c2d12] to-[#b45309]", description: "History, tradition, and the roots we come from." },
};

const TEMPLATE_TO_TOPICS: Record<string, string[]> = {
  portfolio: ["design", "art"],
  gallery: ["art", "photography"],
  blog: ["books", "news", "culture"],
  shop: ["business", "fashion"],
  game: ["gaming"],
  custom: ["tech", "science"],
  donation: [],
};

const TAG_ALIASES: Record<string, string> = {
  aicreators: "ai", deepfakes: "ai", ml: "ai",
  africantech: "tech", opensource: "tech",
  futureofwork: "business",
};

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const found = new Set<string>();
  for (const tag of raw) {
    if (typeof tag !== "string") continue;
    const spaced = tag
      .replace(/^#/, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .replace(/[^a-z]+/g, " ")
      .trim();
    if (!spaced) continue;
    const wholeAlias = TAG_ALIASES[spaced.replace(/\s+/g, "")];
    if (wholeAlias) found.add(wholeAlias);
    for (const word of spaced.split(/\s+/)) {
      const alias = TAG_ALIASES[word];
      if (alias) found.add(alias);
      for (const key of Object.keys(TOPICS)) {
        if (key.length <= 3) {
          if (word === key || word === `${key}s`) found.add(key);
        } else if (word.includes(key)) {
          found.add(key);
        }
      }
    }
  }
  return [...found];
}

const TOPIC_CAPTION_KEYWORDS: Record<string, string[]> = {
  tech: ["tech", "technology", "coding", "developer", "software"],
  ai: ["ai", "artificial intelligence", "machine learning", "chatgpt"],
  design: ["design", "ui", "ux", "branding"],
  photography: ["photo", "photography", "camera", "shot"],
  music: ["music", "song", "beat", "singing", "instrument"],
  gaming: ["game", "gaming", "play", "console"],
  food: ["food", "cooking", "recipe", "meal", "kitchen"],
  books: ["book", "reading", "author", "novel"],
  art: ["art", "drawing", "painting", "sketch"],
  film: ["film", "movie", "cinema", "shot"],
  travel: ["travel", "journey", "trip", "explore"],
  sports: ["sport", "sports", "match", "team", "goal"],
  news: ["news", "breaking", "report"],
  business: ["business", "startup", "entrepreneur", "commerce"],
  culture: ["culture", "tradition", "heritage", "community"],
  science: ["science", "research", "experiment"],
  health: ["health", "fitness", "wellness", "workout"],
  nature: ["nature", "wildlife", "outdoors", "forest"],
  fashion: ["fashion", "style", "outfit", "cloth"],
  heritage: ["heritage", "history", "tradition", "kano", "roots"],
};

type Tab = "foryou" | "posts" | "clips" | "creators" | "forges";

const TABS: { key: Tab; label: string }[] = [
  { key: "foryou", label: "For you" },
  { key: "posts", label: "Posts" },
  { key: "clips", label: "Clips" },
  { key: "creators", label: "Creators" },
  { key: "forges", label: "Forges" },
];

export default function TopicPage() {
  const router = useRouter();
  const params = useParams();
  const key = (params?.key as string) || "";
  const supabase = useMemo(() => createClient(), []);
  const meta = TOPICS[key];

  const [tab, setTab] = useState<Tab>("foryou");
  const [forges, setForges] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [clips, setClips] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meta) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      const templates = Object.entries(TEMPLATE_TO_TOPICS)
        .filter(([, topics]) => topics.includes(key))
        .map(([t]) => t);

      const keywords = TOPIC_CAPTION_KEYWORDS[key] ?? [key];
      const captionOr = keywords
        .map((kw) => `caption.ilike.%${kw}%`)
        .join(",");

      const [forgesRes, feedsRes, fleexRes] = await Promise.all([
        templates.length
          ? supabase
              .from("forges")
              .select("id, name, description, template_type, user_id, created_at, config, profiles:user_id(id, username, display_name, avatar_url)")
              .eq("is_published", true)
              .in("template_type", templates)
              .order("created_at", { ascending: false })
              .limit(40)
          : Promise.resolve({ data: [] as any[] }),

        


supabase
  .from("user_feeds")
  .select(
    "id, title, content, media_url, media_urls, media_type, user_id, created_at, tags, likes_count, comments_count, profiles:user_id(id, username, display_name, avatar_url)"
  )
  .order("created_at", { ascending: false })
  .limit(200),



         
        supabase
          .from("user_fleex")
          .select("id, user_id, video_url, thumbnail_url, caption, view_count, like_count, comment_count, created_at, profiles:user_id(id, username, display_name, avatar_url)")
          .eq("is_private", false)
          .or(captionOr)
          .order("created_at", { ascending: false })
          .limit(60),
      ]);




       

      if (cancelled) return;

       

      const allFeeds = feedsRes.data ?? [];
const lowerKey = key.toLowerCase();
const matchingFeeds = allFeeds.filter((p: any) => {
  // 1. Tag match
  if (normalizeTags(p.tags).includes(key)) return true;
  // 2. Title match
  if (p.title?.toLowerCase().includes(lowerKey)) return true;
  // 3. Content match
  if (p.content?.toLowerCase().includes(lowerKey)) return true;
  return false;
});


   
      const imageFeeds = matchingFeeds.filter((p: any) => p.media_type !== "video");

      const userIds = new Set<string>();
      (forgesRes.data ?? []).forEach((f: any) => userIds.add(f.user_id));
      matchingFeeds.forEach((p: any) => userIds.add(p.user_id));
      (fleexRes.data ?? []).forEach((f: any) => userIds.add(f.user_id));

      let creatorProfiles: any[] = [];
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio, follower_count, is_verified")
          .in("id", [...userIds])
          .limit(40);
        creatorProfiles = profiles ?? [];
      }

      if (cancelled) return;

      setForges(forgesRes.data ?? []);
      setPosts(imageFeeds);
      setClips(fleexRes.data ?? []);
      setCreators(creatorProfiles);
      setLoading(false);
    })().catch((e) => {
      console.error("[Topic] error:", e);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, key, meta]);

  if (!meta) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6 text-center">
        <div>
          <p className="text-[15px] font-semibold">Unknown topic</p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-full bg-[#14181c] px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const total = forges.length + posts.length + clips.length + creators.length;

  return (
    <div className="min-h-[100dvh] w-full bg-white text-[#14181c] antialiased">
      <header
        className="sticky top-0 z-30 border-b border-[#ecebe5] bg-white/90 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="relative mx-auto flex h-11 max-w-3xl items-center justify-center px-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="absolute left-4 grid h-9 w-9 place-items-center rounded-full transition active:scale-95 active:bg-black/5"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
          </button>
          <h1 className="text-[16px] font-semibold tracking-[-0.01em]">{meta.label}</h1>
          <button
            type="button"
            onClick={() => router.push("/search")}
            aria-label="Search"
            className="absolute right-4 grid h-9 w-9 place-items-center rounded-full transition active:scale-95 active:bg-black/5"
          >
            <Search className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl pb-24">
        <section className="px-4 pt-4">
          <div className="relative overflow-hidden rounded-[28px] bg-[#14181c] px-6 py-7">
            <p className="text-[10.5px] font-black uppercase tracking-[0.22em] text-[#b7f23a]">Explore the community</p>
            <h2 className="mt-3 text-[34px] font-bold leading-[1.05] tracking-[-0.03em] text-white">{meta.label}</h2>
            <p className="mt-2.5 max-w-[280px] text-[14px] leading-[1.5] text-white/65">{meta.description}</p>
            <span aria-hidden className="pointer-events-none absolute -right-4 -top-4 text-[110px] leading-none opacity-[0.06]">{meta.emoji}</span>
          </div>
        </section>

        <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const active = tab === t.key;
            const count =
              t.key === "forges" ? forges.length :
              t.key === "posts" ? posts.length :
              t.key === "clips" ? clips.length :
              t.key === "creators" ? creators.length : total;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-full border px-4 py-2 text-[13.5px] font-medium transition active:scale-95 ${
                  active ? "border-[#14181c] bg-[#14181c] text-white" : "border-[#e3e2dd] bg-white text-[#5c6360]"
                }`}
              >
                {t.label}
                {count > 0 && <span className={`ml-1.5 text-[11.5px] ${active ? "text-white/70" : "text-[#a8aca7]"}`}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="px-4 pt-4">
          {loading ? <TopicSkeleton /> : (
            <TabContent tab={tab} meta={meta} topicKey={key} forges={forges} posts={posts} clips={clips} creators={creators} />
          )}
        </div>
      </main>
    </div>
  );
}

function TabContent({
  tab, meta, topicKey, forges, posts, clips, creators,
}: {
  tab: Tab; meta: TopicMeta; topicKey: string;
  forges: any[]; posts: any[]; clips: any[]; creators: any[];
}) {
  if (tab === "forges") {
    return forges.length ? <div className="grid grid-cols-2 gap-3">{forges.map((f) => <ForgeTile key={f.id} forge={f} meta={meta} />)}</div> : <EmptyState meta={meta} topicKey={topicKey} />;
  }
  if (tab === "posts") {
    return posts.length ? <div className="grid grid-cols-2 gap-3">{posts.map((p) => <PostTile key={p.id} post={p} meta={meta} />)}</div> : <EmptyState meta={meta} topicKey={topicKey} />;
  }
  if (tab === "clips") {
    return clips.length ? <div className="grid grid-cols-2 gap-3">{clips.map((c) => <ClipTile key={c.id} clip={c} meta={meta} />)}</div> : <EmptyState meta={meta} topicKey={topicKey} />;
  }
  if (tab === "creators") {
    return creators.length ? <div className="space-y-2">{creators.map((c) => <CreatorRow key={c.id} person={c} />)}</div> : <EmptyState meta={meta} topicKey={topicKey} />;
  }

  const mixed: Array<{ kind: "forge" | "post" | "clip"; data: any }> = [
    ...forges.slice(0, 6).map((f) => ({ kind: "forge" as const, data: f })),
    ...posts.slice(0, 6).map((p) => ({ kind: "post" as const, data: p })),
    ...clips.slice(0, 6).map((c) => ({ kind: "clip" as const, data: c })),
  ].sort((a, b) => new Date(b.data.created_at || 0).getTime() - new Date(a.data.created_at || 0).getTime());

  if (!mixed.length) return <EmptyState meta={meta} topicKey={topicKey} />;
  return (
    <div className="grid grid-cols-2 gap-3">
      {mixed.map((item) => {
        if (item.kind === "forge") return <ForgeTile key={`f-${item.data.id}`} forge={item.data} meta={meta} />;
        if (item.kind === "post") return <PostTile key={`p-${item.data.id}`} post={item.data} meta={meta} />;
        return <ClipTile key={`c-${item.data.id}`} clip={item.data} meta={meta} />;
      })}
    </div>
  );
}

function ForgeTile({ forge, meta }: { forge: any; meta: TopicMeta }) {
  const owner = Array.isArray(forge.profiles) ? forge.profiles[0] : forge.profiles;
  const cover = forge.config?.cover_image || forge.config?.image_url || forge.config?.thumbnail_url || (Array.isArray(forge.config?.images) ? forge.config.images[0] : null);
  return (
    <Link href={`/preview/${forge.id}`} className="group block overflow-hidden rounded-2xl border border-[#ecebe5] bg-white transition active:scale-[0.98]">
      <div className={`relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br ${meta.gradient}`}>
        {cover ? <Image src={cover} alt="" fill className="object-cover" unoptimized /> : <span className="grid h-full w-full place-items-center text-[64px] opacity-30">{meta.emoji}</span>}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur">Forge</span>
      </div>
      <div className="bg-[#f4f2ec] p-3">
        <p className="line-clamp-2 text-[14px] font-semibold leading-[1.25] text-[#14181c]">{forge.name}</p>
        <p className="mt-1 truncate text-[12px] text-[#7d8387]">By {owner?.display_name || owner?.username || "creator"}</p>
      </div>
    </Link>
  );
}

function PostTile({ post, meta }: { post: any; meta: TopicMeta }) {
  const owner = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const media = (Array.isArray(post.media_urls) && post.media_urls[0]) || post.media_url || null;
  const title = post.title?.trim() || post.content?.slice(0, 40)?.trim() || "Untitled post";
  return (
    <Link href={`/post/${post.id}`} className="group block overflow-hidden rounded-2xl border border-[#ecebe5] bg-white transition active:scale-[0.98]">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#f4f3ee]">
        {media ? <Image src={media} alt="" fill className="object-cover" unoptimized /> : <span className="grid h-full w-full place-items-center text-[64px] opacity-25">{meta.emoji}</span>}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur">Post</span>
      </div>
      <div className="bg-[#f4f2ec] p-3">
        <p className="line-clamp-2 text-[14px] font-semibold leading-[1.25] text-[#14181c]">{title}</p>
        <p className="mt-1 truncate text-[12px] text-[#7d8387]">By {owner?.display_name || owner?.username || "creator"}</p>
      </div>
    </Link>
  );
}

function ClipTile({ clip, meta }: { clip: any; meta: TopicMeta }) {
  const owner = Array.isArray(clip.profiles) ? clip.profiles[0] : clip.profiles;
  const views = Number(clip.view_count ?? 0);
  const viewLabel = views >= 1000 ? `${(views / 1000).toFixed(1)}k` : String(views);
  return (
    <Link href={`/fleex?start=${clip.id}`} className="group block overflow-hidden rounded-2xl border border-[#ecebe5] bg-white transition active:scale-[0.98]">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
        {clip.thumbnail_url ? <Image src={clip.thumbnail_url} alt="" fill className="object-cover" unoptimized /> : <video src={clip.video_url} className="h-full w-full object-cover" muted playsInline preload="metadata" />}
        <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="grid h-12 w-12 place-items-center rounded-full bg-black/50 backdrop-blur"><Play className="h-5 w-5 fill-white text-white" /></div></div>
        <span className="absolute left-2.5 top-2.5 rounded-full bg-[#b7f23a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#14181c]">Clip</span>
        <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur"><Play className="h-2.5 w-2.5 fill-white" />{viewLabel}</div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
      </div>
      <div className="bg-[#f4f2ec] p-3">
        <p className="line-clamp-2 text-[14px] font-semibold leading-[1.25] text-[#14181c]">{clip.caption?.trim() || "Untitled clip"}</p>
        <p className="mt-1 truncate text-[12px] text-[#7d8387]">By {owner?.display_name || owner?.username || "creator"}</p>
      </div>
    </Link>
  );
}

function CreatorRow({ person }: { person: any }) {
  const name = person.display_name || person.username || "Siyarwa Pull member";
  return (
    <Link href={`/profile/${person.username || person.id}`} className="flex items-center gap-3 rounded-2xl border border-[#ecebe5] bg-white px-3.5 py-3 transition active:scale-[0.99] active:bg-[#fafbf6]">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#14181c] text-[15px] font-semibold text-[#b7f23a]">
        {person.avatar_url ? <Image src={person.avatar_url} alt="" width={48} height={48} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold text-[#14181c]">{name}</p>
        <p className="truncate text-[12.5px] text-[#7d8387]">@{person.username || "member"}{person.follower_count ? ` · ${person.follower_count} allies` : ""}</p>
        {person.bio && <p className="mt-0.5 line-clamp-1 text-[12px] text-[#5c6360]">{person.bio}</p>}
      </div>
    </Link>
  );
}

function EmptyState({ meta, topicKey }: { meta: TopicMeta; topicKey: string }) {
  return (
    <div className="py-14 text-center">
      <div className={`mx-auto mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br ${meta.gradient} text-[36px]`}>{meta.emoji}</div>
      <p className="text-[16px] font-semibold">Nothing here yet</p>
      <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-[1.5] text-[#7d8387]">
        Be the first to publish a {meta.label} Forge, tag a post with{" "}
        <span className="font-semibold text-[#14181c]">#{topicKey}</span>, or caption a clip "{topicKey}".
      </p>
    </div>
  );
}

function TopicSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 animate-pulse" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-[#ecebe5]">
          <div className="aspect-[4/5] w-full bg-[#f4f3ee]" />
          <div className="bg-[#f4f2ec] p-3">
            <div className="h-3.5 w-3/4 rounded bg-[#e8e6df]" />
            <div className="mt-2 h-3 w-1/2 rounded bg-[#e8e6df]" />
          </div>
        </div>
      ))}
    </div>
  );
}
