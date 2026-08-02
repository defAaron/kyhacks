import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  routeOptimizeRequestSchema,
  type RouteOptimizeResponse,
} from "@/lib/schemas";
import { buildGeometricRoute, type RouteStop } from "@/lib/routing";

const OSRM_BASE =
  process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";
/** Keep OSRM attempts short so the handler stays under the ~2s demo budget. */
const OSRM_TIMEOUT_MS = 1500;

type OsrmRoute = {
  duration: number;
  legs: Array<{ duration: number }>;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
};

type OsrmResponse = {
  code: string;
  routes?: OsrmRoute[];
};

function degradedResponse(
  geometric: ReturnType<typeof buildGeometricRoute>,
): RouteOptimizeResponse {
  return {
    orderedStopIds: geometric.orderedStops.map((s) => s.id),
    legDurationsSeconds: geometric.legDurationsSeconds,
    totalDurationSeconds: geometric.totalDurationSeconds,
    geometry: {
      type: "LineString",
      coordinates: geometric.coordinates,
    },
    degraded: true,
  };
}

/**
 * Call public OSRM for a driving route through origin + ordered stops.
 * Returns null on any failure (timeout, network, bad payload).
 */
async function fetchOsrmRoute(
  origin: { lat: number; lng: number },
  orderedStops: RouteStop[],
): Promise<OsrmRoute | null> {
  const coords = [
    `${origin.lng},${origin.lat}`,
    ...orderedStops.map((s) => `${s.lng},${s.lat}`),
  ].join(";");

  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      // Avoid Next fetch caching of live routing.
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as OsrmResponse;
    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route = data.routes[0];
    if (
      route.geometry?.type !== "LineString" ||
      !Array.isArray(route.geometry.coordinates) ||
      route.geometry.coordinates.length < 2
    ) {
      return null;
    }

    return route;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /api/route-optimize (TRD §5 / §8)
 * Auth: signed-in. Orders stops (NN + 2-opt), then OSRM; falls back to
 * straight-line estimates with `degraded: true` when OSRM is unreachable.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = routeOptimizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { origin, stops } = parsed.data;
  const geometric = buildGeometricRoute(origin, stops);
  const orderedStops = geometric.orderedStops;

  const osrm = await fetchOsrmRoute(origin, orderedStops);
  if (!osrm) {
    return NextResponse.json(degradedResponse(geometric));
  }

  const legDurationsSeconds = osrm.legs.map((leg) =>
    Math.max(0, Math.round(leg.duration)),
  );
  // Prefer sum of legs so lengths always match stop count.
  const totalDurationSeconds =
    legDurationsSeconds.length > 0
      ? legDurationsSeconds.reduce((a, b) => a + b, 0)
      : Math.max(0, Math.round(osrm.duration));

  const response: RouteOptimizeResponse = {
    orderedStopIds: orderedStops.map((s) => s.id),
    legDurationsSeconds,
    totalDurationSeconds,
    geometry: {
      type: "LineString",
      coordinates: osrm.geometry.coordinates,
    },
  };

  return NextResponse.json(response);
}
