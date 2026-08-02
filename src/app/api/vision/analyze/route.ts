import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  analyzeFoodImage,
  VISION_MAX_BYTES,
} from "@/lib/vision";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

/**
 * POST /api/vision/analyze
 * Donor-only multipart upload field `image` (max 5MB).
 * Returns schema-valid vision JSON; offline fallback when Gemini unavailable.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "DONOR") {
    return NextResponse.json({ error: "Donor access required" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data" },
      { status: 400 },
    );
  }

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json(
      { error: 'Missing or empty multipart field "image"' },
      { status: 400 },
    );
  }

  if (image.size > VISION_MAX_BYTES) {
    return NextResponse.json(
      { error: "Image exceeds 5MB limit" },
      { status: 413 },
    );
  }

  const mimeType = image.type || "image/jpeg";
  if (mimeType && !ALLOWED_MIME.has(mimeType.toLowerCase())) {
    return NextResponse.json(
      { error: "Unsupported image type" },
      { status: 415 },
    );
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  const result = await analyzeFoodImage(bytes, mimeType, {
    userId: session.user.id,
  });

  const headers = new Headers();
  if (result.rateLimited) {
    headers.set("X-Vision-Rate-Limited", "1");
  }

  return NextResponse.json(result, { headers });
}
