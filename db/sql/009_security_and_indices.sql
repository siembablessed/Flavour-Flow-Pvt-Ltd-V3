-- 009_security_and_indices.sql
-- Applies missing Row Level Security (RLS) policies and performance indices.

begin;

-- =========================================================================
-- 1. Core Catalog and Inventory Tables
-- =========================================================================

-- Enable RLS to prevent unauthorized inserts/updates/deletes from frontend.
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_levels enable row level security;
alter table public.inventory_movements enable row level security;

-- Create read-only policies to allow the frontend to fetch products/categories/inventory.
-- Backend inserts/updates will still succeed because they use the Service Role key.

drop policy if exists "product_categories_read_all" on public.product_categories;
create policy "product_categories_read_all"
on public.product_categories
for select
to public
using (true);

drop policy if exists "products_read_all" on public.products;
create policy "products_read_all"
on public.products
for select
to public
using (true);

drop policy if exists "inventory_locations_read_all" on public.inventory_locations;
create policy "inventory_locations_read_all"
on public.inventory_locations
for select
to public
using (true);

-- IMPORTANT:
-- Do NOT grant public read access to inventory_levels by default because it exposes
-- per-location on_hand, reserved, and reorder levels.
-- Use `v_inventory_public` (011_public_inventory_view.sql) for storefront reads instead.
drop policy if exists "inventory_levels_read_all" on public.inventory_levels;

-- Inventory movements are usually internal, don't expose them publicly by default.
-- (No SELECT policy created for inventory_movements).

-- =========================================================================
-- 2. Checkout, Orders & Payments
-- =========================================================================

-- Enable RLS and create NO policies. 
-- This completely blocks anon/authenticated Supabase clients from querying or modifying orders.
-- The secure backend API (using Service Role key) bypasses RLS to manage these safely.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_payments enable row level security;

-- =========================================================================
-- 3. Anonymous Cart Security
-- =========================================================================

-- Enable RLS and create NO policies.
-- Fully blocks direct client access. The backend APIs will manage this.
alter table public.anonymous_cart_items enable row level security;

-- =========================================================================
-- 4. Performance Indices
-- =========================================================================

create index if not exists idx_orders_customer_email on public.orders(customer_email);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

commit;
