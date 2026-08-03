# Supabase setup (SurplusLink)

SurplusLink uses **Supabase Postgres only** (via Prisma). Supabase Auth/Storage are not required for the MVP.

## 1. Create a project

1. Open [https://supabase.com/dashboard/new/project](https://supabase.com/dashboard/new/project)
2. Name the project, set a **Database password** (save it)
3. Wait until status is **Healthy**

## 2. Copy connection strings

**Project Settings → Database**, or **Connect → ORMs → Prisma**.

| Env var | Which URI | Notes |
|---|---|---|
| `DIRECT_URL` | **Direct** (`db.<ref>.supabase.co:5432`, user `postgres`) | `prisma db push` / migrate |
| `DATABASE_URL` | **Transaction pooler** (`aws-*-….pooler.supabase.com:6543`, user `postgres.<ref>`) | App runtime + **required on Vercel** |

Replace `[YOUR-PASSWORD]` — do not leave square brackets. URL-encode special characters in the password.

### Example (shape only)

```bash
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres?sslmode=require"
```

> Vercel cannot use the direct IPv6-only host for serverless queries. Always use the **pooler** for `DATABASE_URL` in production.

## 3. Local `.env`

```bash
cp .env.example .env
# paste DATABASE_URL + DIRECT_URL
# AUTH_SECRET=$(openssl rand -base64 32)
# AUTH_URL=http://localhost:3000
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

## 5. Next

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel env vars and `npx vercel --prod`.
