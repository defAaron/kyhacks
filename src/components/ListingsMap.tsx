"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ListingDto } from "@/lib/listing-dto";
import { DEFAULT_MAP_CENTER } from "@/lib/map-center";

export type ListingsMapMarker = {
  id: string;
  lat: number;
  lng: number;
  /** Popup / label text */
  label?: string;
  /** When set, render a numbered stop pin (pickup-run order). */
  order?: number;
};

export type ListingsMapProps = {
  /** Explore mode: listing pins with optional selection highlight. */
  listings?: ListingDto[];
  selectedId?: string | null;
  /** Explicit markers (pickup run / custom). Takes precedence over listings. */
  markers?: ListingsMapMarker[];
  /** GeoJSON LineString coordinates as [lng, lat] pairs. */
  routeCoordinates?: [number, number][];
  /** Optional user/origin point for pickup runs. */
  origin?: { lat: number; lng: number };
  className?: string;
  /** CSS height when not sized by a parent (default uses .listings-map). */
  height?: string;
};

function stopIcon(order: number) {
  return L.divIcon({
    className: "surpluslink-map-pin",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:28px;height:28px;border-radius:9999px;
      background:#2f5430;color:#fffaf2;font:600 13px/1 Source Sans 3,system-ui,sans-serif;
      border:2px solid #fffaf2;box-shadow:0 1px 4px rgba(31,42,28,0.35);
    ">${order}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function pinIcon(selected: boolean) {
  const bg = selected ? "#2f5430" : "#c8892d";
  const size = selected ? 18 : 14;
  return L.divIcon({
    className: "surpluslink-map-pin",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${bg};border:2px solid #fffaf2;
      box-shadow:0 1px 4px rgba(31,42,28,0.35);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const DEFAULT_CENTER: [number, number] = [
  DEFAULT_MAP_CENTER.lat,
  DEFAULT_MAP_CENTER.lng,
];

function MapBounds({ positions }: { positions: Array<[number, number]> }) {
  const map = useMap();
  const key = positions.map((p) => p.join(",")).join("|");

  useEffect(() => {
    if (positions.length === 0) {
      map.setView(DEFAULT_CENTER, 12);
      return;
    }
    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [36, 36], maxZoom: 15 });
    // `key` is a stable serialization of `positions`
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid re-fit on new array identity
  }, [map, key]);

  return null;
}

/**
 * Leaflet map for explore pins and pickup-run polylines.
 * Must be loaded with `next/dynamic(..., { ssr: false })`.
 */
export default function ListingsMap({
  listings = [],
  selectedId = null,
  markers: markersProp,
  routeCoordinates,
  origin,
  className,
  height,
}: ListingsMapProps) {
  const markers: ListingsMapMarker[] = useMemo(() => {
    if (markersProp) return markersProp;
    return listings.map((listing) => ({
      id: listing.id,
      lat: listing.donor.lat,
      lng: listing.donor.lng,
      label: listing.title,
    }));
  }, [markersProp, listings]);

  const listingById = useMemo(() => {
    const map = new Map<string, ListingDto>();
    for (const listing of listings) map.set(listing.id, listing);
    return map;
  }, [listings]);

  const polylineLatLngs = useMemo(
    () =>
      (routeCoordinates ?? []).map(
        ([lng, lat]) => [lat, lng] as [number, number],
      ),
    [routeCoordinates],
  );

  const boundPositions = useMemo(() => {
    const pts: Array<[number, number]> = markers.map((m) => [m.lat, m.lng]);
    if (origin) pts.push([origin.lat, origin.lng]);
    for (const p of polylineLatLngs) pts.push(p);
    return pts;
  }, [markers, origin, polylineLatLngs]);

  return (
    <div
      className={`listings-map overflow-hidden rounded-xl border border-border ${className ?? ""}`}
      style={height ? { height } : undefined}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom
        className="listings-map h-full w-full"
        style={{ height: "100%", width: "100%" }}
        aria-label="Map of surplus food locations"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds positions={boundPositions} />

        {origin ? (
          <CircleMarker
            center={[origin.lat, origin.lng]}
            radius={8}
            pathOptions={{
              color: "#244226",
              fillColor: "#3f6b3a",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>Your start</Popup>
          </CircleMarker>
        ) : null}

        {polylineLatLngs.length >= 2 ? (
          <Polyline
            positions={polylineLatLngs}
            pathOptions={{
              color: "#2f5430",
              weight: 4,
              opacity: 0.85,
            }}
          />
        ) : null}

        {markers.map((marker) => {
          const listing = listingById.get(marker.id);
          const selected = marker.id === selectedId;
          const icon =
            marker.order != null
              ? stopIcon(marker.order)
              : pinIcon(selected);

          return (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={icon}
              zIndexOffset={selected || marker.order != null ? 500 : 0}
            >
              <Popup>
                {listing ? (
                  <div className="space-y-1 text-sm text-ink">
                    <p className="font-medium text-green-700">{listing.title}</p>
                    <p className="text-ink-muted">{listing.donor.orgName}</p>
                    <p>
                      {listing.remainingPortions} portion
                      {listing.remainingPortions === 1 ? "" : "s"} left
                    </p>
                    <p className="text-xs text-ink-muted">
                      Pickup{" "}
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: "America/New_York",
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(listing.pickupStart))}
                      {" – "}
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: "America/New_York",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(listing.pickupEnd))}
                    </p>
                    <Link
                      href={`/listings/${listing.id}`}
                      className="inline-block pt-0.5 font-medium text-green-600 underline-offset-2 hover:underline"
                    >
                      View listing
                    </Link>
                  </div>
                ) : marker.label ? (
                  marker.label
                ) : null}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
