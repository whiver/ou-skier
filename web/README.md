# Où Skier ? — Web App

This is the Next.js web application for [Où Skier?](https://github.com/whiver/ou-skier), serving snow condition data for Nordic ski resorts in France.

Prisma schema and migrations are shared at the repository root in `../prisma/`.

## Setup

```bash
# Prisma CLI uses .env; Next.js uses .env.local
cp .env.example .env
cp .env.example .env.local

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations (needs DATABASE_URL)
npx prisma migrate deploy

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Deployment

Deploy to [Vercel](https://vercel.com) with the `web/` directory as the root. See the main [README](../README.md) for full instructions.

