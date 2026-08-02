import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function extensionFor(file: File): string {
  const fromName = path.extname(file.name);
  if (fromName) return fromName.toLowerCase();

  switch (file.type) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".bin";
  }
}

/**
 * Persist an uploaded file under `public/uploads` and return its public URL path.
 * Abstracted so Vercel Blob (or similar) can replace the local write later.
 */
export async function saveUpload(file: File): Promise<string> {
  const filename = `${randomUUID()}${extensionFor(file)}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}
