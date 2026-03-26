-- 007_anonymous_cart.sql
-- Anonymous session cart with TTL-based expiry.

begin;

create table if not exists public.anonymous_cart_items (
  session_id text not null,
  product_id text not null references public.products(product_id) on delete cascade,
  quantity integer not null check (quantity > 0),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (session_id, product_id)
);

create index if not exists idx_anonymous_cart_items_expires_at on public.anonymous_cart_items(expires_at);

-- Optional read access for anon users is intentionally not granted.
-- This table is intended to be managed server-side via API with service role key.

commit;
