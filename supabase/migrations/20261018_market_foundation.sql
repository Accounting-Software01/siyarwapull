-- =====================================================================
-- PULL Market (Siyarwa Marketplace) — foundation migration
--
-- Design rules
--   * All money is stored as integer kobo (1 NGN = 100 kobo). Never floats.
--   * Clients can NEVER write prices, totals, commission, payment status
--     or payout details. Those are written only by SECURITY DEFINER
--     functions that are executable by the service_role (our server).
--   * Row Level Security is on for every table. Column-level GRANTs hide
--     sensitive store columns (bank details, Paystack subaccount code).
--   * Stock is reserved when an order is created and released if the
--     order expires or is cancelled.
-- Run in the Supabase SQL editor (or `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.market_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Marketplace admins (managed by SQL only; no client policies = no access)
-- To add an admin:  insert into public.marketplace_admins (user_id) values ('<profile uuid>');
-- ---------------------------------------------------------------------
create table if not exists public.marketplace_admins (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.marketplace_admins enable row level security;
revoke all on public.marketplace_admins from anon, authenticated;

-- ---------------------------------------------------------------------
-- Stores
-- ---------------------------------------------------------------------
create table if not exists public.stores (
  id                       uuid primary key default gen_random_uuid(),
  owner_id                 uuid not null unique references public.profiles(id) on delete restrict,
  slug                     text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  name                     text not null check (char_length(name) between 2 and 60),
  description              text not null default '' check (char_length(description) <= 500),
  state                    text not null check (char_length(state) between 2 and 40),
  delivery_fee_kobo        bigint not null default 0 check (delivery_fee_kobo between 0 and 100000000),
  status                   text not null default 'pending'
                             check (status in ('pending','approved','rejected','suspended')),
  commission_bps           integer not null default 500 check (commission_bps between 0 and 3000),
  -- payout details: NEVER readable by clients. Full account number is not stored at all.
  bank_code                text,
  account_name             text,
  account_last4            text check (account_last4 is null or account_last4 ~ '^[0-9]{4}$'),
  paystack_subaccount_code text,
  payout_ready             boolean generated always as (paystack_subaccount_code is not null) stored,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

drop trigger if exists stores_touch on public.stores;
create trigger stores_touch before update on public.stores
  for each row execute function public.market_touch_updated_at();

alter table public.stores enable row level security;

-- Column-level privileges: clients see only safe columns and may edit only a few.
revoke all on public.stores from anon, authenticated;
grant select (id, owner_id, slug, name, description, state, delivery_fee_kobo, status, payout_ready, created_at)
  on public.stores to anon, authenticated;
grant update (name, description, state, delivery_fee_kobo) on public.stores to authenticated;

drop policy if exists stores_select on public.stores;
create policy stores_select on public.stores for select
  using (status = 'approved' or owner_id = auth.uid());

drop policy if exists stores_update_own on public.stores;
create policy stores_update_own on public.stores for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
-- No INSERT/DELETE policy: stores are created only by the server (it must create the Paystack subaccount).

-- ---------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  title       text not null check (char_length(title) between 2 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  category    text not null default 'other'
                check (category in ('fashion','food','electronics','home','beauty','agriculture','books','services','other')),
  price_kobo  bigint not null check (price_kobo between 10000 and 500000000000), -- NGN 100 .. NGN 5bn
  stock       integer not null default 0 check (stock between 0 and 100000),
  status      text not null default 'draft' check (status in ('draft','active','archived')),
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 6),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists products_store_idx on public.products (store_id);
create index if not exists products_active_idx on public.products (created_at desc) where status = 'active';

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.market_touch_updated_at();

alter table public.products enable row level security;

revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert (store_id, title, description, category, price_kobo, stock, status, image_paths)
  on public.products to authenticated;
grant update (title, description, category, price_kobo, stock, status, image_paths)
  on public.products to authenticated;
grant delete on public.products to authenticated;

drop policy if exists products_select on public.products;
create policy products_select on public.products for select
  using (
    exists (select 1 from public.stores s where s.id = products.store_id and s.owner_id = auth.uid())
    or (
      products.status = 'active'
      and exists (select 1 from public.stores s where s.id = products.store_id and s.status = 'approved')
    )
  );

drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert to authenticated
  with check (
    exists (select 1 from public.stores s
            where s.id = store_id and s.owner_id = auth.uid() and s.status = 'approved')
  );

drop policy if exists products_update on public.products;
create policy products_update on public.products for update to authenticated
  using (
    exists (select 1 from public.stores s where s.id = products.store_id and s.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.stores s
            where s.id = products.store_id and s.owner_id = auth.uid() and s.status = 'approved')
  );

drop policy if exists products_delete on public.products;
create policy products_delete on public.products for delete to authenticated
  using (
    exists (select 1 from public.stores s where s.id = products.store_id and s.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- Orders (one order = one store; written only by SECURITY DEFINER functions)
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  buyer_id           uuid not null references public.profiles(id) on delete restrict,
  store_id           uuid not null references public.stores(id) on delete restrict,
  status             text not null default 'pending_payment'
                       check (status in ('pending_payment','paid','shipped','delivered','cancelled','refund_required','refunded')),
  subtotal_kobo      bigint not null check (subtotal_kobo > 0),
  delivery_fee_kobo  bigint not null check (delivery_fee_kobo >= 0),
  total_kobo         bigint not null,
  commission_bps     integer not null check (commission_bps between 0 and 3000),
  commission_kobo    bigint not null check (commission_kobo >= 0),
  seller_amount_kobo bigint not null,
  currency           text not null default 'NGN' check (currency = 'NGN'),
  paystack_reference text not null unique,
  delivery_name      text not null,
  delivery_phone     text not null,
  delivery_address   text not null,
  delivery_state     text not null,
  seller_note        text,
  expires_at         timestamptz not null,
  paid_at            timestamptz,
  shipped_at         timestamptz,
  delivered_at       timestamptz,
  cancelled_at       timestamptz,
  created_at         timestamptz not null default now(),
  constraint orders_total_ck check (total_kobo = subtotal_kobo + delivery_fee_kobo),
  constraint orders_commission_ck check (commission_kobo <= subtotal_kobo),
  constraint orders_seller_ck check (seller_amount_kobo = total_kobo - commission_kobo)
);

create index if not exists orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index if not exists orders_store_idx on public.orders (store_id, status, created_at desc);
create index if not exists orders_pending_expiry_idx on public.orders (expires_at) where status = 'pending_payment';

create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  title           text not null,
  unit_price_kobo bigint not null check (unit_price_kobo > 0),
  quantity        integer not null check (quantity between 1 and 100)
);
create index if not exists order_items_order_idx on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;

-- Buyers see their own orders. Sellers see their store's orders only once paid
-- (so an unpaid/expired checkout never leaks a buyer's address to a seller).
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
  using (
    buyer_id = auth.uid()
    or (
      status in ('paid','shipped','delivered','refund_required','refunded')
      and exists (select 1 from public.stores s where s.id = orders.store_id and s.owner_id = auth.uid())
    )
  );

-- Visibility of items follows visibility of the parent order (orders RLS applies inside the subquery).
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id));

-- ---------------------------------------------------------------------
-- Payment audit log (service role only)
-- ---------------------------------------------------------------------
create table if not exists public.payment_events (
  id         bigint generated always as identity primary key,
  reference  text,
  source     text not null,          -- 'webhook' | 'callback'
  event      text,
  outcome    text not null,          -- e.g. 'paid', 'already_settled', 'amount_mismatch', 'unknown_reference'
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists payment_events_ref_idx on public.payment_events (reference);
alter table public.payment_events enable row level security;
revoke all on public.payment_events from anon, authenticated;

-- ---------------------------------------------------------------------
-- Stock release for abandoned checkouts
-- ---------------------------------------------------------------------
create or replace function public.expire_stale_orders()
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  with expired as (
    update public.orders
       set status = 'cancelled', cancelled_at = now()
     where status = 'pending_payment' and expires_at < now()
    returning id
  ),
  restock as (
    select i.product_id, sum(i.quantity)::int as qty
      from public.order_items i
      join expired e on e.id = i.order_id
     where i.product_id is not null
     group by i.product_id
  )
  update public.products p
     set stock = least(p.stock + r.qty, 100000)
    from restock r
   where p.id = r.product_id;
end;
$$;

-- ---------------------------------------------------------------------
-- create_order: the ONLY place an order and its prices are born.
-- Called by our server with the verified user id. Never callable by clients.
-- p_items: [{"product_id": "<uuid>", "quantity": 2}, ...]  (all from one store)
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_buyer   uuid,
  p_store   uuid,
  p_items   jsonb,
  p_name    text,
  p_phone   text,
  p_address text,
  p_state   text
)
returns table (
  order_id        uuid,
  reference       text,
  total_kobo      bigint,
  commission_kobo bigint,
  subaccount_code text
)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_store      public.stores%rowtype;
  v_item       jsonb;
  v_prod       public.products%rowtype;
  v_qty        integer;
  v_subtotal   bigint := 0;
  v_total      bigint;
  v_commission bigint;
  v_order      uuid := gen_random_uuid();
  v_ref        text;
  v_lines      jsonb := '[]'::jsonb;
  v_pending    integer;
begin
  perform public.expire_stale_orders();

  if p_buyer is null then raise exception 'buyer_required'; end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'invalid_items';
  end if;
  if (select count(distinct x ->> 'product_id') from jsonb_array_elements(p_items) x)
     <> jsonb_array_length(p_items) then
    raise exception 'duplicate_items';
  end if;

  select * into v_store from public.stores where id = p_store and status = 'approved' for share;
  if not found then raise exception 'store_unavailable'; end if;
  if v_store.paystack_subaccount_code is null then raise exception 'store_not_payable'; end if;
  if v_store.owner_id = p_buyer then raise exception 'own_store'; end if;

  select count(*) into v_pending from public.orders
   where buyer_id = p_buyer and status = 'pending_payment';
  if v_pending >= 5 then raise exception 'too_many_pending'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if (v_item ->> 'quantity') is null or (v_item ->> 'quantity') !~ '^[0-9]{1,3}$' then
      raise exception 'invalid_quantity';
    end if;
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty < 1 or v_qty > 100 then raise exception 'invalid_quantity'; end if;

    if (v_item ->> 'product_id') is null
       or (v_item ->> 'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'invalid_product';
    end if;

    select * into v_prod from public.products
     where id = (v_item ->> 'product_id')::uuid
       and store_id = p_store
       and status = 'active'
     for update;
    if not found then raise exception 'product_unavailable'; end if;
    if v_prod.stock < v_qty then raise exception 'out_of_stock'; end if;

    update public.products set stock = stock - v_qty where id = v_prod.id;

    v_subtotal := v_subtotal + (v_prod.price_kobo * v_qty);
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_prod.id,
      'title', v_prod.title,
      'unit_price_kobo', v_prod.price_kobo,
      'quantity', v_qty
    );
  end loop;

  v_total      := v_subtotal + v_store.delivery_fee_kobo;
  v_commission := (v_subtotal * v_store.commission_bps + 5000) / 10000;  -- rounded to nearest kobo
  v_ref        := 'PL-' || v_order::text;

  insert into public.orders (
    id, buyer_id, store_id, status,
    subtotal_kobo, delivery_fee_kobo, total_kobo,
    commission_bps, commission_kobo, seller_amount_kobo,
    paystack_reference,
    delivery_name, delivery_phone, delivery_address, delivery_state,
    expires_at
  ) values (
    v_order, p_buyer, p_store, 'pending_payment',
    v_subtotal, v_store.delivery_fee_kobo, v_total,
    v_store.commission_bps, v_commission, v_total - v_commission,
    v_ref,
    p_name, p_phone, p_address, p_state,
    now() + interval '30 minutes'
  );

  insert into public.order_items (order_id, product_id, title, unit_price_kobo, quantity)
  select v_order, (l ->> 'product_id')::uuid, l ->> 'title',
         (l ->> 'unit_price_kobo')::bigint, (l ->> 'quantity')::int
    from jsonb_array_elements(v_lines) l;

  return query select v_order, v_ref, v_total, v_commission, v_store.paystack_subaccount_code;
end;
$$;

-- ---------------------------------------------------------------------
-- cancel_pending_order: used when Paystack initialisation fails.
-- ---------------------------------------------------------------------
create or replace function public.cancel_pending_order(p_order uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  select status into v_status from public.orders where id = p_order for update;
  if v_status is distinct from 'pending_payment' then return; end if;

  update public.orders set status = 'cancelled', cancelled_at = now() where id = p_order;

  update public.products p
     set stock = least(p.stock + i.quantity, 100000)
    from public.order_items i
   where i.order_id = p_order and p.id = i.product_id;
end;
$$;

-- ---------------------------------------------------------------------
-- mark_order_paid: the ONLY way an order becomes paid.
-- Our server calls it after Paystack's verify endpoint confirms success.
-- Idempotent, and refuses if the amount or currency differ from the order.
-- ---------------------------------------------------------------------
create or replace function public.mark_order_paid(
  p_reference   text,
  p_amount_kobo bigint,
  p_currency    text
)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where paystack_reference = p_reference for update;
  if not found then raise exception 'unknown_reference'; end if;

  if p_currency is distinct from v_order.currency or p_amount_kobo is distinct from v_order.total_kobo then
    raise exception 'amount_mismatch';
  end if;

  if v_order.status in ('paid','shipped','delivered','refund_required','refunded') then
    return v_order.status;                       -- already settled (idempotent)
  end if;

  if v_order.status = 'pending_payment' then
    update public.orders set status = 'paid', paid_at = now() where id = v_order.id;
    return 'paid';
  end if;

  -- status = 'cancelled': buyer paid after the 30-minute hold expired.
  perform 1 from public.products
   where id in (select product_id from public.order_items where order_id = v_order.id and product_id is not null)
   for update;

  if exists (
    select 1
      from public.order_items i
      left join public.products p on p.id = i.product_id
     where i.order_id = v_order.id and (p.id is null or p.stock < i.quantity)
  ) then
    -- Stock is gone: money was taken, so this order must be refunded.
    update public.orders set status = 'refund_required', paid_at = now() where id = v_order.id;
    return 'refund_required';
  end if;

  update public.products p
     set stock = p.stock - i.quantity
    from public.order_items i
   where i.order_id = v_order.id and p.id = i.product_id;

  update public.orders set status = 'paid', paid_at = now(), cancelled_at = null where id = v_order.id;
  return 'paid';
end;
$$;

-- ---------------------------------------------------------------------
-- Seller / buyer actions (callable by signed-in users; ownership checked inside)
-- ---------------------------------------------------------------------
create or replace function public.seller_mark_shipped(p_order uuid, p_note text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_note is not null and char_length(p_note) > 300 then raise exception 'note_too_long'; end if;

  update public.orders o
     set status = 'shipped', shipped_at = now(), seller_note = nullif(btrim(p_note), '')
   where o.id = p_order
     and o.status = 'paid'
     and exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid());
  get diagnostics v_updated = row_count;
  if v_updated = 0 then raise exception 'cannot_ship'; end if;
end;
$$;

create or replace function public.buyer_confirm_delivery(p_order uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  update public.orders
     set status = 'delivered', delivered_at = now()
   where id = p_order and buyer_id = auth.uid() and status = 'shipped';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then raise exception 'cannot_confirm'; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Function privileges. Supabase grants EXECUTE to anon/authenticated by default,
-- so revoke explicitly and grant only what each caller needs.
-- ---------------------------------------------------------------------
revoke execute on function public.expire_stale_orders() from public, anon, authenticated;
revoke execute on function public.create_order(uuid, uuid, jsonb, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.cancel_pending_order(uuid) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(text, bigint, text) from public, anon, authenticated;
revoke execute on function public.seller_mark_shipped(uuid, text) from public, anon;
revoke execute on function public.buyer_confirm_delivery(uuid) from public, anon;

grant execute on function public.expire_stale_orders() to service_role;
grant execute on function public.create_order(uuid, uuid, jsonb, text, text, text, text) to service_role;
grant execute on function public.cancel_pending_order(uuid) to service_role;
grant execute on function public.mark_order_paid(text, bigint, text) to service_role;
grant execute on function public.seller_mark_shipped(uuid, text) to authenticated;
grant execute on function public.buyer_confirm_delivery(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Product image bucket: public read, owner-folder write, small compressed images only
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('market-images', 'market-images', true, 1048576, array['image/jpeg','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists market_images_insert on storage.objects;
create policy market_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'market-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists market_images_delete on storage.objects;
create policy market_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'market-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- OPTIONAL: release stock for abandoned checkouts every 10 minutes (needs pg_cron):
--   select cron.schedule('market-expire-orders', '*/10 * * * *', $$select public.expire_stale_orders()$$);
-- create_order() also calls expire_stale_orders(), so stock is released on demand either way.
-- ---------------------------------------------------------------------
