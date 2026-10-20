"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
} from "lucide-react";

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(date).toLocaleDateString();
}

export default function PostPage() {
  const router = useRouter();
  const params = useParams();
  const id = (params?.id as string) || "";
  const supabase = useMemo(() => createClient(), []);

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("user_feeds")
        .select(
          "*, profiles:user_id(id, username, display_name, avatar_url, is_verified)"
        )
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const normalized = {
        ...data,
        profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
      };
      setPost(normalized);
      setLikesCount(normalized.likes_count ?? 0);

      // Check if current user liked
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && !cancelled) {
        const { data: likeRow } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) setLiked(Boolean(likeRow));
      }

      setLoading(false);
    })().catch((e) => {
      console.error("[Post] error:", e);
      setLoading(false);
      setNotFound(true);
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, id]);

  const handleLike = async () => {
    if (!post || liking) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setLiking(true);

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));

    try {
      if (wasLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: post.id, user_id: user.id });
      }
    } catch (e) {
      // Revert on failure
      setLiked(wasLiked);
      setLikesCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
      console.error("[Post like] error:", e);
    } finally {
      setLiking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#e3e2dd] border-t-[#14181c]" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-white p-6 text-center">
        <p className="text-[16px] font-semibold">Post not found</p>
        <p className="mt-2 text-[13px] text-[#7d8387]">
          It may have been deleted or the link is broken.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-5 rounded-full bg-[#14181c] px-5 py-2.5 text-[13px] font-semibold text-white"
        >
          Go back
        </button>
      </div>
    );
  }

  const owner = post.profiles;
  const mediaList =
    Array.isArray(post.media_urls) && post.media_urls.length > 0
      ? post.media_urls
      : post.media_url
      ? [post.media_url]
      : [];
  const tags: string[] = Array.isArray(post.tags) ? post.tags : [];

  return (
    <div className="min-h-[100dvh] w-full bg-white text-[#14181c] antialiased">
      {/* Header */}
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
          <h1 className="text-[16px] font-semibold tracking-[-0.01em]">Post</h1>
          <button
            type="button"
            aria-label="More"
            className="absolute right-4 grid h-9 w-9 place-items-center rounded-full text-[#8b8f8a] transition active:scale-95 active:bg-black/5"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl pb-24">
        {/* Author */}
        <div className="flex items-center gap-3 px-4 pt-4">
          <Link
            href={`/profile/${owner?.username || owner?.id || ""}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#14181c] text-[15px] font-semibold text-[#b7f23a]"
          >
            {owner?.avatar_url ? (
              <Image
                src={owner.avatar_url}
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            ) : (
              (owner?.display_name || owner?.username || "?").charAt(0).toUpperCase()
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${owner?.username || owner?.id || ""}`}
              className="block truncate text-[14.5px] font-semibold text-[#14181c]"
            >
              {owner?.display_name || owner?.username || "Creator"}
            </Link>
            <p className="truncate text-[12.5px] text-[#7d8387]">
              @{owner?.username || "member"} · {timeAgo(post.created_at)}
            </p>
          </div>
        </div>

        {/* Title + content */}
        {post.title && (
          <h2 className="px-4 pt-4 text-[22px] font-bold leading-tight tracking-[-0.02em]">
            {post.title}
          </h2>
        )}
        {post.content && (
          <p className="whitespace-pre-wrap px-4 pt-3 text-[15px] leading-[1.6] text-[#2d3134]">
            {post.content}
          </p>
        )}

        {/* Feeling / location */}
        {(post.feeling || post.location) && (
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
            {post.feeling && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f3ee] px-2.5 py-1 text-[12px] font-medium text-[#5c6360]">
                {post.feeling_emoji || "💭"} feeling {post.feeling}
              </span>
            )}
            {post.location && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f3ee] px-2.5 py-1 text-[12px] font-medium text-[#5c6360]">
                📍 {post.location}
              </span>
            )}
          </div>
        )}

        {/* Media */}
        {mediaList.length > 0 && (
          <div className="mt-4 space-y-2 px-4">
            {mediaList.map((url: string, i: number) => (
              <div
                key={i}
                className="relative w-full overflow-hidden rounded-2xl bg-[#f4f3ee]"
              >
                {post.media_type === "video" ? (
                  <video
                    src={url}
                    controls
                    playsInline
                    className="w-full"
                  />
                ) : (
                  <div className="relative aspect-video w-full">
                    <Image
                      src={url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-4">
            {tags.map((t) => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}&type=all`}
                className="rounded-full bg-[#f4f3ee] px-3 py-1 text-[12px] font-medium text-[#5c6360] transition active:scale-95"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}

        {/* Engagement bar */}
        <div className="mt-6 border-t border-[#f0efea] px-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={handleLike}
                disabled={liking}
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#5c6360] transition active:scale-95 disabled:opacity-50"
                aria-label={liked ? "Unlike" : "Like"}
              >
                <Heart
                  className={`h-5 w-5 transition ${
                    liked ? "fill-red-500 text-red-500" : ""
                  }`}
                  strokeWidth={2}
                />
                <span className={liked ? "text-red-500" : ""}>{likesCount}</span>
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#5c6360] transition active:scale-95"
              >
                <MessageCircle className="h-5 w-5" strokeWidth={2} />
                <span>{post.comments_count ?? 0}</span>
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#5c6360] transition active:scale-95"
              >
                <Share2 className="h-5 w-5" strokeWidth={2} />
                <span>{post.shares_count ?? 0}</span>
              </button>
            </div>

            <button
              type="button"
              aria-label="Save"
              className="grid h-9 w-9 place-items-center rounded-full text-[#5c6360] transition active:scale-95 active:bg-black/5"
            >
              <Bookmark className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Comments placeholder */}
        <div className="mt-6 px-4">
          <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-[#5c6360]">
            Comments
          </p>
          <div className="rounded-2xl border border-[#ecebe5] bg-[#fafbf6] p-6 text-center">
            <p className="text-[13px] text-[#7d8387]">
              Comments are coming soon.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
