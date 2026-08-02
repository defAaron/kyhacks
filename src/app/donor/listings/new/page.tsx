import type { Metadata } from "next";
import Link from "next/link";
import { DonorSubnav } from "@/components/donor/DonorSubnav";
import { NewListingForm } from "@/components/donor/NewListingForm";
import { Alert } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireDonor } from "@/lib/session";

export const metadata: Metadata = {
  title: "New listing",
  description: "Photograph surplus food, confirm AI suggestions, and publish.",
};

export default async function NewListingPage() {
  const session = await requireDonor();
  const profile = await prisma.donorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-10">
      <DonorSubnav current="/donor/listings/new" />

      <header className="mb-6">
        <h1 className="font-display text-3xl tracking-tight text-green-700">
          New listing
        </h1>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Photo → confirm details → publish with a pickup window.
        </p>
      </header>

      {!profile ? (
        <Alert variant="error" title="Profile required">
          Create your donor profile before publishing listings.{" "}
          <Link href="/donor/profile" className="font-medium underline-offset-2 hover:underline">
            Set up profile
          </Link>
        </Alert>
      ) : (
        <div className="rounded-2xl border border-border bg-surface/90 p-5 sm:p-6">
          <NewListingForm />
        </div>
      )}
    </main>
  );
}
