import { ListingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { expireStaleListings } from "@/lib/expiry";
import { haversineMeters } from "@/lib/geo";
import { toListingDto } from "@/lib/listing-dto";
import { prisma } from "@/lib/prisma";
import { listingCreateSchema } from "@/lib/schemas";
import { saveUpload } from "@/lib/storage";

export const runtime = "nodejs";

function parseStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // comma-separated fallback
    }
    return trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return undefined;
}

function parseOptionalJson(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function parseCreateBody(
  request: Request,
): Promise<
  | { ok: true; data: unknown }
  | { ok: false; error: string; status: number }
> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const photo = form.get("photo");
    let photoUrl = form.get("photoUrl");

    if (photo instanceof File && photo.size > 0) {
      photoUrl = await saveUpload(photo);
    }

    if (typeof photoUrl !== "string" || !photoUrl.trim()) {
      return {
        ok: false,
        error: "photo file or photoUrl is required",
        status: 400,
      };
    }

    const quantityRaw = form.get("quantityAvailable");
    const quantityAvailable =
      typeof quantityRaw === "string" || typeof quantityRaw === "number"
        ? Number(quantityRaw)
        : NaN;

    return {
      ok: true,
      data: {
        photoUrl: photoUrl.trim(),
        title: form.get("title"),
        description: form.get("description") || undefined,
        categories: parseStringArray(form.get("categories")) ?? [],
        allergens: parseStringArray(form.get("allergens")) ?? [],
        quantityAvailable,
        pickupStart: form.get("pickupStart"),
        pickupEnd: form.get("pickupEnd"),
        visionRaw: parseOptionalJson(form.get("visionRaw")),
      },
    };
  }

  try {
    const json: unknown = await request.json();
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: "Invalid JSON body", status: 400 };
  }
}

/**
 * GET /api/listings — public board (TRD §5).
 * Query: lat, lng, radiusKm, q, excludeAllergens (comma-separated).
 * Expire-on-read; returns AVAILABLE listings with remaining portions + donor location (no phone).
 */
export async function GET(request: Request) {
  await expireStaleListings();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const excludeAllergens = (searchParams.get("excludeAllergens") ?? "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);

  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const radiusParam = searchParams.get("radiusKm");

  const lat = latParam !== null ? Number(latParam) : NaN;
  const lng = lngParam !== null ? Number(lngParam) : NaN;
  const radiusKm = radiusParam !== null ? Number(radiusParam) : NaN;
  const hasGeoFilter =
    Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm);

  const rows = await prisma.listing.findMany({
    where: { status: ListingStatus.AVAILABLE },
    include: {
      donor: {
        select: {
          id: true,
          orgName: true,
          address: true,
          lat: true,
          lng: true,
        },
      },
    },
    orderBy: { pickupEnd: "asc" },
  });

  let listings = rows.map((row) => toListingDto(row));

  if (q) {
    listings = listings.filter((listing) => {
      const haystack = [
        listing.title,
        listing.description ?? "",
        listing.donor.orgName,
        ...listing.categories,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  if (excludeAllergens.length > 0) {
    listings = listings.filter((listing) => {
      const allergens = listing.allergens.map((a) => a.toLowerCase());
      return !excludeAllergens.some((excluded) => allergens.includes(excluded));
    });
  }

  if (hasGeoFilter) {
    const origin = { lat, lng };
    const radiusMeters = radiusKm * 1000;
    listings = listings.filter((listing) => {
      const distance = haversineMeters(origin, {
        lat: listing.donor.lat,
        lng: listing.donor.lng,
      });
      return distance <= radiusMeters;
    });
  }

  return NextResponse.json({ listings });
}

/**
 * POST /api/listings — donor-only create (TRD §5).
 * Accepts multipart/form-data (optional `photo` file) or JSON with `photoUrl`.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "DONOR") {
    return NextResponse.json(
      { error: "Donor role required" },
      { status: 403 },
    );
  }

  const donor = await prisma.donorProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!donor) {
    return NextResponse.json(
      { error: "Donor profile required" },
      { status: 400 },
    );
  }

  const parsedBody = await parseCreateBody(request);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: parsedBody.error },
      { status: parsedBody.status },
    );
  }

  const parsed = listingCreateSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const listing = await prisma.listing.create({
    data: {
      donorId: donor.id,
      photoUrl: data.photoUrl,
      title: data.title,
      description: data.description,
      categories: JSON.stringify(data.categories),
      allergens: JSON.stringify(data.allergens),
      quantityAvailable: data.quantityAvailable,
      pickupStart: data.pickupStart,
      pickupEnd: data.pickupEnd,
      visionRaw:
        data.visionRaw === undefined
          ? null
          : JSON.stringify(data.visionRaw),
      status: ListingStatus.AVAILABLE,
    },
    include: {
      donor: {
        select: {
          id: true,
          orgName: true,
          address: true,
          lat: true,
          lng: true,
        },
      },
    },
  });

  return NextResponse.json(
    { listing: toListingDto(listing) },
    { status: 201 },
  );
}
