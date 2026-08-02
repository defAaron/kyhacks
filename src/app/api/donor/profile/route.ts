import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { donorProfileSchema } from "@/lib/schemas";

function serializeProfile(profile: {
  id: string;
  userId: string;
  orgName: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
}) {
  return {
    id: profile.id,
    userId: profile.userId,
    orgName: profile.orgName,
    address: profile.address,
    lat: profile.lat,
    lng: profile.lng,
    phone: profile.phone,
  };
}

/**
 * GET /api/donor/profile — current donor's org profile (or null).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "DONOR") {
    return NextResponse.json({ error: "Donor role required" }, { status: 403 });
  }

  const profile = await prisma.donorProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    profile: profile ? serializeProfile(profile) : null,
  });
}

/**
 * PUT /api/donor/profile — create or update donor org profile (S8.1).
 */
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "DONOR") {
    return NextResponse.json({ error: "Donor role required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = donorProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const profile = await prisma.donorProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      orgName: data.orgName,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      phone: data.phone,
    },
    update: {
      orgName: data.orgName,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      phone: data.phone,
    },
  });

  return NextResponse.json({ profile: serializeProfile(profile) });
}
