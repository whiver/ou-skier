# Architecture & Technical Reference

This document explains design decisions, code conventions, and implementation details that are not covered in the project `README.md`.

---

## Directory layout

```
ou-skier/
├── prisma/                Shared Prisma source of truth
│   ├── schema.prisma      Shared schema for web + worker
│   └── migrations/        Shared SQL migrations
│
├── web/                   Next.js web application
│   ├── app/               App Router pages and API routes
│   │   ├── api/
│   │   │   └── resorts/
│   │   │       ├── route.ts           GET /api/resorts
│   │   │       └── [id]/route.ts      GET /api/resorts/:id
│   │   ├── resorts/[id]/page.tsx      Resort detail page (Server Component)
│   │   └── page.tsx                   Homepage (Server Component)
│   ├── components/
│   │   └── ResortCard.tsx             Resort summary card
│   ├── lib/
│   │   ├── prisma.ts                  Singleton Prisma client
│   │   └── ingest/                    Data ingestion helpers (worker-only source of truth)
│   ├── types/index.ts                 TypeScript mirror of Prisma types
│   └── prisma.config.ts               Prisma config (uses shared `prisma/` symlink)
│
└── worker/                Standalone ingestion process
    ├── src/
    │   ├── index.ts       Entry point (fetch → sync → disconnect)
     │   ├── fetcher.ts     Nordic France AJAX fetcher
    │   ├── sync.ts        Database upsert logic
    │   ├── db.ts          Prisma client singleton
    │   └── types.ts       ResortSnowData interface
     └── prisma.config.ts   Prisma config (uses shared `prisma/` symlink)
```

---

## Shared Prisma setup

There is a single Prisma schema and migration history under `prisma/` at the repository root.

- `web/prisma` is a symlink to `../prisma`.
- `worker/prisma` is a symlink to `../prisma`.
- Both `prisma.config.ts` files still use `prisma/schema.prisma` and `prisma/migrations`, but now read from the shared root source.

This removes schema/migration duplication and ensures both apps always use the same database definition.

---

## Data flow

```
Nordic France website
        │
     │  scheduled worker run
        ▼
   worker/src/fetcher.ts
   ┌──────────────────────────────────┐
     │ 1. Fetch bulletin page metadata  │
     │    (inline `Weather.posts`)      │
     │ 2. Fetch paginated AJAX weather  │
     │    cards (`load_more_weather`)   │
     │ 3. Parse each card:              │
     │    - open/total slopes           │
     │    - snow and fresh-snow fields  │
     │    - update date (dd/mm)         │
     │ 4. Enrich cards with massif from │
     │    `Weather.posts` by permalink  │
     │ 5. Map massif to Region enum     │
     │ 6. Return []ResortSnowData       │
   └──────────────────────────────────┘
        │
        ▼
     worker/src/sync.ts
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

## Bulletin scraping design

The scraper (`worker/src/fetcher.ts`) uses two Nordic France sources:

1. `GET /le-bulletin-neige/` to extract inline station metadata (`class Weather` → `this.posts = [...]`) containing `label`, `massif`, and `permalink`.
2. `POST /cms/wp-admin/admin-ajax.php` with `action=load_more_weather` to fetch paginated weather cards.

The AJAX response is parsed with CSS selectors such as `.Weather-itemContainer`, `.Weather-name`, `.Weather-pistes`, `.Weather-km`, and `.Weather-neigeHeight`.

Because this is frontend-coupled scraping, ingestion is still best-effort and may require selector updates if Nordic France changes its markup or JavaScript payload shape.

### Region inference

The worker enriches card entries with massif metadata using station permalink matching against the inline `Weather.posts` array.

Massif-to-`Region` mapping is applied by default during ingestion.

This mapping is intentionally simple and may be imperfect for cross-region massifs (for example Jura, Pyrénées, or Massif Central).

---

## Idempotency

Every ingestion run is fully idempotent:

- **Resort** records are upserted by `name` (which is `@unique` in the schema). Metadata fields (region, domainUrl) are updated only if the scraped value is non-null, preserving any previously stored value.
- **SnowRecord** records are upserted by `(resortId, recordDate)`. The `recordDate` is always normalised to **midnight UTC** before the upsert, so running the worker multiple times on the same day does not create duplicate records.

---

## Web app rendering model

All pages use **Next.js Server Components** and query the database directly through the Prisma singleton in `lib/prisma.ts`. There is no client-side data fetching or React state for the initial page load.

| Route | Rendering | DB calls |
|-------|-----------|----------|
| `/` | Dynamic Server Component | `resort.findMany` with latest `SnowRecord` |
| `/resorts/[id]` | Dynamic Server Component | `resort.findUnique` with last 10 `SnowRecord`s |
| `GET /api/resorts` | Route Handler | `resort.findMany` with latest `SnowRecord` |
| `GET /api/resorts/[id]` | Route Handler | `resort.findUnique` with last 10 `SnowRecord`s |

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
| `web/.next/` | `npm run build` |
| `worker/dist/` | `npm run build` (tsc) |

Always regenerate the Prisma client after modifying either `schema.prisma`.

---

## Known limitations & future improvements

- **HTML structure can still change.** The worker parser relies on Nordic France markup and may need selector updates when the site changes.
- **Best-effort HTML scraping.** The scraper will silently return zero records if the Nordic France bulletin page is redesigned. Consider adding alerting if a cron run returns 0 records.
- **Massif to Region approximation.** Some massifs span multiple administrative regions; current mapping is a pragmatic default, not a cadastral truth.
- **No historical archiving.** Only the last 10 `SnowRecord` entries per resort are returned by the API. Older records remain in the database but are not surfaced in the UI.
- **Latitude/longitude fields** are present in the schema but not yet populated. A future map view could use them.
