import { NextResponse } from "next/server";
import { ClaimStatus, ListingStatus, Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { toListingDto } from "@/lib/db/listing-dto";
import { prisma } from "@/lib/db/prisma";
import { claimStatusPatchSchema } from "@/lib/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

class ClaimPatchError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ClaimPatchError";
  }
}

const claimInclude = {
  listing: {
    include: {
      donor: {
        select: {
          id: true,
          userId: true,
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

/**
 * PATCH /api/claims/[id] — status transitions (S7.3 / TRD §5).
 * Donor (listing owner): PICKED_UP / NO_SHOW
 * Recipient (claim owner): CANCELLED — restores stock if listing still active
 */
export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = claimStatusPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const nextStatus = parsed.data.status as ClaimStatus;

  try {
    const claim = await prisma.$transaction(async (tx) => {
      const existing = await tx.claim.findUnique({
        where: { id },
        include: claimInclude,
      });

      if (!existing) {
        throw new ClaimPatchError("Claim not found", 404);
      }

      if (existing.status !== ClaimStatus.RESERVED) {
        throw new ClaimPatchError(
          `Claim cannot transition from ${existing.status}`,
          409,
        );
      }

      const isClaimOwner = existing.userId === userId;
      const isListingDonor = existing.listing.donor.userId === userId;

      if (nextStatus === ClaimStatus.CANCELLED) {
        if (!isClaimOwner) {
          throw new ClaimPatchError(
            "Only the claim owner can cancel this claim",
            403,
          );
        }

        const listing = existing.listing;
        const listingActive =
          listing.status === ListingStatus.AVAILABLE ||
          listing.status === ListingStatus.FULLY_CLAIMED;

        if (listingActive) {
          const nextClaimed = Math.max(
            0,
            listing.quantityClaimed - existing.portions,
          );

          await tx.listing.update({
            where: { id: listing.id },
            data: {
              quantityClaimed: nextClaimed,
              ...(nextClaimed < listing.quantityAvailable
                ? { status: ListingStatus.AVAILABLE }
                : {}),
            },
          });
        }

        return tx.claim.update({
          where: { id },
          data: { status: ClaimStatus.CANCELLED },
          include: claimInclude,
        });
      }

      // Donor fulfillment: PICKED_UP / NO_SHOW
      if (
        nextStatus !== ClaimStatus.PICKED_UP &&
        nextStatus !== ClaimStatus.NO_SHOW
      ) {
        throw new ClaimPatchError("Invalid status transition", 400);
      }

      if (!isListingDonor) {
        throw new ClaimPatchError(
          "Only the listing donor can mark pickup / no-show",
          403,
        );
      }

      return tx.claim.update({
        where: { id },
        data: { status: nextStatus },
        include: claimInclude,
      });
    });

    return NextResponse.json({
      claim: {
        id: claim.id,
        listingId: claim.listingId,
        userId: claim.userId,
        portions: claim.portions,
        status: claim.status,
        createdAt: claim.createdAt.toISOString(),
        listing: toListingDto(claim.listing, { includePhone: true }),
      },
    });
  } catch (error) {
    if (error instanceof ClaimPatchError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    console.error("PATCH /api/claims/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to update claim" },
      { status: 500 },
    );
  }
}
