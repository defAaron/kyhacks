# SurplusLink

Mobile-friendly Next.js app that connects restaurants and pantries with people nearby who can claim edible surplus before it expires. Donors photograph leftovers; a **free local Food-101** classifier (ONNX via `@huggingface/transformers`) suggests title, categories, allergen heuristics, and quantity — with offline / rate-limit fallback if the model is unavailable. Recipients browse a map, claim portions, and optimize a multi-stop pickup run.

**Hackathon demo (KYHacks):** Louisville default map center. MVP docs: [PRD](./docs/PRD.md) · [TRD](./docs/TRD.md) · [Work breakdown](./docs/WORK_BREAKDOWN.md).

---

## Quick start (fresh clone)

```bash
git clone <repo-url> kyhacks
cd kyhacks
npm install

cp .env.example .env
# Set AUTH_SECRET (required). Vision runs locally — no paid API key.
# Example: openssl rand -base64 32

npx prisma db push
npm run db:seed

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase Postgres URI (pooler recommended on Vercel) |
| `DIRECT_URL` | Yes | Supabase direct DB URI (for Prisma migrate/push) |
| `AUTH_SECRET` | Yes | Long random string for Auth.js sessions |
| `AUTH_URL` | No | Defaults via Auth.js; use `http://localhost:3000` locally if needed |
| `NEXT_PUBLIC_DEFAULT_CITY_LAT` | No | Default `38.2527` (Louisville) |
| `NEXT_PUBLIC_DEFAULT_CITY_LNG` | No | Default `-85.7585` |
| `VISION_*` quotas | No | Optional CPU rate limits for local Food-101 vision |

See `.env.example` and [TRD §10](./docs/TRD.md).

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build & serve |
| `npx prisma db push` | Apply schema to SQLite |
| `npm run db:seed` | Idempotent demo users + listings |
| `npm run lint` | ESLint |

---

## Demo logins

Password for all demo accounts: **`demo1234`**

| Role | Email | Use |
|---|---|---|
| Donor | `donor@demo.com` | Profile, camera listing, inbox |
| Donor (2nd stop) | `donor2@demo.com` | Extra listings for multi-stop routing |
| Recipient | `recipient@demo.com` | Explore, claim, pickup run |

Seed creates Louisville-area listings with pickup windows relative to seed time so the board is not empty on first run.

---

## 3-minute demo path

1. **Explore (public)** — Open `/explore`. Confirm seed listings on the list and map (Louisville). Note remaining portions and pickup windows on cards.
2. **Donor listing** — Login as `donor@demo.com` → Donor → New listing. Capture or upload a food photo. Confirm/edit AI fields (first photo may take longer while the local Food-101 model downloads). Set pickup window + quantity → Publish.
3. **Claim** — Logout → login as `recipient@demo.com` → open a listing → claim 1+ portions. Confirm under **Claims**.
4. **Pickup run (optional, ~30s)** — Claim a second listing (or use seed listings from both donors). On Claims, select ≥2 stops → optimize route → show ordered stops / map polyline.
5. **Expiry (optional)** — Listings past `pickupEnd` flip to `EXPIRED` (on read / expire helper) and are not claimable in the UI.

**Vision:** local Food-101 ONNX (`onnx-community/swin-finetuned-food101-ONNX`) via `@huggingface/transformers` — free, no cloud API key. Weights cache under `.cache/transformers` after first download. Load failure, low confidence, or `VISION_*` quota → offline / rate-limit manual-entry banner. Allergen fields are label heuristics; staff must confirm.

---

## Disclaimer

- Donors remain responsible for food handling and safety. SurplusLink is a coordination tool, not a certification or medical service.
- Allergen suggestions from Vision are assistive — staff must confirm before publish.
- Public explore does not expose recipient identity. Donor phone is shown only after a successful claim.
- Good Samaritan / surplus-share framing: this is a demo for sharing surplus, not a guarantee of fitness for consumption.

---

## Stack (summary)

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · Prisma + SQLite · Auth.js (Credentials) · Local Food-101 vision (transformers.js) · Leaflet / OSM · OSRM routing

Full contracts and data model: [docs/TRD.md](./docs/TRD.md).
