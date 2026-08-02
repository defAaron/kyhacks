import { NextResponse } from "next/server";
import { expireStaleListings } from "@/lib/expiry";

export const runtime = "nodejs";

/**
 * POST /api/expire — lightweight expiry pass (TRD §5).
 * Marks listings with pickupEnd < now as EXPIRED.
 */
export async function POST() {
  const expiredCount = await expireStaleListings();
  return NextResponse.json({ expiredCount });
}
