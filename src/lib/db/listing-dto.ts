import type { ClaimStatus, Listing, ListingStatus } from "@prisma/client";

type DonorFields = {
  id: string;
  orgName: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string | null;
};

type ListingWithDonor = Listing & {
  donor: DonorFields;
};

function parseJsonStringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export type ListingDto = {
  id: string;
  photoUrl: string;
  title: string;
  description: string | null;
  categories: string[];
  allergens: string[];
  quantityAvailable: number;
  quantityClaimed: number;
  remainingPortions: number;
  pickupStart: string;
  pickupEnd: string;
  status: ListingStatus;
  visionRaw: unknown;
  createdAt: string;
  donor: {
    id: string;
    orgName: string;
    address: string;
    lat: number;
    lng: number;
    phone?: string;
  };
};

/**
 * Public listing shape. Donor phone is omitted unless `includePhone` is true
 * (requester has an active claim — TRD §5).
 */
export function toListingDto(
  listing: ListingWithDonor,
  options?: { includePhone?: boolean },
): ListingDto {
  const remainingPortions = Math.max(
    0,
    listing.quantityAvailable - listing.quantityClaimed,
  );

  let visionRaw: unknown = null;
  if (listing.visionRaw) {
    try {
      visionRaw = JSON.parse(listing.visionRaw);
    } catch {
      visionRaw = listing.visionRaw;
    }
  }

  const donor: ListingDto["donor"] = {
    id: listing.donor.id,
    orgName: listing.donor.orgName,
    address: listing.donor.address,
    lat: listing.donor.lat,
    lng: listing.donor.lng,
  };

  if (options?.includePhone && listing.donor.phone) {
    donor.phone = listing.donor.phone;
  }

  return {
    id: listing.id,
    photoUrl: listing.photoUrl,
    title: listing.title,
    description: listing.description,
    categories: parseJsonStringArray(listing.categories),
    allergens: parseJsonStringArray(listing.allergens),
    quantityAvailable: listing.quantityAvailable,
    quantityClaimed: listing.quantityClaimed,
    remainingPortions,
    pickupStart: listing.pickupStart.toISOString(),
    pickupEnd: listing.pickupEnd.toISOString(),
    status: listing.status,
    visionRaw,
    createdAt: listing.createdAt.toISOString(),
    donor,
  };
}

/** Active claim for contact reveal: reserved (not cancelled / completed no-show). */
export const ACTIVE_CLAIM_STATUSES: ClaimStatus[] = ["RESERVED"];
