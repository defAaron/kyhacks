/** Client-only: shrink phone photos before vision/listing upload. */

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_EDGE = 1600;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image. Try a JPEG or PNG photo."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image compression failed."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

/**
 * Resize/JPEG-compress a photo so it fits under the API size limit.
 * Returns the original file when already small enough.
 */
export async function compressImageFile(
  file: File,
  options?: {
    maxBytes?: number;
    maxEdge?: number;
  },
): Promise<File> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;

  if (file.size <= maxBytes && file.type !== "image/heic" && file.type !== "image/heif") {
    return file;
  }

  const img = await loadImage(file);
  let { width, height } = img;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Image compression unavailable in this browser.");
  }
  ctx.drawImage(img, 0, 0, width, height);

  const baseName = file.name.replace(/\.[^.]+$/, "") || "surplus";
  let quality = 0.85;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);

  while (blob.size > maxBytes && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  if (blob.size > maxBytes) {
    // Last resort: shrink dimensions further.
    const shrink = Math.sqrt(maxBytes / blob.size) * 0.9;
    canvas.width = Math.max(1, Math.round(width * shrink));
    canvas.height = Math.max(1, Math.round(height * shrink));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, "image/jpeg", 0.7);
  }

  if (blob.size > maxBytes) {
    throw new Error("Image is still too large after compression. Try a smaller photo.");
  }

  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
