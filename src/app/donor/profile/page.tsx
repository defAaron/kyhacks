import type { Metadata } from "next";
import { DonorProfileForm } from "@/components/donor/DonorProfileForm";
import { DonorSubnav } from "@/components/donor/DonorSubnav";
import { prisma } from "@/lib/db/prisma";
import { requireDonor } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Donor profile",
  description: "Create or edit your SurplusLink donor organization profile.",
};

const DEFAULT_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_CITY_LAT ?? "38.2527");
const DEFAULT_LNG = Number(process.env.NEXT_PUBLIC_DEFAULT_CITY_LNG ?? "-85.7585");

export default async function DonorProfilePage() {
  const session = await requireDonor();
  const profile = await prisma.donorProfile.findUnique({
    where: { userId: session.user.id },
  });

  const initial = {
    orgName: profile?.orgName ?? "",
    address: profile?.address ?? "",
    lat: profile?.lat ?? (Number.isFinite(DEFAULT_LAT) ? DEFAULT_LAT : 38.2527),
    lng: profile?.lng ?? (Number.isFinite(DEFAULT_LNG) ? DEFAULT_LNG : -85.7585),
    phone: profile?.phone ?? "",
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-10">
      <DonorSubnav current="/donor/profile" />

      <header className="mb-6">
        <h1 className="font-display text-3xl tracking-tight text-mist">
          Donor profile
        </h1>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          {profile
            ? "Update your organization details used for pickup location and contact."
            : "Set up your organization so you can publish surplus listings."}
        </p>
      </header>

      <div className="panel rounded-2xl p-5 sm:p-6">
        <DonorProfileForm initial={initial} isNew={!profile} />
      </div>
    </main>
  );
}
