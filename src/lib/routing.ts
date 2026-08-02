import {
  estimateDurationSeconds,
  haversineMeters,
  type LatLng,
} from "@/lib/geo";

export type RouteStop = LatLng & { id: string };

export type OrderedRoute = {
  orderedStops: RouteStop[];
  /** Origin → stop1, stop1 → stop2, … */
  legDurationsSeconds: number[];
  totalDurationSeconds: number;
  /** GeoJSON LineString coordinates [lng, lat]. */
  coordinates: [number, number][];
};

/**
 * Nearest-neighbor tour starting from `origin`, visiting each stop once.
 */
export function nearestNeighborOrder(
  origin: LatLng,
  stops: RouteStop[],
): RouteStop[] {
  if (stops.length === 0) return [];

  const remaining = [...stops];
  const ordered: RouteStop[] = [];
  let current: LatLng = origin;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMeters(current, remaining[i]!);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0]!;
    ordered.push(next);
    current = next;
  }

  return ordered;
}

/** Total path length origin → stops[0] → … → stops[n-1]. */
function pathLengthMeters(origin: LatLng, stops: RouteStop[]): number {
  let total = 0;
  let prev: LatLng = origin;
  for (const stop of stops) {
    total += haversineMeters(prev, stop);
    prev = stop;
  }
  return total;
}

/**
 * 2-opt local improvement on an open path from `origin` through `stops`.
 * Swaps edges while the straight-line length decreases.
 */
export function twoOptImprove(
  origin: LatLng,
  stops: RouteStop[],
): RouteStop[] {
  if (stops.length < 3) return [...stops];

  let best = [...stops];
  let improved = true;

  while (improved) {
    improved = false;
    let bestLen = pathLengthMeters(origin, best);

    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        const len = pathLengthMeters(origin, candidate);
        if (len + 1e-6 < bestLen) {
          best = candidate;
          bestLen = len;
          improved = true;
        }
      }
    }
  }

  return best;
}

/**
 * Order stops (nearest-neighbor + 2-opt) and build straight-line
 * duration/geometry estimates for the degraded (no-OSRM) path.
 */
export function buildGeometricRoute(
  origin: LatLng,
  stops: RouteStop[],
): OrderedRoute {
  const nn = nearestNeighborOrder(origin, stops);
  const orderedStops = twoOptImprove(origin, nn);

  const legDurationsSeconds: number[] = [];
  const coordinates: [number, number][] = [[origin.lng, origin.lat]];
  let prev: LatLng = origin;
  let totalDurationSeconds = 0;

  for (const stop of orderedStops) {
    const meters = haversineMeters(prev, stop);
    const seconds = estimateDurationSeconds(meters);
    legDurationsSeconds.push(seconds);
    totalDurationSeconds += seconds;
    coordinates.push([stop.lng, stop.lat]);
    prev = stop;
  }

  return {
    orderedStops,
    legDurationsSeconds,
    totalDurationSeconds,
    coordinates,
  };
}
