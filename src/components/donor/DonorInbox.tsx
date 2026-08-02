"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ListingStatusBadge } from "@/components/ListingStatusBadge";
import { Alert, Badge, Button } from "@/components/ui";
import {
  formatPickupWindow,
  getListingAvailability,
} from "@/lib/listing-status";

export type InboxClaim = {
  id: string;
  portions: number;
  status: string;
  createdAt: string;
  claimantName: string | null;
  claimantEmail: string;
};

export type InboxListing = {
  id: string;
  title: string;
  photoUrl: string;
  status: string;
  quantityAvailable: number;
  quantityClaimed: number;
  remainingPortions: number;
  pickupStart: string;
  pickupEnd: string;
  claims: InboxClaim[];
};

function claimBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "RESERVED":
      return "success";
    case "PICKED_UP":
      return "default";
    case "NO_SHOW":
      return "danger";
    case "CANCELLED":
      return "muted";
    default:
      return "warning";
  }
}

function ClaimActions({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"PICKED_UP" | "NO_SHOW" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patchStatus(status: "PICKED_UP" | "NO_SHOW") {
    setError(null);
    setPending(status);
    try {
      const res = await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Could not update claim.";
        setError(message);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error updating claim.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="md"
          disabled={pending !== null}
          onClick={() => patchStatus("PICKED_UP")}
        >
          {pending === "PICKED_UP" ? "Saving…" : "Mark picked up"}
        </Button>
        <Button
          size="md"
          variant="secondary"
          disabled={pending !== null}
          onClick={() => patchStatus("NO_SHOW")}
        >
          {pending === "NO_SHOW" ? "Saving…" : "No-show"}
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DonorInbox({ listings }: { listings: InboxListing[] }) {
  if (listings.length === 0) {
    return (
      <Alert variant="info" title="No listings yet">
        Publish your first surplus listing from New listing. Recipients will
        claim portions and show up here.
      </Alert>
    );
  }

  const openClaims = listings.flatMap((listing) =>
    listing.claims.filter((c) => c.status === "RESERVED"),
  );

  return (
    <div className="space-y-8">
      {openClaims.length > 0 ? (
        <Alert variant="info" title={`${openClaims.length} open claim${openClaims.length === 1 ? "" : "s"}`}>
          Mark handoffs as picked up, or no-show if the recipient never arrived.
        </Alert>
      ) : null}

      <ul className="space-y-5">
        {listings.map((listing) => {
          const availability = getListingAvailability(listing);
          return (
            <li
              key={listing.id}
              className="overflow-hidden rounded-xl border border-border bg-surface/90"
            >
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={listing.photoUrl}
                  alt=""
                  className="h-28 w-full shrink-0 rounded-lg object-cover sm:h-24 sm:w-24"
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg text-green-700">
                      {listing.title}
                    </h2>
                    <ListingStatusBadge listing={listing} />
                  </div>
                  <p className="text-sm text-ink-muted">
                    {listing.remainingPortions} of {listing.quantityAvailable}{" "}
                    portions left ·{" "}
                    {formatPickupWindow(listing.pickupStart, listing.pickupEnd)}
                  </p>
                  {!availability.claimable ? (
                    <p className="text-sm text-ink-muted">
                      {availability.message}
                    </p>
                  ) : null}
                </div>
              </div>

              {listing.claims.length > 0 ? (
                <div className="border-t border-border bg-cream/40 px-4 py-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Claims
                  </h3>
                  <ul className="space-y-3">
                    {listing.claims.map((claim) => (
                      <li
                        key={claim.id}
                        className="flex flex-col gap-2 rounded-lg border border-border/80 bg-surface px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-ink">
                              {claim.claimantName || claim.claimantEmail}
                            </span>
                            <Badge variant={claimBadgeVariant(claim.status)}>
                              {claim.status.replaceAll("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-xs text-ink-muted">
                            {claim.portions} portion
                            {claim.portions === 1 ? "" : "s"} ·{" "}
                            {new Date(claim.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {claim.status === "RESERVED" ? (
                          <ClaimActions claimId={claim.id} />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="border-t border-border px-4 py-3 text-sm text-ink-muted">
                  No claims yet.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
