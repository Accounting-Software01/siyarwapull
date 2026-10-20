"use client";

import { Check, UserRound, X } from "lucide-react";

export type ForgeJoinRequest = {
  id: string;
  requester_id: string;
  requested_role: "viewer" | "contributor";
  message?: string | null;
  created_at: string;
  profiles?: {
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
};

export default function JoinRequestsPanel({
  requests,
  busy,
  onDecision,
}: {
  requests: ForgeJoinRequest[];
  busy: string | null;
  onDecision: (
    request: ForgeJoinRequest,
    decision: "approved" | "rejected",
    role: "viewer" | "contributor",
  ) => void;
}) {
  if (!requests.length) return null;

  return (
    <section className="border border-[#dfe5dc] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6f9000]">
            Needs your decision
          </p>
          <h3 className="mt-1 text-xl font-black tracking-[-0.04em]">
            Join requests
          </h3>
          <p className="mt-1 text-sm text-[#697278]">
            Choose the final role for each person.
          </p>
        </div>
        <span className="bg-[#efffc8] px-2 py-1 text-xs font-black">
          {requests.length}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {requests.map((request) => {
          const name =
            request.profiles?.display_name ||
            request.profiles?.username ||
            "Siyarwa Pull member";
          return (
            <article key={request.id} className="border border-[#e7ebe5] p-3">
              <div className="flex items-center gap-3">
                {request.profiles?.avatar_url ? (
                  <img
                    src={request.profiles.avatar_url}
                    alt={name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#15191b] text-[#b7f23a]">
                    <UserRound className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{name}</p>
                  <p className="text-xs text-[#697278]">
                    Requested role:{" "}
                    <span className="font-semibold capitalize">
                      {request.requested_role}
                    </span>
                  </p>
                </div>
                <time className="text-[11px] text-[#8a9294]">
                  {new Date(request.created_at).toLocaleDateString()}
                </time>
              </div>
              {request.message && (
                <p className="mt-3 border-l-2 border-[#b7f23a] pl-3 text-sm leading-5 text-[#697278]">
                  “{request.message}”
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === request.id}
                  onClick={() => onDecision(request, "approved", "viewer")}
                  className="inline-flex items-center gap-1 border border-[#15191b] px-3 py-2 text-xs font-bold hover:bg-[#efffc8]"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve viewer
                </button>
                <button
                  type="button"
                  disabled={busy === request.id}
                  onClick={() => onDecision(request, "approved", "contributor")}
                  className="inline-flex items-center gap-1 bg-[#15191b] px-3 py-2 text-xs font-bold text-white hover:bg-black"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve contributor
                </button>
                <button
                  type="button"
                  disabled={busy === request.id}
                  onClick={() => onDecision(request, "rejected", "viewer")}
                  className="inline-flex items-center gap-1 px-2 py-2 text-xs font-bold text-[#a34d47] hover:bg-[#fff5f4]"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
