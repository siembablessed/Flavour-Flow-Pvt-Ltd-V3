-- 005_orders_checkout.sql
-- Core e-commerce checkout tables for order + payment tracking.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'order_status'
      and n.nspname = 'public'
  ) then
    create type public.order_status as enum (
      'pending_payment',
      'paid',
      'payment_failed',
      'cancelled'
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'payment_status'
      and n.nspname = 'public'
  ) then
    create type public.payment_status as enum (
      'initiated',
      'sent',
      'paid',
      'failed',
      'cancelled',
      'unknown'
    );
  end if;
end;
$$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_email text,
  currency text not null default 'USD',
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  total numeric(12, 2) not null check (total >= 0),
  status public.order_status not null default 'pending_payment',
  payment_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(product_id) on delete restrict,
  product_name text not null,
  pack text not null,
  unit_case_price numeric(12, 2) not null check (unit_case_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

create table if not exists public.order_payments (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  payment_method text,
  reference text not null unique,
  poll_url text,
  amount numeric(12, 2) not null check (amount >= 0),
  status public.payment_status not null default 'initiated',
  provider_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_order_payments_order_id on public.order_payments(order_id);
create index if not exists idx_order_payments_status on public.order_payments(status);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists trg_order_payments_updated_at on public.order_payments;
create trigger trg_order_payments_updated_at
before update on public.order_payments
for each row
execute function public.set_updated_at();

commit;
