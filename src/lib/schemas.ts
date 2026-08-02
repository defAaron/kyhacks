import { z } from "zod";

/** Lat/lng pair for route stops and origins (TRD §5 / §8). */
const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Donor org profile create/update (PRD § donor profile / S8.1). */
export const donorProfileSchema = z.object({
  orgName: z.string().trim().min(1),
  address: z.string().trim().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? null : v)),
});

export type DonorProfileInput = z.infer<typeof donorProfileSchema>;

/**
 * POST /api/listings body fields (TRD §5).
 * photoUrl may be a prior upload path/URL; pickup window is coercible datetime.
 */
export const listingCreateSchema = z
  .object({
    photoUrl: z.string().min(1),
    title: z.string().trim().min(1),
    description: z.string().optional(),
    categories: z.array(z.string()),
    allergens: z.array(z.string()),
    quantityAvailable: z.number().int().positive(),
    pickupStart: z.coerce.date(),
    pickupEnd: z.coerce.date(),
    visionRaw: z.unknown().optional(),
  })
  .refine((data) => data.pickupEnd > data.pickupStart, {
    message: "pickupEnd must be after pickupStart",
    path: ["pickupEnd"],
  });

export type ListingCreate = z.infer<typeof listingCreateSchema>;

/**
 * POST /api/vision/analyze output (TRD §5 / §6).
 * Offline fallback sets confidence: 0 and offline: true.
 */
export const visionResultSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  categories: z.array(z.string()),
  allergens: z.array(z.string()),
  suggestedQuantity: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
  offline: z.boolean(),
  /** Set when vision was skipped (session/quota) and donor should enter manually. */
  rateLimited: z.boolean().optional(),
});

export type VisionResult = z.infer<typeof visionResultSchema>;

/** POST /api/claims body (TRD §5). */
export const claimCreateSchema = z.object({
  listingId: z.string().min(1),
  portions: z.number().int().min(1),
});

export type ClaimCreate = z.infer<typeof claimCreateSchema>;

/** PATCH /api/claims/[id] body (TRD §5). Role rules enforced in the route. */
export const claimStatusPatchSchema = z.object({
  status: z.enum(["PICKED_UP", "NO_SHOW", "CANCELLED"]),
});

export type ClaimStatusPatch = z.infer<typeof claimStatusPatchSchema>;

/** POST /api/route-optimize request (TRD §5 / §8); stops capped at 10. */
export const routeOptimizeRequestSchema = z.object({
  origin: latLngSchema,
  stops: z
    .array(
      z.object({
        id: z.string().min(1),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    )
    .min(1)
    .max(10),
});

export type RouteOptimizeRequest = z.infer<typeof routeOptimizeRequestSchema>;

/** GeoJSON LineString geometry for optimized route polyline. */
const lineStringSchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
});

/**
 * POST /api/route-optimize response (TRD §5 / §8).
 * `degraded: true` when OSRM is unreachable and straight-line estimates are used.
 */
export const routeOptimizeResponseSchema = z.object({
  orderedStopIds: z.array(z.string()),
  legDurationsSeconds: z.array(z.number().nonnegative()),
  totalDurationSeconds: z.number().nonnegative(),
  geometry: lineStringSchema,
  degraded: z.literal(true).optional(),
});

export type RouteOptimizeResponse = z.infer<typeof routeOptimizeResponseSchema>;
