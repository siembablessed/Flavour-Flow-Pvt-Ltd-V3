-- 002_seed_catalog.sql
-- Generated from src/data/products.ts (re-runnable, idempotent)

begin;

insert into public.product_categories (name, slug)
values
  ('Brandy', 'brandy'),
  ('Cane Spirit', 'cane-spirit'),
  ('Cider', 'cider'),
  ('Gin', 'gin'),
  ('Rum', 'rum'),
  ('Spirit Cooler', 'spirit-cooler'),
  ('Test', 'test'),
  ('Vodka', 'vodka'),
  ('Whisky', 'whisky'),
  ('Wine', 'wine')
on conflict (slug) do update
set name = excluded.name,
    updated_at = now();

with incoming(product_id, category_name, name, pack, code, case_price, unit_price, unit_price_vat) as (
values
  ('t1', 'Test', 'Test Product ($1)', '1 x 1', 'T001', 1.00, 1.00, 1.00),
  ('t2', 'Test', 'Test Product ($2)', '1 x 1', 'T002', 2.00, 2.00, 2.00),
  ('t3', 'Test', 'Test Product ($30)', '1 x 1', 'T030', 30.00, 30.00, 30.00),
  ('w1', 'Whisky', 'Whisky', '12 x 750ml', '9680', 37.44, 3.12, 3.60),
  ('w2', 'Whisky', 'Whisky', '24 x 200ml', '9519', 25.20, 1.05, 1.21),
  ('w3', 'Whisky', 'Whisky', '12 x 750ml PET', '9690', 28.68, 2.39, 2.76),
  ('w4', 'Whisky', 'Whisky', '24 x 200ml PET', '9529', 16.80, 0.70, 0.81),
  ('w5', 'Whisky', 'Gold Blend Black', '12 x 750ml', '9622', 58.18, 4.85, 5.60),
  ('w6', 'Whisky', 'Gold Blend Black', '24 x 200ml PET', '9629', 29.76, 1.24, 1.43),
  ('w7', 'Whisky', 'Gold Blend No. 9', '12 x 750ml', '9675', 33.24, 2.77, 3.20),
  ('w8', 'Whisky', 'Gold Blend No. 9', '24 x 200ml PET', '9789', 12.48, 0.52, 0.60),
  ('b1', 'Brandy', 'Viceroy 5', '12 x 750ml', '9660', 74.82, 6.24, 7.20),
  ('b2', 'Brandy', 'Viceroy 5', '24 x 375ml', '9596', 72.00, 3.00, 3.47),
  ('b3', 'Brandy', 'Viceroy 5', '24 x 200ml', '9509', 40.73, 1.70, 1.96),
  ('b4', 'Brandy', 'Old Chateau', '12 x 750ml', '9542', 49.86, 4.16, 4.80),
  ('b5', 'Brandy', 'Old Chateau', '24 x 200ml', '9719', 38.64, 1.61, 1.86),
  ('b6', 'Brandy', 'Old Chateau', '24 x 200ml PET', '9599', 23.71, 0.99, 1.14),
  ('b7', 'Brandy', 'Heritage Brandy', '12 x 750ml PET', '9642', 32.22, 2.69, 3.10),
  ('b8', 'Brandy', 'Heritage Brandy', '24 x 200ml', '9579', 22.80, 0.95, 1.10),
  ('b9', 'Brandy', 'Heritage Brandy', '24 x 200ml PET', '9589', 16.70, 0.70, 0.80),
  ('b10', 'Brandy', 'Star Brandy', '24 x 200ml PET', '9779', 14.88, 0.62, 0.72),
  ('r1', 'Rum', 'Admirals Rum', '12 x 750ml', '9562', 75.24, 6.27, 7.24),
  ('v1', 'Vodka', 'Smirnoff 1818', '12 x 750ml', '9580', 66.48, 5.54, 6.40),
  ('v2', 'Vodka', 'Nikolai', '12 x 750ml', '9612', 41.15, 3.43, 3.96),
  ('v3', 'Vodka', 'Nikolai', '24 x 200ml', '9619', 25.20, 1.05, 1.21),
  ('v4', 'Vodka', 'Nikolai', '12 x 750ml PET', '9652', 33.24, 2.77, 3.20),
  ('v5', 'Vodka', 'Nikolai', '24 x 200ml PET', '9639', 19.94, 0.83, 0.96),
  ('v6', 'Vodka', 'Nikolai Vanilla & Coffee Bean', '12 x 750ml', '9662', 40.32, 3.36, 3.88),
  ('v7', 'Vodka', 'Nikolai Caramel & Toffee', '12 x 750ml', '9672', 40.32, 3.36, 3.88),
  ('v8', 'Vodka', 'Count Pushkin', '12 x 750ml', '9720', 49.87, 4.16, 4.80),
  ('g1', 'Gin', 'Gilberts Gin', '12 x 750ml', '9700', 48.62, 4.05, 4.68),
  ('g2', 'Gin', 'Gilberts Gin', '24 x 200ml', '9539', 25.20, 1.05, 1.21),
  ('g3', 'Gin', 'Gilberts Gin', '24 x 200ml PET', '9549', 24.24, 1.01, 1.17),
  ('g4', 'Gin', 'Whitestone Gin', '6 x 750ml', '9665', 24.54, 4.09, 4.72),
  ('g5', 'Gin', 'Whitestone Strawberry', '6 x 750ml', '9695', 24.54, 4.09, 4.72),
  ('g6', 'Gin', 'Whitestone Pineapple', '6 x 750ml', '9697', 24.54, 4.09, 4.72),
  ('g7', 'Gin', 'Whitestone Blackcurrant', '6 x 750ml', '9698', 24.54, 4.09, 4.72),
  ('cs1', 'Cane Spirit', 'Mainstay', '12 x 750ml', '9592', 49.87, 4.16, 4.80),
  ('cs2', 'Cane Spirit', 'Skipper''s', '12 x 750ml PET', '9632', 24.94, 2.08, 2.40),
  ('cs3', 'Cane Spirit', 'Skipper''s', '24 x 200ml', '9609', 22.80, 0.95, 1.10),
  ('cs4', 'Cane Spirit', 'Skipper''s', '24 x 200ml PET', '9679', 16.68, 0.70, 0.80),
  ('cs5', 'Cane Spirit', 'Star Cane', '24 x 200ml PET', '9649', 14.14, 0.59, 0.68),
  ('sc1', 'Spirit Cooler', 'Sting Lemon', '24 x 275ml', '9557', 16.08, 0.67, 0.77),
  ('sc2', 'Spirit Cooler', 'Sting Tropical', '24 x 275ml', '9577', 16.08, 0.67, 0.77),
  ('sc3', 'Spirit Cooler', 'Sting Strawberry', '24 x 275ml', '9587', 16.08, 0.67, 0.77),
  ('sc4', 'Spirit Cooler', 'Night Sky Ginger Ale', '24 x 440ml', '9793', 20.88, 0.87, 1.00),
  ('sc5', 'Spirit Cooler', 'Night Sky Black Cherry', '24 x 440ml', '9794', 20.88, 0.87, 1.00),
  ('sc6', 'Spirit Cooler', 'Night Sky Lemon Lime', '24 x 440ml', '9795', 20.88, 0.87, 1.00),
  ('ci1', 'Cider', 'Hunters Dry', '24 x 330ml', '9536', 21.60, 0.90, 1.04),
  ('ci2', 'Cider', 'Hunters Gold', '24 x 330ml', '9546', 21.60, 0.90, 1.04),
  ('ci3', 'Cider', 'Savanna Dry', '24 x 330ml', '9556', 28.32, 1.18, 1.36),
  ('ci4', 'Cider', 'Hunters Dry', '12 x 660ml', '9688', 33.24, 1.39, 1.60),
  ('ci5', 'Cider', 'Hunters Gold', '12 x 660ml', '9676', 33.24, 1.39, 1.60),
  ('wi1', 'Wine', 'Montello Jerepigo', '12 x 750ml', '9702', 37.40, 3.12, 3.60),
  ('wi2', 'Wine', 'Montello Jerepigo', '12 x 750ml PET', '9692', 37.40, 3.12, 3.60),
  ('wi3', 'Wine', 'Montello Jerepigo', '24 x 200ml PET', '9669', 16.62, 0.69, 0.80),
  ('wi4', 'Wine', 'Green Valley Medium White', '12 x 750ml', '9740', 36.16, 3.01, 3.48),
  ('wi5', 'Wine', 'Green Valley Rose', '12 x 750ml', '9750', 36.16, 3.01, 3.48),
  ('wi6', 'Wine', '4th Street Rose', '6 x 750ml', '9512', 20.78, 3.46, 4.00),
  ('wi7', 'Wine', '4th Street White', '6 x 750ml', '9522', 20.78, 3.46, 4.00),
  ('wi8', 'Wine', '4th Street Red', '6 x 750ml', '9532', 20.78, 3.46, 4.00)
)
insert into public.products (
  product_id,
  category_id,
  name,
  pack,
  code,
  case_price,
  unit_price,
  unit_price_vat,
  is_active
)
select
  i.product_id,
  c.id,
  i.name,
  i.pack,
  i.code,
  i.case_price,
  i.unit_price,
  i.unit_price_vat,
  true
from incoming i
join public.product_categories c
  on c.slug = regexp_replace(lower(i.category_name), '[^a-z0-9]+', '-', 'g')
on conflict (product_id) do update
set category_id = excluded.category_id,
    name = excluded.name,
    pack = excluded.pack,
    code = excluded.code,
    case_price = excluded.case_price,
    unit_price = excluded.unit_price,
    unit_price_vat = excluded.unit_price_vat,
    is_active = true,
    updated_at = now();

insert into public.inventory_locations (location_code, name)
values
  ('MAIN', 'Main Warehouse')
on conflict (location_code) do update
set name = excluded.name,
    is_active = true,
    updated_at = now();

insert into public.inventory_levels (product_id, location_id, on_hand_cases, reserved_cases, reorder_level_cases)
select
  p.id,
  l.id,
  coalesce(il.on_hand_cases, 0),
  coalesce(il.reserved_cases, 0),
  coalesce(il.reorder_level_cases, 0)
from public.products p
cross join public.inventory_locations l
left join public.inventory_levels il
  on il.product_id = p.id
 and il.location_id = l.id
where l.location_code = 'MAIN'
on conflict (product_id, location_id) do nothing;

commit;
