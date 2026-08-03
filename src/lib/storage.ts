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

function mimeFor(file: File): string {
  if (file.type) return file.type;
  switch (extensionFor(file)) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

/**
 * Persist an uploaded file and return a public URL (path or data URL).
 * - Local/dev: write under `public/uploads`
 * - Vercel/serverless: store as a data URL (ephemeral FS is not durable)
 */
export async function saveUpload(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  // On Vercel the filesystem is read-only except /tmp and does not persist.
  if (process.env.VERCEL === "1" || process.env.UPLOAD_STRATEGY === "data-url") {
    const mime = mimeFor(file);
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }

  const filename = `${randomUUID()}${extensionFor(file)}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}
