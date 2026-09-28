# Jacxi Shipping Platform

Vehicle shipping operations platform for importing vehicles from the USA/Canada to
Afghanistan (Mersin and UAE routes): auction sourcing (Copart/IAAI), containerization,
shipment lifecycle, transit/dispatch legs, invoicing, customer/company ledgers,
tracking, partner portals, and a companion mobile app.

## Stack

| Layer | Tech |
|---|---|
| Web | Next.js 16 (App Router), React 19, TypeScript (strict), MUI 7 + Tailwind 4, in-repo design system (`src/components/design-system`, design tokens in `src/lib/design-tokens`) |
| Backend | Next.js route handlers under `src/app/api` (141 routes); business logic in `src/lib` |
| Server | Custom Node server (`server.ts`): CORS for the Expo app + WebSocket bridge for the voice agent (`/api/voice/live`) |
| Data | Prisma 6 + PostgreSQL (Prisma Accelerate pool at runtime, direct URL for migrations). Schema: `prisma/schema.prisma`; migrations in `prisma/migrations` |
| Auth | NextAuth v5 beta — email/password, Google, low-literacy login codes; mobile JWT flow (`src/lib/mobile-auth.ts`) |
| Mobile | Expo SDK 54 / React Native app in `mobile/` (admin + customer roles) |
| Infra | Vercel (crons in `vercel.json`, Blob storage) + Dockerfile / docker-compose |

## Repository layout

- `src/app/` — pages + API routes (`src/app/api`)
- `src/components/` — React components (dashboard, shipments, containers, transits, finance, ui, …)
- `src/lib/` — domain logic: workflows, ledger/company-ledger, billing/shipment-charges, financial (Plaid/Finicity/bank CSV), ai, voice, copart/iaai clients, pdf generation, validations
- `mobile/` — Expo React Native app (own package.json)
- `prisma/` — schema + migrations (80+ migrations, Nov 2025 → Aug 2026)
- `docs/` — curated project documentation (flow diagrams, business logic index, invoice/accounting design, API specs)
- `docs/archive/` — historical session/summary notes from earlier development (keep for reference, not for onboarding)

## Core domain notes

- **Container** = the unit being shipped (vehicle); holds expenses, damages, invoices, documents, tracking events, audit logs.
- **Shipment lifecycle**: `ON_HAND → DISPATCHING → IN_TRANSIT → RELEASED → IN_TRANSIT_TO_DESTINATION → DELIVERED`; sub-workflows for transit and dispatch (events, expenses, delivery confirmation).
- **Billing**: approved *shipment charges* are the source of truth. Generate issues a customer invoice (per container/shipment) and marks charges `INVOICED`. Charges on DRAFT/PENDING invoices can still be disputed/approved (they are released from the draft). Issued invoices must be **reversed** (cancel → releases charges) before rows can change. Only DRAFT/PENDING invoices can be **deleted**.
- **Ledgers**: customer (`LedgerEntry`), company (`CompanyLedgerEntry`), partner portal; balances are recalculated transactionally after mutations.
- **Release token**: a shipment must be released (shipment or container status `RELEASED`) and carry a release token before it can be assigned to a transit.

## Getting started

```bash
npm install                     # runs prisma generate + type fixer via postinstall
cp .env.example .env.local      # then fill in values
npm run db:setup                # generate client + db push + seed (dev)
npm run dev                     # custom server on :3000 (voice WS + mobile CORS)
```

Production: `npm run build && npm run start` (or the Dockerfile / Vercel).

## Environment variables

See `.env.example` for the full list. Critical ones:

- DB (runtime, via Prisma Accelerate): `jacxi_PRISMA_DATABASE_URL`
- DB (migrations/CLI): `jacxi_POSTGRES_URL` / `jacxi_DATABASE_URL` / `DATABASE_URL` (legacy aliases — keep in sync)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`
- `BLOB_READ_WRITE_TOKEN` (shipment photo uploads)
- `RESEND_API_KEY` (invoice/notification emails)
- Copart/IAAI scraping: `OXYLABS_*`, `LOT_FETCH_PROXY_*`, `IAAI_API_*` (optional)
- `VOICE_WEBHOOK_TOKEN` (call agent); Twilio + Gemini settings are managed in Dashboard → Settings → Call Agent

## Useful scripts

```bash
npm run dev              # dev server (custom)
npm run build            # prisma generate --no-engine && next build --webpack
npm run lint             # eslint
npm test                 # unit tests (tsx --test over src/**/*.test.ts)
npm run test:e2e         # Playwright specs
npm run db:migrate:deploy
npm run db:studio
npm run db:backup
# mobile (from mobile/ or via npm run mobile:*)
```

## Verification notes

- `npx tsc --noEmit` reports a small set of pre-existing errors from a stale
  `.next/types` artifact (deleted routes) plus one in
  `src/components/ui/SmoothScrolling.tsx` — clean `rm -rf .next` and rebuild to refresh.
