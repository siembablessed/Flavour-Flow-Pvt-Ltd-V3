# Flavor Flow - Wholesale Spirits

Premium spirits wholesale platform for retail and hospitality buyers.

## Features

- Product catalog with wholesale pricing
- VAT-inclusive unit pricing
- Cart functionality
- Transport quote requests
- Paynow payment checkout (EcoCash, OneMoney, VISA)

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Shadcn UI
- Express (secure Paynow API)

## Paynow Security Model

- Paynow integration keys are used only on the backend (`server/index.ts`).
- Cart totals are recalculated on the server from product IDs and quantities.
- Callback validation verifies Paynow request hash before accepting status updates.
- Rate limiting, Helmet headers, strict CORS allowlist, and request validation are enabled.

## Environment Setup

1. Copy `.env.example` to `.env` and fill in Paynow credentials/URLs.
2. Use a publicly reachable `PAYNOW_RESULT_URL` so Paynow can call your callback endpoint.
3. Keep `PAYNOW_INTEGRATION_KEY` secret and never expose it in frontend code.

## Getting Started

```bash
npm install
npm run dev:all
```

- Frontend runs on `http://localhost:8080`
- Paynow API runs on `http://localhost:8787`

## Build

```bash
npm run build
```

## Server Only

```bash
npm run server:start
```

## Database (Catalog + Inventory)

SQL files are in [`db/sql`](./db/sql):

1. `001_schema.sql` - Creates catalog and inventory tables, views, triggers, and stock movement function.
2. `002_seed_catalog.sql` - Idempotent catalog seed generated from `src/data/products.ts`.
3. `003_inventory_queries.sql` - Reusable stock operation/reporting queries.

Generate a fresh catalog seed from static data:

```bash
npm run db:seed:generate
```
