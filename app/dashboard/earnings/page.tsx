"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/dashboard/layout/dashboard-header";
import { createClient } from "@/lib/supabase/client";

type EarningsStats = {
  followers_count: number;
  allies_count: number;
  videos_count: number;
  likes_count: number;
  eligible: boolean;
  earnings_active: boolean;
  balance_usd: number;
  withdrawal_minimum_usd: number;
  pool_percent: number;
  monthly_cap_usd: number;
  large_withdrawal_threshold_usd: number;
  identity_status: "unverified" | "pending" | "verified" | "rejected";
  revenue_backed: boolean;
};

type WithdrawalRequest = {
  id: string;
  amount_usd: number;
  status: string;
  requires_manual_review: boolean;
  created_at: string;
};

const emptyStats: EarningsStats = {
  followers_count: 0,
  allies_count: 0,
  videos_count: 0,
  likes_count: 0,
  eligible: false,
  earnings_active: false,
  balance_usd: 0,
  withdrawal_minimum_usd: 100,
  pool_percent: 30,
  monthly_cap_usd: 50,
  large_withdrawal_threshold_usd: 250,
  identity_status: "unverified",
  revenue_backed: true,
};

export default function EarningsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState(emptyStats);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("100");
  const [method, setMethod] = useState("bank_transfer");
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const [{ data, error: statsError }, { data: requestData }] =
      await Promise.all([
        supabase.rpc("get_creator_earnings_stats"),
        supabase
          .from("creator_withdrawal_requests")
          .select("id, amount_usd, status, requires_manual_review, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    if (statsError) setError(statsError.message);
    if (data)
      setStats({
        ...emptyStats,
        ...data,
        balance_usd: Number(data.balance_usd) || 0,
      });
    setRequests(
      (requestData ?? []).map((item) => ({
        ...item,
        amount_usd: Number(item.amount_usd),
      })),
    );
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activate = async () => {
    setWorking(true);
    setError("");
    setNotice("");
    const { data, error: activationError } = await supabase.rpc(
      "activate_creator_earnings",
    );
    if (activationError) setError(activationError.message);
    else {
      setStats({
        ...emptyStats,
        ...data,
        balance_usd: Number(data?.balance_usd) || 0,
      });
      setNotice("Earnings tracking is active.");
    }
    setWorking(false);
  };

  const submitWithdrawal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    setNotice("");
    const requested = Number(amount);
    if (
      requested < stats.withdrawal_minimum_usd ||
      requested > stats.balance_usd
    ) {
      setError(
        `Enter an amount between $${stats.withdrawal_minimum_usd} and your available balance.`,
      );
      setWorking(false);
      return;
    }
    const { error: requestError } = await supabase.rpc(
      "request_creator_withdrawal",
      {
        p_amount_usd: requested,
        p_payout_method: method,
        p_payout_name: name,
        p_payout_reference: reference,
      },
    );
    if (requestError) setError(requestError.message);
    else {
      setShowForm(false);
      setName("");
      setReference("");
      setNotice("Withdrawal request submitted for review.");
      await loadData();
    }
    setWorking(false);
  };

  const requirements = [
    ["Followers", stats.followers_count, 50],
    ["Allies", stats.allies_count, 50],
    ["Videos", stats.videos_count, 50],
    ["Verified likes", stats.likes_count, 100],
  ] as const;
  const canWithdraw =
    stats.earnings_active &&
    stats.identity_status === "verified" &&
    stats.balance_usd >= stats.withdrawal_minimum_usd;

  return (
    <div className="min-h-screen bg-white text-[#141414]">
      <DashboardHeader />
      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-8 sm:px-8">
        <header className="flex items-center justify-between border-b border-[#e5e7e3] pb-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#687074]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-2 text-sm font-bold">
            <WalletCards className="h-4 w-4 text-[#779f00]" />
            Earnings
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            aria-label="Refresh"
            className="text-[#687074] disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </header>

        {error && (
          <p className="mt-5 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-5 border-l-4 border-[#b7f23a] bg-[#f5fae9] px-4 py-3 text-xs font-semibold text-[#557500]">
            {notice}
          </p>
        )}

        <section className="mt-8 grid gap-px border border-[#e5e7e3] bg-[#e5e7e3] sm:grid-cols-3">
          <Metric
            label="Balance"
            value={`$${stats.balance_usd.toFixed(4)}`}
            detail={`Minimum $${stats.withdrawal_minimum_usd}`}
          />
          <Metric
            label="Creator pool"
            value={`${stats.pool_percent}%`}
            detail="Confirmed net revenue"
          />
          <Metric
            label="Monthly cap"
            value={`$${stats.monthly_cap_usd}`}
            detail="Beta limit per creator"
          />
        </section>

        <section className="mt-8 border border-[#e5e7e3]">
          <div className="flex items-center justify-between border-b border-[#e5e7e3] px-5 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#779f00]">
                Eligibility
              </p>
              <h2 className="mt-1 text-lg font-bold">Creator requirements</h2>
            </div>
            <span className="text-xs font-bold text-[#687074]">
              {stats.eligible ? "Complete" : "In progress"}
            </span>
          </div>
          <div className="space-y-5 px-5 py-5">
            {requirements.map(([label, value, target]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="font-semibold">{label}</span>
                  <span className="text-[#687074]">
                    <strong className="text-[#141414]">
                      {Math.min(value, target)}
                    </strong>{" "}
                    / {target}
                  </span>
                </div>
                <div className="h-2 bg-[#edf0eb]">
                  <div
                    className="h-full bg-[#b7f23a]"
                    style={{
                      width: `${Math.min(100, (value / target) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="border border-[#e5e7e3] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#779f00]">
              Earnings setup
            </p>
            <h2 className="mt-2 text-lg font-bold">
              {stats.earnings_active ? "Active" : "Not active"}
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#687074]">
              Verified interactions are distributed from the monthly Fleex
              revenue pool.
            </p>
            <button
              type="button"
              onClick={() => void activate()}
              disabled={!stats.eligible || stats.earnings_active || working}
              className="mt-5 flex h-10 w-full items-center justify-center gap-2 bg-[#141414] text-xs font-bold text-white disabled:bg-[#edf0eb] disabled:text-[#8a9092]"
            >
              {working ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : stats.earnings_active ? (
                <>
                  <Check className="h-4 w-4" />
                  Earnings active
                </>
              ) : (
                "Activate earnings"
              )}
            </button>
          </div>
          <div className="border border-[#e5e7e3] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#779f00]" />
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#779f00]">
                Identity
              </p>
            </div>
            <h2 className="mt-2 text-lg font-bold capitalize">
              {stats.identity_status}
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#687074]">
              Identity verification is required before any payout can be
              requested.
            </p>
          </div>
        </section>

        <section className="mt-8 border border-[#e5e7e3] p-5">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#779f00]" />
            <h2 className="text-lg font-bold">Withdrawals</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#687074]">
            Requests of ${stats.large_withdrawal_threshold_usd} or more receive
            manual review.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={!canWithdraw}
            className="mt-5 h-10 w-full border border-[#141414] text-xs font-bold disabled:border-[#e5e7e3] disabled:text-[#9aa09b]"
          >
            {stats.identity_status !== "verified"
              ? "Identity verification required"
              : canWithdraw
                ? "Request withdrawal"
                : "Withdrawal locked"}
          </button>
        </section>

        {showForm && canWithdraw && (
          <section className="mt-5 border border-[#e5e7e3] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Request withdrawal</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs font-semibold underline"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={submitWithdrawal} className="mt-5 space-y-4">
              <Field label="Amount">
                <input
                  type="number"
                  min={stats.withdrawal_minimum_usd}
                  max={stats.balance_usd}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </Field>
              <Field label="Payout method">
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                >
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="mobile_money">Mobile money</option>
                </select>
              </Field>
              <Field label="Account name">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={2}
                  placeholder="Name on account"
                />
              </Field>
              <Field label="Account reference">
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  required
                  minLength={3}
                  placeholder="Account number, email, or wallet reference"
                />
              </Field>
              <button
                type="submit"
                disabled={working}
                className="h-10 w-full bg-[#141414] text-xs font-bold text-white disabled:opacity-50"
              >
                {working ? "Submitting…" : "Submit request"}
              </button>
            </form>
          </section>
        )}

        {requests.length > 0 && (
          <section className="mt-8 border border-[#e5e7e3]">
            <h2 className="border-b border-[#e5e7e3] px-5 py-4 text-lg font-bold">
              Recent requests
            </h2>
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between border-b border-[#edf0eb] px-5 py-4 text-xs last:border-0"
              >
                <div>
                  <p className="font-bold">${request.amount_usd.toFixed(2)}</p>
                  <p className="mt-1 text-[#8a9092]">
                    {new Date(request.created_at).toLocaleDateString()}{" "}
                    {request.requires_manual_review && "· Manual review"}
                  </p>
                </div>
                <span className="font-bold capitalize text-[#557500]">
                  {request.status}
                </span>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-white px-4 py-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a9092]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-[-0.05em]">{value}</p>
      <p className="mt-1 text-xs text-[#8a9092]">{detail}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-bold">
      {label}
      <span className="mt-2 block [&>input]:h-10 [&>input]:w-full [&>input]:border [&>input]:border-[#dfe3dc] [&>input]:bg-[#fbfcf9] [&>input]:px-3 [&>input]:text-sm [&>input]:outline-none [&>select]:h-10 [&>select]:w-full [&>select]:border [&>select]:border-[#dfe3dc] [&>select]:bg-[#fbfcf9] [&>select]:px-3 [&>select]:text-sm [&>select]:outline-none">
        {children}
      </span>
    </label>
  );
}
