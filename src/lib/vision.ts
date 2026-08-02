import { mkdirSync } from "fs";
import path from "path";
import { visionResultSchema, type VisionResult } from "@/lib/schemas";
import {
  visionResultFromFood101,
  type FoodPrediction,
} from "@/lib/food101-map";
import { tryConsumeVisionQuota } from "@/lib/vision-quota";

/** Max upload size for vision analyze (TRD §5). */
export const VISION_MAX_BYTES = 5 * 1024 * 1024;

/** Local Food-101 ONNX classifier — free, no API key / billing. */
const FOOD101_MODEL = "onnx-community/swin-finetuned-food101-ONNX";

type OfflineOptions = {
  rateLimited?: boolean;
  description?: string;
};

type Classifier = (
  input: unknown,
  options?: { topk?: number },
) => Promise<FoodPrediction | FoodPrediction[]>;

type VisionGlobal = typeof globalThis & {
  __surplusFoodClassifier?: Classifier;
  __surplusFoodClassifierPromise?: Promise<Classifier>;
};

/**
 * Heuristic offline result when the local model fails to load/run,
 * or rate limits block a call.
 * TRD §5 / §6: confidence 0, offline true, title from timestamp, empty allergens.
 */
export function offlineVisionFallback(options?: OfflineOptions): VisionResult {
  const stamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return visionResultSchema.parse({
    title: `Surplus food item (${stamp})`,
    description:
      options?.description ??
      "Manual entry — AI vision unavailable. Confirm details before publishing.",
    categories: ["prepared"],
    allergens: [],
    suggestedQuantity: 1,
    confidence: 0,
    offline: true,
    ...(options?.rateLimited ? { rateLimited: true } : {}),
  });
}

async function getFoodClassifier(): Promise<Classifier> {
  const g = globalThis as VisionGlobal;
  if (g.__surplusFoodClassifier) {
    return g.__surplusFoodClassifier;
  }
  if (!g.__surplusFoodClassifierPromise) {
    g.__surplusFoodClassifierPromise = (async () => {
      const cacheDir = path.join(process.cwd(), ".cache", "transformers");
      mkdirSync(cacheDir, { recursive: true });

      const { env, pipeline } = await import("@huggingface/transformers");
      env.cacheDir = cacheDir;
      env.allowLocalModels = true;
      if (env.backends.onnx?.wasm) {
        env.backends.onnx.wasm.proxy = false;
      }

      console.info("[vision] loading local Food-101 model", FOOD101_MODEL);
      const classifier = (await pipeline(
        "image-classification",
        FOOD101_MODEL,
        {
          // Quantized weights keep first-download size / RAM reasonable.
          dtype: "q8",
        },
      )) as unknown as Classifier;

      g.__surplusFoodClassifier = classifier;
      console.info("[vision] Food-101 model ready");
      return classifier;
    })().catch((err) => {
      g.__surplusFoodClassifierPromise = undefined;
      throw err;
    });
  }
  return g.__surplusFoodClassifierPromise;
}

function normalizePredictions(output: unknown): FoodPrediction[] {
  const list = Array.isArray(output) ? output : [output];
  return list
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { label?: unknown; score?: unknown };
      if (typeof row.label !== "string") return null;
      const score =
        typeof row.score === "number" && Number.isFinite(row.score)
          ? row.score
          : 0;
      return { label: row.label, score };
    })
    .filter((p): p is FoodPrediction => p !== null)
    .sort((a, b) => b.score - a.score);
}

/**
 * Analyze a food image with a local Food-101 classifier (ONNX / transformers.js).
 * No cloud vision billing. Rate-limit / load failures → offline fallback.
 */
export async function analyzeFoodImage(
  imageBytes: Buffer | Uint8Array,
  mimeType: string,
  options?: { userId?: string },
): Promise<VisionResult> {
  const userId = options?.userId?.trim();
  if (!userId) {
    console.warn("[vision] missing userId; skipping classifier");
    return offlineVisionFallback({
      rateLimited: true,
      description:
        "Vision unavailable for this session. Enter details manually before publishing.",
    });
  }

  const quota = tryConsumeVisionQuota(userId);
  if (!quota.allowed) {
    console.warn("[vision] quota denied", quota.reason, quota.message);
    return offlineVisionFallback({
      rateLimited: true,
      description: quota.message,
    });
  }

  try {
    const classifier = await getFoodClassifier();
    const { RawImage } = await import("@huggingface/transformers");
    const bytes = Uint8Array.from(Buffer.from(imageBytes));
    const blob = new Blob([bytes], {
      type: mimeType || "image/jpeg",
    });
    const image = await RawImage.fromBlob(blob);
    const output = await classifier(image, { topk: 5 });
    const predictions = normalizePredictions(output);
    if (predictions.length === 0) {
      console.warn("[vision] classifier returned no labels");
      return offlineVisionFallback();
    }

    // Reject near-uniform / non-food scores so donors get manual entry instead of noise.
    if (predictions[0].score < 0.12) {
      console.warn(
        "[vision] low confidence",
        predictions[0].label,
        predictions[0].score,
      );
      return offlineVisionFallback({
        description:
          "Could not confidently identify the food. Enter details manually before publishing.",
      });
    }

    return visionResultFromFood101(predictions);
  } catch (err) {
    console.warn("[vision] local Food-101 analyze failed; offline fallback", err);
    return offlineVisionFallback({
      description:
        "Local food recognition failed to load. Confirm details manually before publishing.",
    });
  }
}
