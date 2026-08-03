# Supabase setup (SurplusLink)

## 1. Create a project

1. Open [https://supabase.com/dashboard/new/project](https://supabase.com/dashboard/new/project)
2. Pick an org, name (e.g. `surpluslink`), set a **Database password** (save it)
3. Region: closest to you (or US East for Vercel)
4. Create project — wait until status is **Healthy**

## 2. Copy connection strings

Go to **Project Settings → Database → Connection string → URI**.

You need **two** URIs:

| Env var | Which URI | Notes |
|---|---|---|
| `DIRECT_URL` | **Direct connection** (port `5432`, host `db.<ref>.supabase.co`) | Used by `prisma db push` / migrate |
| `DATABASE_URL` | **Transaction pooler** (port `6543`, host `*.pooler.supabase.com`) | Used by the Next.js app on Vercel |

In both strings, replace `[YOUR-PASSWORD]` with the DB password (URL-encode special chars: `@` → `%40`, `#` → `%23`, etc.).

### Example

```bash
# App / Vercel (pooler)
DATABASE_URL="postgresql://postgres.abcdefghijklmnop:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"

# Prisma migrations (direct)
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.abcdefghijklmnop.supabase.co:5432/postgres?sslmode=require"
```

If the dashboard only shows one URI at first, use the **direct** URI for **both** `DATABASE_URL` and `DIRECT_URL` while testing locally; switch `DATABASE_URL` to the pooler before Vercel deploy.

## 3. Put them in `.env`

```bash
cp .env.example .env
# paste DATABASE_URL and DIRECT_URL
# keep AUTH_SECRET from before (or: openssl rand -base64 32)
```

## 4. Push schema + seed

```bash
npx prisma db push
npm run db:seed
```

Demo logins (password `demo1234`):

- `donor@demo.com`
- `donor2@demo.com`
- `recipient@demo.com`

## 5. Deploy to Vercel

Set these **Production** env vars in the Vercel project (or via CLI):

- `DATABASE_URL` (pooler)
- `DIRECT_URL` (direct)
- `AUTH_SECRET`
- `AUTH_URL` = `https://<your-project>.vercel.app`

Then:

```bash
npx vercel --prod
```

## Notes

- SurplusLink uses **Supabase Postgres only** (Prisma). No Supabase Auth/Storage required for the MVP.
- Photo uploads on Vercel are stored as **data URLs** in the DB (no Supabase Storage needed for demo).
- Local Food-101 vision may fall back to offline mode on Vercel (cold start / binary limits) — listing still works with manual confirm.
