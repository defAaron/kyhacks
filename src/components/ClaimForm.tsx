"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FormEvent, useMemo, useState } from "react";
import { ListingNotClaimable } from "@/components/ListingNotClaimable";
import { NetworkErrorAlert } from "@/components/NetworkErrorAlert";
import { Alert, Button } from "@/components/ui";
import type { ListingDto } from "@/lib/listing-dto";
import {
  FOOD_SAFETY_DISCLAIMER,
  getListingAvailability,
} from "@/lib/listing-status";

export type ClaimFormProps = {
  listing: ListingDto;
  /** Server-resolved auth so SSR can show claim CTA vs sign-in gate. */
  initiallyAuthenticated?: boolean;
};

function loginHref(listingId: string) {
  const callbackUrl = `/listings/${listingId}`;
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

function listingAfterConflict(
  listing: ListingDto,
  message: string,
): ListingDto {
  if (/pickup window/i.test(message)) {
    return { ...listing, status: "EXPIRED" };
  }
  if (/not enough portions|not available|fully claimed/i.test(message)) {
    return {
      ...listing,
      remainingPortions: 0,
      status: "FULLY_CLAIMED",
    };
  }
  return listing;
}

/**
 * Portion selector + claim CTA for listing detail (S10.2).
 * Auth gate → login with return; success → /claims.
 */
export function ClaimForm({
  listing,
  initiallyAuthenticated = false,
}: ClaimFormProps) {
  const router = useRouter();
  const { status } = useSession();
  const availability = useMemo(
    () => getListingAvailability(listing),
    [listing],
  );
  /** Prefer server hint while the client session is still resolving. */
  const isAuthenticated =
    status === "authenticated" ||
    (status !== "unauthenticated" && initiallyAuthenticated);

  const maxPortions = Math.max(0, listing.remainingPortions);
  const [portions, setPortions] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [pending, setPending] = useState(false);
  /** After a conflict response, freeze the form on a not-claimable state. */
  const [conflictListing, setConflictListing] = useState<ListingDto | null>(
    null,
  );

  const selectedPortions = Math.min(
    Math.max(1, portions),
    Math.max(1, maxPortions),
  );

  const displayListing = conflictListing ?? listing;
  const displayAvailability = conflictListing
    ? getListingAvailability(conflictListing)
    : availability;

  if (!displayAvailability.claimable || maxPortions < 1) {
    return (
      <div className="space-y-3">
        {error ? (
          <Alert variant="error" title="Claim failed">
            {error}
          </Alert>
        ) : null}
        <ListingNotClaimable
          listing={
            maxPortions < 1 && displayAvailability.claimable
              ? {
                  ...displayListing,
                  remainingPortions: 0,
                  status: "FULLY_CLAIMED",
                }
              : displayListing
          }
        />
        <p className="text-xs text-ink-muted">{FOOD_SAFETY_DISCLAIMER}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface/90 p-4 sm:p-5">
        <div>
          <h2 className="font-display text-xl text-green-700">Claim portions</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Sign in to reserve pickup portions for this listing.
          </p>
        </div>
        <Link
          href={loginHref(listing.id)}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-green-600 px-5 text-base font-medium text-surface transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:w-auto"
        >
          Sign in to claim
        </Link>
        <p className="text-xs text-ink-muted">{FOOD_SAFETY_DISCLAIMER}</p>
      </div>
    );
  }

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNetworkError(false);
    setPending(true);

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          portions: selectedPortions,
        }),
      });

      let data: { error?: string } = {};
      try {
        data = (await res.json()) as { error?: string };
      } catch {
        data = {};
      }

      if (res.status === 401) {
        router.push(loginHref(listing.id));
        return;
      }

      if (!res.ok) {
        const message = data.error ?? "Could not create claim";
        setError(message);
        setConflictListing(listingAfterConflict(listing, message));
        setPending(false);
        return;
      }

      router.push("/claims");
      router.refresh();
    } catch {
      setNetworkError(true);
      setPending(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface/90 p-4 sm:p-5">
      <div>
        <h2 className="font-display text-xl text-green-700">Claim portions</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Reserve up to {maxPortions} portion{maxPortions === 1 ? "" : "s"} for
          pickup during the window.
        </p>
      </div>

      <form onSubmit={submitClaim} className="space-y-4" noValidate>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">Portions</span>
          <select
            name="portions"
            value={selectedPortions}
            onChange={(e) => setPortions(Number(e.target.value))}
            disabled={pending}
            className="flex h-11 w-full max-w-[10rem] rounded-lg border border-border bg-surface px-3 py-2 text-base text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:opacity-50"
            aria-label="Number of portions to claim"
          >
            {Array.from({ length: maxPortions }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        {networkError ? (
          <NetworkErrorAlert
            message="Your claim could not be submitted. Check your connection and try again."
            onRetry={() => {
              setNetworkError(false);
              setError(null);
            }}
            retryLabel="Dismiss"
          />
        ) : null}

        {error && !networkError ? (
          <Alert variant="error" title="Claim failed">
            {error}
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="w-full sm:w-auto"
        >
          {pending ? "Claiming…" : "Claim for pickup"}
        </Button>
      </form>

      <p className="text-xs text-ink-muted">{FOOD_SAFETY_DISCLAIMER}</p>
    </div>
  );
}
