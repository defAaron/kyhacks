# SurplusLink — Work Breakdown (Subagent Assignment)

**Purpose:** Ordered build sections with subtasks sized for one subagent each.  
**Source of truth:** [PRD](../product/PRD.md), [TRD](../product/TRD.md)  
**Rule:** Do not start a section until its **Blocked by** items are done (or stubs exist).  
**Status:** All sections S1–S12 complete; production on Vercel + Supabase.

Paths below reflect the **as-shipped** layout (`src/components/{home,explore,listings,donor,auth,layout}`, `src/lib/{auth,db,vision,routing}`).

---

## Dependency overview

```text
S1 Foundation
├── S2 Auth & session
├── S3 Design system / shell          (can parallel S2 after S1)
 └── S4 Data layer (Prisma + seed)    (can parallel S2/S3 after S1)
        │
        ├── S5 Listings API
        ├── S6 Vision API             (can parallel S5)
        └── S7 Claims API             (needs S5 contracts)
               │
               ├── S8 Donor UI        (needs S2, S4, S5, S6)
               ├── S9 Explore UI      (needs S5; map can start after S3)
               └── S10 Claim detail UI (needs S7, S9)
                      │
                      ├── S11 Route optimize API + UI
                      └── S12 Polish, expiry, README, deploy
```

**Multitask tip:** After **S1** lands, run **S2 + S3 + S4** in parallel. After those, run **S5 + S6** in parallel, then **S7**. Then **S8 + S9** in parallel. Then **S10 → S11 → S12**.

---

## Section 1 — Project foundation  
**Build first. Nothing else until this merges.**

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S1.1** | Scaffold Next.js app | `package.json`, App Router, TypeScript, Tailwind, `src/app` layout | Next.js 15, React 19, `src/` directory. |
| **S1.2** | Env + ignore + scripts | `.env.example`, `.gitignore`, npm scripts | `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, optional `VISION_*`, map center. No cloud vision key. |
| **S1.3** | Base layout + fonts/CSS vars | `src/app/layout.tsx`, `globals.css` | Warm food-rescue tokens. Brand SurplusLink in metadata. |

**Exit criteria:** `npm install && npm run dev` starts a blank branded shell.

---

## Section 2 — Auth  
**Blocked by:** S1  
**Parallel with:** S3, S4

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S2.1** | Auth.js setup | `src/lib/auth/auth.ts`, `auth.config.ts`, `src/app/api/auth/[...nextauth]/route.ts` | Credentials; JWT with `user.id` + `role`. Edge config must not import Prisma/bcrypt. |
| **S2.2** | Login page | `src/app/login/page.tsx`, `src/components/auth/LoginForm.tsx` | Demo-friendly; show demo emails. |
| **S2.3** | Middleware + role helpers | `src/middleware.ts`, `src/lib/auth/session.ts` | Protect `/donor/*`. Helpers: `requireSession`, `requireDonor`. |

**Exit criteria:** Can sign in as donor/recipient (after seed — coordinate with S4).

---

## Section 3 — App shell & design system  
**Blocked by:** S1  
**Parallel with:** S2, S4

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S3.1** | Shared UI primitives | `src/components/ui/*` | Button, Input, Textarea, Badge, Alert. |
| **S3.2** | Nav / app chrome | `src/components/layout/AppHeader.tsx` | Explore, Donor, Claims, Login/Logout. |
| **S3.3** | Marketing home | `src/app/page.tsx`, `src/components/home/*` | Brand-first hero; problem → solution → architecture → FAQ. |

**Exit criteria:** Home + header coherent on mobile and desktop.

---

## Section 4 — Data layer  
**Blocked by:** S1  
**Parallel with:** S2, S3

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S4.1** | Prisma schema | `prisma/schema.prisma`, `src/lib/db/prisma.ts` | Models/enums from TRD §4. **Postgres** + `DIRECT_URL`. |
| **S4.2** | Migrate + seed | `prisma/seed.ts`, seed script | Demo users `*@demo.com` / `demo1234`; 2 donors; ≥3 listings; Louisville. |
| **S4.3** | Shared Zod types | `src/lib/schemas.ts` | Listing, vision, claim, route-optimize. |

**Exit criteria:** `npx prisma db push && npm run db:seed` populates Supabase (or local Postgres).

---

## Section 5 — Listings API  
**Blocked by:** S4 (and S2 for write auth)  
**Parallel with:** S6

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S5.1** | Image upload helper | `src/lib/storage.ts`, `public/uploads/.gitkeep` | Local files under `public/uploads`; data URLs on Vercel. |
| **S5.2** | Listings GET/POST | `src/app/api/listings/route.ts` | GET: filters + expire-on-read. POST: donor create. |
| **S5.3** | Listing detail GET | `src/app/api/listings/[id]/route.ts` | Hide phone unless active claim. |
| **S5.4** | Expiry helper | `src/lib/db/expiry.ts`, `POST /api/expire` | Flip past `pickupEnd` → `EXPIRED`. |

**Exit criteria:** Seed listings via GET; POST creates listing as donor.

---

## Section 6 — Vision API  
**Blocked by:** S4.3, S2  
**Parallel with:** S5

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S6.1** | Local Food-101 client | `src/lib/vision/*` | `@huggingface/transformers` ONNX; map labels → Zod. No cloud key. |
| **S6.2** | Analyze route | `src/app/api/vision/analyze/route.ts` | Multipart `image`, 5MB, donor auth. |
| **S6.3** | Offline + quota | `vision.ts`, `vision-quota.ts` | Failures → offline; quota → `rateLimited`. |

**Exit criteria:** Schema-valid JSON from local Food-101 or offline fallback — no cloud vision key.

---

## Section 7 — Claims API  
**Blocked by:** S5.2, S2, S4

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S7.1** | Create claim | `src/app/api/claims/route.ts` | Transactional stock; `FULLY_CLAIMED` at 0. |
| **S7.2** | List my claims | GET on claims route | Listing + donor address/phone + lat/lng. |
| **S7.3** | Patch claim status | `src/app/api/claims/[id]/route.ts` | Donor: picked up / no-show. Recipient: cancel restores stock. |

**Exit criteria:** Last portion cannot oversell under sequential requests.

---

## Section 8 — Donor UI  
**Blocked by:** S2, S3, S4, S5, S6  
**Parallel with:** S9

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S8.1** | Donor profile | `src/app/donor/profile/page.tsx`, `src/components/donor/DonorProfileForm.tsx` | orgName, address, lat/lng, phone. |
| **S8.2** | New listing flow | `src/app/donor/listings/new/page.tsx`, `NewListingForm.tsx` | Camera → vision → edit → publish. |
| **S8.3** | Donor inbox | `src/app/donor/page.tsx`, `DonorInbox.tsx` | Listings + claims; offline / rate-limit banner. |

**Exit criteria:** Photo → confirm → publish appears in GET /api/listings.

---

## Section 9 — Explore UI  
**Blocked by:** S3, S5  
**Parallel with:** S8

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S9.1** | Leaflet map | `src/components/explore/ListingsMap.tsx` | Dynamic import; Louisville center. |
| **S9.2** | Explore page | `src/app/explore/page.tsx`, `ExploreBoard.tsx` | List + map; portions + window on cards. |
| **S9.3** | Filters | filters on explore | Distance / text / allergen exclude. |

**Exit criteria:** Seed listings on map and list without login.

---

## Section 10 — Listing detail + claim UI  
**Blocked by:** S7, S9

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S10.1** | Listing detail | `src/app/listings/[id]/page.tsx` | Photo, allergens, window, remaining. |
| **S10.2** | Claim form | `src/components/listings/ClaimForm.tsx` | Portions; auth gate; → claims. |
| **S10.3** | Empty/error states | `ListingNotClaimable`, network alert | Sold out, expired, network. |

**Exit criteria:** Recipient claims seed listing under My Claims.

---

## Section 11 — Route optimization  
**Blocked by:** S7.2, S10, S3

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S11.1** | Geo + TSP | `src/lib/routing/*` | Haversine, NN, optional 2-opt. |
| **S11.2** | Route API | `src/app/api/route-optimize/route.ts` | OSRM; degraded straight-line. |
| **S11.3** | Pickup run UI | `src/app/claims/page.tsx`, `ClaimsClient.tsx` | ≥2 claims → ordered stops + polyline. |

**Exit criteria:** 2–3 reserved claims → itinerary &lt; 2s (or degraded).

---

## Section 12 — Polish & demo readiness  
**Blocked by:** S8–S11 roughly complete

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S12.1** | Expiry UX | listing cards + APIs | Expired not claimable. |
| **S12.2** | Mobile QA | CSS/layout | Safari camera, tap targets, map height. |
| **S12.3** | README + demo path | `README.md` | Setup, Supabase, seed, 3-minute path. |
| **S12.4** | Docs + deploy | `docs/**`, Vercel | Food-101; Supabase + Vercel; live URL. |

**Exit criteria:** Fresh clone → Supabase push/seed → demo path; production at kyhacks.vercel.app.

---

## Suggested multitask waves

| Wave | Assign in parallel | Wait for |
|---|---|---|
| **Wave 0** | S1.1 → S1.2 → S1.3 (sequential) | — |
| **Wave 1** | S2.*, S3.*, S4.* | S1 done |
| **Wave 2** | S5.*, S6.* | Wave 1 done |
| **Wave 3** | S7.* | S5 + S2 done |
| **Wave 4** | S8.*, S9.* | Wave 2–3 done |
| **Wave 5** | S10.* | S7 + S9 done |
| **Wave 6** | S11.* | S10 done |
| **Wave 7** | S12.* | S11 done |

---

## Subagent prompt template

```text
You are implementing SurplusLink subtask <ID>: <title>.
Read docs/product/PRD.md, docs/product/TRD.md, and docs/engineering/WORK_BREAKDOWN.md.
Only implement this subtask’s deliverables. Do not expand scope.
Match existing code style and file paths in the TRD.
When done: list files changed, how to verify, and any blockers.
```

---

## Status tracker

| Section | Status |
|---|---|
| S1 Foundation | done |
| S2 Auth | done (Edge-safe `auth.config.ts`) |
| S3 Shell / design | done |
| S4 Data layer | done (Supabase Postgres + seed + Zod) |
| S5 Listings API | done |
| S6 Vision API | done (local Food-101 + offline / rate-limit) |
| S7 Claims API | done |
| S8 Donor UI | done |
| S9 Explore UI | done |
| S10 Detail + claim UI | done |
| S11 Route optimize | done |
| S12 Polish + README | done |
| Deploy | done — https://kyhacks.vercel.app |
