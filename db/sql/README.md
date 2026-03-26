# Database SQL Pack

This folder contains re-runnable SQL files for the catalog and inventory system.

## Files

1. `001_schema.sql`
- Creates tables, indexes, views, triggers, and inventory movement function.

2. `002_seed_catalog.sql`
- Idempotent upsert seed for categories/products.
- Also ensures a default `MAIN` warehouse and starter `inventory_levels` rows.
- Generated from `src/data/products.ts`.

3. `003_inventory_queries.sql`
- Ready-to-use query patterns for receiving, reserving, releasing, dispatching, and reporting stock.

## Run Order

1. `001_schema.sql`
2. `002_seed_catalog.sql`
3. `003_inventory_queries.sql` (optional utility queries)

## Regenerate Catalog Seed

```bash
npm run db:seed:generate
```

Then rerun `002_seed_catalog.sql` in your database.

## Supabase Notes

- Use Supabase SQL Editor or `psql` to run these files.
- If using Supabase migrations, copy files into your migration folder with timestamps.
