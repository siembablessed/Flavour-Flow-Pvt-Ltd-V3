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
- Express (local Paynow API)
- Vercel Serverless Functions (`/api/*`) for production

## Paynow Security Model

- Paynow integration keys are used only on the backend (`server/index.ts`).
- Cart totals are recalculated on the server from product IDs and quantities using database prices (`products.case_price`).
- Callback validation verifies Paynow request hash before accepting status updates.
- Rate limiting, Helmet headers, strict CORS allowlist, and request validation are enabled.

## Environment Setup

1. Copy `.env.example` to `.env` and fill in Paynow credentials/URLs.
2. Use a publicly reachable `PAYNOW_RESULT_URL` so Paynow can call your callback endpoint.
3. Set a strong `PAYNOW_COOKIE_SECRET` (at least 16 chars) for signed payment state cookies.
4. Keep `PAYNOW_INTEGRATION_KEY` secret and never expose it in frontend code.

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

## Vercel Production Routing

- API endpoints are implemented under `api/`:
  - `GET /api/health`
  - `POST /api/payments/paynow/initiate`
  - `POST /api/payments/paynow/callback`
  - `GET /api/payments/paynow/status/:reference`
- SPA route fallback (`/payment/complete`) is configured in `vercel.json`.

Required Vercel environment variables:

- `PAYNOW_INTEGRATION_ID`
- `PAYNOW_INTEGRATION_KEY`
- `PAYNOW_RESULT_URL` (example: `https://www.flavourflows.com/api/payments/paynow/callback`)
- `PAYNOW_RETURN_URL` (example: `https://www.flavourflows.com/payment/complete`)
- `PAYNOW_COOKIE_SECRET`
- `FRONTEND_URL` (example: `https://www.flavourflows.com`)
- `PAYNOW_ALLOWED_ORIGINS` (comma-separated allowed origins)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never expose in frontend)

## Database (Catalog + Inventory)

SQL files are in [`db/sql`](./db/sql):

1. `001_schema.sql` - Creates catalog and inventory tables, views, triggers, and stock movement function.
2. `002_seed_catalog.sql` - Idempotent catalog seed generated from `src/data/products.ts`.
3. `003_inventory_queries.sql` - Reusable stock operation/reporting queries.

Generate a fresh catalog seed from static data:

```bash
npm run db:seed:generate
```

v2.9