# Deployment (Vercel)

**Production URL:** [https://kyhacks.vercel.app](https://kyhacks.vercel.app)

## Prerequisites

1. Supabase project with schema pushed and seeded ([SUPABASE.md](./SUPABASE.md))
2. Vercel account linked to this repo (`npx vercel link`)

## Required environment variables (Production)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **Transaction pooler** URI (`aws-*-….pooler.supabase.com:6543`, username `postgres.<project-ref>`) |
| `DIRECT_URL` | Supabase **direct** URI (`db.<project-ref>.supabase.co:5432`) |
| `AUTH_SECRET` | Long random secret (`openssl rand -base64 32`) |
| `AUTH_URL` | `https://kyhacks.vercel.app` (or your custom domain) |

Optional: `NEXT_PUBLIC_DEFAULT_CITY_*`, `VISION_*` quotas.

## Deploy

```bash
npx vercel --prod
```

Or push to the connected GitHub branch if Git integration is enabled.

## Production notes

- **DB:** Vercel cannot reliably use Supabase direct IPv6-only hosts. Always set `DATABASE_URL` to the **pooler**.
- **Uploads:** On Vercel (`VERCEL=1`), photos are stored as **data URLs** in Postgres (see `src/lib/storage.ts`). Locally they write to `public/uploads/`.
- **Vision:** Food-101 ONNX may fall back to offline/manual entry on serverless (cold start / binary limits). Listing still works.
- **Auth middleware:** Edge-safe config in `src/lib/auth/auth.config.ts` (no Prisma/bcrypt in the Edge bundle).
- **Demo users:** `donor@demo.com` / `recipient@demo.com` / `donor2@demo.com` — password `demo1234`

## Smoke test

```bash
curl -sL -o /dev/null -w "%{http_code}\n" https://kyhacks.vercel.app/
curl -sL https://kyhacks.vercel.app/api/listings | head -c 200
```

Expect home `200` and JSON listings from seed data.
