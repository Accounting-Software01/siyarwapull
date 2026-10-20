"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  AtSign,
  BriefcaseBusiness,
  Check,
  Globe2,
  Group,
  Loader2,
  Search,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type SearchKind = "all" | "people" | "news" | "forges" | "projects" | "groups";

type PersonResult = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  follower_count?: number | null;
  forge_count?: number | null;
  is_verified?: boolean;
  is_official?: boolean;
};

type ContentResult = {
  id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  excerpt?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  slug?: string | null;
  username?: string | null;
  source?: string | null;
  created_at?: string | null;
  url?: string | null;
  user_id?: string | null;
  members_count?: number | null;
  display_name?: string | null;
  avatar_url?: string | null;
  creator_username?: string | null;
  template_type?: string | null;
  active_members?: Array<{
    id: string;
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  }>;
};

type SearchResponse = {
  people?: PersonResult[];
  news?: ContentResult[];
  forges?: ContentResult[];
  projects?: ContentResult[];
  groups?: ContentResult[];
};

const SEARCH_TYPES: { key: SearchKind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "people", label: "People" },
  { key: "news", label: "News" },
  { key: "forges", label: "Forges" },
  { key: "projects", label: "Projects" },
  { key: "groups", label: "Groups" },
];

const TRENDING_SEARCHES = [
  "AI creators",
  "Deepfakes",
  "Technology policy",
  "Design systems",
  "Climate projects",
  "Future of work",
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<SearchKind>("all");
  const [results, setResults] = useState<SearchResponse>({});
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [recommendedPeople, setRecommendedPeople] = useState<PersonResult[]>([]);
  const [recommendedForges, setRecommendedForges] = useState<ContentResult[]>([]);

  const loadRecommendedProfiles = async (excludeUserId?: string) => {
    let request = supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, bio, follower_count, forge_count, is_verified, is_official"
      )
      .order("follower_count", { ascending: false, nullsFirst: false })
      .limit(8);

    if (excludeUserId) request = request.neq("id", excludeUserId);

    const { data, error } = await request;
    if (!error && data) {
      setRecommendedPeople(data as PersonResult[]);
      return;
    }

    try {
      const response = await fetch(
        "/api/search?type=people&recommended=true&limit=8"
      );
      if (!response.ok) return;
      const fallback = await response.json();
      setRecommendedPeople(
        (fallback.people || fallback.profiles || [])
          .filter((person: PersonResult) => person.id !== excludeUserId)
          .slice(0, 8)
      );
    } catch (fallbackError) {
      console.error("[Pull recommendations] error:", fallbackError);
    }
  };

  const loadRecommendedForges = async () => {
    const { data, error } = await supabase
      .from("forges")
      .select(
        "id, name, description, template_type, user_id, config, is_published, is_public_preview, updated_at, created_at"
      )
      .or("is_published.eq.true,is_public_preview.eq.true")
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(8);

    if (!error && data) {
      /* ---- Fetch uploaded cover images from forge_assets ---- */
      const forgeIds = data.map((forge: any) => forge.id);
      const { data: assetRows } = forgeIds.length
        ? await supabase
            .from("forge_assets")
            .select("forge_id, url, mime, created_at")
            .in("forge_id", forgeIds)
            .like("mime", "image/%")
            .order("created_at", { ascending: true })
        : { data: [] };

      const forgeAssetsByForge = new Map<string, string>();
      for (const row of assetRows || []) {
        // Keep only the first image per forge
        if (!forgeAssetsByForge.has(row.forge_id)) {
          forgeAssetsByForge.set(row.forge_id, row.url);
        }
      }

      /* ---- Fetch owners ---- */
      const ownerIds = [
        ...new Set(data.map((forge: any) => forge.user_id).filter(Boolean)),
      ];
      const { data: owners } = ownerIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", ownerIds)
        : { data: [] };
      const ownersById = new Map(
        (owners || []).map((owner: any) => [owner.id, owner])
      );

      /* ---- Build results ---- */
      const forgeResults = await Promise.all(
        data.map(async (forge: any) => {
          const owner = ownersById.get(forge.user_id);
          const { data: contributorRows } = await supabase
            .from("forge_contributors")
            .select(
              "user_id, joined_at, profiles(id, username, display_name, avatar_url)"
            )
            .eq("forge_id", forge.id)
            .order("joined_at", { ascending: false })
            .limit(4);

          const ownerMember = owner
            ? [
                {
                  id: owner.id,
                  username: owner.username,
                  display_name: owner.display_name,
                  avatar_url: owner.avatar_url,
                },
              ]
            : [];
          const contributorMembers = (contributorRows || [])
            .map((row: any) => row.profiles)
            .filter(Boolean);
          const members = [...ownerMember, ...contributorMembers].filter(
            (member, index, list) =>
              list.findIndex((item) => item.id === member.id) === index
          );

          return {
            id: forge.id,
            name: forge.name,
            title: forge.name,
            description: forge.description,
            source: forge.template_type,
            user_id: forge.user_id,
            display_name: owner?.display_name || null,
            creator_username: owner?.username || null,
            avatar_url: owner?.avatar_url || null,
            template_type: forge.template_type,
            image_url:
              forge.config?.cover_image ||
              forge.config?.image_url ||
              forge.config?.thumbnail_url ||
              forge.config?.heroImage ||
              (Array.isArray(forge.config?.images)
                ? forge.config.images[0]
                : null) ||
              forgeAssetsByForge.get(forge.id) ||
              null,
            members_count: members.length,
            active_members: members.slice(0, 3),
            created_at: forge.updated_at || forge.created_at,
          };
        })
      );

      setRecommendedForges(forgeResults as ContentResult[]);
      return;
    }

    try {
      const response = await fetch(
        "/api/search?type=forges&recommended=true&limit=8"
      );
      if (!response.ok) return;
      const fallback = await response.json();
      setRecommendedForges((fallback.forges || []).slice(0, 8));
    } catch (fallbackError) {
      console.error("[Pull forge discovery] error:", fallbackError);
    }
  };

  useEffect(() => {
    const saved = window.localStorage.getItem("recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 6));
      } catch {
        window.localStorage.removeItem("recent_searches");
      }
    }

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        await Promise.all([loadRecommendedProfiles(), loadRecommendedForges()]);
        return;
      }
      setCurrentUserId(user.id);
      const { data: allies } = await supabase
        .from("allies")
        .select("following_id")
        .eq("follower_id", user.id);
      setFollowing(new Set(allies?.map((ally) => ally.following_id) || []));
      await Promise.all([
        loadRecommendedProfiles(user.id),
        loadRecommendedForges(),
      ]);
    };

    loadUser().catch((error) =>
      console.error("[Pull search] user loading error:", error)
    );
  }, [supabase]);

  const performSearch = async (term: string, kind = activeType) => {
    const cleanTerm = term.trim();
    if (!cleanTerm) {
      setResults({});
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(cleanTerm)}&type=${kind}`
      );
      if (!response.ok)
        throw new Error(`Search failed with ${response.status}`);
      const data = await response.json();
      setResults({
        people: data.people || data.profiles || [],
        news: data.news || [],
        forges: data.forges || [],
        projects: data.projects || [],
        groups: data.groups || [],
      });
    } catch (error) {
      console.error("[Search] error:", error);
      setResults({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialQuery = searchParams.get("q") || "";
    const initialType = (searchParams.get("type") as SearchKind) || "all";
    setQuery(initialQuery);
    if (SEARCH_TYPES.some((item) => item.key === initialType))
      setActiveType(initialType);
    if (initialQuery) performSearch(initialQuery, initialType);
  }, [searchParams]);

  const rememberSearch = (term: string) => {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;
    const updated = [
      cleanTerm,
      ...recentSearches.filter(
        (item) => item.toLowerCase() !== cleanTerm.toLowerCase()
      ),
    ].slice(0, 6);
    setRecentSearches(updated);
    window.localStorage.setItem("recent_searches", JSON.stringify(updated));
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const cleanTerm = query.trim();
    if (!cleanTerm) return;
    rememberSearch(cleanTerm);
    router.push(`/search?q=${encodeURIComponent(cleanTerm)}&type=${activeType}`);
    performSearch(cleanTerm, activeType);
  };

  const selectType = (kind: SearchKind) => {
    setActiveType(kind);
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}&type=${kind}`);
      performSearch(query, kind);
    }
  };

  const runSuggestedSearch = (term: string) => {
    setQuery(term);
    rememberSearch(term);
    router.push(`/search?q=${encodeURIComponent(term)}&type=${activeType}`);
    performSearch(term, activeType);
  };

  const handleFollow = async (userId: string) => {
    if (!currentUserId || followLoading) return;
    const wasFollowing = following.has(userId);
    setFollowLoading(userId);
    setFollowing((previous) => {
      const next = new Set(previous);
      wasFollowing ? next.delete(userId) : next.add(userId);
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
      console.error("[Search follow] error:", error);
      setFollowing((previous) => {
        const next = new Set(previous);
        wasFollowing ? next.add(userId) : next.delete(userId);
        return next;
      });
    } finally {
      setFollowLoading(null);
    }
  };

  const clearRecent = () => {
    setRecentSearches([]);
    window.localStorage.removeItem("recent_searches");
  };

  const totalResults = Object.values(results).reduce(
    (total, items) => total + (items?.length || 0),
    0
  );
  const hasResults = totalResults > 0;

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[#fbfaf6] text-[#14181c] antialiased">
      {/* Sticky native header — nav row + search input + type chips */}
      <header
        className="sticky top-0 z-30 border-b border-[#ecebe5] bg-[#fbfaf6]/92 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto w-full max-w-3xl px-4 pb-3 pt-1">
          {/* Nav bar */}
          <div className="relative flex h-11 items-center justify-center">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              aria-label="Back to dashboard"
              className="absolute left-0 grid h-9 w-9 place-items-center rounded-full text-[#14181c] transition active:scale-95 active:bg-black/5"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            </button>
            <h1 className="text-[16px] font-semibold tracking-[-0.01em]">
              Search
            </h1>
          </div>

          {/* Search input */}
          <form onSubmit={submitSearch} className="relative mt-2">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8b8f8a]"
              strokeWidth={2.2}
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Pull"
              aria-label="Search Pull"
              autoFocus
              className="h-12 w-full rounded-2xl border border-[#e3e2dd] bg-white pl-11 pr-20 text-[16px] text-[#14181c] placeholder:text-[#9ca29c] outline-none transition focus:border-[#b7f23a] focus:bg-white focus:ring-2 focus:ring-[#b7f23a]/25"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults({});
                }}
                aria-label="Clear search"
                className="absolute right-[68px] top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-[#8b8f8a] transition active:scale-95 active:bg-black/5"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-[#14181c] px-3.5 py-2 text-[13px] font-semibold text-white transition active:scale-95 disabled:opacity-50"
              disabled={!query.trim()}
            >
              Search
            </button>
          </form>

          {/* Type chips */}
          <div className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
            {SEARCH_TYPES.map((item) => {
              const active = activeType === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => selectType(item.key)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition active:scale-95 ${
                    active
                      ? "border-[#14181c] bg-[#14181c] text-white"
                      : "border-[#e3e2dd] bg-white text-[#5c6360] hover:bg-[#f4f5ef]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-5">
        {loading ? (
          <SearchSkeleton />
        ) : query.trim() && hasResults ? (
          <ResultsView
            results={results}
            following={following}
            currentUserId={currentUserId}
            followLoading={followLoading}
            onFollow={handleFollow}
          />
        ) : query.trim() ? (
          <EmptySearch query={query} onSuggestion={runSuggestedSearch} />
        ) : (
          <DiscoverState
            recentSearches={recentSearches}
            recommendedPeople={recommendedPeople}
            recommendedForges={recommendedForges}
            following={following}
            currentUserId={currentUserId}
            followLoading={followLoading}
            onFollow={handleFollow}
            onSearch={runSuggestedSearch}
            onClearRecent={clearRecent}
          />
        )}
      </main>
    </div>
  );
}

/* =========================================================================
   Results
   ========================================================================= */

function ResultsView({
  results,
  following,
  currentUserId,
  followLoading,
  onFollow,
}: {
  results: SearchResponse;
  following: Set<string>;
  currentUserId: string | null;
  followLoading: string | null;
  onFollow: (id: string) => void;
}) {
  const sections = [
    { key: "people" as const, label: "People", icon: Users, items: results.people || [] },
    { key: "news" as const, label: "News", icon: Globe2, items: results.news || [] },
    { key: "forges" as const, label: "Forges", icon: BriefcaseBusiness, items: results.forges || [] },
    { key: "projects" as const, label: "Projects", icon: BriefcaseBusiness, items: results.projects || [] },
    { key: "groups" as const, label: "Groups", icon: Group, items: results.groups || [] },
  ];

  return (
    <div className="space-y-7">
      {sections.map((section) =>
        section.items.length ? (
          <section key={section.key}>
            <div className="mb-3 flex items-center gap-2 px-1">
              <section.icon className="h-3.5 w-3.5 text-[#7a9c00]" strokeWidth={2.4} />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5c6360]">
                {section.label}
              </h2>
              <span className="text-[11px] text-[#a8aca7]">
                {section.items.length}
              </span>
            </div>
            {section.key === "people" ? (
              <div className="overflow-hidden rounded-2xl border border-[#ecebe5] bg-white">
                {(section.items as PersonResult[]).map((person, i) => (
                  <PersonResultCard
                    key={person.id}
                    person={person}
                    isFollowing={following.has(person.id)}
                    isCurrentUser={currentUserId === person.id}
                    isLoading={followLoading === person.id}
                    onFollow={() => onFollow(person.id)}
                    isLast={i === section.items.length - 1}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(section.items as ContentResult[]).map((item) => (
                  <ContentResultCard
                    key={item.id}
                    item={item}
                    kind={section.key}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null
      )}
    </div>
  );
}

/* =========================================================================
   Person card — mobile-native row
   ========================================================================= */

function PersonResultCard({
  person,
  isFollowing,
  isCurrentUser,
  isLoading,
  onFollow,
  isLast,
}: {
  person: PersonResult;
  isFollowing: boolean;
  isCurrentUser: boolean;
  isLoading: boolean;
  onFollow: () => void;
  isLast?: boolean;
}) {
  const name = person.display_name || person.username || "Pull member";
  return (
    <div
      className={`flex min-w-0 items-center gap-3 px-4 py-3.5 transition active:bg-[#fafbf6] ${
        isLast ? "" : "border-b border-[#f0efea]"
      }`}
    >
      <Link
        href={`/profile/${person.username || person.id}`}
        className="shrink-0"
        aria-label={`Open ${name}'s profile`}
      >
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#14181c] text-[15px] font-semibold text-[#b7f23a]">
          {person.avatar_url ? (
            <Image
              src={person.avatar_url}
              alt=""
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
      </Link>

      <Link
        href={`/profile/${person.username || person.id}`}
        className="min-w-0 flex-1"
      >
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#14181c]">
            {name}
          </h3>
          {person.is_verified && (
            <Check
              className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#14181c] p-0.5 text-[#b7f23a]"
              strokeWidth={3}
            />
          )}
          {person.is_official && (
            <span className="shrink-0 rounded-full bg-[#b7f23a] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#14181c]">
              Official
            </span>
          )}
        </div>
        <p className="truncate text-[13px] text-[#7d8387]">
          @{person.username || "member"}
        </p>
        {person.bio && (
          <p className="mt-0.5 line-clamp-1 text-[12px] leading-[1.4] text-[#5c6360]">
            {person.bio}
          </p>
        )}
        <div className="mt-1 flex items-center gap-3 text-[11.5px] text-[#8b8f8a]">
          <span className="font-semibold text-[#5c6360]">
            {person.follower_count || 0}
          </span>
          <span>allies</span>
          <span className="text-[#d0d3cf]">·</span>
          <span className="font-semibold text-[#5c6360]">
            {person.forge_count || 0}
          </span>
          <span>forges</span>
        </div>
      </Link>

      {isCurrentUser ? (
        <span className="shrink-0 rounded-full border border-[#e3e2dd] px-3 py-1.5 text-[12px] font-semibold text-[#8b8f8a]">
          You
        </span>
      ) : (
        <button
          type="button"
          onClick={onFollow}
          disabled={isLoading}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition active:scale-95 disabled:opacity-50 ${
            isFollowing
              ? "border border-[#e3e2dd] bg-white text-[#14181c]"
              : "bg-[#14181c] text-white"
          }`}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <span className="inline-flex items-center gap-1">
              {isFollowing ? (
                <UserCheck className="h-3 w-3" strokeWidth={2.6} />
              ) : (
                <UserPlus className="h-3 w-3" strokeWidth={2.6} />
              )}
              {isFollowing ? "Allied" : "Ally"}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

/* =========================================================================
   Content cards — news, forges, projects, groups
   ========================================================================= */

function ContentResultCard({
  item,
  kind,
}: {
  item: ContentResult;
  kind: "news" | "forges" | "projects" | "groups";
}) {
  if (kind === "forges") return <ForgePostCard item={item} />;

  const title = item.title || item.name || "Untitled result";
  const description = item.excerpt || item.description;
  const href =
    kind === "news" && item.url
      ? item.url
      : item.slug
        ? `/${kind}/${item.slug}`
        : `/${kind}/${item.id}`;
  const Icon =
    kind === "news" ? Globe2 : kind === "projects" ? BriefcaseBusiness : Group;

  return (
    <Link
      href={href}
      target={kind === "news" && item.url ? "_blank" : undefined}
      rel={kind === "news" && item.url ? "noreferrer" : undefined}
      className="group flex min-w-0 gap-3 rounded-2xl border border-[#ecebe5] bg-white p-3 transition active:scale-[0.99] active:bg-[#fafbf6]"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f0efea]">
        {item.image_url || item.thumbnail_url ? (
          <Image
            src={item.image_url || item.thumbnail_url || ""}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#7a9c00]">
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a9c00]">
            {kind}
          </span>
          {item.source && (
            <span className="truncate text-[11px] text-[#a8aca7]">
              {item.source}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug tracking-[-0.01em] text-[#14181c]">
          {title}
        </h3>
        {description && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.4] text-[#7d8387]">
            {description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[#a8aca7]">
          {item.members_count !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" strokeWidth={2.2} />
              {item.members_count}
            </span>
          )}
          {item.created_at && (
            <span>{new Date(item.created_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ForgePostCard({ item }: { item: ContentResult }) {
  const title = item.title || item.name || "Untitled Forge";
  const creatorName =
    item.display_name || item.creator_username || "Pull creator";
  const templateLabel = (
    item.template_type ||
    item.source ||
    "Forge"
  ).toUpperCase();
  const activeMembers = item.active_members || [];
  const coverImage = item.image_url || item.thumbnail_url;

  return (
    <Link
      href={`/preview/${item.id}`}
      className="group flex min-w-0 gap-3 overflow-hidden rounded-2xl border border-[#ecebe5] bg-white p-3 transition active:scale-[0.99] active:bg-[#fafbf6]"
    >
      <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-[#eef5d9]">
        {coverImage ? (
          <Image
            src={coverImage}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-[#5e7800]">
            <BriefcaseBusiness className="h-6 w-6" strokeWidth={1.6} />
            <span className="text-[9px] font-black uppercase tracking-[0.14em]">
              Forge
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#14181c] text-[9px] font-bold text-[#b7f23a]">
              {item.avatar_url ? (
                <Image
                  src={item.avatar_url}
                  alt=""
                  width={20}
                  height={20}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                creatorName.charAt(0).toUpperCase()
              )}
            </div>
            <span className="truncate text-[11.5px] text-[#5c6360]">
              By {creatorName}
            </span>
          </div>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#7a9c00]">
            {templateLabel}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#14181c]">
            {title}
          </h3>
          {item.description && (
            <p className="mt-1 line-clamp-1 text-[12px] text-[#7d8387]">
              {item.description}
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px] text-[#8b8f8a]">
          <span>{item.members_count || 0} members</span>
          {activeMembers.length > 0 && (
            <>
              <span className="text-[#d0d3cf]">·</span>
              <div className="flex -space-x-1.5">
                {activeMembers.slice(0, 3).map((member) => (
                  <div
                    key={member.id}
                    className="h-5 w-5 overflow-hidden rounded-full border-2 border-white bg-[#14181c] text-center text-[8px] font-bold leading-[16px] text-[#b7f23a]"
                  >
                    {member.avatar_url ? (
                      <Image
                        src={member.avatar_url}
                        alt=""
                        width={20}
                        height={20}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      (member.display_name || member.username || "M")
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>
                ))}
              </div>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#11a94d]" />
                {formatForgeActivity(item.created_at)}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function formatForgeActivity(value?: string | null) {
  if (!value) return "recently";
  const hours = Math.max(
    1,
    Math.round((Date.now() - new Date(value).getTime()) / 3_600_000)
  );
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/* =========================================================================
   Discover (no query)
   ========================================================================= */

function DiscoverState({
  recentSearches,
  recommendedPeople,
  recommendedForges,
  following,
  currentUserId,
  followLoading,
  onFollow,
  onSearch,
  onClearRecent,
}: {
  recentSearches: string[];
  recommendedPeople: PersonResult[];
  recommendedForges: ContentResult[];
  following: Set<string>;
  currentUserId: string | null;
  followLoading: string | null;
  onFollow: (id: string) => void;
  onSearch: (term: string) => void;
  onClearRecent: () => void;
}) {
  return (
    <div className="space-y-7">
      {recommendedPeople.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5c6360]">
              People to know
            </h2>
            <Users className="h-3.5 w-3.5 text-[#7a9c00]" strokeWidth={2.4} />
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#ecebe5] bg-white">
            {recommendedPeople.map((person, i) => (
              <PersonResultCard
                key={person.id}
                person={person}
                isFollowing={following.has(person.id)}
                isCurrentUser={currentUserId === person.id}
                isLoading={followLoading === person.id}
                onFollow={() => onFollow(person.id)}
                isLast={i === recommendedPeople.length - 1}
              />
            ))}
          </div>
        </section>
      )}

      {recommendedForges.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5c6360]">
              Featured Forges
            </h2>
            <BriefcaseBusiness
              className="h-3.5 w-3.5 text-[#7a9c00]"
              strokeWidth={2.4}
            />
          </div>
          <div className="space-y-2.5">
            {recommendedForges.map((forge) => (
              <ContentResultCard key={forge.id} item={forge} kind="forges" />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2 px-1">
          <TrendingUp className="h-3.5 w-3.5 text-[#7a9c00]" strokeWidth={2.4} />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5c6360]">
            Trending
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {TRENDING_SEARCHES.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => onSearch(term)}
              className="rounded-full border border-[#e3e2dd] bg-white px-3.5 py-2 text-[13px] font-medium text-[#14181c] transition active:scale-95 active:bg-[#efffc8]"
            >
              {term}
            </button>
          ))}
        </div>
      </section>

      {recentSearches.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <AtSign className="h-3.5 w-3.5 text-[#8b8f8a]" strokeWidth={2.4} />
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5c6360]">
                Recent
              </h2>
            </div>
            <button
              type="button"
              onClick={onClearRecent}
              className="text-[12px] font-semibold text-[#8b8f8a] transition active:opacity-60"
            >
              Clear
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#ecebe5] bg-white">
            {recentSearches.map((term, i) => (
              <button
                key={term}
                type="button"
                onClick={() => onSearch(term)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] text-[#14181c] transition active:bg-[#fafbf6] ${
                  i === recentSearches.length - 1
                    ? ""
                    : "border-b border-[#f0efea]"
                }`}
              >
                <Search
                  className="h-4 w-4 shrink-0 text-[#8b8f8a]"
                  strokeWidth={2.2}
                />
                <span className="truncate">{term}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* =========================================================================
   Empty states
   ========================================================================= */

function EmptySearch({
  query,
  onSuggestion,
}: {
  query: string;
  onSuggestion: (term: string) => void;
}) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f0efea] text-[#8b8f8a]">
        <Search className="h-6 w-6" strokeWidth={2} />
      </div>
      <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
        No matches for "{query}"
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-[1.5] text-[#7d8387]">
        Try a broader keyword, a creator name, or a topic like "AI" or "design".
      </p>
      <button
        type="button"
        onClick={() => onSuggestion("AI creators")}
        className="mt-6 rounded-full bg-[#14181c] px-5 py-2.5 text-[13px] font-semibold text-white transition active:scale-95"
      >
        Try a trending search
      </button>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-7">
      {[1, 2].map((section) => (
        <section key={section}>
          <div className="mb-3 h-3 w-20 animate-pulse rounded-full bg-[#e8e7e2]" />
          <div className="overflow-hidden rounded-2xl border border-[#ecebe5] bg-white">
            {[1, 2, 3].map((item, i) => (
              <div
                key={item}
                className={`flex items-center gap-3 px-4 py-3.5 ${
                  i === 2 ? "" : "border-b border-[#f0efea]"
                }`}
              >
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-[#efeee9]" />
                <div className="min-w-0 flex-1">
                  <div className="h-3.5 w-2/5 animate-pulse rounded-full bg-[#efeee9]" />
                  <div className="mt-2 h-3 w-3/5 animate-pulse rounded-full bg-[#f3f2ed]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#fbfaf6]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#e3e2dd] border-t-[#14181c]" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
