import type { Metadata } from "next";
import { ClaimsClient } from "@/app/claims/ClaimsClient";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "My claims",
  description:
    "View reserved pickups and build an optimized SurplusLink pickup run.",
};

/**
 * Recipient claims + pickup-run UI (S11.3).
 * Auth-gated: signed-in users only (recipients with claims).
 */
export default async function ClaimsPage() {
  await requireSession();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl tracking-tight text-green-700 sm:text-4xl">
          My claims
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-muted sm:text-base">
          Build a pickup run from reserved claims — optimized stop order, drive
          times, and a route on the map.
        </p>
      </header>

      <ClaimsClient />
    </main>
  );
}
