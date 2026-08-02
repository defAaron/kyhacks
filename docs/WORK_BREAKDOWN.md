# SurplusLink — Work Breakdown (Subagent Assignment)

**Purpose:** Ordered build sections with subtasks sized for one subagent each.  
**Source of truth:** [PRD.md](./PRD.md), [TRD.md](./TRD.md)  
**Rule:** Do not start a section until its **Blocked by** items are done (or stubs exist).

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
                      └── S12 Polish, expiry, README
```

**Multitask tip:** After **S1** lands, run **S2 + S3 + S4** in parallel. After those, run **S5 + S6** in parallel, then **S7**. Then **S8 + S9** in parallel. Then **S10 → S11 → S12**.

---

## Section 1 — Project foundation  
**Build first. Nothing else until this merges.**

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S1.1** | Scaffold Next.js app | `package.json`, App Router, TypeScript, Tailwind, `src/app` layout | Next.js 15, React 19, `src/` directory. No business pages yet beyond a placeholder home. |
| **S1.2** | Env + ignore + scripts | `.env.example`, `.gitignore`, npm scripts | Include `DATABASE_URL`, `AUTH_SECRET`, `GEMINI_API_KEY`, map center vars per TRD. |
| **S1.3** | Base layout + fonts/CSS vars | `src/app/layout.tsx`, `globals.css` | Warm food-rescue tokens (not purple AI default). Brand name SurplusLink in metadata. |

**Exit criteria:** `npm install && npm run dev` starts a blank branded shell.

---

## Section 2 — Auth  
**Blocked by:** S1  
**Parallel with:** S3, S4

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S2.1** | Auth.js setup | `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts` | Credentials provider; session must expose `user.id` + `role`. |
| **S2.2** | Login page | `src/app/login/page.tsx` | Demo-friendly form; show both demo emails. |
| **S2.3** | Middleware + role helpers | `src/middleware.ts`, `src/lib/session.ts` | Protect `/donor/*`. Helpers: `requireSession`, `requireDonor`. |

**Exit criteria:** Can sign in as donor/recipient (after seed users exist — coordinate with S4).

---

## Section 3 — App shell & design system  
**Blocked by:** S1  
**Parallel with:** S2, S4

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S3.1** | Shared UI primitives | `src/components/ui/*` (Button, Input, Textarea, Badge, Alert) | Keep minimal; match CSS variables. |
| **S3.2** | Nav / app chrome | `src/components/AppHeader.tsx` | Links: Explore, Donor, Claims, Login/Logout. |
| **S3.3** | Marketing home | `src/app/page.tsx` | Brand-first hero (SurplusLink), one headline, one CTA group → Explore / Login. No stats strip. |

**Exit criteria:** Home + header look coherent on mobile and desktop.

---

## Section 4 — Data layer  
**Blocked by:** S1  
**Parallel with:** S2, S3

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S4.1** | Prisma schema | `prisma/schema.prisma`, `src/lib/prisma.ts` | Exact models/enums from TRD §4. SQLite. |
| **S4.2** | Migrate + seed | `prisma/seed.ts`, seed script in `package.json` | `donor@demo.com` / `recipient@demo.com` / `demo1234`; 1–2 donors; ≥3 listings with future pickup windows; Louisville coords. |
| **S4.3** | Shared Zod types | `src/lib/schemas.ts` | Listing create, vision result, claim create, route-optimize request/response. |

**Exit criteria:** `npx prisma db push && npm run db:seed` populates demo data.

---

## Section 5 — Listings API  
**Blocked by:** S4 (and S2 for write auth)  
**Parallel with:** S6

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S5.1** | Image upload helper | `src/lib/storage.ts`, `public/uploads/.gitkeep` | Save under `public/uploads`; return public URL path. |
| **S5.2** | Listings GET/POST | `src/app/api/listings/route.ts` | GET: filters + expire-on-read. POST: donor-only multipart/JSON create. |
| **S5.3** | Listing detail GET | `src/app/api/listings/[id]/route.ts` | Hide donor phone unless requester has active claim. |
| **S5.4** | Expiry helper | `src/lib/expiry.ts` (+ optional `POST /api/expire`) | Flip `pickupEnd < now` → `EXPIRED`. |

**Exit criteria:** Seed listings return via GET; POST creates a listing when authenticated as donor.

---

## Section 6 — Vision API  
**Blocked by:** S4.3 (schemas), S2 (donor auth)  
**Parallel with:** S5

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S6.1** | Gemini client + prompt | `src/lib/vision.ts` | Strict JSON → Zod; model flash vision. |
| **S6.2** | Analyze route | `src/app/api/vision/analyze/route.ts` | Multipart `image`, 5MB cap, donor auth. |
| **S6.3** | Offline fallback | same modules | Missing key / parse fail → heuristic + `offline: true`, `confidence: 0`. |

**Exit criteria:** POST image returns schema-valid JSON with or without `GEMINI_API_KEY`.

---

## Section 7 — Claims API  
**Blocked by:** S5.2, S2, S4  
**Parallel with:** none (short; do before UI claim flows)

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S7.1** | Create claim (transactional) | `src/app/api/claims/route.ts` | Stock check; increment `quantityClaimed`; `FULLY_CLAIMED` when 0 remain. |
| **S7.2** | List my claims | GET on claims route or `src/app/api/claims/mine/route.ts` | Include listing + donor address/phone + lat/lng for routing. |
| **S7.3** | Patch claim status | `src/app/api/claims/[id]/route.ts` | Donor: `PICKED_UP` / `NO_SHOW`. Recipient: `CANCELLED` restores stock if listing still active. |

**Exit criteria:** Claiming last portion cannot oversell under sequential requests.

---

## Section 8 — Donor UI  
**Blocked by:** S2, S3, S4, S5, S6  
**Parallel with:** S9

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S8.1** | Donor profile page | `src/app/donor/profile/page.tsx` (+ API if needed) | Create/edit orgName, address, lat/lng, phone. Seed may already have profile. |
| **S8.2** | New listing camera flow | `src/app/donor/listings/new/page.tsx` | `capture="environment"`; call vision analyze; editable fields; allergen highlight; pickup window; publish. |
| **S8.3** | Donor inbox | `src/app/donor/page.tsx` | My listings + claims; mark picked up / no-show. Offline AI banner when vision returns `offline`. |

**Exit criteria:** Donor can photo → confirm → publish; listing appears in GET /api/listings.

---

## Section 9 — Explore UI (map + list)  
**Blocked by:** S3, S5  
**Parallel with:** S8  
**Note:** Map component can be built against mock props if API lagging; wire to S5 before merge.

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S9.1** | Leaflet map component | `src/components/ListingsMap.tsx` | Dynamic import (SSR off); Louisville default center; pins for listings. |
| **S9.2** | Explore page | `src/app/explore/page.tsx` | List + map; show remaining portions + pickup window on every card. |
| **S9.3** | Filters | filters UI on explore | Distance / text query / allergen exclude (client or query params to API). |

**Exit criteria:** Seed listings visible on map and list without login.

---

## Section 10 — Listing detail + claim UI  
**Blocked by:** S7, S9  
**Parallel with:** none (depends on explore navigation)

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S10.1** | Listing detail page | `src/app/listings/[id]/page.tsx` | Photo, allergens, window, remaining; claim CTA. |
| **S10.2** | Claim form | client component on detail | Portion selector; auth gate → login; success → claims page. |
| **S10.3** | Empty/error states | shared across detail/explore | Sold out, expired, network errors. |

**Exit criteria:** Recipient claims a seed listing and sees it under My Claims.

---

## Section 11 — Route optimization  
**Blocked by:** S7.2, S10, S3  
**Parallel with:** none

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S11.1** | Geo + TSP helpers | `src/lib/geo.ts`, `src/lib/routing.ts` | Haversine, nearest-neighbor, optional 2-opt. |
| **S11.2** | Route optimize API | `src/app/api/route-optimize/route.ts` | OSRM call; degraded straight-line fallback. |
| **S11.3** | Pickup run UI | `src/app/claims/page.tsx` | Select ≥2 claims; show ordered stops + polyline on map; durations. |

**Exit criteria:** 2–3 reserved claims produce ordered itinerary &lt; 2s (or degraded path).

---

## Section 12 — Polish & demo readiness  
**Blocked by:** S8–S11 roughly complete  
**Parallel with:** small fixes only

| ID | Subtask | Deliverables | Notes for subagent |
|---|---|---|---|
| **S12.1** | Expiry UX pass | listing cards + APIs | Expired not claimable; donor sees expired state. |
| **S12.2** | Mobile QA pass | CSS/layout fixes | iPhone Safari camera input, tap targets, map height. |
| **S12.3** | README + judge script | `README.md` | Setup, env, seed, 3-minute demo path, disclaimer copy. |
| **S12.4** | Docs sync | touch PRD/TRD only if behavior drifted | Keep WORK_BREAKDOWN status notes optional. |

**Exit criteria:** Fresh clone → seed → demo path works without Gemini key (offline vision).

---

## Suggested multitask waves

| Wave | Assign in parallel | Wait for |
|---|---|---|
| **Wave 0** | S1.1 → S1.2 → S1.3 (one agent, sequential) | — |
| **Wave 1** | S2.*, S3.*, S4.* | S1 done |
| **Wave 2** | S5.*, S6.* | Wave 1 done |
| **Wave 3** | S7.* | S5 + S2 done |
| **Wave 4** | S8.*, S9.* | Wave 2–3 done |
| **Wave 5** | S10.* | S7 + S9 done |
| **Wave 6** | S11.* | S10 done |
| **Wave 7** | S12.* | S11 done |

---

## Subagent prompt template (copy/paste)

```text
You are implementing SurplusLink subtask <ID>: <title>.
Read docs/PRD.md, docs/TRD.md, and docs/WORK_BREAKDOWN.md.
Only implement this subtask’s deliverables. Do not expand scope.
Match existing code style and file paths in the TRD.
When done: list files changed, how to verify, and any blockers.
```

---

## Status tracker

| Section | Status |
|---|---|
| S1 Foundation | done (Wave 0 complete) |
| S2 Auth | not started |
| S3 Shell / design | not started |
| S4 Data layer | not started |
| S5 Listings API | not started |
| S6 Vision API | not started |
| S7 Claims API | not started |
| S8 Donor UI | not started |
| S9 Explore UI | not started |
| S10 Detail + claim UI | not started |
| S11 Route optimize | not started |
| S12 Polish + README | not started |
