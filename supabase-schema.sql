-- ============================================================================
-- ESHU CAKES / SWEETCRAVE — PRODUCTION SUPABASE MIGRATION (NON-DESTRUCTIVE)
-- Project: eimgzvuocueqezqohlgb
--
-- Features:
-- 1. Proper schema/table GRANTs (fixes 401 permission denied for anon/auth)
-- 2. Admin RBAC via Supabase Auth + public.admin_roles + public.is_admin()
-- 3. Non-destructive upgrades to cakes_menu, categories, site_content, orders
-- 4. Server-side price validation & duplicate-proof order submission RPC
-- 5. Order lifecycle status tracking + timestamped status_history
-- 6. Secure Supabase Storage bucket (`product-images`) with admin-only write RLS
-- 7. Supabase Realtime publication for live storefront & admin updates
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 0. SCHEMA GRANTS & TIMESTAMP TRIGGER
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. ADMIN ROLES & AUTHORIZATION (SUPABASE AUTH BACKED — ZERO CLIENT SECRETS)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);

alter table public.admin_roles enable row level security;

-- Helper function checked by all Admin RLS & Storage policies
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_roles ar
    where ar.user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Admin can read only their own role row; public cannot read admin_roles at all
drop policy if exists "Admin read own role" on public.admin_roles;
create policy "Admin read own role"
  on public.admin_roles for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.admin_roles to authenticated;

-- ----------------------------------------------------------------------------
-- 2. STORE METADATA (VERSION & REALTIME SIGNAL)
-- ----------------------------------------------------------------------------
create table if not exists public.store_metadata (
  store_slug text primary key,
  menu_version text not null default '2026.11.6',
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_store_metadata_updated on public.store_metadata;
create trigger trg_store_metadata_updated
before update on public.store_metadata
for each row execute function public.set_updated_at();

insert into public.store_metadata (store_slug, menu_version)
values ('sweet-crave', '2026.11.6')
on conflict (store_slug) do nothing;

-- ----------------------------------------------------------------------------
-- 3. PRODUCT CATEGORIES (FULL CRUD)
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id text primary key,
  store_slug text not null default 'sweet-crave',
  name text not null,
  slug text not null,
  description text not null default '',
  image_url text not null default '',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_store_sort
  on public.categories (store_slug, sort_order asc);

drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated
before update on public.categories
for each row execute function public.set_updated_at();

insert into public.categories (id, store_slug, name, slug, description, image_url, is_visible, sort_order)
values
  ('cat-birthday', 'sweet-crave', 'Birthday Cake', 'birthday-cake', 'Custom celebration & birthday cakes', 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=200&q=80', true, 1),
  ('cat-bento', 'sweet-crave', 'Bento Cake', 'bento-cake', 'Cute Korean-style mini lunchbox cakes', 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=200&q=80', true, 2),
  ('cat-cupcake', 'sweet-crave', 'Cupcake', 'cupcake', 'Hand-piped gourmet cupcake boxes', 'https://images.unsplash.com/photo-1587668178277-295251f900ce?auto=format&fit=crop&w=200&q=80', true, 3),
  ('cat-sugar-free', 'sweet-crave', 'Sugar-Free', 'sugar-free', 'Guilt-free naturally sweetened cakes', 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&w=200&q=80', true, 4)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 4. PRODUCTS / CAKES MENU (NON-DESTRUCTIVE UPGRADE)
-- ----------------------------------------------------------------------------
create table if not exists public.cakes_menu (
  id text primary key,
  store_slug text not null default 'sweet-crave',
  name text not null,
  category text not null,
  base_price integer not null check (base_price >= 0),
  image_url text not null,
  sort_order integer not null default 0,
  payload_json jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.cakes_menu add column if not exists slug text;
alter table public.cakes_menu add column if not exists promo_price integer;
alter table public.cakes_menu add column if not exists is_visible boolean not null default true;
alter table public.cakes_menu add column if not exists is_available boolean not null default true;
alter table public.cakes_menu add column if not exists is_featured boolean not null default false;
alter table public.cakes_menu add column if not exists stock_limit integer;
alter table public.cakes_menu add column if not exists delivery_available boolean not null default true;
alter table public.cakes_menu add column if not exists pickup_available boolean not null default true;
alter table public.cakes_menu add column if not exists created_at timestamptz not null default now();

create index if not exists idx_cakes_menu_store_sort
  on public.cakes_menu (store_slug, sort_order asc);

create index if not exists idx_cakes_menu_visibility
  on public.cakes_menu (store_slug, is_visible, is_available);

drop trigger if exists trg_cakes_menu_updated on public.cakes_menu;
create trigger trg_cakes_menu_updated
before update on public.cakes_menu
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. SITE CONTENT & STORE SETTINGS
-- ----------------------------------------------------------------------------
create table if not exists public.site_content (
  store_slug text primary key,
  content_json jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_site_content_updated on public.site_content;
create trigger trg_site_content_updated
before update on public.site_content
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. ORDERS & LIFECYCLE TRACKING (NON-DESTRUCTIVE UPGRADE)
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  store_slug text not null default 'sweet-crave',
  status text not null default 'pending',
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

alter table public.orders add column if not exists idempotency_key text;
alter table public.orders add column if not exists order_type text not null default 'delivery';
alter table public.orders add column if not exists customer_alt_phone text;
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists delivery_city text;
alter table public.orders add column if not exists delivery_area text;
alter table public.orders add column if not exists delivery_postal_code text;
alter table public.orders add column if not exists delivery_date date;
alter table public.orders add column if not exists delivery_time_window text;
alter table public.orders add column if not exists delivery_instructions text;
alter table public.orders add column if not exists addons_total integer not null default 0;
alter table public.orders add column if not exists payment_method text not null default 'cash_on_delivery';
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists status_history jsonb not null default '[]'::jsonb;

-- Upgrade status check constraint to full 8-stage cake order lifecycle
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in (
    'pending',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered',
    'completed',
    'cancelled'
  ));

alter table public.orders drop constraint if exists orders_order_type_check;
alter table public.orders add constraint orders_order_type_check
  check (order_type in ('delivery', 'pickup'));

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'partial', 'paid', 'refunded'));

create unique index if not exists idx_orders_idempotency_key
  on public.orders (idempotency_key) where idempotency_key is not null;

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

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) & LEAST-PRIVILEGE GRANTS
-- ----------------------------------------------------------------------------
alter table public.store_metadata enable row level security;
alter table public.categories enable row level security;
alter table public.cakes_menu enable row level security;
alter table public.site_content enable row level security;
alter table public.orders enable row level security;

-- Explicit PostgreSQL role privileges (RLS still enforces row-level rules!)
grant select on public.store_metadata to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.cakes_menu to anon, authenticated;
grant select on public.site_content to anon, authenticated;

grant insert, update, delete on public.store_metadata to authenticated;
grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.cakes_menu to authenticated;
grant insert, update, delete on public.site_content to authenticated;
grant select, insert, update, delete on public.orders to authenticated;

-- STORE METADATA POLICIES
drop policy if exists "Public read store_metadata" on public.store_metadata;
create policy "Public read store_metadata"
  on public.store_metadata for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin write store_metadata" on public.store_metadata;
drop policy if exists "Authenticated manage store_metadata" on public.store_metadata;
create policy "Admin write store_metadata"
  on public.store_metadata for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- CATEGORIES POLICIES (Public sees visible categories; Admin manages all)
drop policy if exists "Public read visible categories" on public.categories;
create policy "Public read visible categories"
  on public.categories for select
  to anon, authenticated
  using (is_visible = true or public.is_admin());

drop policy if exists "Admin write categories" on public.categories;
create policy "Admin write categories"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- CAKES MENU POLICIES (Public sees only visible products; Admin manages all)
drop policy if exists "Public read cakes_menu" on public.cakes_menu;
create policy "Public read cakes_menu"
  on public.cakes_menu for select
  to anon, authenticated
  using (is_visible = true or public.is_admin());

drop policy if exists "Admin write cakes_menu" on public.cakes_menu;
drop policy if exists "Authenticated manage cakes_menu" on public.cakes_menu;
create policy "Admin write cakes_menu"
  on public.cakes_menu for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- SITE CONTENT POLICIES
drop policy if exists "Public read site_content" on public.site_content;
create policy "Public read site_content"
  on public.site_content for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin write site_content" on public.site_content;
drop policy if exists "Authenticated manage site_content" on public.site_content;
create policy "Admin write site_content"
  on public.site_content for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ORDERS POLICIES (Public CANNOT read orders directly; orders MUST go through create_validated_order RPC!)
drop policy if exists "Public insert orders" on public.orders;
drop policy if exists "Authenticated manage orders" on public.orders;
drop policy if exists "Authenticated update orders" on public.orders;
drop policy if exists "Admin full access orders" on public.orders;
create policy "Admin full access orders"
  on public.orders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. SERVER-SIDE VALIDATED ORDER SUBMISSION RPC (PRICE-TAMPER PROOF)
-- ----------------------------------------------------------------------------
create or replace function public.create_validated_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_slug text := coalesce(nullif(trim(p_payload->>'store_slug'), ''), 'sweet-crave');
  v_idempotency text := nullif(trim(p_payload->>'idempotency_key'), '');
  v_existing public.orders%rowtype;

  v_order_type text := coalesce(nullif(trim(p_payload->>'order_type'), ''), 'delivery');
  v_customer_name text := trim(coalesce(p_payload->>'customer_name', ''));
  v_customer_phone text := regexp_replace(coalesce(p_payload->>'customer_phone', ''), '[\s-]', '', 'g');
  v_customer_alt_phone text := nullif(trim(coalesce(p_payload->>'customer_alt_phone', '')), '');
  v_customer_email text := nullif(trim(coalesce(p_payload->>'customer_email', '')), '');
  v_address text := trim(coalesce(p_payload->>'delivery_address', ''));
  v_city text := nullif(trim(coalesce(p_payload->>'delivery_city', '')), '');
  v_area text := nullif(trim(coalesce(p_payload->>'delivery_area', '')), '');
  v_postal text := nullif(trim(coalesce(p_payload->>'delivery_postal_code', '')), '');
  v_delivery_date_str text := nullif(trim(coalesce(p_payload->>'delivery_date', '')), '');
  v_delivery_date date;
  v_time_window text := nullif(trim(coalesce(p_payload->>'delivery_time_window', '')), '');
  v_instructions text := nullif(trim(coalesce(p_payload->>'delivery_instructions', '')), '');
  v_inscription text := nullif(trim(coalesce(p_payload->>'cake_inscription', '')), '');
  v_payment_method text := coalesce(nullif(trim(p_payload->>'payment_method'), ''), 'cash_on_delivery');
  v_promo_code text := upper(nullif(trim(coalesce(p_payload->>'promo_code', '')), ''));

  v_items jsonb := p_payload->'items';
  v_item jsonb;
  v_db_cake public.cakes_menu%rowtype;
  v_qty integer;
  v_base_unit integer;
  v_item_addons integer;
  v_unit_price integer;
  v_selected_ids jsonb;
  v_opt_id text;
  v_opt_delta integer;
  v_opt_name text;
  v_verified_names jsonb;
  v_verified_items jsonb := '[]'::jsonb;

  v_subtotal integer := 0;
  v_addons_total integer := 0;
  v_discount integer := 0;
  v_discount_pct integer := 0;
  v_delivery_fee integer := 0;
  v_free_min integer := 1200;
  v_base_delivery integer := 60;
  v_total integer := 0;
  v_site_json jsonb;
  v_offer jsonb;
  v_accepting_orders boolean := true;

  v_order_code text;
  v_inserted public.orders%rowtype;
begin
  -- 1. Duplicate submission guard
  if v_idempotency is not null then
    select * into v_existing
    from public.orders
    where idempotency_key = v_idempotency
    limit 1;
    if found then
      return to_jsonb(v_existing);
    end if;
  end if;

  -- 2. Load store settings for order acceptance, delivery charge, and promo codes
  select content_json into v_site_json
  from public.site_content
  where store_slug = v_store_slug;

  if v_site_json is not null then
    v_accepting_orders := coalesce((v_site_json->>'acceptingOrders')::boolean, true);
    v_base_delivery := coalesce((v_site_json->>'deliveryFee')::integer, 60);
    v_free_min := coalesce((v_site_json->>'freeDeliveryMin')::integer, 1200);
  end if;

  if not v_accepting_orders then
    raise exception 'store_closed';
  end if;

  -- 3. Validate customer & delivery fields
  if length(v_customer_name) < 2 then
    raise exception 'invalid_customer_name';
  end if;

  if length(v_customer_phone) < 10 or length(v_customer_phone) > 16 then
    raise exception 'invalid_phone';
  end if;

  if v_order_type not in ('delivery', 'pickup') then
    raise exception 'invalid_order_type';
  end if;

  if v_order_type = 'delivery' and length(v_address) < 4 then
    raise exception 'invalid_address';
  end if;

  if v_delivery_date_str is not null then
    v_delivery_date := v_delivery_date_str::date;
    if v_delivery_date < current_date then
      raise exception 'invalid_delivery_date';
    end if;
  end if;

  if v_items is null or jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'empty_cart';
  end if;

  -- 4. Server-side product lookup & tamper-proof price calculation
  for v_item in select * from jsonb_array_elements(v_items)
  loop
    v_qty := coalesce((v_item->>'quantity')::integer, 0);
    if v_qty < 1 or v_qty > 50 then
      raise exception 'invalid_quantity';
    end if;

    select * into v_db_cake
    from public.cakes_menu
    where id = (v_item->>'cakeId')
      and store_slug = v_store_slug
      and is_visible = true
      and is_available = true;

    if not found then
      raise exception 'product_unavailable:%', coalesce(v_item->>'name', v_item->>'cakeId');
    end if;

    v_base_unit := v_db_cake.base_price;
    v_item_addons := 0;
    v_verified_names := '[]'::jsonb;
    v_selected_ids := coalesce(v_item->'selectedOptionIds', '[]'::jsonb);

    if jsonb_typeof(v_selected_ids) = 'array' then
      for v_opt_id in select jsonb_array_elements_text(v_selected_ids)
      loop
        v_opt_delta := null;
        v_opt_name := null;

        -- First look inside dynamic optionGroups
        select
          coalesce((ch->>'priceDelta')::integer, 0),
          ch->>'name'
        into v_opt_delta, v_opt_name
        from jsonb_array_elements(coalesce(v_db_cake.payload_json->'optionGroups', '[]'::jsonb)) as grp,
             jsonb_array_elements(coalesce(grp->'choices', '[]'::jsonb)) as ch
        where ch->>'id' = v_opt_id
        limit 1;

        -- Fallback to legacy customizerOptions array
        if v_opt_delta is null then
          select
            coalesce((opt->>'priceDelta')::integer, 0),
            opt->>'name'
          into v_opt_delta, v_opt_name
          from jsonb_array_elements(coalesce(v_db_cake.payload_json->'customizerOptions', '[]'::jsonb)) as opt
          where opt->>'id' = v_opt_id
          limit 1;
        end if;

        if v_opt_delta is not null then
          v_item_addons := v_item_addons + greatest(0, v_opt_delta);
          if v_opt_name is not null then
            v_verified_names := v_verified_names || to_jsonb(v_opt_name);
          end if;
        end if;
      end loop;
    end if;

    v_unit_price := v_base_unit + v_item_addons;
    v_subtotal := v_subtotal + (v_unit_price * v_qty);
    v_addons_total := v_addons_total + (v_item_addons * v_qty);

    v_verified_items := v_verified_items || jsonb_build_object(
      'cartItemId', coalesce(v_item->>'cartItemId', v_db_cake.id),
      'cakeId', v_db_cake.id,
      'name', v_db_cake.name,
      'image_url', v_db_cake.image_url,
      'basePrice', v_base_unit,
      'addonsUnitPrice', v_item_addons,
      'unitPrice', v_unit_price,
      'quantity', v_qty,
      'weight', coalesce(v_db_cake.payload_json->>'weight', ''),
      'selectedOptionIds', v_selected_ids,
      'selectedOptionNames', v_verified_names,
      'cakeMessage', coalesce(v_item->>'cakeMessage', ''),
      'specialInstructions', coalesce(v_item->>'specialInstructions', '')
    );
  end loop;

  -- 5. Server-side Promo Code validation
  if v_promo_code is not null and v_site_json is not null then
    for v_offer in select * from jsonb_array_elements(coalesce(v_site_json->'offers', '[]'::jsonb))
    loop
      if coalesce((v_offer->>'isActive')::boolean, false)
         and upper(coalesce(v_offer->>'promoCode', '')) = v_promo_code then
        v_discount_pct := greatest(0, least(90, coalesce((v_offer->>'discountPercent')::integer, 0)));
        exit;
      end if;
    end loop;

    if v_discount_pct = 0 and upper(coalesce(v_site_json->>'promoCode', '')) = v_promo_code then
      v_discount_pct := greatest(0, least(90, coalesce((v_site_json->>'promoDiscountPercent')::integer, 0)));
    end if;
  end if;

  if v_discount_pct > 0 then
    v_discount := round((v_subtotal::numeric * v_discount_pct::numeric) / 100.0)::integer;
  else
    v_promo_code := null;
  end if;

  -- 6. Delivery Fee calculation
  if v_order_type = 'pickup' then
    v_delivery_fee := 0;
  elsif (v_subtotal - v_discount) >= v_free_min then
    v_delivery_fee := 0;
  else
    v_delivery_fee := greatest(0, v_base_delivery);
  end if;

  v_total := greatest(0, v_subtotal - v_discount) + v_delivery_fee;

  -- 7. Generate unique order code & insert
  v_order_code := 'EC-' || to_char(now(), 'YYMMDD') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');

  insert into public.orders (
    order_code,
    store_slug,
    idempotency_key,
    status,
    order_type,
    customer_name,
    customer_phone,
    customer_alt_phone,
    customer_email,
    delivery_address,
    delivery_city,
    delivery_area,
    delivery_postal_code,
    delivery_date,
    delivery_time_window,
    delivery_instructions,
    cake_inscription,
    promo_code,
    subtotal,
    addons_total,
    discount,
    delivery_fee,
    total_amount,
    payment_method,
    payment_status,
    items_json,
    status_history
  )
  values (
    v_order_code,
    v_store_slug,
    v_idempotency,
    'pending',
    v_order_type,
    v_customer_name,
    v_customer_phone,
    v_customer_alt_phone,
    v_customer_email,
    coalesce(nullif(v_address, ''), 'Store Pickup'),
    v_city,
    v_area,
    v_postal,
    v_delivery_date,
    v_time_window,
    v_instructions,
    v_inscription,
    v_promo_code,
    v_subtotal,
    v_addons_total,
    v_discount,
    v_delivery_fee,
    v_total,
    v_payment_method,
    'unpaid',
    v_verified_items,
    jsonb_build_array(
      jsonb_build_object(
        'status', 'pending',
        'at', now(),
        'note', 'Order placed by customer'
      )
    )
  )
  returning * into v_inserted;

  return to_jsonb(v_inserted);
end;
$$;

grant execute on function public.create_validated_order(jsonb) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 9. SECURE ORDER-SPECIFIC TRACKING RPC (NO CUSTOMER LOGIN, ZERO DATA LEAK)
-- ----------------------------------------------------------------------------
create or replace function public.track_order_by_code(
  p_order_code text,
  p_customer_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_code text := upper(trim(coalesce(p_order_code, '')));
  v_clean_phone text := regexp_replace(coalesce(p_customer_phone, ''), '[\s-]', '', 'g');
  v_row public.orders%rowtype;
begin
  if length(v_clean_code) < 4 or length(v_clean_phone) < 8 then
    return null;
  end if;

  select * into v_row
  from public.orders
  where upper(order_code) = v_clean_code
    and regexp_replace(customer_phone, '[\s-]', '', 'g') = v_clean_phone
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'order_code', v_row.order_code,
    'status', v_row.status,
    'order_type', v_row.order_type,
    'delivery_date', v_row.delivery_date,
    'delivery_time_window', v_row.delivery_time_window,
    'total_amount', v_row.total_amount,
    'payment_status', v_row.payment_status,
    'status_history', v_row.status_history,
    'created_at', v_row.created_at
  );
end;
$$;

grant execute on function public.track_order_by_code(text, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 10. ADMIN ORDER STATUS UPDATE RPC (AUDITED WITH TIMESTAMPS)
-- ----------------------------------------------------------------------------
create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_status text,
  p_payment_status text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated public.orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'unauthorized';
  end if;

  update public.orders
  set
    status = coalesce(nullif(trim(p_status), ''), status),
    payment_status = coalesce(nullif(trim(p_payment_status), ''), payment_status),
    status_history = coalesce(status_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'status', coalesce(nullif(trim(p_status), ''), status),
        'payment_status', coalesce(nullif(trim(p_payment_status), ''), payment_status),
        'at', now(),
        'note', coalesce(nullif(trim(p_note), ''), 'Updated by Admin')
      )
    )
  where id = p_order_id
  returning * into v_updated;

  if not found then
    raise exception 'order_not_found';
  end if;

  return to_jsonb(v_updated);
end;
$$;

grant execute on function public.admin_update_order_status(uuid, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 11. SUPABASE STORAGE BUCKET & STRICT ADMIN-ONLY WRITE POLICIES
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Public view product images" on storage.objects;
create policy "Public view product images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Admin upload product images" on storage.objects;
create policy "Admin upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admin update product images" on storage.objects;
create policy "Admin update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admin delete product images" on storage.objects;
create policy "Admin delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ----------------------------------------------------------------------------
-- 12. REALTIME PUBLICATION (LIVE SYNC FOR STOREFRONT & ADMIN ORDERS)
-- ----------------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.cakes_menu; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.categories; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.site_content; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.store_metadata; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.orders; exception when duplicate_object then null; end;
end;
$$;

-- ============================================================================
-- ONE-TIME ADMIN USER LINKING STEP (RUN AFTER CREATING ADMIN IN SUPABASE AUTH)
-- 1. In Supabase Dashboard -> Authentication -> Users -> "Add user"
--    Create your admin email (e.g. admin@eshucakes.com) with your chosen password.
-- 2. Then run this 2-line query (replacing the email if different):
--
-- insert into public.admin_roles (user_id, email, role)
-- select id, email, 'super_admin' from auth.users where email = 'admin@eshucakes.com'
-- on conflict (user_id) do nothing;
-- ============================================================================
