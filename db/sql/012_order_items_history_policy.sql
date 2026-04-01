-- 012_order_items_history_policy.sql
-- Allow authenticated users to read order_items for orders they own.
-- Complements 010_payment_history.sql.

begin;

-- Ensure RLS is enabled (it is in 009, but keep idempotent).
alter table public.order_items enable row level security;

drop policy if exists "order_items_read_via_order" on public.order_items;
create policy "order_items_read_via_order"
on public.order_items
for select
to authenticated
using (
  order_id in (
    select id from public.orders where user_id = auth.uid()
  )
);

commit;

