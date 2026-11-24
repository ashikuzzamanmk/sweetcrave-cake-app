-- ============================================================================
-- SweetCrave — Live Sync & High-Security Supabase SQL Schema
-- Project: eimgzvuocueqezqohlgb
-- - Zero binary image storage (strict https:// link-only CHECK)
-- - Direct public writes on menu/settings are 100% BLOCKED by RLS
-- - "The MK" Admin writes go through SHA-256 verified SECURITY DEFINER RPCs
--   so new foods, offers & home sections appear LIVE for all users immediately!
-- Paste and run once inside Supabase SQL Editor.
-- ============================================================================

create extension if not exists pgcrypto;

-- 0. Automatic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Store Cache Version Tracker (Tiny 200-byte check so phones stay live & fast)
create table if not exists public.store_metadata (
  store_slug text primary key,
  menu_version text not null default '2026.11.5',
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_store_metadata_updated on public.store_metadata;
create trigger trg_store_metadata_updated
before update on public.store_metadata
for each row execute function public.set_updated_at();

insert into public.store_metadata (store_slug, menu_version)
values ('sweet-crave', '2026.11.5')
on conflict (store_slug) do nothing;

-- 2. Food & Cake Catalog (External HD Image Links Only — Zero Binary Storage)
create table if not exists public.cakes_menu (
  id text primary key,
  store_slug text not null default 'sweet-crave',
  name text not null,
  category text not null,
  base_price integer not null check (base_price >= 0),
  image_url text not null check (image_url ~* '^https?://'),
  sort_order integer not null default 0,
  payload_json jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_cakes_menu_store_sort
  on public.cakes_menu (store_slug, sort_order asc);

drop trigger if exists trg_cakes_menu_updated on public.cakes_menu;
create trigger trg_cakes_menu_updated
before update on public.cakes_menu
for each row execute function public.set_updated_at();

-- 3. Live Storefront Content, Offers & Home Sections
create table if not exists public.site_content (
  store_slug text primary key,
  content_json jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_site_content_updated on public.site_content;
create trigger trg_site_content_updated
before update on public.site_content
for each row execute function public.set_updated_at();

-- 4. Customer Orders & Live Status Tracking
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  store_slug text not null default 'sweet-crave',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  cake_inscription text,
  promo_code text,
  subtotal integer not null check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total_amount integer not null check (total_amount >= 0),
  items_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_store_created
  on public.orders (store_slug, created_at desc);

create index if not exists idx_orders_status
  on public.orders (store_slug, status);

create index if not exists idx_orders_phone
  on public.orders (customer_phone);

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated
before update on public.orders
for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security (RLS) — Direct Public Writes Strictly Blocked
-- ============================================================================
alter table public.store_metadata enable row level security;
alter table public.cakes_menu enable row level security;
alter table public.site_content enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Public read store_metadata" on public.store_metadata;
create policy "Public read store_metadata"
  on public.store_metadata for select using (true);

drop policy if exists "Public read cakes_menu" on public.cakes_menu;
create policy "Public read cakes_menu"
  on public.cakes_menu for select using (true);

drop policy if exists "Public read site_content" on public.site_content;
create policy "Public read site_content"
  on public.site_content for select using (true);

-- Public checkout can ONLY insert new pending orders
drop policy if exists "Public insert orders" on public.orders;
create policy "Public insert orders"
  on public.orders for insert
  with check (status = 'pending' and total_amount >= 0);

-- ============================================================================
-- High-Security "The MK" Admin RPCs (Server-Side Salted SHA-256 Verification)
-- ============================================================================
create or replace function public.mk_verify_secret(p_admin_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  v_hash := encode(digest('mk-vault-2026::' || coalesce(p_admin_code, ''), 'sha256'), 'hex');
  return v_hash = '90582622944e88140e69c5ad3cb8f5947343cf87f28122f383dd800d3481819a';
end;
$$;

-- Sync full cake catalog so all users see every food immediately
create or replace function public.mk_sync_cakes(
  p_admin_code text,
  p_store_slug text,
  p_cakes jsonb
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_item jsonb;
  v_idx integer := 0;
  v_version text;
begin
  if not public.mk_verify_secret(p_admin_code) then
    raise exception 'unauthorized';
  end if;

  if jsonb_typeof(p_cakes) <> 'array' or jsonb_array_length(p_cakes) = 0 then
    raise exception 'invalid_payload';
  end if;

  delete from public.cakes_menu where store_slug = p_store_slug;

  for v_item in select * from jsonb_array_elements(p_cakes)
  loop
    insert into public.cakes_menu (
      id, store_slug, name, category, base_price, image_url, sort_order, payload_json
    )
    values (
      v_item->>'id',
      p_store_slug,
      v_item->>'name',
      v_item->>'category',
      coalesce((v_item->>'basePrice')::integer, 0),
      v_item->>'image_url',
      v_idx,
      v_item
    )
    on conflict (id) do update set
      name = excluded.name,
      category = excluded.category,
      base_price = excluded.base_price,
      image_url = excluded.image_url,
      sort_order = excluded.sort_order,
      payload_json = excluded.payload_json,
      updated_at = now();

    v_idx := v_idx + 1;
  end loop;

  v_version := 'v-' || floor(extract(epoch from now()) * 1000)::bigint::text;

  insert into public.store_metadata (store_slug, menu_version)
  values (p_store_slug, v_version)
  on conflict (store_slug) do update set
    menu_version = excluded.menu_version,
    updated_at = now();

  return v_version;
end;
$$;

-- Sync live site content, offers, hero speed & home sections
create or replace function public.mk_sync_site_content(
  p_admin_code text,
  p_store_slug text,
  p_content jsonb
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_version text;
begin
  if not public.mk_verify_secret(p_admin_code) then
    raise exception 'unauthorized';
  end if;

  insert into public.site_content (store_slug, content_json)
  values (p_store_slug, p_content)
  on conflict (store_slug) do update set
    content_json = excluded.content_json,
    updated_at = now();

  v_version := 'v-' || floor(extract(epoch from now()) * 1000)::bigint::text;

  insert into public.store_metadata (store_slug, menu_version)
  values (p_store_slug, v_version)
  on conflict (store_slug) do update set
    menu_version = excluded.menu_version,
    updated_at = now();

  return v_version;
end;
$$;

-- Grant execute on RPCs to anon/authenticated (password still strictly enforced inside!)
grant execute on function public.mk_verify_secret(text) to anon, authenticated;
grant execute on function public.mk_sync_cakes(text, text, jsonb) to anon, authenticated;
grant execute on function public.mk_sync_site_content(text, text, jsonb) to anon, authenticated;
