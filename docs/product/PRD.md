# SurplusLink — Product Requirements Document (PRD)

**Version:** 1.2  
**Status:** MVP complete · deployed  
**Product name:** SurplusLink  
**Platform:** Next.js mobile-friendly web app  
**Production:** [https://kyhacks.vercel.app](https://kyhacks.vercel.app)  
**Vision:** Local Food-101 classifier (`@huggingface/transformers` / ONNX) — free, no cloud API key  
**Data:** Supabase Postgres (Prisma)  

---

## 1. Problem

Restaurants and pantries discard edible surplus while nearby people face food insecurity. Discovery is fragmented, surplus is time-sensitive, and pickup logistics are unclear. People who could benefit often do not know what is available, where, or when.

## 2. Solution

A mobile-friendly web app where:

1. A restaurant photographs leftover food.
2. A **local Food-101** image classifier suggests a dish name, categories, allergen heuristics, and quantity (staff always confirm).
3. Staff confirms details and sets a pickup window and quantity.
4. Listings appear on a live public dashboard/map.
5. Recipients claim items and get an optimized pickup route across multiple stops.

## 3. Goals (hackathon MVP)

- End-to-end demo in under 3 minutes: photo → listing → claim → route
- Clear dual personas: **Restaurant (Donor)** and **Recipient**
- Real computer-vision value (local Food-101 ONNX), with graceful offline / rate-limit fallback — no paid vision API
- Privacy-respecting: no recipient PII on the public board beyond claim status
- Deployed demo on Vercel with hosted Postgres (Supabase)

## 4. Non-goals (v1)

- Payments or delivery drivers
- Native mobile apps (iOS/Android stores)
- Full restaurant inventory / ERP
- Real-time chat
- Regulatory food-safety certification workflows
- Multi-language support (English only for MVP)
- Push notifications / SMS
- Admin moderation console
- Stripe / donations
- Cloud vision APIs (Gemini, etc.) — replaced by free local CV
- Supabase Auth / Storage (Postgres only for MVP)

## 5. Personas

| Persona | Needs |
|---|---|
| Restaurant staff | Fast leftover listing from phone camera; minimal typing |
| Recipient | See what’s available nearby, claim, know when/where to pick up, efficient multi-stop route |
| Pantry partner (soft) | Same as restaurant; treated as a “donor org” type |

## 6. User stories

### Restaurant / Donor

- As staff, I can create a donor profile (name, address, lat/lng, phone).
- As staff, I can capture or upload a photo of surplus food.
- As staff, I see AI-suggested title, category, allergens, and quantity, and can edit before publish.
- As staff, I set a pickup window (start/end) and available portions.
- As staff, I see my active listings and mark claimed items as handed off / no-show / expired.

### Recipient

- As a recipient, I browse a live dashboard of available surplus (list + map).
- As a recipient, I filter by distance, text query, and allergens to avoid.
- As a recipient, I claim N portions (atomic decrement of inventory).
- As a recipient, I cancel a claim and restore stock if the listing is still active.
- As a recipient, I add multiple claims to a “pickup run” and get an optimized route + stop order.
- As a recipient, I see claim confirmation with address, window, and what to ask for at pickup.

## 7. Core flows

```text
Restaurant: Capture photo → Local Food-101 classify → Confirm listing → Publish with pickup window
Public board: Live listings on map + feed
Recipient: Claim portions → Build pickup run → Optimize route → Navigate stops
```

## 8. Functional requirements

1. **Auth / roles:** Users sign in as `DONOR` or `RECIPIENT` (seeded demo accounts).
2. **Donor profile:** org name, address, coordinates, contact phone (phone shown only after claim).
3. **Listing creation:** image upload → local Vision analysis → editable fields → publish.
4. **Listing fields:** photo URL (or data URL in production), title, description, categories[], allergens[], quantityAvailable, quantityClaimed, pickupStart, pickupEnd, status, donorId; location inherited from donor.
5. **Public dashboard:** cards + map pins for `AVAILABLE` listings within active pickup windows.
6. **Claim:** recipient claims 1..N portions; stock decrements transactionally.
7. **Claim cancel:** recipient can set `CANCELLED`; stock restored if listing still active.
8. **Pickup run / routing:** select 2+ claims → nearest-neighbor / 2-opt → polyline via OSRM (straight-line fallback).
9. **Expiry:** listings past `pickupEnd` auto-flip to `EXPIRED` (on read + expire route).
10. **Donor fulfillment:** mark claim `PICKED_UP` or `NO_SHOW`.

## 9. UX requirements

- Mobile-first; restaurant flow optimized for phone camera.
- Marketing home: brand-first hero, then problem → solution → how-it-works (interactive architecture pipeline) → FAQ → CTA.
- Pickup window and remaining portions always visible on cards.
- Offline / rate-limit banners when classification is skipped.
- Warm food-rescue aesthetic (greens/amber/parchment). Avoid purple-gradient “AI default.”

## 10. MVP screens (shipped)

1. Home / marketing + architecture FAQ  
2. Login (demo credentials)  
3. Donor: profile setup  
4. Donor: new listing (camera → review → publish)  
5. Donor: my listings + claims inbox  
6. Recipient: explore (map + list + filters)  
7. Recipient: listing detail → claim  
8. Recipient: my claims / pickup run + route  

## 11. Success metrics (demo)

- Time from photo to published listing &lt; 30s after model warm  
- Claim succeeds without oversell  
- Route for 3 stops returns ordered itinerary &lt; 2s  
- Production site serves seed listings from Supabase Postgres  

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Food safety liability | Donors remain responsible; Good Samaritan framing |
| Vision mislabels allergens | Heuristics from dish label; always human-confirm |
| Oversell | DB transaction on claim |
| Local model slow / fails on Vercel | Offline fallback + banner |
| Supabase IPv6-only direct host | Use Transaction pooler for `DATABASE_URL` on Vercel |
| Vision CPU abuse | `VISION_*` rate limits |

## 13. Copy / trust notes

- Public board does not expose recipient identity.
- Donor contact phone is revealed only after a successful claim.
- Allergen suggestions are assistive, not guarantees — staff must confirm.
- Disclaimer: food handling remains the donor’s responsibility.

## 14. Product decisions (MVP)

- Product name: **SurplusLink**
- Pantries use the same donor profile type as restaurants
- Claim cancellation is in MVP
- Vision: free local Food-101 ONNX — no Gemini
- Hosting: Vercel + Supabase Postgres

---

*End of PRD*
