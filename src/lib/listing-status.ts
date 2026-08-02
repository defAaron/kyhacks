/**
 * Client-safe listing availability helpers for explore / detail / donor UI (S12.1).
 * Server expiry mutation lives in `expiry.ts`; this module only derives UX state.
 */

export type ListingStatusValue =
  | "AVAILABLE"
  | "FULLY_CLAIMED"
  | "EXPIRED"
  | "HANDED_OFF";

export type ListingAvailabilityInput = {
  status: ListingStatusValue | string;
  pickupEnd: string | Date;
  remainingPortions?: number;
  quantityAvailable?: number;
  quantityClaimed?: number;
};

export type ListingAvailabilityKind =
  | "available"
  | "expired"
  | "sold_out"
  | "handed_off"
  | "window_ended";

export type ListingAvailability = {
  kind: ListingAvailabilityKind;
  /** Can create a new claim right now */
  claimable: boolean;
  /** Short badge label */
  label: string;
  /** Longer helper for empty/disabled CTA states */
  message: string;
  /** Suggested Badge variant from `@/components/ui` */
  badgeVariant: "success" | "warning" | "danger" | "muted" | "default";
};

function remainingOf(listing: ListingAvailabilityInput): number {
  if (typeof listing.remainingPortions === "number") {
    return Math.max(0, listing.remainingPortions);
  }
  const available = listing.quantityAvailable ?? 0;
  const claimed = listing.quantityClaimed ?? 0;
  return Math.max(0, available - claimed);
}

function pickupEndDate(pickupEnd: string | Date): Date {
  return pickupEnd instanceof Date ? pickupEnd : new Date(pickupEnd);
}

/** True when pickup window has ended (client clock). */
export function isPickupWindowEnded(
  pickupEnd: string | Date,
  now: Date = new Date(),
): boolean {
  return pickupEndDate(pickupEnd).getTime() <= now.getTime();
}

/**
 * Whether a recipient may claim portions.
 * Matches server rules: AVAILABLE, remaining > 0, now < pickupEnd.
 */
export function isListingClaimable(
  listing: ListingAvailabilityInput,
  now: Date = new Date(),
): boolean {
  if (listing.status !== "AVAILABLE") return false;
  if (remainingOf(listing) < 1) return false;
  if (isPickupWindowEnded(listing.pickupEnd, now)) return false;
  return true;
}

/** UX copy + badge mapping for listing cards and detail CTAs. */
export function getListingAvailability(
  listing: ListingAvailabilityInput,
  now: Date = new Date(),
): ListingAvailability {
  const remaining = remainingOf(listing);
  const windowEnded = isPickupWindowEnded(listing.pickupEnd, now);

  if (listing.status === "EXPIRED" || windowEnded) {
    return {
      kind: listing.status === "EXPIRED" ? "expired" : "window_ended",
      claimable: false,
      label: "Expired",
      message: "Pickup window ended — this listing is no longer claimable.",
      badgeVariant: "muted",
    };
  }

  if (listing.status === "HANDED_OFF") {
    return {
      kind: "handed_off",
      claimable: false,
      label: "Handed off",
      message: "This surplus has already been handed off.",
      badgeVariant: "muted",
    };
  }

  if (listing.status === "FULLY_CLAIMED" || remaining < 1) {
    return {
      kind: "sold_out",
      claimable: false,
      label: "Fully claimed",
      message: "All portions have been claimed.",
      badgeVariant: "warning",
    };
  }

  return {
    kind: "available",
    claimable: true,
    label: remaining === 1 ? "1 left" : `${remaining} left`,
    message: "Available to claim during the pickup window.",
    badgeVariant: "success",
  };
}

/** Donor-facing status label (inbox / my listings). */
export function getDonorListingStatusLabel(
  listing: ListingAvailabilityInput,
  now: Date = new Date(),
): string {
  const availability = getListingAvailability(listing, now);
  if (availability.kind === "expired" || availability.kind === "window_ended") {
    return "Expired";
  }
  if (listing.status === "HANDED_OFF") return "Handed off";
  if (availability.kind === "sold_out") return "Fully claimed";
  return "Available";
}

/** Format pickup window for cards (compact, locale-friendly). */
export function formatPickupWindow(
  pickupStart: string | Date,
  pickupEnd: string | Date,
  timeZone?: string,
): string {
  const start = pickupStart instanceof Date ? pickupStart : new Date(pickupStart);
  const end = pickupEnd instanceof Date ? pickupEnd : new Date(pickupEnd);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  };
  const fmt = new Intl.DateTimeFormat(undefined, opts);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

/** Food-safety disclaimer (PRD §13) — show near publish / claim. */
export const FOOD_SAFETY_DISCLAIMER =
  "Donors remain responsible for food handling and safety. Allergen suggestions are assistive, not guarantees — confirm before pickup.";

export const VISION_OFFLINE_BANNER =
  "AI offline — manual entry. Suggestions are heuristic; confirm allergens and quantity before publishing.";
