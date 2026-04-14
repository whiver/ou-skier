# ou-skier Copilot Instructions

This repository has two runnable projects:

- web/ is a Next.js 16 app with React 19.
- worker/ is a Node and TypeScript ingestion worker for Nordic France snow bulletins.
- prisma/schema.prisma and prisma/migrations/ at the repo root are the shared schema and migration source of truth.

Always make schema changes in the root prisma directory first. Both web/ and worker/ copy that schema into their package-local prisma directories with existing db:sync-schema scripts, so prefer those scripts over manual edits to generated Prisma output.

Run commands from the package you changed:

- web/: npm install, npm run lint, npm run build
- worker/: npm install, npm run build
- worker/ schema deployment when required: npm run db:migrate

Important runtime details:

- web/package.json runs db:generate during build and postinstall.
- worker/package.json runs db:generate during build.
- Both projects need DATABASE_URL.
- Revalidation needs REVALIDATE_SECRET in web/ and WEB_REVALIDATE_URL plus WEB_REVALIDATE_SECRET in worker/.
- The daily ingestion workflow is .github/workflows/worker-daily.yml.
- The weekly backup workflow is .github/workflows/supabase-weekly-backup.yml.

Prefer the smallest relevant validation command for the files you changed. Trust these instructions before doing wider repository searches.