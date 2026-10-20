"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Bell,
  Check,
  Home,
  Loader2,
  Plus,
  Search,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react";

/* =========================================================================
   Types
   ========================================================================= */

type PersonResult = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  follower_count?: number | null;
  is_verified?: boolean;
  is_official?: boolean;
};

type TopicCreator = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type TopicCreatorMap = Record<string, TopicCreator[]>; // topic.key -> real people

type Tab = "topics" | "trending";

type Topic = {
  key: string;
  label: string;
  emoji: string;
  gradient: string;
  image?: string | null;
};

/* =========================================================================
   Topic catalogue
   ========================================================================= */

const TOPICS: Topic[] = [
  { key: "tech", label: "Tech", emoji: "⚡", gradient: "from-[#1e3a8a] via-[#1e40af] to-[#312e81]" },
  { key: "ai", label: "AI", emoji: "🧠", gradient: "from-[#065f46] via-[#047857] to-[#064e3b]" },
  { key: "design", label: "Design", emoji: "🎨", gradient: "from-[#d97706] via-[#ea580c] to-[#be123c]" },
  { key: "photography", label: "Photography", emoji: "📷", gradient: "from-[#78350f] via-[#92400e] to-[#451a03]" },
  { key: "music", label: "Music", emoji: "🎵", gradient: "from-[#4c1d95] via-[#6d28d9] to-[#3b0764]" },
  { key: "gaming", label: "Gaming", emoji: "🎮", gradient: "from-[#0c4a6e] via-[#075985] to-[#0c4a6e]" },
  { key: "food", label: "Food", emoji: "🍜", gradient: "from-[#991b1b] via-[#b91c1c] to-[#7f1d1d]" },
  { key: "books", label: "Books", emoji: "📚", gradient: "from-[#7c2d12] via-[#9a3412] to-[#431407]" },
  { key: "art", label: "Art", emoji: "🖼", gradient: "from-[#9d174d] via-[#be185d] to-[#831843]" },
  { key: "film", label: "Film", emoji: "🎬", gradient: "from-[#111827] via-[#1f2937] to-[#030712]" },
  { key: "travel", label: "Travel", emoji: "✈️", gradient: "from-[#0369a1] via-[#0284c7] to-[#075985]" },
  { key: "sports", label: "Sports", emoji: "⚽", gradient: "from-[#15803d] via-[#16a34a] to-[#14532d]" },
  { key: "news", label: "News", emoji: "📰", gradient: "from-[#334155] via-[#475569] to-[#1e293b]" },
  { key: "business", label: "Business", emoji: "💼", gradient: "from-[#78350f] via-[#a16207] to-[#422006]" },
  { key: "culture", label: "Culture", emoji: "🌍", gradient: "from-[#9f1239] via-[#be123c] to-[#881337]" },
  { key: "science", label: "Science", emoji: "🔬", gradient: "from-[#0e7490] via-[#0891b2] to-[#164e63]" },
  { key: "health", label: "Health", emoji: "💚", gradient: "from-[#166534] via-[#15803d] to-[#14532d]" },
  { key: "nature", label: "Nature", emoji: "🌿", gradient: "from-[#14532d] via-[#166534] to-[#052e16]" },
  { key: "fashion", label: "Fashion", emoji: "👗", gradient: "from-[#701a75] via-[#86198f] to-[#4a044e]" },
  { key: "heritage", label: "Heritage", emoji: "🏛", gradient: "from-[#7c2d12] via-[#b45309] to-[#451a03]" },
];

/* =========================================================================
   Trending hashtags
   ========================================================================= */

const TRENDING_TAGS = [
  { tag: "AIcreators", count: 245, emoji: "🧠", gradient: "from-[#065f46] to-[#047857]" },
  { tag: "Kanoheritage", count: 180, emoji: "🏛", gradient: "from-[#7c2d12] to-[#b45309]" },
  { tag: "AfricanTech", count: 312, emoji: "⚡", gradient: "from-[#1e3a8a] to-[#312e81]" },
  { tag: "Photography", count: 890, emoji: "📷", gradient: "from-[#78350f] to-[#451a03]" },
  { tag: "OpenSource", count: 156, emoji: "💻", gradient: "from-[#0c4a6e] to-[#075985]" },
  { tag: "FutureOfWork", count: 421, emoji: "🚀", gradient: "from-[#4c1d95] to-[#3b0764]" },
  { tag: "NigerianDesign", count: 98, emoji: "🎨", gradient: "from-[#d97706] to-[#be123c]" },
  { tag: "Deepfakes", count: 342, emoji: "🎭", gradient: "from-[#9f1239] to-[#881337]" },
  { tag: "SustainableFashion", count: 210, emoji: "🌱", gradient: "from-[#166534] to-[#052e16]" },
  { tag: "BooksWorthReading", count: 175, emoji: "📚", gradient: "from-[#7c2d12] to-[#431407]" },
];

/* =========================================================================
   Hook: real people per topic, derived from published forges + tagged posts
   No schema changes: forges.template_type and user_feeds.tags[] already exist.
   ========================================================================= */

const TOPIC_KEYS = TOPICS.map((t) => t.key);

// Forge template -> implied topics
const TEMPLATE_TO_TOPICS: Record<string, string[]> = {
  portfolio: ["design", "art"],
  gallery: ["art", "photography"],
  blog: ["books", "news", "culture"],
  shop: ["business", "fashion"],
  game: ["gaming"],
  custom: ["tech", "science"],
  donation: [],
};

// Compound hashtags that don't contain a topic word
const TAG_ALIASES: Record<string, string> = {
  aicreators: "ai",
  deepfakes: "ai",
  ml: "ai",
  africantech: "tech",
  opensource: "tech",
  futureofwork: "business",
};

/**
 * Raw tag -> topic keys.
 * "AI creators" -> ai, "#photography" -> photography, "Tech & Design" -> tech, design,
 * "SustainableFashion" -> fashion, "Kanoheritage" -> heritage.
 * Short keys (ai, art) must match a whole word; longer keys match inside a word.
 */
function normalizeTags(raw: string[] | null | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  const found = new Set<string>();

  for (const tag of raw) {
    if (typeof tag !== "string") continue;
    const spaced = tag
      .replace(/^#/, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2") // split camelCase before lowercasing
      .toLowerCase()
      .replace(/[^a-z]+/g, " ")
      .trim();
    if (!spaced) continue;

    // Aliases are matched against the whole tag too ("OpenSource" -> "opensource")
    const wholeAlias = TAG_ALIASES[spaced.replace(/\s+/g, "")];
    if (wholeAlias) found.add(wholeAlias);

    for (const word of spaced.split(/\s+/)) {
      const alias = TAG_ALIASES[word];
      if (alias) found.add(alias);

      for (const key of TOPIC_KEYS) {
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

const TOPIC_CACHE_KEY = "pull:topicCreators:v1";
const TOPIC_CACHE_MS = 5 * 60 * 1000;

function useTopicCreators(supabase: ReturnType<typeof createClient>) {
  const [map, setMap] = useState<TopicCreatorMap>({});

  useEffect(() => {
    let cancelled = false;

    // 5-minute session cache so revisiting Discover is instant
    try {
      const raw = sessionStorage.getItem(TOPIC_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { at: number; map: TopicCreatorMap };
        if (Date.now() - cached.at < TOPIC_CACHE_MS) {
          setMap(cached.map);
          return;
        }
      }
    } catch {
      /* storage unavailable: just fetch */
    }

    (async () => {
      const [forgesRes, feedsRes] = await Promise.all([
        supabase
          .from("forges")
          .select("user_id, template_type")
          .or("is_published.eq.true,is_public_preview.eq.true")
          .limit(200),
        supabase
          .from("user_feeds")
          .select("user_id, tags")
          .not("tags", "is", null)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (cancelled) return;

      const usersByTopic: Record<string, Set<string>> = {};
      const push = (topic: string, userId: string | null | undefined) => {
        if (!userId) return;
        (usersByTopic[topic] ||= new Set()).add(userId);
      };

      for (const forge of forgesRes.data ?? []) {
        const topics = TEMPLATE_TO_TOPICS[forge.template_type ?? ""] ?? [];
        for (const topic of topics) push(topic, forge.user_id);
      }
      for (const feed of feedsRes.data ?? []) {
        for (const topic of normalizeTags(feed.tags)) push(topic, feed.user_id);
      }

      const allUserIds = [
        ...new Set(Object.values(usersByTopic).flatMap((s) => [...s])),
      ];
      if (allUserIds.length === 0) {
        setMap({});
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", allUserIds)
        .not("avatar_url", "is", null);
      if (!profiles || cancelled) return;

      const profileById = new Map<string, TopicCreator>(
        (profiles as TopicCreator[]).map((p) => [p.id, p])
      );

      const next: TopicCreatorMap = {};
      for (const [topic, userIds] of Object.entries(usersByTopic)) {
        const creators = [...userIds]
          .map((id) => profileById.get(id))
          .filter((p): p is TopicCreator => Boolean(p))
          .slice(0, 8);
        if (creators.length > 0) next[topic] = creators;
      }

      setMap(next);
      try {
        sessionStorage.setItem(
          TOPIC_CACHE_KEY,
          JSON.stringify({ at: Date.now(), map: next })
        );
      } catch {
        /* ignore */
      }
    })().catch((e) => console.error("[Discover] topic creators error:", e));

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return map;
}

/* =========================================================================
   Main
   ========================================================================= */

export default function DiscoverPage() {
  return <DiscoverContent />;
}

function DiscoverContent() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const topicCreators = useTopicCreators(supabase);

  const [tab, setTab] = useState<Tab>("topics");
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let profileQuery = supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, bio, follower_count, is_verified, is_official"
        )
        .order("follower_count", { ascending: false, nullsFirst: false })
        .limit(10);

      if (user) profileQuery = profileQuery.neq("id", user.id);

      const [{ data: profiles }, alliesRes] = await Promise.all([
        profileQuery,
        user
          ? supabase
              .from("allies")
              .select("following_id")
              .eq("follower_id", user.id)
          : Promise.resolve({ data: [] as { following_id: string }[] }),
      ]);

      setCurrentUserId(user?.id ?? null);
      setPeople((profiles as PersonResult[]) || []);
      setFollowing(
        new Set(
          ((alliesRes as { data: { following_id: string }[] }).data || []).map(
            (row) => row.following_id
          )
        )
      );
      setLoading(false);
    };

    load().catch((error) => {
      console.error("[Discover] load error:", error);
      setLoading(false);
    });
  }, [supabase]);

  const handleFollow = async (userId: string) => {
    if (!currentUserId || followLoading) return;
    const wasFollowing = following.has(userId);
    setFollowLoading(userId);
    setFollowing((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(userId);
      else next.add(userId);
      return next;
    });

    try {
      const response = await fetch("/api/allies", {
        method: wasFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: userId }),
      });
      if (!response.ok) throw new Error("Follow update failed");
    } catch (error) {
      console.error("[Discover follow] error:", error);
      setFollowing((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(userId);
        else next.delete(userId);
        return next;
      });
    } finally {
      setFollowLoading(null);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-x-clip bg-white text-[#14181c] antialiased">
      {/* ==== Sticky header (nav + search + tabs) ==== */}
      <header
        className="sticky top-0 z-30 border-b border-[#ecebe5] bg-white/90 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto w-full max-w-3xl px-4 pb-1 pt-1">
          <div className="relative flex h-11 items-center justify-center">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="absolute left-0 grid h-11 w-11 place-items-center rounded-full text-[#14181c] transition active:scale-95 active:bg-black/5"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            </button>
            <h1 className="text-[16px] font-semibold tracking-[-0.01em]">
              Discover
            </h1>
          </div>

          {/* Search: tap navigates to /search */}
          <button
            type="button"
            onClick={() => router.push("/search")}
            className="relative mt-1 flex h-12 w-full items-center rounded-2xl border border-[#e3e2dd] bg-[#fafbf6] pl-11 pr-4 text-left text-[15px] text-[#8b8f8a] transition active:scale-[0.99] active:bg-white"
          >
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8b8f8a]"
              strokeWidth={2.2}
            />
            <span>Search Siyarwa Pull</span>
          </button>

          {/* Tabs */}
          <div className="mt-2 grid grid-cols-2" role="tablist">
            {(["topics", "trending"] as Tab[]).map((item) => {
              const active = tab === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item)}
                  className="relative flex h-11 items-center justify-center"
                >
                  <span
                    className={`text-[14px] font-semibold transition ${
                      active ? "text-[#14181c]" : "text-[#8b8f8a]"
                    }`}
                  >
                    {item === "topics" ? "Topics" : "Trending #"}
                  </span>
                  <span
                    className={`absolute bottom-0 h-[2px] w-12 rounded-full transition ${
                      active ? "bg-[#14181c]" : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ==== Content ==== */}
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">
        {loading ? (
          <DiscoverSkeleton />
        ) : tab === "topics" ? (
          <TopicsView
            people={people}
            following={following}
            currentUserId={currentUserId}
            followLoading={followLoading}
            onFollow={handleFollow}
            topicCreators={topicCreators}
          />
        ) : (
          <TrendingView />
        )}
      </main>

      <BottomNav active="discover" />
    </div>
  );
}

/* =========================================================================
   Topics view
   ========================================================================= */

function TopicsView({
  people,
  following,
  currentUserId,
  followLoading,
  onFollow,
  topicCreators,
}: {
  people: PersonResult[];
  following: Set<string>;
  currentUserId: string | null;
  followLoading: string | null;
  onFollow: (id: string) => void;
  topicCreators: TopicCreatorMap;
}) {
  return (
    <div className="space-y-7">
      {people.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
              Follow suggestions
            </h2>
            <Link
              href="/search?type=people"
              className="-mr-2 px-2 py-2 text-[13px] font-medium text-[#7a9c00] active:opacity-60"
            >
              See all
            </Link>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {people.slice(0, 8).map((person) => (
              <FollowSuggestionCard
                key={person.id}
                person={person}
                isFollowing={following.has(person.id)}
                isCurrentUser={currentUserId === person.id}
                isLoading={followLoading === person.id}
                onFollow={() => onFollow(person.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
          Explore topics
        </h2>
        <p className="mb-3 mt-0.5 text-[12.5px] text-[#7d8387]">
          Tap a topic to see posts and the people behind them
        </p>
        <div className="grid grid-cols-2 gap-3">
          {TOPICS.map((topic) => (
            <TopicTile
              key={topic.key}
              topic={topic}
              creators={topicCreators[topic.key] ?? []}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/* =========================================================================
   Trending view
   ========================================================================= */

function TrendingView() {
  return (
    <div className="space-y-2">
      <div className="mb-2 px-1">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
          Trending now
        </h2>
        <p className="mt-0.5 text-[12.5px] text-[#7d8387]">
          Hashtags gaining momentum across Siyarwa Pull
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#ecebe5] bg-white">
        {TRENDING_TAGS.map((item, i) => (
          <Link
            key={item.tag}
            href={`/search?q=%23${item.tag}&type=all`}
            className={`flex items-center gap-3 px-4 py-3.5 transition active:bg-[#fafbf6] ${
              i === TRENDING_TAGS.length - 1 ? "" : "border-b border-[#f0efea]"
            }`}
          >
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${item.gradient} text-[20px]`}
            >
              <span>{item.emoji}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                #{item.tag}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[#7d8387]">
                {item.count} posts
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   Avatar stack
   ========================================================================= */

function AvatarStack({ people, max = 3 }: { people: TopicCreator[]; max?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  if (shown.length === 0) return null;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((p) => {
          const name = p.display_name || p.username || "?";
          return (
            <div
              key={p.id}
              className="h-7 w-7 overflow-hidden rounded-full bg-[#14181c] ring-2 ring-white/90"
            >
              {p.avatar_url ? (
                <Image
                  src={p.avatar_url}
                  alt={name}
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-[11px] font-semibold text-[#b7f23a]">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {extra > 0 && (
        <span className="ml-2 text-[11.5px] font-semibold text-white/90 drop-shadow">
          +{extra}
        </span>
      )}
    </div>
  );
}

/* =========================================================================
   Topic tile
   ========================================================================= */

function TopicTile({ topic, creators }: { topic: Topic; creators: TopicCreator[] }) {
  // Photos live in /public/topics/<key>.jpg (e.g. /public/topics/tech.jpg).
  // The gradient only shows while a photo loads or if the file is missing.
  const [imgFailed, setImgFailed] = useState(false);
  const src = topic.image ?? `/topics/${topic.key}.jpg`;

  return (
    <Link
      
      href={`/topics/${topic.key}`}
      className="group relative block aspect-[4/5] select-none overflow-hidden rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-transform duration-150 active:scale-[0.97]"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${topic.gradient}`} />
      {!imgFailed && (
        <Image
          src={src}
          alt=""
          fill
          sizes="(max-width: 768px) 50vw, 360px"
          className="object-cover"
          onError={() => setImgFailed(true)}
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3.5">
        <h3 className="text-[17px] font-bold leading-tight tracking-[-0.01em] text-white drop-shadow">
          {topic.label}
        </h3>
        {creators.length > 0 ? (
          <AvatarStack people={creators} />
        ) : (
          <span className="text-[11.5px] font-medium text-white/70">Explore</span>
        )}
      </div>
    </Link>
  );
}

/* =========================================================================
   Follow suggestion card
   ========================================================================= */

function FollowSuggestionCard({
  person,
  isFollowing,
  isCurrentUser,
  isLoading,
  onFollow,
}: {
  person: PersonResult;
  isFollowing: boolean;
  isCurrentUser: boolean;
  isLoading: boolean;
  onFollow: () => void;
}) {
  const name = person.display_name || person.username || "Siyarwa Pull member";
  return (
    <div className="flex w-[164px] shrink-0 snap-start flex-col items-center rounded-3xl border border-[#ecebe5] bg-white p-4 text-center">
      <Link
        href={`/profile/${person.username || person.id}`}
        className="flex w-full flex-col items-center active:opacity-70"
      >
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#14181c] text-[20px] font-semibold text-[#b7f23a]">
          {person.avatar_url ? (
            <Image
              src={person.avatar_url}
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="mt-2.5 flex max-w-full items-center gap-1">
          <h3 className="truncate text-[14px] font-semibold text-[#14181c]">
            {name}
          </h3>
          {person.is_verified && (
            <Check
              className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#14181c] p-0.5 text-[#b7f23a]"
              strokeWidth={3}
            />
          )}
        </div>
        <p className="max-w-full truncate text-[12px] text-[#7d8387]">
          @{person.username || "member"}
        </p>
        <p className="mt-1.5 line-clamp-2 min-h-[32px] text-[12px] leading-4 text-[#5b6165]">
          {person.bio || ""}
        </p>
      </Link>

      {isCurrentUser ? (
        <span className="mt-3 grid h-10 w-full place-items-center rounded-full border border-[#e3e2dd] text-[12.5px] font-semibold text-[#8b8f8a]">
          You
        </span>
      ) : (
        <button
          type="button"
          onClick={onFollow}
          disabled={isLoading}
          className={`mt-3 grid h-10 w-full place-items-center rounded-full text-[13px] font-semibold transition active:scale-95 disabled:opacity-50 ${
            isFollowing
              ? "border border-[#e3e2dd] bg-white text-[#14181c]"
              : "bg-[#14181c] text-white"
          }`}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="inline-flex items-center gap-1.5">
              {isFollowing ? (
                <UserCheck className="h-3.5 w-3.5" strokeWidth={2.6} />
              ) : (
                <UserPlus className="h-3.5 w-3.5" strokeWidth={2.6} />
              )}
              {isFollowing ? "Allied" : "Follow"}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

/* =========================================================================
   Loading skeleton
   ========================================================================= */

function DiscoverSkeleton() {
  return (
    <div className="space-y-7 animate-pulse" aria-busy="true">
      <div>
        <div className="mb-3 h-4 w-36 rounded bg-[#f0efea]" />
        <div className="-mx-4 flex gap-3 overflow-hidden px-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[220px] w-[164px] shrink-0 rounded-3xl bg-[#f4f3ee]"
            />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-3 h-4 w-32 rounded bg-[#f0efea]" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-3xl bg-[#f4f3ee]" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Bottom nav
   ========================================================================= */

type NavKey = "feed" | "discover" | "create" | "messages" | "profile";

function BottomNav({ active }: { active: NavKey }) {
  const items = [
    { key: "feed" as const, icon: Home, label: "Feed", href: "/dashboard" },
    { key: "discover" as const, icon: Search, label: "Discover", href: "/discover" },
    { key: "create" as const, icon: Plus, label: "", href: "/dashboard/forges/create" },
    { key: "messages" as const, icon: Bell, label: "", href: "/messages" },
    { key: "profile" as const, icon: User, label: "Profile", href: "/profile" },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ecebe5] bg-white/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-around px-2">
        {items.map((item) => {
          const isActive = active === item.key;
          const Icon = item.icon;

          if (!item.label) {
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-label={item.key}
                className="grid h-12 w-12 place-items-center rounded-full text-[#14181c] transition active:scale-95"
              >
                <Icon
                  className={`h-[22px] w-[22px] ${
                    isActive ? "text-[#14181c]" : "text-[#14181c]/70"
                  }`}
                  strokeWidth={isActive ? 2.6 : 2.2}
                />
              </Link>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-2 transition active:scale-95"
            >
              <Icon
                className={`h-[22px] w-[22px] ${
                  isActive ? "text-[#14181c]" : "text-[#8b8f8a]"
                }`}
                strokeWidth={isActive ? 2.6 : 2.2}
              />
              <span
                className={`text-[10.5px] font-semibold ${
                  isActive ? "text-[#14181c]" : "text-[#8b8f8a]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
