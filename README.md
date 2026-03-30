# ⛷️ Où Skier ?

> Trouvez votre prochaine destination de ski nordique grâce aux conditions d'enneigement en temps réel des domaines français.

## Architecture

The project is split into two components:

| Component | Directory | Description |
|-----------|-----------|-------------|
| **Web app** | `web/` | Next.js application displaying ski resort snow conditions |
| **Worker** | `worker/` | Data ingestion worker that fetches Nordic France snow bulletins |

Both share the same PostgreSQL database schema and migration history from `prisma/schema.prisma` and `prisma/migrations/`.

## Database Schema

```
Resort
├── id             Integer (PK)
├── name           String
├── region         Region?      (enum, metropolitan regions)
├── domainUrl      String?
├── latitude       Float?
├── longitude      Float?
├── createdAt      DateTime
└── updatedAt      DateTime

SnowRecord
├── id             Integer (PK)
├── resortId       Integer (FK → Resort)
├── recordDate     DateTime
├── openSlopes     Int?
├── totalSlopes    Int?
├── notes          String?
└── sourceUrl      String?
```

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database (e.g. [Neon](https://neon.tech) for Vercel deployments)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/whiver/ou-skier.git
   cd ou-skier
   ```

2. **Set up the web app**

   ```bash
   cd web
   cp .env.example .env         # Prisma CLI reads this for migrate/generate
   cp .env.example .env.local   # Next.js app runtime
   npm install
   npx prisma migrate deploy
   npx prisma generate
   npm run dev
   ```

3. **Set up the worker**

   ```bash
   cd worker
   cp .env.example .env  # then fill in DATABASE_URL
   npm install
   npx prisma generate
   npm run dev
   ```

### Environment Variables

Both the web app and worker need a `DATABASE_URL` pointing to the same PostgreSQL database:

```
DATABASE_URL=postgresql://user:password@host:5432/ou_skier
```

For cache freshness after ingestion:

- In `web/`, set `REVALIDATE_SECRET`.
- In `worker/`, set:

```
WEB_REVALIDATE_URL=https://ouskier.vercel.app/api/revalidate
WEB_REVALIDATE_SECRET=<same value as REVALIDATE_SECRET>
```

To make partial scrapes visible instead of silently writing incomplete daily data, the worker also supports:

```
ACTIVE_RESORT_LOOKBACK_DAYS=7
ACTIVE_RESORT_MIN_RECORD_DAYS=2
NTFY_TOPIC=ouskier-worker
```

By default, the worker compares the scraped resort list with resorts that had at least 2 known SnowRecord days in the last 7 days. If any of those recently active resorts disappear from the bulletin, the worker:

- logs the missing resorts in detail,
- emits a GitHub Actions warning annotation,
- sends an ntfy notification when `NTFY_TOPIC` is set,
- still ingests all available scraped rows for that day.

After a successful worker run, the worker calls this endpoint so `/domaines` and resort detail pages are invalidated immediately.

### Running the Worker

The worker fetches the latest [Nordic France](https://www.nordicfrance.fr/le-bulletin-neige/) snow bulletin and upserts the data into the database.

It combines paginated weather cards with inline station metadata (`Weather.posts`) from the bulletin page to infer a massif, then maps that massif to a best-effort `Region` value.

Before writing anything to the database, the worker validates scrape coverage against recently active resorts so partial bulletin responses are surfaced immediately while still ingesting the available scraped data.

For newly discovered resorts, the worker also attempts to fill `latitude` / `longitude` once (BAN geocoder with Nominatim fallback) so resorts can be displayed on a map.

Because some massifs span multiple administrative regions, this region attribution remains approximate.

```bash
cd worker
npm run dev      # development (ts-node)
npm run build    # compile TypeScript
npm start        # run compiled version
```

For automated updates, run the worker on a schedule (e.g. daily at 8:00 AM) using a cron job or a scheduled GitHub Actions workflow.

## Deployment

### Web App (Vercel)

1. Connect your GitHub repository to Vercel
2. Set the root directory to `web/`
3. Add `DATABASE_URL` to your Vercel environment variables
4. Deploy

### Worker

The worker can be deployed as:
- A standalone Node.js process on any server
- A scheduled GitHub Actions workflow

### Automated weekly database backup (Supabase)

This repository includes a GitHub Actions workflow at `.github/workflows/supabase-weekly-backup.yml` that:

- runs every Sunday at 02:00 UTC,
- dumps Supabase/PostgreSQL **data only** to `backups/supabase/data-YYYY-MM-DD.sql.gz`,
- keeps only the latest 6 weekly backups,
- commits and pushes backup changes automatically.

Required GitHub secret:

- `DATABASE_URL`: your Supabase Postgres connection string (the same one used by the app/worker).

For daily ingestion cache invalidation, add these GitHub Action secrets too:

- `WEB_REVALIDATE_URL`: typically `https://ouskier.vercel.app/api/revalidate`
- `REVALIDATE_SECRET`: same value as `web/REVALIDATE_SECRET`

You can also trigger the backup manually from the Actions tab using `workflow_dispatch`.

## Data Source

Snow condition data is sourced from [Nordic France](https://www.nordicfrance.fr/) — the official portal for Nordic skiing in France.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
