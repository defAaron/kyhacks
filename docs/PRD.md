# SurplusLink — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Draft for review  
**Product name:** SurplusLink  
**Platform:** Next.js mobile-friendly web app  
**Vision:** Gemini Vision for leftover photo classification  

---

## 1. Problem

Restaurants and pantries discard edible surplus while nearby people face food insecurity. Discovery is fragmented, surplus is time-sensitive, and pickup logistics are unclear. People who could benefit often do not know what is available, where, or when.

## 2. Solution

A mobile-friendly web app where:

1. A restaurant photographs leftover food.
2. Gemini Vision classifies it (name, tags, allergens, suggested quantity).
3. Staff confirms details and sets a pickup window and quantity.
4. Listings appear on a live public dashboard/map.
5. Recipients claim items and get an optimized pickup route across multiple stops.

## 3. Goals (hackathon MVP)

- End-to-end demo in under 3 minutes: photo → listing → claim → route
- Clear dual personas: **Restaurant (Donor)** and **Recipient**
- Real computer-vision value (not mock-only), with graceful fallback if the API key is missing
- Privacy-respecting: no recipient PII on the public board beyond claim status

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
- As a recipient, I filter by distance, pickup window, category, and allergens to avoid.
- As a recipient, I claim N portions (atomic decrement of inventory).
- As a recipient, I add multiple claims to a “pickup run” and get an optimized route + stop order.
- As a recipient, I see claim confirmation with address, window, and what to ask for at pickup.

## 7. Core flows

```text
Restaurant: Capture photo → Gemini Vision → Confirm listing → Publish with pickup window
Public board: Live listings on map + feed
Recipient: Claim portions → Build pickup run → Optimize route → Navigate stops
```

## 8. Functional requirements

1. **Auth / roles:** Users sign in and act as `DONOR` or `RECIPIENT` (demo accounts; role switchable for demo).
2. **Donor profile:** org name, address, coordinates, contact phone (phone shown only after claim).
3. **Listing creation:** image upload → Vision analysis → editable fields → publish.
4. **Listing fields:** photo URL, title, description, categories[], allergens[], quantityAvailable, quantityClaimed, pickupStart, pickupEnd, status (`AVAILABLE` | `FULLY_CLAIMED` | `EXPIRED` | `HANDED_OFF`), donorId; location inherited from donor.
5. **Public dashboard:** cards + map pins for `AVAILABLE` listings within active pickup windows (or starting soon).
6. **Claim:** recipient claims 1..N portions; stock decrements transactionally; claim record created.
7. **Pickup run / routing:** select 2+ claims → nearest-neighbor / 2-opt order from user geolocation → polyline + stop list via OSRM.
8. **Expiry:** listings past `pickupEnd` auto-flip to `EXPIRED` (on read + lightweight API/cron route).
9. **Donor fulfillment:** mark claim `PICKED_UP` or `NO_SHOW`.

## 9. UX requirements

- Mobile-first; restaurant flow optimized for phone camera.
- First useful screen for recipients = map/feed of food available now — not a marketing landing wall of stats.
- Brand-forward name **SurplusLink** as hero on marketing/home; app screens prioritize task UI.
- Pickup window and remaining portions always visible on cards.
- Loading / error / empty states for Vision and maps.
- Accessibility: large tap targets, sufficient contrast, alt text on food images.
- Visual direction: warm food-rescue aesthetic (greens/amber/cream textures). Avoid purple-gradient “AI default,” dark neon glow, or generic system fonts as the primary brand voice.

## 10. MVP screens

1. Home / role gate  
2. Donor: profile setup  
3. Donor: new listing (camera → review → publish)  
4. Donor: my listings + claims inbox  
5. Recipient: explore (map + list)  
6. Recipient: listing detail → claim  
7. Recipient: my claims / pickup run + route  

## 11. Success metrics (demo)

- Time from photo to published listing &lt; 30s
- Claim succeeds without oversell under concurrent demo clicks
- Route for 3 stops returns ordered itinerary &lt; 2s
- Judges understand value without narration beyond 30s

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Food safety liability perception | Copy: donors remain responsible; surplus-share / Good Samaritan framing; no medical claims |
| Vision mislabels allergens | Always human-confirm; allergen field editable and highlighted |
| Oversell | DB transaction / conditional update on quantity |
| No Gemini key in demo | Fallback classifier + banner “AI offline — manual entry” |
| Map API cost | Leaflet + OSM tiles + public OSRM |

## 13. Copy / trust notes

- Public board does not expose recipient identity.
- Donor contact phone is revealed only after a successful claim.
- Allergen suggestions are assistive, not guarantees — staff must confirm.
- Disclaimer on listing/publish: food handling remains the donor’s responsibility.

## 14. Open questions for stakeholders

- Final product name (SurplusLink is working title).
- Whether pantries need a distinct donor subtype in v1 UI (schema can treat them the same).
- Whether claim cancellation by recipients is in MVP (recommended: yes, restores stock if still within window).

---

*End of PRD*
