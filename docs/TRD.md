# SurplusLink — Technical Requirements Document (TRD)

**Version:** 1.0  
**Status:** Draft for review  
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
        ├──► Gemini Vision API
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
| Vision | Local Food-101 classifier via `@huggingface/transformers` (ONNX) |
| Maps | `leaflet` + `react-leaflet` |
| Routing | OSRM HTTP API from server route |
| Validation | Zod |
| Images | `public/uploads` locally; storage helper abstracted for Vercel Blob later |

## 3. Repository layout

```text
/
  prisma/schema.prisma
  prisma/seed.ts
  src/app/
    page.tsx                      # brand home + enter app
    login/page.tsx
    (donor)/donor/...
    explore/...
    listings/[id]/page.tsx
    claims/page.tsx
    api/vision/analyze/route.ts
    api/listings/route.ts
    api/claims/route.ts
    api/route-optimize/route.ts
    api/auth/[...nextauth]/route.ts
  src/components/
  src/lib/
    prisma.ts
    auth.ts
    vision.ts
    routing.ts
    geo.ts
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
  visionRaw         String?       // JSON of model response
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
  "title": "Tray of vegetable fried rice",
  "description": "Prepared rice with mixed vegetables",
  "categories": ["prepared", "asian", "vegetarian"],
  "allergens": ["soy", "sesame"],
  "suggestedQuantity": 8,
  "confidence": 0.82,
  "offline": false
}
```

If the local Food-101 model fails to load/run: heuristic fallback, `confidence: 0`, `offline: true`.

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

### `POST /api/route-optimize`

- **Auth:** signed-in  
- **Body:**

```json
{
  "origin": { "lat": 38.25, "lng": -85.76 },
  "stops": [{ "id": "claimOrListingId", "lat": 38.25, "lng": -85.75 }]
}
```

- **Response:** ordered stop IDs, leg durations (seconds), total duration, GeoJSON LineString

### `POST /api/expire` (optional lightweight)

- Marks listings with `pickupEnd < now` as `EXPIRED`

## 6. Vision pipeline

1. Client captures image via `<input capture="environment">` or file picker.
2. Server receives image, enforces size limit, converts to inline base64.
3. Prompt Gemini to return **strict JSON** matching a Zod schema:
   - `title`, `description`, `categories[]`, `allergens[]`, `suggestedQuantity`, `confidence`
4. On parse failure or missing key → fallback title from timestamp, empty allergens, `confidence: 0`, `offline: true`.
5. Store `visionRaw` on publish for debugging/demo.

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
  - `recipient@demo.com` / `demo1234` (role `RECIPIENT`)
- Session includes `user.id` + `role`.
- Middleware protects `/donor/*`.
- Explore is public-read; claim requires auth.

## 10. Environment variables

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="generate-a-long-random-string"
# Vision is local Food-101 (no cloud key). Optional VISION_* rate-limit envs in .env.example.
NEXT_PUBLIC_DEFAULT_CITY_LAT=38.2527
NEXT_PUBLIC_DEFAULT_CITY_LNG=-85.7585
```

## 11. Seed data

- 2 demo users (donor + recipient) + 1 donor profile (sample downtown Louisville restaurant)
- Second donor profile optional for multi-stop routing demo
- 3 sample listings with placeholder food images (Vision not required for seed)
- Pickup windows set relative to seed time (e.g. now → +4h) so the demo board is never empty on first run

## 12. Non-functional requirements

- Target browsers: iPhone Safari + desktop Chrome
- Vision analyze p95 &lt; 10s when Gemini available
- No secrets in client bundle except public map center coords
- README includes setup, seed, and a judge demo script

## 13. Implementation phases

1. Scaffold Next.js + Prisma schema + seed + auth  
2. Donor listing flow + Vision API route  
3. Public explore map/list + detail/claim  
4. My claims + route optimize  
5. Polish UX, expiry handling, README  

## 14. Testing checklist (manual / demo)

- [ ] Donor login → profile exists from seed  
- [ ] Photo upload → Vision fields populate (or offline banner)  
- [ ] Publish listing → appears on explore map + list  
- [ ] Recipient claims last portion → listing becomes fully claimed  
- [ ] Concurrent double-claim of last portion → only one succeeds  
- [ ] Two+ claims → route optimize returns ordered stops  
- [ ] Past pickupEnd → listing no longer claimable / shows expired  

## 15. Out of scope (engineering)

- Production Postgres migration (schema kept portable only)
- Native apps
- Real-time websockets
- CDN/image pipeline beyond local uploads
- Push / SMS providers

---

*End of TRD*
