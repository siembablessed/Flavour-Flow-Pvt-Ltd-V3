-- 003_inventory_queries.sql
-- Reusable operational queries for inventory management.

-- 1) Receive stock into a location (stock_in)
-- Replace placeholders before running.
-- select public.record_inventory_movement(
--   'stock_in',
--   (select id from public.products where product_id = 'w1'),
--   (select id from public.inventory_locations where location_code = 'MAIN'),
--   25,
--   'goods_received_note',
--   'GRN-1001',
--   'Initial stock received',
--   null
-- );

-- 2) Reserve stock for an order
-- select public.record_inventory_movement(
--   'reserve',
--   (select id from public.products where product_id = 'w1'),
--   (select id from public.inventory_locations where location_code = 'MAIN'),
--   3,
--   'sales_order',
--   'SO-22001',
--   'Reserve for customer order',
--   null
-- );

-- 3) Release reserved stock (order cancelled)
-- select public.record_inventory_movement(
--   'release',
--   (select id from public.products where product_id = 'w1'),
--   (select id from public.inventory_locations where location_code = 'MAIN'),
--   1,
--   'sales_order',
--   'SO-22001',
--   'Partial cancellation',
--   null
-- );

-- 4) Consume stock after dispatch (stock_out)
-- select public.record_inventory_movement(
--   'stock_out',
--   (select id from public.products where product_id = 'w1'),
--   (select id from public.inventory_locations where location_code = 'MAIN'),
--   2,
--   'delivery_note',
--   'DN-9918',
--   'Order dispatched',
--   null
-- );

-- 5) Inventory adjustment (cycle count)
-- select public.record_inventory_movement(
--   'adjustment_minus',
--   (select id from public.products where product_id = 'w1'),
--   (select id from public.inventory_locations where location_code = 'MAIN'),
--   0.5,
--   'cycle_count',
--   'CC-APR-01',
--   'Breakage adjustment',
--   null
-- );

-- 6) Check current catalog
select *
from public.v_catalog
order by category, name;

-- 7) Check inventory state
select *
from public.v_inventory_snapshot
order by location_code, product_id;

-- 8) Low stock report
select
  p.product_id,
  p.name,
  l.location_code,
  il.on_hand_cases,
  il.reserved_cases,
  il.reorder_level_cases,
  (il.on_hand_cases - il.reserved_cases) as available_cases
from public.inventory_levels il
join public.products p on p.id = il.product_id
join public.inventory_locations l on l.id = il.location_id
where (il.on_hand_cases - il.reserved_cases) <= il.reorder_level_cases
order by l.location_code, p.name;
