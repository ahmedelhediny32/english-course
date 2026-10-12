# Vercel deployment

The app uses Neon PostgreSQL through `DATABASE_URL`. Do not use the local SQLite file as a production database; it is only the source for the one-time import.

## Required Vercel environment variables

- `DATABASE_URL` (provided by the connected Neon integration)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Set the admin variables in Production, Preview, and Development from the Vercel project settings. Keep their values out of Git.

## Import existing SQLite data

With Node.js 22 or newer and the target `DATABASE_URL` available in `.env.local`, run:

```powershell
npx node@24 scripts/migrate-sqlite-to-neon.js "C:\path\to\app.db"
```

The import is safe to re-run: rows are upserted by their primary keys. It intentionally does not import the old admin email or password hash; those come from environment variables.

## Deploy

Push to the connected GitHub branch to trigger a Vercel deployment, or run `vercel --prod` from this linked project directory. The project uses the Next.js default build command, `npm run build`.
