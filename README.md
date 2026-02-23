# ⛷️ Où Skier ?

> Trouvez votre prochaine destination de ski nordique grâce aux conditions d'enneigement en temps réel des domaines français.

## Architecture

The project is split into two components:

| Component | Directory | Description |
|-----------|-----------|-------------|
| **Web app** | `web/` | Next.js application displaying ski resort snow conditions |
| **Worker** | `worker/` | Data ingestion worker that fetches Nordic France snow bulletins |

Both share the same PostgreSQL database schema (defined in `worker/prisma/schema.prisma` and mirrored in `web/prisma/schema.prisma`).

## Database Schema

```
Resort
├── id             Integer (PK)
├── name           String
├── region         String?
├── department     String?
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
├── snowDepthBase  Float?   (cm at base)
├── snowDepthTop   Float?   (cm at top)
├── freshSnow      Float?   (cm of recent snowfall)
├── notes          String?
└── sourceUrl      String?
```

## Getting Started

### Prerequisites

- Node.js 20+
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

### Running the Worker

The worker fetches the latest [Nordic France](https://www.nordicfrance.fr/le-bulletin-neige/) snow bulletin and upserts the data into the database.

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

## Data Source

Snow condition data is sourced from [Nordic France](https://www.nordicfrance.fr/) — the official portal for Nordic skiing in France.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
