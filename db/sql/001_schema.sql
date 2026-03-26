-- 001_schema.sql
-- Base schema for catalog + inventory management (PostgreSQL/Supabase)

begin;

create extension if not exists pgcrypto;

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  product_id text not null unique,
  category_id uuid not null references public.product_categories(id) on delete restrict,
  name text not null,
  pack text not null,
  code text not null unique,
  case_price numeric(12, 2) not null check (case_price >= 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  unit_price_vat numeric(12, 2) not null check (unit_price_vat >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_is_active on public.products(is_active);

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  location_code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_levels (
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.inventory_locations(id) on delete cascade,
  on_hand_cases numeric(14, 3) not null default 0 check (on_hand_cases >= 0),
  reserved_cases numeric(14, 3) not null default 0 check (reserved_cases >= 0),
  reorder_level_cases numeric(14, 3) not null default 0 check (reorder_level_cases >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, location_id),
  check (reserved_cases <= on_hand_cases)
);

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'inventory_movement_type'
      and n.nspname = 'public'
  ) then
    create type public.inventory_movement_type as enum (
      'stock_in',
      'stock_out',
      'reserve',
      'release',
      'adjustment_plus',
      'adjustment_minus'
    );
  end if;
end;
$$;

create table if not exists public.inventory_movements (
  id bigint generated always as identity primary key,
  movement_type public.inventory_movement_type not null,
  product_id uuid not null references public.products(id) on delete restrict,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  quantity_cases numeric(14, 3) not null check (quantity_cases > 0),
  reference_type text,
  reference_id text,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_movements_product_loc on public.inventory_movements(product_id, location_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_product_categories_updated_at on public.product_categories;
create trigger trg_product_categories_updated_at
before update on public.product_categories
for each row
execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists trg_inventory_locations_updated_at on public.inventory_locations;
create trigger trg_inventory_locations_updated_at
before update on public.inventory_locations
for each row
execute function public.set_updated_at();

create or replace function public.record_inventory_movement(
  p_movement_type public.inventory_movement_type,
  p_product_id uuid,
  p_location_id uuid,
  p_quantity_cases numeric,
  p_reference_type text default null,
  p_reference_id text default null,
  p_note text default null,
  p_created_by uuid default null
)
returns void
language plpgsql
as $$
declare
  v_on_hand numeric(14, 3);
  v_reserved numeric(14, 3);
  v_new_on_hand numeric(14, 3);
  v_new_reserved numeric(14, 3);
begin
  if p_quantity_cases is null or p_quantity_cases <= 0 then
    raise exception 'Quantity must be > 0';
  end if;

  insert into public.inventory_levels (product_id, location_id)
  values (p_product_id, p_location_id)
  on conflict (product_id, location_id) do nothing;

  select on_hand_cases, reserved_cases
    into v_on_hand, v_reserved
  from public.inventory_levels
  where product_id = p_product_id
    and location_id = p_location_id
  for update;

  v_new_on_hand := v_on_hand;
  v_new_reserved := v_reserved;

  if p_movement_type in ('stock_in', 'adjustment_plus') then
    v_new_on_hand := v_on_hand + p_quantity_cases;
  elsif p_movement_type in ('stock_out', 'adjustment_minus') then
    v_new_on_hand := v_on_hand - p_quantity_cases;
  elsif p_movement_type = 'reserve' then
    v_new_reserved := v_reserved + p_quantity_cases;
  elsif p_movement_type = 'release' then
    v_new_reserved := v_reserved - p_quantity_cases;
  end if;

  if v_new_on_hand < 0 then
    raise exception 'Insufficient on-hand inventory';
  end if;

  if v_new_reserved < 0 then
    raise exception 'Reserved inventory cannot be negative';
  end if;

  if v_new_reserved > v_new_on_hand then
    raise exception 'Reserved inventory cannot exceed on-hand inventory';
  end if;

  update public.inventory_levels
  set on_hand_cases = v_new_on_hand,
      reserved_cases = v_new_reserved,
      updated_at = now()
  where product_id = p_product_id
    and location_id = p_location_id;

  insert into public.inventory_movements (
    movement_type,
    product_id,
    location_id,
    quantity_cases,
    reference_type,
    reference_id,
    note,
    created_by
  )
  values (
    p_movement_type,
    p_product_id,
    p_location_id,
    p_quantity_cases,
    p_reference_type,
    p_reference_id,
    p_note,
    p_created_by
  );
end;
$$;

create or replace view public.v_catalog as
select
  p.product_id,
  c.name as category,
  p.name,
  p.pack,
  p.code,
  p.case_price,
  p.unit_price,
  p.unit_price_vat,
  p.is_active
from public.products p
join public.product_categories c on c.id = p.category_id;

create or replace view public.v_inventory_snapshot as
select
  p.product_id,
  p.name,
  l.location_code,
  l.name as location_name,
  il.on_hand_cases,
  il.reserved_cases,
  (il.on_hand_cases - il.reserved_cases) as available_cases,
  il.reorder_level_cases,
  il.updated_at
from public.inventory_levels il
join public.products p on p.id = il.product_id
join public.inventory_locations l on l.id = il.location_id;

commit;

