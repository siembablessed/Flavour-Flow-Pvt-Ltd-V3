-- 006_user_cart.sql
-- Persistent server-side cart for authenticated users.

begin;

create table if not exists public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(product_id) on delete cascade,
  quantity integer not null check (quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists idx_cart_items_user_id on public.cart_items(user_id);

alter table public.cart_items enable row level security;

drop policy if exists "cart_select_own" on public.cart_items;
create policy "cart_select_own"
on public.cart_items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "cart_insert_own" on public.cart_items;
create policy "cart_insert_own"
on public.cart_items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "cart_update_own" on public.cart_items;
create policy "cart_update_own"
on public.cart_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "cart_delete_own" on public.cart_items;
create policy "cart_delete_own"
on public.cart_items
for delete
to authenticated
using (auth.uid() = user_id);

commit;
