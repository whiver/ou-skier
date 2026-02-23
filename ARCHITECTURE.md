# Architecture & Technical Reference

This document explains design decisions, code conventions, and implementation details that are not covered in the project `README.md`.

---

## Directory layout

```
ou-skier/
├── web/                   Next.js web application
│   ├── app/               App Router pages and API routes
│   │   ├── api/
│   │   │   ├── cron/ingest/route.ts   Vercel Cron Job handler
│   │   │   └── resorts/
│   │   │       ├── route.ts           GET /api/resorts
│   │   │       └── [id]/route.ts      GET /api/resorts/:id
│   │   ├── resorts/[id]/page.tsx      Resort detail page (Server Component)
│   │   └── page.tsx                   Homepage (Server Component)
│   ├── components/
│   │   └── ResortCard.tsx             Resort summary card
│   ├── lib/
│   │   ├── prisma.ts                  Singleton Prisma client
│   │   └── ingest/fetcher.ts          HTML scraper (used by cron route)
│   ├── prisma/
│   │   ├── schema.prisma              Prisma 7 schema (no `url` in datasource)
│   │   └── migrations/                SQL migration files
│   ├── types/index.ts                 TypeScript mirror of Prisma types
│   └── vercel.json                    Cron schedule configuration
│
└── worker/                Standalone ingestion process
    ├── src/
    │   ├── index.ts       Entry point (fetch → sync → disconnect)
    │   ├── fetcher.ts     HTML scraper (node-fetch + cheerio)
    │   ├── sync.ts        Database upsert logic
    │   ├── db.ts          Prisma client singleton
    │   └── types.ts       ResortSnowData interface
    └── prisma/
        ├── schema.prisma  Prisma 6 schema (has `url` in datasource)
        └── migrations/    Same SQL migration files as web/
```

---

## Dual Prisma setup

The `web/` and `worker/` packages each maintain their own Prisma installation. This is an intentional trade-off — it avoids a shared-package build step at the cost of keeping the schemas in sync manually.

| Aspect | `web/` | `worker/` |
|--------|--------|-----------|
| Prisma version | 7.x | 6.x |
| Connection method | `@prisma/adapter-pg` (driver adapter) | `datasourceUrl` option on `PrismaClient` |
| Datasource `url` in schema | ❌ removed (Prisma 7 requirement) | ✅ present (`env("DATABASE_URL")`) |
| Generated client output | `app/generated/prisma/` | `src/generated/prisma/` |

**Why different versions?** Prisma 7 was not yet stable across all adapters when the worker was scaffolded. Prisma 6 is used in the worker because it supports the simpler `datasourceUrl` constructor option, avoiding the need for a driver adapter in a short-lived Node.js process.

**Keeping schemas in sync:** Both `prisma/schema.prisma` files must be kept identical (except for the generator `output` path and whether the datasource has a `url` field). When adding or modifying models, update both files and regenerate both clients:

```bash
# Web
cd web && npx prisma generate

# Worker
cd worker && npx prisma generate
```

Migrations live in `web/prisma/migrations/` and are mirrored to `worker/prisma/migrations/`. Run migrations once against the shared database (from either package).

---

## Data flow

```
Nordic France website
        │
        │  HTTP GET (daily cron or manual run)
        ▼
   fetcher.ts / lib/ingest/fetcher.ts
   ┌──────────────────────────────────┐
   │ 1. Fetch HTML bulletin page      │
   │ 2. Parse date from heading       │
   │ 3. Iterate table rows            │
   │ 4. Parse each cell:              │
   │    - snow depth ("30/60 cm")     │
   │    - fresh snow ("5 cm")         │
   │    - open/total slopes ("12/18") │
   │ 5. Return []ResortSnowData       │
   └──────────────────────────────────┘
        │
        ▼
   sync.ts (worker) / api/cron/ingest/route.ts (web)
   ┌──────────────────────────────────┐
   │ For each record:                 │
   │   UPSERT Resort (key: name)      │
   │   UPSERT SnowRecord              │
   │     (key: resortId + recordDate) │
   └──────────────────────────────────┘
        │
        ▼
   PostgreSQL database
        │
        ▼
   Server Components (app/page.tsx, app/resorts/[id]/page.tsx)
   query Prisma directly — no client-side data fetching
```

---

## HTML scraping design

The scraper (`fetcher.ts`) targets the Nordic France bulletin page using CSS selectors. Because the site has no public API, the selectors are best-effort and **may break if the site is redesigned**.

### Bulletin date detection

The scraper looks for the first `<h2>`, `<h3>`, `.bulletin-date`, or `.date` element whose text contains a date-like pattern (`dd month yyyy`). If none is found, it falls back to the current date.

### Table row parsing

Column order assumed (0-indexed):

| Index | Content |
|-------|---------|
| 0 | Resort name (may contain `<a>` for domain URL) |
| 1 | Region |
| 2 | Snow depth, format `"base/top cm"` or `"depth cm"` |
| 3 | Fresh snow, format `"n cm"` |
| 4 | Open/total slopes, format `"open/total"` or `"open"` |
| 5 | Notes (optional free text) |

Rows with fewer than 3 cells, or whose first cell equals `"domaine"` or `"station"` (header rows), are skipped.

### Updating selectors

If the bulletin page changes structure, update the selectors in:
- `worker/src/fetcher.ts` (standalone worker)
- `web/lib/ingest/fetcher.ts` (Vercel cron route)

Both files share the same logic — changes must be applied to both.

---

## Idempotency

Every ingestion run is fully idempotent:

- **Resort** records are upserted by `name` (which is `@unique` in the schema). Metadata fields (region, domainUrl) are updated only if the scraped value is non-null, preserving any previously stored value.
- **SnowRecord** records are upserted by `(resortId, recordDate)`. The `recordDate` is always normalised to **midnight UTC** before the upsert, so running the worker multiple times on the same day does not create duplicate records.

---

## Cron job security

`GET /api/cron/ingest` checks the `Authorization` header against `Bearer <CRON_SECRET>`.

- If `CRON_SECRET` is **not set**, the endpoint is open (acceptable in development).
- If `CRON_SECRET` **is set**, requests without the correct header return `401 Unauthorized`.

Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when it invokes a cron endpoint, so no extra configuration is needed beyond setting the env var.

---

## Web app rendering model

All pages use **Next.js Server Components** and query the database directly through the Prisma singleton in `lib/prisma.ts`. There is no client-side data fetching or React state for the initial page load.

| Route | Rendering | DB calls |
|-------|-----------|----------|
| `/` | Dynamic Server Component | `resort.findMany` with latest `SnowRecord` |
| `/resorts/[id]` | Dynamic Server Component | `resort.findUnique` with last 10 `SnowRecord`s |
| `GET /api/resorts` | Route Handler | `resort.findMany` with latest `SnowRecord` |
| `GET /api/resorts/[id]` | Route Handler | `resort.findUnique` with last 10 `SnowRecord`s |
| `GET /api/cron/ingest` | Route Handler | upsert loop (write path) |

---

## Snow depth colour coding

`ResortCard` uses a `SnowDepthBadge` component to colour-code depth values:

| Depth | Colour |
|-------|--------|
| ≥ 50 cm | Blue (`bg-blue-100 text-blue-800`) |
| 20 – 49 cm | Sky (`bg-sky-100 text-sky-700`) |
| < 20 cm | Yellow (`bg-yellow-100 text-yellow-700`) |
| `null` | Grey dash `—` |

---

## TypeScript type conventions

`web/types/index.ts` defines plain TypeScript interfaces (`Resort`, `SnowRecord`) that mirror the Prisma-generated types but use `string` for `DateTime` fields (since JSON serialisation converts dates to strings). These interfaces are used in React components and API responses — the Prisma types themselves are only used in server-side data-fetching code.

---

## Generated files

The following directories are **auto-generated** and excluded from version control:

| Path | Generated by |
|------|-------------|
| `web/app/generated/prisma/` | `npx prisma generate` in `web/` |
| `worker/src/generated/prisma/` | `npx prisma generate` in `worker/` |
| `web/.next/` | `npm run build` |
| `worker/dist/` | `npm run build` (tsc) |

Always regenerate the Prisma client after modifying either `schema.prisma`.

---

## Known limitations & future improvements

- **Duplicated schema & fetcher logic.** Both packages define the same Prisma schema and HTML scraper independently. A future improvement would be to extract a shared `packages/` workspace (e.g. `packages/db` for the schema, `packages/scraper` for the fetcher).
- **Best-effort HTML scraping.** The scraper will silently return zero records if the Nordic France bulletin page is redesigned. Consider adding alerting if a cron run returns 0 records.
- **No historical archiving.** Only the last 10 `SnowRecord` entries per resort are returned by the API. Older records remain in the database but are not surfaced in the UI.
- **Latitude/longitude fields** are present in the schema but not yet populated. A future map view could use them.
