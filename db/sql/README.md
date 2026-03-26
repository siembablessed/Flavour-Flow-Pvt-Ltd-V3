# Database SQL Pack

This folder contains re-runnable SQL files for catalog, inventory, saved items, checkout order tracking, and carts.

## Files

1. `001_schema.sql`
- Creates catalog and inventory tables, indexes, views, triggers, and stock movement function.

2. `002_seed_catalog.sql`
- Idempotent upsert seed for categories/products.
- Ensures a default `MAIN` warehouse and starter `inventory_levels` rows.
- Generated from `src/data/products.ts`.

3. `003_inventory_queries.sql`
- Ready-to-use query patterns for receiving, reserving, releasing, dispatching, and reporting stock.

4. `004_saved_catalog.sql`
- Creates `saved_catalog_items` with row-level security for authenticated users.

5. `005_orders_checkout.sql`
- Creates `orders`, `order_items`, and `order_payments` for server-side checkout/payment lifecycle tracking.

6. `006_user_cart.sql`
- Creates persistent `cart_items` for authenticated users with row-level security.

7. `007_anonymous_cart.sql`
- Creates `anonymous_cart_items` for non-authenticated sessions with TTL expiry.

8. `008_anonymous_cart_cron.sql`
- Schedules periodic cleanup of expired anonymous carts via `pg_cron`.

## Run Order

1. `001_schema.sql`
2. `002_seed_catalog.sql`
3. `004_saved_catalog.sql`
4. `005_orders_checkout.sql`
5. `006_user_cart.sql`
6. `007_anonymous_cart.sql`
7. `008_anonymous_cart_cron.sql`
8. `003_inventory_queries.sql` (optional utility queries)

## Regenerate Catalog Seed

```bash
npm run db:seed:generate
```

Then rerun `002_seed_catalog.sql` in your database.

## Supabase Notes

- Use Supabase SQL Editor or `psql` to run these files.
- If using Supabase migrations, copy files into your migration folder with timestamps.
