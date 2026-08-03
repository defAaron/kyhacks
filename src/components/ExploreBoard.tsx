"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { ListingStatusBadge } from "@/components/ListingStatusBadge";
import type { ListingDto } from "@/lib/listing-dto";
import {
  formatPickupWindow,
  getListingAvailability,
} from "@/lib/listing-status";
import { DEFAULT_MAP_CENTER } from "@/lib/map-center";
import { NetworkErrorAlert } from "@/components/NetworkErrorAlert";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ListingsMap = dynamic(() => import("@/components/ListingsMap"), {
  ssr: false,
  loading: () => (
    <div
      className="listings-map flex w-full items-center justify-center rounded-2xl border border-border bg-cream-deep/80 text-sm text-ink-muted"
      aria-busy="true"
    >
      Loading map…
    </div>
  ),
});

const DISTANCE_OPTIONS = [
  { label: "Any distance", value: "" },
  { label: "Within 2 km", value: "2" },
  { label: "Within 5 km", value: "5" },
  { label: "Within 10 km", value: "10" },
  { label: "Within 25 km", value: "25" },
] as const;

/** Common allergens for exclude chips (seed + FDA major list). */
const ALLERGEN_OPTIONS = [
  "dairy",
  "gluten",
  "soy",
  "sesame",
  "eggs",
  "peanuts",
  "tree nuts",
  "fish",
  "shellfish",
] as const;

type Filters = {
  q: string;
  radiusKm: string;
  excludeAllergens: string[];
};

const initialFilters: Filters = {
  q: "",
  radiusKm: "",
  excludeAllergens: [],
};

function selectClassName() {
  return "flex h-11 min-h-11 w-full rounded-xl border border-border bg-cream-deep px-3 py-2 text-base text-ink transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background";
}

export function ExploreBoard() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [draftQ, setDraftQ] = useState("");
  const [listings, setListings] = useState<ListingDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const fetchListings = useCallback(async (next: Filters) => {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.excludeAllergens.length > 0) {
      params.set("excludeAllergens", next.excludeAllergens.join(","));
    }
    if (next.radiusKm) {
      params.set("lat", String(DEFAULT_MAP_CENTER.lat));
      params.set("lng", String(DEFAULT_MAP_CENTER.lng));
      params.set("radiusKm", next.radiusKm);
    }

    const res = await fetch(`/api/listings?${params.toString()}`);
    if (!res.ok) {
      throw new Error("Could not load listings");
    }
    const data = (await res.json()) as { listings: ListingDto[] };
    return data.listings;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchListings(filters)
      .then((rows) => {
        if (!cancelled) {
          setListings(rows);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Something went wrong loading surplus nearby. Try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, fetchListings, reloadToken]);

  function applySearch(event: FormEvent) {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, q: draftQ }));
  }

  function toggleAllergen(allergen: string) {
    setFilters((prev) => {
      const has = prev.excludeAllergens.includes(allergen);
      return {
        ...prev,
        excludeAllergens: has
          ? prev.excludeAllergens.filter((a) => a !== allergen)
          : [...prev.excludeAllergens, allergen],
      };
    });
  }

  function clearFilters() {
    setDraftQ("");
    setFilters(initialFilters);
  }

  const filtersActive =
    Boolean(filters.q) ||
    Boolean(filters.radiusKm) ||
    filters.excludeAllergens.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight text-mist sm:text-4xl">
          Explore
        </h1>
        <p className="max-w-xl text-ink-muted">
          Live surplus near Louisville — claim what you can pick up before the
          window closes.
        </p>
      </header>

      <section
        aria-label="Filters"
        className="panel space-y-4 rounded-2xl p-4 sm:p-5"
      >
        <form
          onSubmit={applySearch}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="block flex-1 space-y-1.5">
            <span className="text-sm font-medium text-ink">Search</span>
            <Input
              type="search"
              name="q"
              placeholder="Title, category, or donor…"
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              aria-label="Search listings"
            />
          </label>
          <label className="block w-full space-y-1.5 sm:w-48">
            <span className="text-sm font-medium text-ink">Distance</span>
            <select
              className={selectClassName()}
              value={filters.radiusKm}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, radiusKm: e.target.value }))
              }
              aria-label="Filter by distance from Louisville center"
            >
              {DISTANCE_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" className="sm:mb-0">
            Search
          </Button>
        </form>

        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">Exclude allergens</p>
          <div className="flex flex-wrap gap-2">
            {ALLERGEN_OPTIONS.map((allergen) => {
              const active = filters.excludeAllergens.includes(allergen);
              return (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => toggleAllergen(allergen)}
                  aria-pressed={active}
                  className={
                    active
                      ? "inline-flex min-h-11 items-center rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-medium capitalize text-danger transition-all duration-300"
                      : "inline-flex min-h-11 items-center rounded-xl border border-border bg-cream-deep px-3 py-2 text-sm font-medium capitalize text-ink-muted transition-all duration-300 hover:border-teal hover:text-mist"
                  }
                >
                  {allergen}
                </button>
              );
            })}
          </div>
        </div>

        {filtersActive ? (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-xs text-ink-muted">
              Distance is measured from downtown Louisville.
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : null}
      </section>

      {error ? (
        <NetworkErrorAlert
          title="Could not load listings"
          message={error}
          onRetry={() => {
            setError(null);
            setReloadToken((n) => n + 1);
          }}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <section aria-label="Map" className="lg:sticky lg:top-[4.5rem]">
          <ListingsMap
            listings={listings}
            selectedId={selectedId}
            height="var(--map-min-height)"
            className="w-full shadow-[0_1px_0_rgba(31,42,28,0.04)]"
          />
        </section>

        <section aria-label="Available listings" className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-xl text-mist">
              Available now
            </h2>
            <p className="text-sm text-ink-muted" aria-live="polite">
              {loading
                ? "Loading…"
                : `${listings.length} listing${listings.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {loading && listings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-surface/50 px-4 py-10 text-center text-sm text-ink-muted">
              Loading surplus…
            </p>
          ) : null}

          {!loading && !error && listings.length === 0 ? (
            <Alert variant="info" title="No listings match">
              Try widening distance, clearing allergen excludes, or a different
              search.
            </Alert>
          ) : null}

          {listings.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {listings.map((listing) => {
                const selected = listing.id === selectedId;
                const availability = getListingAvailability(listing);
                return (
                  <li key={listing.id}>
                    <Link
                      href={`/listings/${listing.id}`}
                      onMouseEnter={() => setSelectedId(listing.id)}
                      onFocus={() => setSelectedId(listing.id)}
                      className={
                        selected
                          ? "interactive-lift flex min-h-[5.5rem] gap-3 rounded-2xl border border-teal bg-surface p-3 outline-none ring-2 ring-teal/35 sm:gap-4 sm:p-4"
                          : "interactive-lift flex min-h-[5.5rem] gap-3 rounded-2xl border border-border bg-surface/90 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:gap-4 sm:p-4"
                      }
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-cream-deep sm:h-24 sm:w-24">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={listing.photoUrl}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="font-display text-lg leading-snug text-mist">
                            {listing.title}
                          </h3>
                          <ListingStatusBadge listing={listing} />
                        </div>
                        {!availability.claimable ? (
                          <p className="text-sm text-ink-muted">
                            {availability.message}
                          </p>
                        ) : null}
                        <p className="truncate text-sm text-ink-muted">
                          {listing.donor.orgName} · {listing.donor.address}
                        </p>
                        <p className="text-sm text-ink">
                          <span className="text-ink-muted">Pickup </span>
                          {formatPickupWindow(
                            listing.pickupStart,
                            listing.pickupEnd,
                            "America/New_York",
                          )}
                        </p>
                        {listing.allergens.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {listing.allergens.map((a) => (
                              <Badge key={a} variant="warning">
                                {a}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  );
}
