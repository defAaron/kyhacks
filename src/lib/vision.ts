import { GoogleGenerativeAI } from "@google/generative-ai";
import { visionResultSchema, type VisionResult } from "@/lib/schemas";

/** Max upload size for vision analyze (TRD §5). */
export const VISION_MAX_BYTES = 5 * 1024 * 1024;

/** Gemini Flash multimodal model (TRD §2 / §6). */
const GEMINI_VISION_MODEL = "gemini-2.0-flash";

const VISION_PROMPT = `You classify leftover food photos for a food-rescue app.
Return ONLY a single JSON object (no markdown, no commentary) with these exact keys:
- title: string — short human-readable name of the food
- description: string — one short sentence
- categories: string[] — e.g. prepared, produce, bakery, dairy, asian, vegetarian
- allergens: string[] — common allergens present (e.g. gluten, dairy, soy, sesame, nuts, eggs, shellfish); empty if none apparent
- suggestedQuantity: integer — estimated portions available (at least 1)
- confidence: number between 0 and 1

Do not invent allergens you cannot see evidence for. Prefer conservative allergen lists.`;

/**
 * Heuristic offline result when GEMINI_API_KEY is missing or the model/parse fails.
 * TRD §5 / §6: confidence 0, offline true, title from timestamp, empty allergens.
 */
export function offlineVisionFallback(): VisionResult {
  const stamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return visionResultSchema.parse({
    title: `Surplus food item (${stamp})`,
    description: "Manual entry — AI vision unavailable. Confirm details before publishing.",
    categories: ["prepared"],
    allergens: [],
    suggestedQuantity: 1,
    confidence: 0,
    offline: true,
  });
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model response");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Analyze a food image with Gemini Vision, validated via Zod.
 * Missing key, API errors, or parse/schema failures → offline fallback.
 */
export async function analyzeFoodImage(
  imageBytes: Buffer | Uint8Array,
  mimeType: string,
): Promise<VisionResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return offlineVisionFallback();
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_VISION_MODEL,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const base64 = Buffer.from(imageBytes).toString("base64");
    const result = await model.generateContent([
      { text: VISION_PROMPT },
      {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: base64,
        },
      },
    ]);

    const text = result.response.text();
    const raw = extractJsonObject(text);
    const parsed = visionResultSchema.safeParse({
      ...(typeof raw === "object" && raw !== null ? raw : {}),
      offline: false,
    });

    if (!parsed.success) {
      return offlineVisionFallback();
    }
    return parsed.data;
  } catch {
    return offlineVisionFallback();
  }
}
