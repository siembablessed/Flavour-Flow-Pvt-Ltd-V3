-- 011_public_inventory_view.sql
-- Introduce a public-safe inventory view and policies.
--
-- Goal:
-- - Keep per-location on_hand / reserved / reorder levels admin-only.
-- - Allow the storefront to read an aggregated "available" quantity per product.

begin;

-- Public storefront inventory view (aggregated across active locations).
-- Does NOT expose reserved, reorder levels, or per-location breakdowns.
create or replace view public.v_inventory_public as
select
  p.product_id,
  p.name,
  sum(greatest((il.on_hand_cases - il.reserved_cases), 0)) as available_cases,
  max(il.updated_at) as updated_at
from public.products p
left join public.inventory_levels il on il.product_id = p.id
left join public.inventory_locations l on l.id = il.location_id and l.is_active = true
where p.is_active = true
group by p.product_id, p.name;

alter view public.v_inventory_public owner to postgres;

-- RLS remains on base tables; expose the view for public read.
grant select on public.v_inventory_public to anon, authenticated;

commit;

