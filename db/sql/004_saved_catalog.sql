-- 004_saved_catalog.sql
-- Per-user saved catalogue items with row-level security.

begin;

create table if not exists public.saved_catalog_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(product_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_saved_catalog_items_user_id on public.saved_catalog_items(user_id);
create index if not exists idx_saved_catalog_items_product_id on public.saved_catalog_items(product_id);

alter table public.saved_catalog_items enable row level security;

-- Users can only access their own saved catalogue rows.
drop policy if exists "saved_catalog_select_own" on public.saved_catalog_items;
create policy "saved_catalog_select_own"
on public.saved_catalog_items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "saved_catalog_insert_own" on public.saved_catalog_items;
create policy "saved_catalog_insert_own"
on public.saved_catalog_items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "saved_catalog_delete_own" on public.saved_catalog_items;
create policy "saved_catalog_delete_own"
on public.saved_catalog_items
for delete
to authenticated
using (auth.uid() = user_id);

commit;
