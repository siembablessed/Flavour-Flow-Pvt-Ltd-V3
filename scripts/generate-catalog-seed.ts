import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { products } from "../src/data/products";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

const categories = Array.from(new Set(products.map((product) => product.category))).sort();

const categoryValues = categories
  .map((category) => `  ('${escapeSql(category)}', '${escapeSql(slugify(category))}')`)
  .join(",\n");

const productValues = products
  .map((product) => {
    return `  ('${escapeSql(product.id)}', '${escapeSql(product.category)}', '${escapeSql(product.name)}', '${escapeSql(product.pack)}', '${escapeSql(product.code)}', ${product.casePrice.toFixed(2)}, ${product.unitPrice.toFixed(2)}, ${product.unitPriceVat.toFixed(2)})`;
  })
  .join(",\n");

const sql = `-- 002_seed_catalog.sql
-- Generated from src/data/products.ts (re-runnable, idempotent)

begin;

insert into public.product_categories (name, slug)
values
${categoryValues}
on conflict (slug) do update
set name = excluded.name,
    updated_at = now();

with incoming(product_id, category_name, name, pack, code, case_price, unit_price, unit_price_vat) as (
values
${productValues}
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
`;

const outputPath = path.resolve(__dirname, "../db/sql/002_seed_catalog.sql");
writeFileSync(outputPath, sql, "utf8");

console.log(`Generated ${outputPath}`);
