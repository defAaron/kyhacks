import { NextResponse } from "next/server";
import { ListingStatus, Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { toListingDto } from "@/lib/listing-dto";
import { prisma } from "@/lib/prisma";
import { claimCreateSchema } from "@/lib/schemas";

class ClaimConflictError extends Error {
  constructor(
    message: string,
    readonly status = 409,
  ) {
    super(message);
    this.name = "ClaimConflictError";
  }
}

const claimInclude = {
  listing: {
    include: {
      donor: {
        select: {
          id: true,
          orgName: true,
          address: true,
          phone: true,
          lat: true,
          lng: true,
        },
      },
    },
  },
} as const;

function serializeClaim(claim: {
  id: string;
  listingId: string;
  userId: string;
  portions: number;
  status: string;
  createdAt: Date;
  listing: Parameters<typeof toListingDto>[0];
}) {
  return {
    id: claim.id,
    listingId: claim.listingId,
    userId: claim.userId,
    portions: claim.portions,
    status: claim.status,
    createdAt: claim.createdAt.toISOString(),
    // Claim owners always get donor address/phone/lat/lng for routing (S7.2).
    listing: toListingDto(claim.listing, { includePhone: true }),
  };
}

/**
 * GET /api/claims — list the signed-in user's claims with listing + donor
 * routing fields (address, phone, lat/lng) for pickup runs (S7.2 / TRD §5).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claims = await prisma.claim.findMany({
    where: { userId: session.user.id },
    include: claimInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    claims: claims.map(serializeClaim),
  });
}

/**
 * POST /api/claims — transactional create with stock check (S7.1 / TRD §7).
 * Auth: any signed-in user (demo-friendly; TRD §5).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = claimCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { listingId, portions } = parsed.data;
  const now = new Date();
  const userId = session.user.id;

  try {
    const claim = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
      });

      if (!listing) {
        throw new ClaimConflictError("Listing not found", 404);
      }

      if (listing.pickupEnd <= now) {
        if (listing.status !== ListingStatus.EXPIRED) {
          await tx.listing.update({
            where: { id: listingId },
            data: { status: ListingStatus.EXPIRED },
          });
        }
        throw new ClaimConflictError("Listing pickup window has ended");
      }

      if (listing.status !== ListingStatus.AVAILABLE) {
        throw new ClaimConflictError("Listing is not available to claim");
      }

      const remaining = listing.quantityAvailable - listing.quantityClaimed;
      if (remaining < portions) {
        throw new ClaimConflictError("Not enough portions remaining");
      }

      // Conditional update: refuses if stock/status changed under us (no oversell).
      const stockUpdate = await tx.listing.updateMany({
        where: {
          id: listingId,
          status: ListingStatus.AVAILABLE,
          quantityClaimed: listing.quantityClaimed,
          pickupEnd: { gt: now },
        },
        data: {
          quantityClaimed: { increment: portions },
          ...(remaining - portions === 0
            ? { status: ListingStatus.FULLY_CLAIMED }
            : {}),
        },
      });

      if (stockUpdate.count !== 1) {
        throw new ClaimConflictError("Not enough portions remaining");
      }

      return tx.claim.create({
        data: {
          listingId,
          userId,
          portions,
        },
        include: claimInclude,
      });
    });

    return NextResponse.json(
      { claim: serializeClaim(claim) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ClaimConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    console.error("POST /api/claims failed", error);
    return NextResponse.json(
      { error: "Failed to create claim" },
      { status: 500 },
    );
  }
}
