"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronLeft,
  Clock3,
  Eye,
  Heart,
  Loader2,
  MoreVertical,
  Play,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SavedType = "post" | "video";

type SavedItem = {
  id: string;
  sourceId: string;
  type: SavedType;
  title: string;
  author: string;
  likes: number;
  savedAt: string;
  thumbnail?: string | null;
  mediaUrl?: string | null;
};

export default function SavedPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [activeTab, setActiveTab] = useState<SavedType | "all">("all");
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [removedId, setRemovedId] = useState<string | null>(null);
  const [viewerItem, setViewerItem] = useState<SavedItem | null>(null);

  const loadSavedItems = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/auth/login");
          return;
        }

        const [
          { data: newsSaves, error: newsSaveError },
          { data: fleexSaves, error: fleexSaveError },
        ] = await Promise.all([
          supabase
            .from("news_saves")
            .select("article_id, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("fleex_saves")
            .select("fleex_id, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        if (newsSaveError)
          throw new Error(
            `Could not load saved posts: ${newsSaveError.message}`,
          );
        if (fleexSaveError)
          throw new Error(
            `Could not load saved videos: ${fleexSaveError.message}`,
          );

        const articleIds = (newsSaves || []).map((save) => save.article_id);
        const fleexIds = (fleexSaves || []).map((save) => save.fleex_id);

        const [
          { data: articles, error: articlesError },
          { data: videos, error: videosError },
        ] = await Promise.all([
          articleIds.length
            ? supabase
                .from("news_articles")
                .select("id, title, source_name, image_url, published_at")
                .in("id", articleIds)
            : Promise.resolve({ data: [], error: null }),
          fleexIds.length
            ? supabase
                .from("user_fleex")
                .select(
                  "id, caption, video_url, thumbnail_url, like_count, created_at, profiles:user_id(display_name, username)",
                )
                .in("id", fleexIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (articlesError)
          throw new Error(
            `Could not load saved post details: ${articlesError.message}`,
          );
        if (videosError)
          throw new Error(
            `Could not load saved video details: ${videosError.message}`,
          );

        const articleMap = new Map(
          (articles || []).map((article: any) => [article.id, article]),
        );
        const videoMap = new Map(
          (videos || []).map((video: any) => [video.id, video]),
        );
        const posts: SavedItem[] = (newsSaves || []).flatMap((save: any) => {
          const article = articleMap.get(save.article_id);
          if (!article) return [];
          return [
            {
              id: `post-${save.article_id}`,
              sourceId: save.article_id,
              type: "post" as const,
              title: article.title,
              author: article.source_name || "News",
              likes: 0,
              savedAt: save.created_at,
              thumbnail: article.image_url,
              mediaUrl: article.image_url,
            },
          ];
        });
        const savedVideos: SavedItem[] = (fleexSaves || []).flatMap(
          (save: any) => {
            const video = videoMap.get(save.fleex_id);
            if (!video) return [];
            const profile = Array.isArray(video.profiles)
              ? video.profiles[0]
              : video.profiles;
            return [
              {
                id: `video-${save.fleex_id}`,
                sourceId: save.fleex_id,
                type: "video" as const,
                title: video.caption?.trim() || "Fleex video",
                author: profile?.username
                  ? `@${profile.username}`
                  : profile?.display_name || "Fleex creator",
                likes: Number(video.like_count) || 0,
                savedAt: save.created_at,
                thumbnail: video.thumbnail_url,
                mediaUrl: video.video_url,
              },
            ];
          },
        );

        setSavedItems(
          [...posts, ...savedVideos].sort(
            (a, b) =>
              new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
          ),
        );
      } catch (loadError) {
        console.error("[Saved] Could not load saved items:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your saved items.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, supabase],
  );

  useEffect(() => {
    loadSavedItems();
  }, [loadSavedItems]);

  const filteredItems = useMemo(
    () =>
      activeTab === "all"
        ? savedItems
        : savedItems.filter((item) => item.type === activeTab),
    [activeTab, savedItems],
  );
  const postCount = savedItems.filter((item) => item.type === "post").length;
  const videoCount = savedItems.filter((item) => item.type === "video").length;

  const removeItem = async (item: SavedItem) => {
    setOpenMenu(null);
    const table = item.type === "video" ? "fleex_saves" : "news_saves";
    const key = item.type === "video" ? "fleex_id" : "article_id";
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const { error: removeError } = await supabase
      .from(table)
      .delete()
      .eq(key, item.sourceId)
      .eq("user_id", user.id);
    if (removeError) {
      setError(
        `Could not remove this ${item.type === "video" ? "video" : "post"}.`,
      );
      return;
    }
    setSavedItems((items) => items.filter((saved) => saved.id !== item.id));
    setRemovedId(item.id);
    window.setTimeout(() => setRemovedId(null), 2200);
  };

  const formatNumber = (value: number) =>
    value >= 1000
      ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
      : String(value);
  const formatSavedAt = (value: string) => {
    const days = Math.max(
      0,
      Math.floor((Date.now() - new Date(value).getTime()) / 86400000),
    );
    if (days === 0) return "today";
    if (days === 1) return "1d ago";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Date(value).toLocaleDateString();
  };

  return (
    <main className="min-h-[100dvh] bg-[#f7f8f5] text-[#14181c]">
      <header className="sticky top-0 z-20 border-b border-[#dfe3dc] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#687074] transition hover:text-[#14181c]"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-[#779f00]" />
            <h1 className="text-sm font-bold tracking-tight">Saved</h1>
          </div>
          <button
            type="button"
            onClick={() => loadSavedItems(true)}
            disabled={refreshing}
            aria-label="Refresh saved items"
            className="p-1 text-[#687074] hover:text-[#14181c] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-20 pt-6 sm:px-8">
        <section className="mb-6 border border-[#dfe3dc] bg-white px-5 py-5 sm:px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#779f00]">
            Your library
          </p>
          <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.06em] sm:text-3xl">
                Keep what matters.
              </h2>
              <p className="mt-1 text-sm text-[#687074]">
                Your saved posts and Fleex videos, ready when you are.
              </p>
            </div>
            <div className="flex gap-4 text-xs font-semibold text-[#8a9092]">
              <span>
                <strong className="text-[#14181c]">{postCount}</strong> posts
              </span>
              <span>
                <strong className="text-[#14181c]">{videoCount}</strong> videos
              </span>
            </div>
          </div>
        </section>

        <div
          className="mb-4 flex border-b border-[#dfe3dc]"
          role="tablist"
          aria-label="Saved content filter"
        >
          {[
            { id: "all" as const, label: "All", count: savedItems.length },
            { id: "post" as const, label: "Posts", count: postCount },
            { id: "video" as const, label: "Videos", count: videoCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative mr-6 px-1 pb-3 pt-1 text-xs font-bold transition ${activeTab === tab.id ? "text-[#14181c]" : "text-[#8a9092] hover:text-[#535a5e]"}`}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] text-[#a1a7a8]">
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <span className="absolute bottom-[-1px] left-0 h-0.5 w-full bg-[#b7f23a]" />
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 flex items-center justify-between border-l-4 border-[#b33b3b] bg-[#fff7f7] px-3 py-2.5 text-xs font-semibold text-[#8c2e2e]">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadSavedItems(true)}
              className="font-bold underline"
            >
              Retry
            </button>
          </div>
        )}
        {removedId !== null && (
          <div
            role="status"
            className="mb-3 flex items-center gap-2 border-l-4 border-[#b7f23a] bg-[#f6faec] px-3 py-2.5 text-xs font-semibold text-[#557500]"
          >
            <Check className="h-4 w-4" />
            Removed from saved
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center border border-[#dfe3dc] bg-white py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#779f00]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="border border-dashed border-[#cfd5ce] bg-white px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-[#14181c] text-[#b7f23a]">
              <Bookmark className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold">Nothing saved here yet</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-[#8a9092]">
              Save posts and videos while you explore Fleex and they’ll appear
              in this library.
            </p>
          </div>
        ) : (
          <section className="border border-[#dfe3dc] bg-white">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="group relative flex gap-3 border-b border-[#edf0eb] px-4 py-4 last:border-b-0 sm:gap-4 sm:px-5"
              >
                <button
                  type="button"
                  onClick={() => setViewerItem(item)}
                  aria-label={`View ${item.type === "video" ? "video" : "image"}: ${item.title}`}
                  className="relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden bg-[#eef0ec] text-left sm:h-24 sm:w-32"
                >
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                    />
                  ) : item.type === "video" ? (
                    <Play className="h-6 w-6 text-[#687074]" />
                  ) : (
                    <Eye className="h-6 w-6 text-[#687074]" />
                  )}
                  {item.type === "video" && (
                    <span className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center bg-[#14181c]/85 text-white">
                      <Play className="h-3 w-3 fill-current" />
                    </span>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mb-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#779f00]">
                        {item.type === "video" ? "Fleex video" : "Post"}
                      </p>
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#14181c] sm:text-base">
                        {item.title}
                      </h3>
                      <p className="mt-1 truncate text-xs text-[#687074]">
                        {item.author}
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenu(openMenu === item.id ? null : item.id)
                        }
                        aria-label={`More options for ${item.title}`}
                        className="p-1 text-[#8a9092] hover:bg-[#f3f5f1] hover:text-[#14181c]"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenu === item.id && (
                        <div className="absolute right-0 top-8 z-10 w-36 border border-[#dfe3dc] bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => removeItem(item)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-[#b33b3b] hover:bg-[#fff7f7]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-[10px] font-semibold text-[#8a9092]">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      Saved {formatSavedAt(item.savedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatNumber(item.likes)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {viewerItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#14181c]/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Saved media viewer"
          onClick={() => setViewerItem(null)}
        >
          <button
            type="button"
            onClick={() => setViewerItem(null)}
            aria-label="Close viewer"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center bg-white text-[#14181c]"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="flex max-h-[90vh] max-w-5xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            {viewerItem.type === "video" && viewerItem.mediaUrl ? (
              <video
                src={viewerItem.mediaUrl}
                poster={viewerItem.thumbnail || undefined}
                controls
                autoPlay
                playsInline
                className="max-h-[85vh] max-w-full object-contain"
              />
            ) : viewerItem.thumbnail ? (
              <img
                src={viewerItem.thumbnail}
                alt={viewerItem.title}
                className="max-h-[85vh] max-w-full object-contain"
              />
            ) : (
              <div className="bg-white px-8 py-12 text-center text-sm font-semibold text-[#687074]">
                Media preview unavailable
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
