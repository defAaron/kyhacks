# SurplusLink — Technical Requirements Document (TRD)

**Version:** 1.2  
**Status:** MVP complete · deployed  
**Companion:** [PRD.md](./PRD.md)  
**Production:** [https://kyhacks.vercel.app](https://kyhacks.vercel.app)  

---

## 1. Architecture

```text
Browser (Next.js App Router)
        │
        ▼
Route Handlers
        │
        ├──► Supabase Postgres via Prisma (pooler on Vercel)
        ├──► Uploads: public/uploads (local) or data URLs (Vercel)
        ├──► Local Food-101 vision (transformers.js + ONNX)
        └──► OSRM public routing

Browser ──► Leaflet / OSM tiles
```

**Default map center:** Louisville, KY (`38.2527`, `-85.7585`).

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript, React 19 |
| Styling | Tailwind CSS + CSS variables |
| ORM / DB | Prisma + **Supabase Postgres** (`DATABASE_URL` pooler + `DIRECT_URL`) |
| Auth | Auth.js Credentials; Edge-safe `auth.config.ts` for middleware |
| Vision | Local Food-101 ONNX via `@huggingface/transformers` (`onnx-community/swin-finetuned-food101-ONNX`, q8) |
| Maps | `leaflet` + `react-leaflet` |
| Routing | OSRM HTTP API from server route |
| Validation | Zod |
| Hosting | Vercel |
| Images | Local `public/uploads`; on Vercel, data URLs in `photoUrl` |
| Vision guard | In-memory + best-effort `.data/` file quotas (`VISION_*`) |

`next.config.ts` marks `@huggingface/transformers`, `sharp`, and `onnxruntime-node` as `serverExternalPackages`.

## 3. Repository layout

```text
/
  README.md
  package.json
  next.config.ts
  .env.example
  prisma/
    schema.prisma          # postgresql
    seed.ts
  docs/
    README.md
    product/PRD.md
    product/TRD.md
    setup/SUPABASE.md
    setup/DEPLOYMENT.md
    engineering/WORK_BREAKDOWN.md
  public/
    hero-*.svg
    uploads/.gitkeep
  src/
    middleware.ts          # Edge donor gate (auth.config only)
    app/                   # App Router pages + API routes
    components/
      home/                # landing (hero, architecture, FAQ)
      explore/             # map + board
      listings/            # claim UI, status badges
      donor/               # donor forms + inbox
      auth/                # login form
      layout/              # header, providers
      motion/
      ui/
    lib/
      auth/                # NextAuth + session helpers
      db/                  # prisma, DTOs, expiry, listing-status
      vision/              # Food-101 pipeline, quota, compress
      routing/             # geo, TSP, map center, OSRM helpers
      schemas.ts
      storage.ts
      rate-limit.ts
      utils.ts
    types/
```

## 4. Data model (Prisma)

Postgres-backed; JSON arrays stored as `String` columns (same as prior SQLite shape).

```prisma
enum Role { DONOR RECIPIENT }
enum ListingStatus { AVAILABLE FULLY_CLAIMED EXPIRED HANDED_OFF }
enum ClaimStatus { RESERVED PICKED_UP NO_SHOW CANCELLED }

// User, DonorProfile, Listing, Claim — see prisma/schema.prisma
```

`datasource` uses `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")`.

## 5. API contracts

Unchanged from MVP:

- `POST /api/vision/analyze` — donor; multipart image; Food-101 or offline/rate-limited result  
- `GET|POST /api/listings` — public list / donor create  
- `GET /api/listings/[id]` — detail; phone after claim  
- `POST|GET /api/claims`, `PATCH /api/claims/[id]`  
- `POST /api/donor/profile`  
- `POST /api/route-optimize`  
- `POST /api/expire`  

Vision result schema includes optional `rateLimited`.

## 6. Vision pipeline

1. Client capture / upload (optional client compress).  
2. Server size cap 5MB; donor `userId` required.  
3. Quota check → offline + `rateLimited` if denied.  
4. Local ONNX Food-101 (`topk: 5`) → `food101-map` → Zod.  
5. Low confidence / load error → offline fallback.  
6. Persist `visionRaw` on publish.

On Vercel, model load may fail; offline path keeps the demo usable.

## 7. Claim concurrency

Prisma interactive transaction: stock check → increment → `FULLY_CLAIMED` when remaining 0 → create `RESERVED` claim.

## 8. Route optimization

Nearest-neighbor (+ optional 2-opt) → OSRM GeoJSON; `degraded: true` straight-line fallback.

## 9. Auth

- Credentials: `donor@demo.com`, `donor2@demo.com`, `recipient@demo.com` / `demo1234`  
- JWT session with `user.id` + `role`  
- Middleware (`/donor/*`) uses Edge-safe config only — **must not** import Prisma/bcrypt  
- Server pages use `requireSession` / `requireDonor` from `@/lib/auth`

## 10. Environment variables

```bash
DATABASE_URL="postgresql://postgres.<ref>:…@aws-*-….pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres:…@db.<ref>.supabase.co:5432/postgres?sslmode=require"
AUTH_SECRET="…"
AUTH_URL="https://kyhacks.vercel.app"   # or http://localhost:3000
# optional VISION_* and NEXT_PUBLIC_DEFAULT_CITY_*
```

See [../setup/SUPABASE.md](../setup/SUPABASE.md) and [../setup/DEPLOYMENT.md](../setup/DEPLOYMENT.md).

## 11. Seed data

- 3 users, 2 Louisville donors, ≥3 listings with relative pickup windows  
- Placeholder Unsplash food images  

## 12. Non-functional

- Target: iPhone Safari + desktop Chrome  
- Vision warm p95 &lt; 10s locally; production may use offline fallback  
- Edge middleware under Vercel free plan size limit (~1MB)  
- No secrets in client except public map center  

## 13. Implementation phases

All complete: scaffold → listings/vision/claims APIs → donor/explore/claim UI → routing → polish → Supabase + Vercel deploy.

## 14. Testing checklist

- [x] Donor login / seed profile  
- [x] Photo → vision or offline banner → publish  
- [x] Explore map + list  
- [x] Claim / cancel / no oversell  
- [x] Multi-stop route optimize  
- [x] Expiry  
- [x] Production `/api/listings` returns seed data  

## 15. Out of scope

- Native apps, websockets, push/SMS  
- Supabase Auth/Storage (Postgres only)  
- Cloud vision providers  

---

*End of TRD*
