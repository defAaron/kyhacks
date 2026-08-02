"use client";

import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Badge, Button, Input, Textarea } from "@/components/ui";
import {
  FOOD_SAFETY_DISCLAIMER,
  VISION_OFFLINE_BANNER,
} from "@/lib/listing-status";
import type { VisionResult } from "@/lib/schemas";

type Step = "capture" | "confirm";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultPickupWindow() {
  const start = new Date();
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
  return {
    pickupStart: toLocalInputValue(start),
    pickupEnd: toLocalInputValue(end),
  };
}

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function NewListingForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("capture");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vision, setVision] = useState<VisionResult | null>(null);

  const defaults = useMemo(() => defaultPickupWindow(), []);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("");
  const [allergens, setAllergens] = useState("");
  const [quantity, setQuantity] = useState("4");
  const [pickupStart, setPickupStart] = useState(defaults.pickupStart);
  const [pickupEnd, setPickupEnd] = useState(defaults.pickupEnd);

  function resetCapture() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhotoFile(null);
    setPreviewUrl(null);
    setVision(null);
    setStep("capture");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onPhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPhotoFile(file);
    setPreviewUrl(url);
    setAnalyzing(true);

    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/vision/analyze", {
        method: "POST",
        body: form,
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Vision analysis failed.";
        setError(message);
        return;
      }

      const result = data as VisionResult;
      setVision(result);
      setTitle(result.title);
      setDescription(result.description ?? "");
      setCategories(result.categories.join(", "));
      setAllergens(result.allergens.join(", "));
      setQuantity(String(result.suggestedQuantity));
      setStep("confirm");
    } catch {
      setError("Network error analyzing photo. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function onPublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photoFile) {
      setError("Photo is required.");
      return;
    }

    setError(null);
    setPublishing(true);

    try {
      const form = new FormData();
      form.append("photo", photoFile);
      form.append("title", title.trim());
      form.append("description", description.trim());
      form.append("categories", JSON.stringify(parseCommaList(categories)));
      form.append("allergens", JSON.stringify(parseCommaList(allergens)));
      form.append("quantityAvailable", String(Number(quantity)));
      form.append("pickupStart", new Date(pickupStart).toISOString());
      form.append("pickupEnd", new Date(pickupEnd).toISOString());
      if (vision) {
        form.append("visionRaw", JSON.stringify(vision));
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        body: form,
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Could not publish listing.";
        setError(message);
        return;
      }

      router.push("/donor");
      router.refresh();
    } catch {
      setError("Network error publishing listing. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  const allergenList = parseCommaList(allergens);

  return (
    <div className="space-y-5">
      {step === "capture" ? (
        <section className="space-y-4">
          <p className="text-sm text-ink-muted">
            Take a photo of the surplus food. We&apos;ll suggest a title,
            categories, allergens, and portion count — you confirm before
            publishing.
          </p>

          {previewUrl ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-cream-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Selected surplus food"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-border bg-surface/80 text-sm text-ink-muted">
              Camera preview will appear here
            </div>
          )}

          <label className="block">
            <span className="sr-only">Capture surplus photo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPhotoSelected}
              disabled={analyzing}
              className="camera-input block w-full text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-green-600 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-surface hover:file:bg-green-700 disabled:opacity-60"
            />
          </label>

          {analyzing ? (
            <Alert variant="info" title="Analyzing photo…">
              Identifying food, tags, and allergens. This may take a few
              seconds.
            </Alert>
          ) : null}
        </section>
      ) : null}

      {step === "confirm" ? (
        <form onSubmit={onPublish} className="space-y-4" noValidate>
          {vision?.offline ? (
            <Alert variant="info" title="AI offline — manual entry">
              {VISION_OFFLINE_BANNER}
            </Alert>
          ) : null}

          {previewUrl ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-cream-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Listing photo preview"
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-sm font-medium text-ink">
              Title
            </label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-ink"
            >
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="categories"
              className="block text-sm font-medium text-ink"
            >
              Categories
            </label>
            <Input
              id="categories"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="prepared, vegetarian"
            />
            <p className="text-xs text-ink-muted">Comma-separated tags.</p>
          </div>

          <div className="space-y-2 rounded-xl border border-danger/35 bg-danger/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="allergens"
                className="text-sm font-semibold text-danger"
              >
                Allergens — confirm carefully
              </label>
              {vision && !vision.offline ? (
                <Badge variant="warning">AI suggested</Badge>
              ) : null}
            </div>
            <Input
              id="allergens"
              value={allergens}
              onChange={(e) => setAllergens(e.target.value)}
              placeholder="soy, sesame, dairy"
              className="border-danger/40 focus-visible:ring-danger"
            />
            {allergenList.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {allergenList.map((allergen) => (
                  <Badge key={allergen} variant="danger">
                    {allergen}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-muted">
                No allergens listed. Add any that apply before publishing.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-ink"
            >
              Portions available
            </label>
            <Input
              id="quantity"
              type="number"
              min={1}
              step={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="pickupStart"
                className="block text-sm font-medium text-ink"
              >
                Pickup starts
              </label>
              <Input
                id="pickupStart"
                type="datetime-local"
                required
                value={pickupStart}
                onChange={(e) => setPickupStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="pickupEnd"
                className="block text-sm font-medium text-ink"
              >
                Pickup ends
              </label>
              <Input
                id="pickupEnd"
                type="datetime-local"
                required
                value={pickupEnd}
                onChange={(e) => setPickupEnd(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs leading-relaxed text-ink-muted">
            {FOOD_SAFETY_DISCLAIMER}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={publishing}>
              {publishing ? "Publishing…" : "Publish listing"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={publishing}
              onClick={resetCapture}
            >
              Retake photo
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <Alert variant="error" title="Something went wrong">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
