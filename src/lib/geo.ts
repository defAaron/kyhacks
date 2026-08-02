/** Geographic helpers for pickup-run routing (TRD §8). */

export type LatLng = {
  lat: number;
  lng: number;
};

const EARTH_RADIUS_M = 6_371_000;

/** Degrees → radians. */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two WGS84 points (Haversine), in meters.
 */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Estimate driving duration (seconds) from straight-line meters.
 * Uses ~40 km/h urban average when OSRM is unavailable.
 */
export function estimateDurationSeconds(
  distanceMeters: number,
  speedKmh = 40,
): number {
  if (distanceMeters <= 0) return 0;
  const metersPerSecond = (speedKmh * 1000) / 3600;
  return Math.round(distanceMeters / metersPerSecond);
}
