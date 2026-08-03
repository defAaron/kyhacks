import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { expireStaleListings } from "@/lib/db/expiry";
import { ACTIVE_CLAIM_STATUSES, toListingDto } from "@/lib/db/listing-dto";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/listings/[id] — public detail (TRD §5).
 * Donor phone omitted unless the requester has an active (RESERVED) claim.
 */
export async function GET(_request: Request, context: RouteContext) {
  await expireStaleListings();

  const { id } = await context.params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      donor: {
        select: {
          id: true,
          orgName: true,
          address: true,
          lat: true,
          lng: true,
          phone: true,
        },
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  let includePhone = false;
  const session = await auth();
  if (session?.user?.id) {
    const activeClaim = await prisma.claim.findFirst({
      where: {
        listingId: id,
        userId: session.user.id,
        status: { in: ACTIVE_CLAIM_STATUSES },
      },
      select: { id: true },
    });
    includePhone = Boolean(activeClaim);
  }

  return NextResponse.json({
    listing: toListingDto(listing, { includePhone }),
  });
}
