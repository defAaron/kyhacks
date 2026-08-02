/** Public default map center — Louisville, KY (TRD §1). */

function parseCoord(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const DEFAULT_MAP_CENTER = {
  lat: parseCoord(process.env.NEXT_PUBLIC_DEFAULT_CITY_LAT, 38.2527),
  lng: parseCoord(process.env.NEXT_PUBLIC_DEFAULT_CITY_LNG, -85.7585),
} as const;

export const DEFAULT_MAP_ZOOM = 13;
