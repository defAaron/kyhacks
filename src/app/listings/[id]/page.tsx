import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimForm } from "@/components/ClaimForm";
import { ListingStatusBadge } from "@/components/ListingStatusBadge";
import { Badge } from "@/components/ui";
import { auth } from "@/lib/auth";
import { expireStaleListings } from "@/lib/expiry";
import { toListingDto } from "@/lib/listing-dto";
import {
  formatPickupWindow,
  getListingAvailability,
} from "@/lib/listing-status";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { title: true },
  });
  return {
    title: listing?.title ?? "Listing",
    description: listing
      ? `${listing.title} — surplus pickup on SurplusLink`
      : "Listing not found",
  };
}

/**
 * Listing detail + claim UI (S10.1–S10.3).
 * Photo, allergens, pickup window, remaining portions, and claim CTA.
 */
export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  await expireStaleListings();

  const row = await prisma.listing.findUnique({
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

  if (!row) {
    notFound();
  }

  const listing = toListingDto(row, { includePhone: false });
  const availability = getListingAvailability(listing);
  const windowLabel = formatPickupWindow(
    listing.pickupStart,
    listing.pickupEnd,
  );
  const session = await auth();
  const initiallyAuthenticated = Boolean(session?.user);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <p className="mb-4">
        <Link
          href="/explore"
          className="inline-flex min-h-11 items-center text-sm font-medium text-green-600 underline-offset-2 hover:underline"
        >
          ← Back to explore
        </Link>
      </p>

      <article className="space-y-6">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-cream-deep">
          <Image
            src={listing.photoUrl}
            alt={listing.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            unoptimized
          />
        </div>

        <header className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-display text-3xl tracking-tight text-green-700 sm:text-4xl">
              {listing.title}
            </h1>
            <ListingStatusBadge listing={listing} />
          </div>
          <p className="text-base text-ink-muted">
            {listing.donor.orgName}
            <span className="text-ink-muted/80"> · </span>
            {listing.donor.address}
          </p>
        </header>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface/80 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Pickup window
            </dt>
            <dd className="mt-1 text-base text-ink">{windowLabel}</dd>
          </div>
          <div className="rounded-xl border border-border bg-surface/80 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Remaining
            </dt>
            <dd className="mt-1 text-base text-ink">
              {listing.remainingPortions} of {listing.quantityAvailable} portion
              {listing.quantityAvailable === 1 ? "" : "s"}
              {availability.claimable ? null : (
                <span className="mt-0.5 block text-sm text-ink-muted">
                  {availability.message}
                </span>
              )}
            </dd>
          </div>
        </dl>

        {listing.description ? (
          <p className="text-base leading-relaxed text-ink">
            {listing.description}
          </p>
        ) : null}

        <section aria-label="Allergens" className="space-y-2">
          <h2 className="text-sm font-medium text-ink">Allergens</h2>
          {listing.allergens.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {listing.allergens.map((allergen) => (
                <Badge key={allergen} variant="warning">
                  {allergen}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              No allergens listed — confirm with the donor at pickup.
            </p>
          )}
        </section>

        {listing.categories.length > 0 ? (
          <section aria-label="Categories" className="space-y-2">
            <h2 className="text-sm font-medium text-ink">Categories</h2>
            <div className="flex flex-wrap gap-2">
              {listing.categories.map((category) => (
                <Badge key={category} variant="muted">
                  {category}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        <ClaimForm
          listing={listing}
          initiallyAuthenticated={initiallyAuthenticated}
        />
      </article>
    </main>
  );
}
