import { ListingStatus } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Flip listings whose pickup window has ended to EXPIRED (TRD §5 / PRD §8).
 * Safe to call on read paths and via `POST /api/expire`.
 */
export async function expireStaleListings(now = new Date()): Promise<number> {
  const result = await prisma.listing.updateMany({
    where: {
      pickupEnd: { lt: now },
      status: { notIn: [ListingStatus.EXPIRED, ListingStatus.HANDED_OFF] },
    },
    data: { status: ListingStatus.EXPIRED },
  });
  return result.count;
}
