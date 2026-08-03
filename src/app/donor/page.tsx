import type { Metadata } from "next";
import Link from "next/link";
import {
  DonorInbox,
  type InboxListing,
} from "@/components/donor/DonorInbox";
import { DonorSubnav } from "@/components/donor/DonorSubnav";
import { Alert } from "@/components/ui";
import { expireStaleListings } from "@/lib/expiry";
import { prisma } from "@/lib/prisma";
import { requireDonor } from "@/lib/session";

export const metadata: Metadata = {
  title: "Donor inbox",
  description: "Manage your SurplusLink listings and claims.",
};

export default async function DonorInboxPage() {
  const session = await requireDonor();
  await expireStaleListings();

  const profile = await prisma.donorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, orgName: true },
  });

  let listings: InboxListing[] = [];

  if (profile) {
    const rows = await prisma.listing.findMany({
      where: { donorId: profile.id },
      include: {
        claims: {
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    listings = rows.map((row) => ({
      id: row.id,
      title: row.title,
      photoUrl: row.photoUrl,
      status: row.status,
      quantityAvailable: row.quantityAvailable,
      quantityClaimed: row.quantityClaimed,
      remainingPortions: Math.max(
        0,
        row.quantityAvailable - row.quantityClaimed,
      ),
      pickupStart: row.pickupStart.toISOString(),
      pickupEnd: row.pickupEnd.toISOString(),
      claims: row.claims.map((claim) => ({
        id: claim.id,
        portions: claim.portions,
        status: claim.status,
        createdAt: claim.createdAt.toISOString(),
        claimantName: claim.user.name,
        claimantEmail: claim.user.email,
      })),
    }));
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <DonorSubnav current="/donor" />

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-tight text-mist">
            Donor inbox
          </h1>
          <p className="mt-2 text-sm text-ink-muted sm:text-base">
            {profile
              ? `${profile.orgName} — your listings and claim handoffs.`
              : "Set up your profile, then publish surplus listings."}
          </p>
        </div>
        {profile ? (
          <Link
            href="/donor/listings/new"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-teal px-4 text-sm font-medium text-void transition-all duration-300 hover:bg-green-600 hover:shadow-[0_8px_28px_rgba(143,162,138,0.35)] active:scale-[0.98] sm:w-auto"
          >
            New listing
          </Link>
        ) : null}
      </header>

      {!profile ? (
        <Alert variant="info" title="Complete your donor profile">
          Add your organization name, address, and coordinates before listing
          surplus.{" "}
          <Link
            href="/donor/profile"
            className="font-medium underline-offset-2 hover:underline"
          >
            Create profile
          </Link>
        </Alert>
      ) : (
        <DonorInbox listings={listings} />
      )}
    </main>
  );
}
