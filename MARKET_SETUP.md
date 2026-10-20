# Siyarwa Pull Marketplace — setup & go-live checklist

Siyarwa Pull Marketplace is a feature of Siyarwa Pull (routes under `/market`), not a separate app.
It uses Siyarwa Pull's existing Supabase login, profiles and navigation.

## 0. Local setup (Windows)
Work in a short path outside OneDrive (e.g. `C:\dev\fleex-v4`), then:
```
npm ci
copy .env.example .env.local     # fill in real values; never commit .env.local
npx tsc --noEmit
npm run build
npm run dev
```
Note: `next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so a passing build does NOT prove type safety — always run `npx tsc --noEmit` as well.

## 1. Database (Supabase SQL editor)
**Pre-flight** — this must return no rows (otherwise a table with the same name already exists and the migration would silently skip it):
```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('stores','products','orders','order_items','payment_events','marketplace_admins');
```
Then run `supabase/migrations/20261018_market_foundation.sql` in the SQL editor (not `supabase db push`; Siyarwa Pull's older migrations are not timestamped).
It creates `stores`, `products`, `orders`, `order_items`, `payment_events`, `marketplace_admins`, the `market-images` storage bucket and the money-safe functions. It requires `public.profiles(id)` (Siyarwa Pull's user profile table).

Make yourself a Market admin (replace with your profile UUID):
```sql
insert into public.marketplace_admins (user_id) values ('YOUR-PROFILE-UUID');
```
Optional (frees stock from abandoned checkouts every 10 min; needs pg_cron — checkout also expires stale orders on demand):
```sql
select cron.schedule('market-expire-orders', '*/10 * * * *', $$select public.expire_stale_orders()$$);
```

## 2. Environment variables (Netlify → Site settings → Environment)
See `.env.example` for the full list. Marketplace-specific:
| Name | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Already used by Siyarwa Pull. |
| `PAYSTACK_SECRET_KEY` | `sk_test_…` first, `sk_live_…` at launch. Server-only. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API. Server-only. Bypasses RLS. |
| `NEXT_PUBLIC_SITE_URL` | Required in production, e.g. `https://pull.example.com` (Paystack return URL). |
| `PAYSTACK_FEE_BEARER` | `account` (platform pays Paystack fee, default) or `subaccount` (seller pays). |

Never put the secret or service-role key in a `NEXT_PUBLIC_` variable or commit real values.

## 3. Paystack dashboard
Settings → API Keys & Webhooks → webhook URL: `https://YOUR-SITE/api/market/paystack/webhook`

## 4. Test with TEST keys before going live
1. Sign in as user A → `/market/sell` → create a store with a real bank account (test mode still validates the format).
2. As admin → `/market/admin` → approve the store.
3. As user A → `/market/sell/products` → add a product with a photo, publish.
4. As user B (different account) → open the product → buy → pay with a Paystack test card.
5. Confirm: order shows "Paid", stock dropped, `payment_events` has a row.
6. As user A → `/market/sell/orders` → mark shipped. As user B → confirm received.
7. Retry the webhook from the Paystack dashboard → nothing should change (idempotent).
8. Confirm an unsigned POST to the webhook URL returns 401.
9. Confirm existing Siyarwa Pull features still work: login, feed, Forge, Clips, messages, profile.

## 5. Payment safety (what is and isn't implemented)
* An order becomes `paid` only via `mark_order_paid`, called by the server after Paystack's verify endpoint confirms success; amount and currency must match the order total. Callback and webhook both use this path; the webhook also checks Paystack's HMAC signature.
* **No escrow.** Paystack settles each sale to the seller's bank on Paystack's schedule, before the buyer confirms delivery. Holding funds would need legal/regulatory advice.
* **Refunds are manual.** Orders in `refund_required` appear on `/market/admin`; refund in the Paystack dashboard, then run `update public.orders set status='refunded' where id='…';`.
* **No automatic reconciliation job.** If a webhook is missed and the buyer never returns, the order stays unpaid until it expires; compare Paystack's transaction list with `orders` periodically.
* **Fees on small orders.** With `PAYSTACK_FEE_BEARER=account` the platform pays Paystack's fee out of its commission. Check current Paystack pricing; on cheap items 5% may not cover it.
* The bank-name lookup has only a per-instance rate limit; add a shared limiter before heavy traffic.

## 6. Known limits (MVP)
Single product per order (no cart), no reviews/disputes UI, no seller notifications, no product moderation, admin can only approve/reject/suspend stores.

## 7. Where products appear
Active, in-stock products from approved stores are shown in the dashboard feed (Marketplace card with a "Buy now" button) as well as at `/market`. A store must be approved by an admin before its products appear anywhere.
