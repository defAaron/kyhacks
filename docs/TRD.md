# SurplusLink — Technical Requirements Document (TRD)

**Version:** 1.1  
**Status:** MVP complete (KYHacks demo)  
**Companion:** [PRD.md](./PRD.md)  

---

## 1. Architecture

```text
Browser (Next.js App Router)
        │
        ▼
Route Handlers / Server Actions
        │
        ├──► SQLite via Prisma
        ├──► Local uploads (public/uploads) [Blob later]
        ├──► Local Food-101 vision (transformers.js + ONNX)
        └──► OSRM public routing

Browser ──► Leaflet / OSM tiles
```

**Default map center:** Louisville, KY (`38.2527`, `-85.7585`) for KYHacks relevance.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript, React 19 |
| Styling | Tailwind CSS + CSS variables |
| ORM / DB | Prisma + SQLite (`prisma/dev.db`); schema portable to Postgres |
| Auth | Auth.js (NextAuth) Credentials provider + `role` on User; seeded demo users |
| Vision | Local Food-101 classifier via `@huggingface/transformers` (ONNX q8); model `onnx-community/swin-finetuned-food101-ONNX` |
| Maps | `leaflet` + `react-leaflet` |
| Routing | OSRM HTTP API from server route |
| Validation | Zod |
| Images | `public/uploads` locally; storage helper abstracted for Vercel Blob later |
| Vision guard | File-backed per-user / global quotas (`VISION_*` envs) |

`next.config.ts` marks `@huggingface/transformers`, `sharp`, and `onnxruntime-node` as `serverExternalPackages` so the local classifier runs outside the Next bundler.

## 3. Repository layout

```text
/
  prisma/schema.prisma
  prisma/seed.ts
  src/app/
    page.tsx                      # brand home + enter app
    login/page.tsx
    donor/...                     # profile, inbox, new listing
    explore/...
    listings/[id]/page.tsx
    claims/page.tsx
    api/vision/analyze/route.ts
    api/listings/route.ts
    api/listings/[id]/route.ts
    api/claims/route.ts
    api/claims/[id]/route.ts
    api/donor/profile/route.ts
    api/route-optimize/route.ts
    api/expire/route.ts
    api/auth/[...nextauth]/route.ts
  src/components/
    donor/                        # NewListingForm, DonorInbox, …
    ExploreBoard.tsx, ListingsMap.tsx, ClaimForm.tsx, …
  src/lib/
    prisma.ts
    auth.ts
    vision.ts                     # Food-101 pipeline + offline fallback
    food101-map.ts                # label → title / categories / allergens
    vision-quota.ts               # VISION_* rate limits
    routing.ts
    geo.ts
    expiry.ts
    storage.ts
    schemas.ts
  .cache/transformers/            # local model weights (gitignored)
  docs/PRD.md
  docs/TRD.md
  README.md
```

## 4. Data model (Prisma)

```prisma
enum Role { DONOR RECIPIENT }
enum ListingStatus { AVAILABLE FULLY_CLAIMED EXPIRED HANDED_OFF }
enum ClaimStatus { RESERVED PICKED_UP NO_SHOW CANCELLED }

model User {
  id           String        @id @default(cuid())
  email        String        @unique
  name         String?
  passwordHash String
  role         Role          @default(RECIPIENT)
  donorProfile DonorProfile?
  claims       Claim[]
}

model DonorProfile {
  id       String    @id @default(cuid())
  userId   String    @unique
  user     User      @relation(fields: [userId], references: [id])
  orgName  String
  address  String
  lat      Float
  lng      Float
  phone    String?
  listings Listing[]
}

model Listing {
  id                String        @id @default(cuid())
  donorId           String
  donor             DonorProfile  @relation(fields: [donorId], references: [id])
  photoUrl          String
  title             String
  description       String?
  categories        String        // JSON array string (SQLite)
  allergens         String        // JSON array string
  quantityAvailable Int
  quantityClaimed   Int           @default(0)
  pickupStart       DateTime
  pickupEnd         DateTime
  status            ListingStatus @default(AVAILABLE)
  visionRaw         String?       // JSON of classifier response
  claims            Claim[]
  createdAt         DateTime      @default(now())
}

model Claim {
  id        String      @id @default(cuid())
  listingId String
  listing   Listing     @relation(fields: [listingId], references: [id])
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  portions  Int
  status    ClaimStatus @default(RESERVED)
  createdAt DateTime    @default(now())
}
```

## 5. API contracts

### `POST /api/vision/analyze`

- **Auth:** Donor session required  
- **Input:** multipart form field `image` (max ~5MB)  
- **Output:**

```json
{
  "title": "Fried Rice",
  "description": "Fried Rice (also looks like …). Confirm before publishing.",
  "categories": ["prepared", "asian"],
  "allergens": ["gluten", "soy"],
  "suggestedQuantity": 6,
  "confidence": 0.82,
  "offline": false
}
```

Optional `rateLimited: true` when quota / session blocks classification (still `offline: true`, `confidence: 0`).

If the local Food-101 model fails to load/run, confidence is too low, or quota denies: heuristic fallback, `confidence: 0`, `offline: true`.

### `POST /api/listings`

- **Auth:** Donor with profile  
- **Body:** photo (multipart or prior upload URL), title, description, categories, allergens, quantityAvailable, pickupStart, pickupEnd, visionRaw  

### `GET /api/listings`

- **Auth:** public  
- **Query:** `lat`, `lng`, `radiusKm`, `q`, optional allergen exclude  
- **Behavior:** expire stale listings on read; return `AVAILABLE` (and optionally soon-starting) with remaining portions and donor lat/lng/orgName/address (no phone until claim)

### `GET /api/listings/[id]`

- Public listing detail; phone omitted unless requester has an active claim on this listing

### `POST /api/claims`

- **Auth:** Recipient (or any signed-in user for demo)  
- **Body:** `{ "listingId": "...", "portions": 1 }`  
- **Behavior:** transactional stock check (see §7)

### `PATCH /api/claims/[id]`

- Donor: set `PICKED_UP` / `NO_SHOW`  
- Recipient: set `CANCELLED` (restore stock if listing still active)

### `POST /api/donor/profile`

- **Auth:** Donor  
- Create/update orgName, address, lat/lng, phone

### `POST /api/route-optimize`

- **Auth:** signed-in  
- **Body:**

```json
{
  "origin": { "lat": 38.25, "lng": -85.76 },
  "stops": [{ "id": "claimOrListingId", "lat": 38.25, "lng": -85.75 }]
}
```

- **Response:** ordered stop IDs, leg durations (seconds), total duration, GeoJSON LineString; optional `degraded: true`

### `POST /api/expire`

- Marks listings with `pickupEnd < now` as `EXPIRED`

## 6. Vision pipeline

**Stack:** free local CV — no Gemini / cloud vision key.

1. Client captures image via `<input capture="environment">` or file picker (client may compress before upload).
2. Server receives image, enforces size limit (`VISION_MAX_BYTES` = 5MB), requires donor `userId`.
3. `tryConsumeVisionQuota(userId)` — if denied, return offline + `rateLimited` with message.
4. Load/cached image-classification pipeline for `onnx-community/swin-finetuned-food101-ONNX` (`dtype: "q8"`), weights under `.cache/transformers`.
5. Run classifier with `topk: 5`; map top labels via `food101-map.ts` → Zod `visionResultSchema`:
   - `title`, `description`, `categories[]`, `allergens[]` (label heuristics, not visual allergen detection), `suggestedQuantity`, `confidence`, `offline: false`
6. If top score &lt; 0.12, empty predictions, or load/runtime error → offline fallback: timestamp title, empty allergens, `confidence: 0`, `offline: true`.
7. Store `visionRaw` on publish for debugging/demo.

## 7. Claim concurrency

Prisma interactive transaction:

1. Load listing; require `status === AVAILABLE`, `now < pickupEnd`, and `quantityAvailable - quantityClaimed >= portions`.
2. Increment `quantityClaimed` by `portions`.
3. If remaining == 0 → set `FULLY_CLAIMED`.
4. Create `Claim` with status `RESERVED`.

## 8. Route optimization

1. Input: user geolocation + claimed stop coordinates (≤10 stops).
2. Order stops with nearest-neighbor from origin; optional 2-opt improvement.
3. Call OSRM  
   `GET /route/v1/driving/{lon,lat;...}?overview=full&geometries=geojson`
4. Return ordered stop IDs, leg durations, total duration, GeoJSON LineString.
5. If OSRM unreachable: return geometric order + straight-line estimates and `degraded: true`.

## 9. Auth

- Auth.js Credentials provider for seeded demo users:
  - `donor@demo.com` / `demo1234` (role `DONOR`)
  - `donor2@demo.com` / `demo1234` (role `DONOR`, second Louisville stop)
  - `recipient@demo.com` / `demo1234` (role `RECIPIENT`)
- Session includes `user.id` + `role`.
- Middleware protects `/donor/*`.
- Explore is public-read; claim requires auth.

## 10. Environment variables

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="generate-a-long-random-string"
AUTH_URL="http://localhost:3000"   # optional

# Local Food-101 CPU guard (no cloud key). See .env.example.
VISION_MIN_INTERVAL_MS=3000
VISION_MAX_PER_USER_PER_MINUTE=3
VISION_MAX_PER_USER_PER_HOUR=10
VISION_MAX_PER_USER_PER_DAY=40
VISION_MAX_GLOBAL_PER_DAY=200

NEXT_PUBLIC_DEFAULT_CITY_LAT=38.2527
NEXT_PUBLIC_DEFAULT_CITY_LNG=-85.7585
```

Legacy `GEMINI_*` quota env names are still accepted as fallbacks in `vision-quota.ts` but are not documented for new setups.

## 11. Seed data

- 3 demo users: `donor@demo.com`, `donor2@demo.com`, `recipient@demo.com` (password `demo1234`)
- Two donor profiles (Louisville-area) for multi-stop routing demo
- Sample listings with placeholder food images (Vision not required for seed)
- Pickup windows set relative to seed time (e.g. now → +4h) so the demo board is never empty on first run

## 12. Non-functional requirements

- Target browsers: iPhone Safari + desktop Chrome
- Vision analyze: first call may download ONNX weights (can take tens of seconds); warm p95 target &lt; 10s on laptop CPU
- No secrets in client bundle except public map center coords
- No paid vision API dependency for demo
- README includes setup, seed, and a judge demo script

## 13. Implementation phases

1. ~~Scaffold Next.js + Prisma schema + seed + auth~~  
2. ~~Donor listing flow + Vision API route (local Food-101)~~  
3. ~~Public explore map/list + detail/claim~~  
4. ~~My claims + route optimize~~  
5. ~~Polish UX, expiry handling, README~~  

## 14. Testing checklist (manual / demo)

- [x] Donor login → profile exists from seed  
- [x] Photo upload → Vision fields populate (or offline / rate-limit banner)  
- [x] Publish listing → appears on explore map + list  
- [x] Recipient claims last portion → listing becomes fully claimed  
- [x] Concurrent double-claim of last portion → only one succeeds  
- [x] Two+ claims → route optimize returns ordered stops  
- [x] Past pickupEnd → listing no longer claimable / shows expired  
- [x] Demo path works with no cloud vision key  

## 15. Out of scope (engineering)

- Production Postgres migration (schema kept portable only)
- Native apps
- Real-time websockets
- CDN/image pipeline beyond local uploads
- Push / SMS providers
- Cloud vision providers (Gemini, etc.)

---

*End of TRD*
