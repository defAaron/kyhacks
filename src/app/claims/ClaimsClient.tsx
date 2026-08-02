"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button } from "@/components/ui";
import type { ListingDto } from "@/lib/listing-dto";
import { DEFAULT_MAP_CENTER } from "@/lib/map-center";
import type { RouteOptimizeResponse } from "@/lib/schemas";

const ListingsMap = dynamic(() => import("@/components/ListingsMap"), {
  ssr: false,
  loading: () => (
    <div
      className="listings-map flex items-center justify-center rounded-xl border border-border bg-cream-deep text-sm text-ink-muted"
      aria-busy="true"
    >
      Loading map…
    </div>
  ),
});

type ClaimDto = {
  id: string;
  listingId: string;
  userId: string;
  portions: number;
  status: string;
  createdAt: string;
  listing: ListingDto;
};

type Origin = { lat: number; lng: number };

const DEFAULT_ORIGIN: Origin = {
  lat: DEFAULT_MAP_CENTER.lat,
  lng: DEFAULT_MAP_CENTER.lng,
};

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function formatPickupWindow(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  return `${start.toLocaleTimeString(undefined, opts)} – ${end.toLocaleTimeString(undefined, opts)}`;
}

function claimStatusVariant(
  status: string,
): "success" | "warning" | "danger" | "muted" | "default" {
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

async function resolveOrigin(): Promise<{ origin: Origin; fromGps: boolean }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { origin: DEFAULT_ORIGIN, fromGps: false };
  }

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      resolve({ origin: DEFAULT_ORIGIN, fromGps: false });
    }, 2500);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        resolve({
          origin: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
          fromGps: true,
        });
      },
      () => {
        window.clearTimeout(timer);
        resolve({ origin: DEFAULT_ORIGIN, fromGps: false });
      },
      { enableHighAccuracy: false, timeout: 2000, maximumAge: 60_000 },
    );
  });
}

export function ClaimsClient() {
  const [claims, setClaims] = useState<ClaimDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [optimizing, setOptimizing] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteOptimizeResponse | null>(null);
  const [origin, setOrigin] = useState<Origin>(DEFAULT_ORIGIN);
  const [originFromGps, setOriginFromGps] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/claims", { cache: "no-store" });
      if (res.status === 401) {
        setLoadError("Sign in to view your claims.");
        setClaims([]);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to load claims");
      }
      const data = (await res.json()) as { claims: ClaimDto[] };
      setClaims(data.claims ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load claims");
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const reservedClaims = useMemo(
    () => claims.filter((c) => c.status === "RESERVED"),
    [claims],
  );

  const claimsById = useMemo(() => {
    const map = new Map<string, ClaimDto>();
    for (const c of claims) map.set(c.id, c);
    return map;
  }, [claims]);

  function toggleClaim(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setRoute(null);
    setRouteError(null);
    setElapsedMs(null);
  }

  function selectAllReserved() {
    setSelectedIds(new Set(reservedClaims.map((c) => c.id)));
    setRoute(null);
    setRouteError(null);
    setElapsedMs(null);
  }

  async function optimizeRoute() {
    if (selectedIds.size < 2) {
      setRouteError("Select at least 2 reserved claims for a pickup run.");
      return;
    }

    setOptimizing(true);
    setRouteError(null);
    setRoute(null);
    setElapsedMs(null);

    const started = performance.now();
    try {
      const { origin: nextOrigin, fromGps } = await resolveOrigin();
      setOrigin(nextOrigin);
      setOriginFromGps(fromGps);

      const stops = [...selectedIds].flatMap((id) => {
        const claim = claimsById.get(id);
        if (!claim || claim.status !== "RESERVED") return [];
        return [
          {
            id: claim.id,
            lat: claim.listing.donor.lat,
            lng: claim.listing.donor.lng,
          },
        ];
      });

      if (stops.length < 2) {
        setRouteError("Need at least 2 reserved claims with locations.");
        return;
      }

      const res = await fetch("/api/route-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: nextOrigin, stops }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Route optimization failed");
      }

      const data = (await res.json()) as RouteOptimizeResponse;
      setRoute(data);
      setElapsedMs(Math.round(performance.now() - started));
    } catch (err) {
      setRouteError(
        err instanceof Error ? err.message : "Route optimization failed",
      );
    } finally {
      setOptimizing(false);
    }
  }

  const orderedStops = useMemo(() => {
    if (!route) return [] as Array<{
      claim: ClaimDto;
      order: number;
      legSeconds: number | null;
    }>;
    const stops: Array<{
      claim: ClaimDto;
      order: number;
      legSeconds: number | null;
    }> = [];
    for (let index = 0; index < route.orderedStopIds.length; index++) {
      const id = route.orderedStopIds[index]!;
      const claim = claimsById.get(id);
      if (!claim) continue;
      stops.push({
        claim,
        order: index + 1,
        legSeconds: route.legDurationsSeconds[index] ?? null,
      });
    }
    return stops;
  }, [route, claimsById]);

  const mapMarkers = useMemo(() => {
    if (orderedStops.length > 0) {
      return orderedStops.map(({ claim, order }) => ({
        id: claim.id,
        lat: claim.listing.donor.lat,
        lng: claim.listing.donor.lng,
        order,
        label: `${order}. ${claim.listing.title} — ${claim.listing.donor.orgName}`,
      }));
    }
    return reservedClaims
      .filter((c) => selectedIds.has(c.id))
      .map((c) => ({
        id: c.id,
        lat: c.listing.donor.lat,
        lng: c.listing.donor.lng,
        label: `${c.listing.title} — ${c.listing.donor.orgName}`,
      }));
  }, [orderedStops, reservedClaims, selectedIds]);

  return (
    <div className="space-y-8">
      {loadError ? (
        <Alert variant="error" title="Could not load claims">
          {loadError}
        </Alert>
      ) : null}

      <section aria-labelledby="my-claims-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="my-claims-heading"
              className="font-display text-xl text-green-700"
            >
              My claims
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Select 2 or more reserved pickups, then optimize a run.
            </p>
          </div>
          {reservedClaims.length >= 2 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAllReserved}
            >
              Select all reserved
            </Button>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-ink-muted">Loading claims…</p>
        ) : claims.length === 0 ? (
          <Alert variant="info" title="No claims yet">
            Claim portions from Explore, then build a pickup run here.
          </Alert>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {claims.map((claim) => {
              const selectable = claim.status === "RESERVED";
              const checked = selectedIds.has(claim.id);
              return (
                <li key={claim.id}>
                  <label
                    className={`flex cursor-pointer gap-3 px-4 py-3 transition-colors ${
                      selectable ? "hover:bg-green-50/60" : "opacity-70"
                    } ${checked ? "bg-green-50/80" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-green-600"
                      checked={checked}
                      disabled={!selectable}
                      onChange={() => toggleClaim(claim.id)}
                      aria-label={`Select ${claim.listing.title} for pickup run`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">
                          {claim.listing.title}
                        </span>
                        <Badge variant={claimStatusVariant(claim.status)}>
                          {claim.status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {claim.listing.donor.orgName} · {claim.portions}{" "}
                        {claim.portions === 1 ? "portion" : "portions"}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {claim.listing.donor.address}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        Pickup{" "}
                        {formatPickupWindow(
                          claim.listing.pickupStart,
                          claim.listing.pickupEnd,
                        )}
                        {claim.listing.donor.phone
                          ? ` · ${claim.listing.donor.phone}`
                          : null}
                      </p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="pickup-run-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="pickup-run-heading"
              className="font-display text-xl text-green-700"
            >
              Pickup run
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {selectedIds.size} selected
              {selectedIds.size < 2
                ? " — choose at least 2 reserved claims"
                : null}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void optimizeRoute()}
            disabled={optimizing || selectedIds.size < 2}
            className="tap-target"
          >
            {optimizing ? "Optimizing…" : "Optimize route"}
          </Button>
        </div>

        {routeError ? (
          <Alert variant="error" title="Route error">
            {routeError}
          </Alert>
        ) : null}

        {route?.degraded ? (
          <Alert variant="info" title="Approximate route">
            Live routing was unavailable. Showing stop order with straight-line
            time estimates.
          </Alert>
        ) : null}

        {route ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              <p className="font-medium text-ink">
                Total ~{formatDuration(route.totalDurationSeconds)}
              </p>
              {elapsedMs != null ? (
                <p className="text-ink-muted">
                  Optimized in {(elapsedMs / 1000).toFixed(1)}s
                  {route.degraded ? " (degraded)" : ""}
                </p>
              ) : null}
              <p className="text-ink-muted">
                Start:{" "}
                {originFromGps
                  ? "your location"
                  : "Louisville default (enable location for better order)"}
              </p>
            </div>

            <ol className="space-y-2 rounded-xl border border-border bg-surface p-4">
              <li className="flex gap-3 text-sm text-ink-muted">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                  ●
                </span>
                <span>
                  Start
                  {originFromGps ? " (GPS)" : " (city center)"}
                </span>
              </li>
              {orderedStops.map(({ claim, order, legSeconds }, idx) => (
                <li key={claim.id} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-surface">
                    {order}
                  </span>
                  <div className="min-w-0 flex-1">
                    {legSeconds != null ? (
                      <p className="text-xs text-ink-muted">
                        {idx === 0 ? "From start" : "From previous"} ·{" "}
                        {formatDuration(legSeconds)}
                      </p>
                    ) : null}
                    <p className="font-medium text-ink">{claim.listing.title}</p>
                    <p className="text-sm text-ink-muted">
                      {claim.listing.donor.orgName} ·{" "}
                      {claim.listing.donor.address}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <ListingsMap
          markers={mapMarkers}
          routeCoordinates={route?.geometry.coordinates}
          origin={route || selectedIds.size > 0 ? origin : undefined}
          height="var(--map-min-height)"
        />
      </section>
    </div>
  );
}
