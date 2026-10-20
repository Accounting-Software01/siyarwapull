"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  Loader2,
  MessageSquareText,
  Send,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ForgeCommunityPanelProps = {
  forge: {
    id: string;
    user_id?: string | null;
    join_mode?: "open" | "request" | "invite_only" | null;
  };
};

type Profile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type Member = {
  user_id: string;
  role: "viewer" | "contributor";
  profiles?: Profile | null;
};

type JoinRequest = {
  id: string;
  requester_id: string;
  requested_role: "viewer" | "contributor";
  owner_role?: "viewer" | "contributor" | null;
  message?: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  created_at: string;
  profiles?: Profile | null;
};

type Review = {
  id: string;
  rating: number;
  review?: string | null;
  created_at: string;
  profiles?: Profile | null;
};

const roleDescriptions = {
  viewer: "View and comment",
  contributor: "Upload and edit Forge content",
};

export default function ForgeCommunityPanel({
  forge,
}: ForgeCommunityPanelProps) {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [selectedRole, setSelectedRole] = useState<"viewer" | "contributor">(
    "viewer",
  );
  const [joinMessage, setJoinMessage] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const isOwner = Boolean(userId && userId === forge.user_id);
  const currentMember = members.find((member) => member.user_id === userId);
  const joinMode = forge.join_mode || "request";

  const loadCommunity = async (currentUserId?: string | null) => {
    const [{ data: memberRows }, { data: reviewRows }, { data: summary }] =
      await Promise.all([
        supabase
          .from("forge_contributors")
          .select(
            "user_id, role, profiles:user_id(id, username, display_name, avatar_url)",
          )
          .eq("forge_id", forge.id)
          .order("joined_at", { ascending: false })
          .limit(12),
        supabase
          .from("forge_reviews")
          .select(
            "id, rating, review, created_at, profiles:reviewer_id(id, username, display_name, avatar_url)",
          )
          .eq("forge_id", forge.id)
          .eq("is_visible", true)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("forge_review_summary")
          .select("average_rating, review_count")
          .eq("forge_id", forge.id)
          .maybeSingle(),
      ]);

    setMembers((memberRows || []) as Member[]);
    setReviews((reviewRows || []) as Review[]);
    setAverageRating(Number(summary?.average_rating || 0));
    setReviewCount(Number(summary?.review_count || 0));

    if (currentUserId) {
      const { data: ownRequest } = await supabase
        .from("forge_join_requests")
        .select("*")
        .eq("forge_id", forge.id)
        .eq("requester_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setMyRequest(ownRequest as JoinRequest | null);
    }

    if (currentUserId && currentUserId === forge.user_id) {
      const { data: ownerRequests } = await supabase
        .from("forge_join_requests")
        .select(
          "*, profiles:requester_id(id, username, display_name, avatar_url)",
        )
        .eq("forge_id", forge.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      setRequests((ownerRequests || []) as JoinRequest[]);
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const id = data.user?.id || null;
      setUserId(id);
      loadCommunity(id);
    });
    return () => {
      mounted = false;
    };
  }, [forge.id, forge.user_id]);

  const visibleMembers = useMemo(() => members.slice(0, 5), [members]);

  const requestJoin = async () => {
    setBusy("join");
    setMessage("");
    const { error } = await supabase.rpc("request_join_forge", {
      p_forge_id: forge.id,
      p_requested_role: selectedRole,
      p_message: joinMessage.trim() || null,
    });
    if (error) setMessage(error.message);
    else {
      setMessage(
        joinMode === "open"
          ? "You joined this Forge."
          : "Join request sent to the owner.",
      );
      setShowJoinForm(false);
      setJoinMessage("");
      await loadCommunity(userId);
    }
    setBusy(null);
  };

  const decideRequest = async (
    request: JoinRequest,
    decision: "approved" | "rejected",
    role: "viewer" | "contributor" = "viewer",
  ) => {
    setBusy(request.id);
    setMessage("");
    const { error } = await supabase.rpc("decide_forge_join_request", {
      p_request_id: request.id,
      p_decision: decision,
      p_role: role,
      p_decision_note: null,
    });
    if (error) setMessage(error.message);
    else {
      setMessage(
        decision === "approved" ? "Member approved." : "Request rejected.",
      );
      await loadCommunity(userId);
    }
    setBusy(null);
  };

  const submitReview = async () => {
    if (!reviewRating) {
      setMessage("Choose a star rating first.");
      return;
    }
    setBusy("review");
    setMessage("");
    const { error } = await supabase.rpc("submit_forge_review", {
      p_forge_id: forge.id,
      p_rating: reviewRating,
      p_review: reviewText.trim() || null,
    });
    if (error) setMessage(error.message);
    else {
      setMessage("Your review was saved.");
      setShowReviewForm(false);
      setReviewText("");
      await loadCommunity(userId);
    }
    setBusy(null);
  };

  return (
    <section className="border-t border-[#e7ebe5] bg-white px-5 py-8 sm:px-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6f9000]">
            Forge community
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
            Join the Forge
          </h2>
          <p className="mt-1 text-sm leading-5 text-[#697278]">
            Build, learn, and contribute with the people around this work.
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm font-bold text-[#14181c]">
          <Star className="h-4 w-4 fill-[#b7f23a] text-[#6f9000]" />
          {averageRating ? averageRating.toFixed(1) : "—"}
          <span className="font-normal text-[#8a9294]">({reviewCount})</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-[#e7ebe5] py-4 text-sm text-[#697278]">
        <span className="inline-flex items-center gap-2 font-semibold text-[#14181c]">
          <Users className="h-4 w-4" />
          {members.length} members
        </span>
        <span className="text-[#c1c7c2]">·</span>
        <div className="flex -space-x-2">
          {visibleMembers.map((member) => (
            <Avatar key={member.user_id} profile={member.profiles} />
          ))}
        </div>
        {members.length > visibleMembers.length && (
          <span>+{members.length - visibleMembers.length} more</span>
        )}
      </div>

      {!userId && (
        <p className="mt-5 border border-[#e7ebe5] bg-[#f7f9f5] p-4 text-sm text-[#697278]">
          Sign in to request access and leave a verified review.
        </p>
      )}

      {userId &&
        !isOwner &&
        !currentMember &&
        !myRequest &&
        joinMode !== "invite_only" && (
          <div className="mt-5">
            {!showJoinForm ? (
              <button
                type="button"
                onClick={() => setShowJoinForm(true)}
                className="inline-flex items-center gap-2 bg-[#15191b] px-4 py-3 text-sm font-bold text-white hover:bg-black"
              >
                Request to join <ChevronDown className="h-4 w-4" />
              </button>
            ) : (
              <div className="border border-[#dfe5dc] bg-[#fbfcf9] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">Choose your role</p>
                  <button
                    type="button"
                    onClick={() => setShowJoinForm(false)}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(["viewer", "contributor"] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`border p-3 text-left ${selectedRole === role ? "border-[#15191b] bg-[#efffc8]" : "border-[#dfe5dc] bg-white"}`}
                    >
                      <span className="block text-sm font-bold capitalize">
                        {role}
                      </span>
                      <span className="mt-1 block text-xs text-[#697278]">
                        {roleDescriptions[role]}
                      </span>
                    </button>
                  ))}
                </div>
                <textarea
                  value={joinMessage}
                  onChange={(event) => setJoinMessage(event.target.value)}
                  placeholder="Message to the Forge owner (optional)"
                  rows={3}
                  className="mt-3 w-full resize-none border border-[#dfe5dc] bg-white p-3 text-sm outline-none focus:border-[#15191b]"
                />
                <button
                  type="button"
                  onClick={requestJoin}
                  disabled={busy === "join"}
                  className="mt-3 inline-flex items-center gap-2 bg-[#15191b] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === "join" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}{" "}
                  Send request
                </button>
              </div>
            )}
          </div>
        )}

      {myRequest && !currentMember && (
        <div
          className={`mt-5 flex items-center gap-2 border p-4 text-sm ${myRequest.status === "rejected" ? "border-[#f0d6d3] bg-[#fff8f7]" : "border-[#dfe5dc] bg-[#f7f9f5]"}`}
        >
          <ShieldCheck className="h-4 w-4" />
          Your request is{" "}
          <strong className="capitalize">{myRequest.status}</strong>
          {myRequest.owner_role && ` as ${myRequest.owner_role}.`}
        </div>
      )}
      {currentMember && !isOwner && (
        <div className="mt-5 flex items-center gap-2 border border-[#dfe5dc] bg-[#f7f9f5] p-4 text-sm">
          <Check className="h-4 w-4 text-[#00a94f]" />
          You are a <strong className="capitalize">
            {currentMember.role}
          </strong>{" "}
          in this Forge.
        </div>
      )}

      {isOwner && (
        <OwnerRequests
          requests={requests}
          busy={busy}
          onDecision={decideRequest}
        />
      )}

      {currentMember && !isOwner && (
        <ReviewComposer
          shown={showReviewForm}
          setShown={setShowReviewForm}
          rating={reviewRating}
          setRating={setReviewRating}
          text={reviewText}
          setText={setReviewText}
          busy={busy === "review"}
          onSubmit={submitReview}
        />
      )}

      <ReviewList reviews={reviews} />
      {message && (
        <p className="mt-4 border border-[#dfe5dc] bg-[#f7f9f5] p-3 text-sm text-[#4f595d]">
          {message}
        </p>
      )}
    </section>
  );
}

function Avatar({ profile }: { profile?: Profile | null }) {
  const name = profile?.display_name || profile?.username || "Member";
  return (
    <div
      className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#15191b] text-[10px] font-bold text-[#b7f23a]"
      title={name}
    >
      {profile?.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt={name}
          width={32}
          height={32}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function OwnerRequests({
  requests,
  busy,
  onDecision,
}: {
  requests: JoinRequest[];
  busy: string | null;
  onDecision: (
    request: JoinRequest,
    decision: "approved" | "rejected",
    role?: "viewer" | "contributor",
  ) => void;
}) {
  return (
    <div className="mt-7 border-t border-[#e7ebe5] pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black tracking-[-0.04em]">
            Join requests
          </h3>
          <p className="mt-1 text-xs text-[#697278]">
            Choose the final role for each new member.
          </p>
        </div>
        <span className="text-sm font-bold">{requests.length}</span>
      </div>
      {requests.length ? (
        <div className="mt-4 space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="border border-[#dfe5dc] p-3">
              <div className="flex items-center gap-3">
                <Avatar profile={request.profiles} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {request.profiles?.display_name ||
                      request.profiles?.username ||
                      "Pull member"}
                  </p>
                  <p className="text-xs text-[#697278]">
                    Requested {request.requested_role}
                  </p>
                </div>
              </div>
              {request.message && (
                <p className="mt-3 text-sm leading-5 text-[#697278]">
                  “{request.message}”
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === request.id}
                  onClick={() => onDecision(request, "approved", "viewer")}
                  className="border border-[#15191b] px-3 py-2 text-xs font-bold hover:bg-[#efffc8]"
                >
                  Approve viewer
                </button>
                <button
                  type="button"
                  disabled={busy === request.id}
                  onClick={() => onDecision(request, "approved", "contributor")}
                  className="bg-[#15191b] px-3 py-2 text-xs font-bold text-white"
                >
                  Approve contributor
                </button>
                <button
                  type="button"
                  disabled={busy === request.id}
                  onClick={() => onDecision(request, "rejected")}
                  className="px-3 py-2 text-xs font-bold text-[#a34d47]"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#8a9294]">No pending requests.</p>
      )}
    </div>
  );
}

function ReviewComposer({
  shown,
  setShown,
  rating,
  setRating,
  text,
  setText,
  busy,
  onSubmit,
}: {
  shown: boolean;
  setShown: (value: boolean) => void;
  rating: number;
  setRating: (value: number) => void;
  text: string;
  setText: (value: string) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-7 border-t border-[#e7ebe5] pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black tracking-[-0.04em]">Your review</h3>
          <p className="mt-1 text-xs text-[#697278]">
            Only approved members can review this Forge.
          </p>
        </div>
        {!shown && (
          <button
            type="button"
            onClick={() => setShown(true)}
            className="border border-[#15191b] px-3 py-2 text-xs font-bold"
          >
            Review Forge
          </button>
        )}
      </div>
      {shown && (
        <div className="mt-4 border border-[#dfe5dc] bg-[#fbfcf9] p-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                aria-label={`${star} stars`}
              >
                <Star
                  className={`h-7 w-7 ${star <= rating ? "fill-[#b7f23a] text-[#6f9000]" : "text-[#b9c0b9]"}`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Share your experience (optional)"
            rows={3}
            className="mt-3 w-full resize-none border border-[#dfe5dc] bg-white p-3 text-sm outline-none focus:border-[#15191b]"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onSubmit}
              className="inline-flex items-center gap-2 bg-[#15191b] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Submit
              review
            </button>
            <button
              type="button"
              onClick={() => setShown(false)}
              className="px-4 py-3 text-sm font-bold text-[#697278]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewList({ reviews }: { reviews: Review[] }) {
  return (
    <div className="mt-7 border-t border-[#e7ebe5] pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black tracking-[-0.04em]">
          Member reviews
        </h3>
        <MessageSquareText className="h-5 w-5 text-[#697278]" />
      </div>
      {reviews.length ? (
        <div className="mt-4 space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="border-b border-[#eef0ec] pb-4">
              <div className="flex items-center gap-3">
                <Avatar profile={review.profiles} />
                <div>
                  <p className="text-sm font-bold">
                    {review.profiles?.display_name ||
                      review.profiles?.username ||
                      "Verified member"}
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-[#b7f23a] text-[#6f9000]" : "text-[#c7cdc6]"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {review.review && (
                <p className="mt-3 text-sm leading-5 text-[#4f595d]">
                  {review.review}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#8a9294]">
          No reviews yet. Approved members can be the first to review this
          Forge.
        </p>
      )}
    </div>
  );
}
