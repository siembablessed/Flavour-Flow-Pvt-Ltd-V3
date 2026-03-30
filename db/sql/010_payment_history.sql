-- 010_payment_history.sql
-- Adds user_id to orders for authentication-gated history,
-- plus RLS policies so users can read only their own records.

begin;

-- =========================================================================
-- 1. Add user_id to orders (nullable — guest orders have no user)
-- =========================================================================

alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_orders_user_id on public.orders(user_id);

-- =========================================================================
-- 2. RLS — allow authenticated users to SELECT their own orders
-- =========================================================================

drop policy if exists "orders_read_own" on public.orders;
create policy "orders_read_own"
on public.orders
for select
to authenticated
using (user_id = auth.uid());

-- =========================================================================
-- 3. RLS — allow authenticated users to SELECT payments for their orders
-- =========================================================================

drop policy if exists "order_payments_read_via_order" on public.order_payments;
create policy "order_payments_read_via_order"
on public.order_payments
for select
to authenticated
using (
  order_id in (
    select id from public.orders where user_id = auth.uid()
  )
);

commit;
