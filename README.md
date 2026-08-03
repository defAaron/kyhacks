# SurplusLink

Mobile-friendly Next.js app connecting restaurants and pantries with people nearby who can claim edible surplus before it expires.

Donors photograph leftovers; a **free local Food-101** classifier (ONNX via `@huggingface/transformers`) suggests listing details (with offline / rate-limit fallback). Recipients browse a map, claim portions, and optimize a multi-stop pickup run.

**Live:** [https://kyhacks.vercel.app](https://kyhacks.vercel.app)  
**Stack:** Next.js 15 · Prisma · **Supabase Postgres** · Auth.js · Food-101 ONNX · Leaflet · OSRM · **Vercel**

Docs: [docs/](./docs/README.md) · [PRD](./docs/product/PRD.md) · [TRD](./docs/product/TRD.md) · [Supabase](./docs/setup/SUPABASE.md) · [Deploy](./docs/setup/DEPLOYMENT.md)

---

## Quick start

```bash
git clone https://github.com/defAaron/kyhacks.git
cd kyhacks
npm install

cp .env.example .env
# Set DATABASE_URL + DIRECT_URL (Supabase) and AUTH_SECRET
# See docs/setup/SUPABASE.md

npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase **Transaction pooler** URI |
| `DIRECT_URL` | Yes | Supabase **direct** URI (Prisma push) |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `AUTH_URL` | Prod | `https://kyhacks.vercel.app` locally `http://localhost:3000` |
| `NEXT_PUBLIC_DEFAULT_CITY_LAT/LNG` | No | Louisville defaults |
| `VISION_*` | No | Local Food-101 CPU quotas |

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build & serve |
| `npx prisma db push` | Apply schema to Supabase |
| `npm run db:seed` | Demo users + Louisville listings |
| `npm run lint` | ESLint |

---

## Demo logins

Password for all: **`demo1234`**

| Role | Email |
|---|---|
| Donor | `donor@demo.com` |
| Donor (2nd stop) | `donor2@demo.com` |
| Recipient | `recipient@demo.com` |

---

## 3-minute demo path

1. **Explore** — `/explore` seed listings on map + list (Louisville).  
2. **Donor listing** — `donor@demo.com` → New listing → photo → confirm AI fields → publish.  
3. **Claim** — `recipient@demo.com` → claim portions → **Claims**.  
4. **Pickup run** — claim a second stop → optimize route.  
5. **Expiry** — past `pickupEnd` → not claimable.

**Vision:** local Food-101 ONNX. On Vercel, offline/manual entry may appear if the model cannot load — listing still works.

---

## Project structure

```text
src/
  app/                 # routes + API
  components/
    home/ explore/ listings/ donor/ auth/ layout/ motion/ ui/
  lib/
    auth/ db/ vision/ routing/   # domain modules + barrels
    schemas.ts storage.ts …
docs/
  product/ setup/ engineering/
prisma/                # schema + seed (Postgres)
```

---

## Disclaimer

- Donors remain responsible for food handling and safety.  
- Allergen suggestions are assistive — staff must confirm.  
- Public explore does not expose recipient identity.  
- Coordination tool for surplus-share demos, not a certification service.
