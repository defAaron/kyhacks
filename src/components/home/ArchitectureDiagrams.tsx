"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

type StageId =
  | "capture"
  | "classify"
  | "manual"
  | "confirm"
  | "persist"
  | "publish"
  | "claim"
  | "route";

type Stage = {
  id: StageId;
  label: string;
  short: string;
  tech: string;
  body: string;
  kind?: "default" | "branch" | "finish";
};

const stages: Stage[] = [
  {
    id: "capture",
    label: "Capture",
    short: "Donor camera / upload",
    tech: "Browser · multipart upload",
    body: "Restaurant staff photograph surplus leftovers on a phone. The image is sized client-side when needed, then sent to the analyze route (5MB cap).",
  },
  {
    id: "classify",
    label: "Classify",
    short: "Local Food-101 ONNX",
    tech: "@huggingface/transformers",
    body: "A free local Food-101 classifier runs on the server — no cloud vision key. It returns a dish title, categories, allergen heuristics, suggested quantity, and confidence.",
  },
  {
    id: "manual",
    label: "Manual",
    short: "Offline fallback",
    tech: "Heuristic + rate limits",
    kind: "branch",
    body: "If the model is cold, confidence is low, or a VISION_* quota blocks the call, donors get an offline / rate-limit banner and enter details by hand.",
  },
  {
    id: "confirm",
    label: "Confirm",
    short: "Human-in-the-loop",
    tech: "Donor listing form",
    body: "Staff edit title, allergens, portions, and the pickup window. Suggestions are assistive — never published without confirmation.",
  },
  {
    id: "persist",
    label: "Persist",
    short: "Postgres + photo",
    tech: "Prisma · Supabase Postgres",
    body: "The listing and visionRaw JSON land in Supabase Postgres. Locally the photo is stored under public/uploads; on Vercel it is persisted as a data URL.",
  },
  {
    id: "publish",
    label: "Publish",
    short: "Live explore board",
    tech: "Leaflet · OSM tiles",
    body: "AVAILABLE listings appear on the public map and feed with remaining portions and pickup windows. Donor phone stays hidden until a claim succeeds.",
  },
  {
    id: "claim",
    label: "Claim",
    short: "Transactional stock",
    tech: "Prisma interactive txn",
    body: "Recipients reserve 1…N portions. Stock decrements in a transaction so the last tray cannot be oversold. Cancel restores stock while the window is open.",
  },
  {
    id: "route",
    label: "Route",
    short: "Multi-stop pickup",
    tech: "OSRM · nearest-neighbor",
    kind: "finish",
    body: "With two or more claims, SurplusLink orders stops from the recipient’s location and draws a polyline. If OSRM is down, a straight-line degraded path still returns.",
  },
];

const stageById = Object.fromEntries(stages.map((s) => [s.id, s])) as Record<
  StageId,
  Stage
>;

const mainPath: StageId[] = [
  "capture",
  "classify",
  "confirm",
  "persist",
  "publish",
  "claim",
  "route",
];

const pulseOrder: StageId[] = [
  "capture",
  "classify",
  "confirm",
  "persist",
  "publish",
  "claim",
  "route",
  "classify",
  "manual",
  "confirm",
];

const metrics = [
  { value: "Local", label: "Food-101 ONNX" },
  { value: "$0", label: "vision API cost" },
  { value: "< 30s", label: "photo → listing*" },
  { value: "OSRM", label: "pickup routing" },
] as const;

function nodeStyle(kind: Stage["kind"], lit: boolean): CSSProperties {
  if (lit) {
    return {
      background: "#fffcf6",
      border: "2px solid #c8a96b",
      boxShadow: "0 0 0 3px rgba(200,169,107,0.25)",
      color: "#5c6e58",
    };
  }
  if (kind === "branch") {
    return {
      background: "#faf2ef",
      border: "2px solid #d4a39a",
      color: "#5c6e58",
    };
  }
  if (kind === "finish") {
    return {
      background: "#eef3ec",
      border: "2px solid #8fa28a",
      color: "#5c6e58",
    };
  }
  return {
    background: "#fffcf6",
    border: "2px solid #c7d3c0",
    color: "#5c6e58",
  };
}

export function ArchitectureDiagrams() {
  const [activeId, setActiveId] = useState<StageId>("capture");
  const [pulseIndex, setPulseIndex] = useState(0);
  const pulseStage = pulseOrder[pulseIndex] ?? "capture";

  useEffect(() => {
    const id = window.setInterval(() => {
      setPulseIndex((i) => (i + 1) % pulseOrder.length);
    }, 900);
    return () => window.clearInterval(id);
  }, []);

  const select = useCallback((id: StageId) => {
    setActiveId(id);
  }, []);

  const active = stageById[activeId];

  return (
    <div className="mt-14">
      <div className="mx-auto max-w-3xl text-center">
        <h3
          className="font-display text-2xl tracking-tight sm:text-3xl"
          style={{ color: "#5c6e58" }}
        >
          System architecture
        </h3>
        <p className="mt-3 text-sm sm:text-base" style={{ color: "#6a7464" }}>
          From photo to pickup route under the hood. Click any stage for
          details.
        </p>
      </div>

      {/* Single shell: pipeline + branch + stage detail */}
      <div
        className="mx-auto mt-10 w-full max-w-5xl overflow-hidden rounded-2xl"
        style={{
          background: "#fffcf6",
          border: "1px solid #d5ddd0",
        }}
      >
        {/* Pipeline track — scroll inside the shell, never spill out */}
        <div className="border-b px-4 py-6 sm:px-6" style={{ borderColor: "#e4e8df" }}>
          <p
            className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{ color: "#6a7464" }}
          >
            Pipeline
          </p>
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-max items-center gap-1.5 px-1">
              {mainPath.map((id, index) => {
                const stage = stageById[id];
                const lit = activeId === id || pulseStage === id;
                return (
                  <div key={id} className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => select(id)}
                      aria-pressed={activeId === id}
                      className="min-h-11 min-w-[5.5rem] rounded-xl px-3 py-2.5 text-center font-display text-sm font-semibold"
                      style={nodeStyle(stage.kind, lit)}
                    >
                      {stage.label}
                    </button>
                    {index < mainPath.length - 1 ? (
                      <span
                        aria-hidden
                        className="text-lg font-semibold"
                        style={{ color: "#c8a96b" }}
                      >
                        →
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Offline branch */}
        <div
          className="border-b px-4 py-5 sm:px-6"
          style={{ borderColor: "#e4e8df", background: "#faf8f2" }}
        >
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-3 sm:text-left">
            <p
              className="text-[11px] font-medium uppercase tracking-[0.14em] sm:mr-2"
              style={{ color: "#6a7464" }}
            >
              Offline branch
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs" style={{ color: "#6a7464" }}>
                Classify
              </span>
              <span aria-hidden style={{ color: "#b85c4a" }}>
                ↓
              </span>
              <button
                type="button"
                onClick={() => select("manual")}
                aria-pressed={activeId === "manual"}
                className="min-h-11 min-w-[5.5rem] rounded-xl px-3 py-2.5 text-center font-display text-sm font-semibold"
                style={nodeStyle(
                  "branch",
                  activeId === "manual" || pulseStage === "manual",
                )}
              >
                Manual
              </button>
              <span aria-hidden style={{ color: "#b85c4a" }}>
                →
              </span>
              <span className="text-xs" style={{ color: "#6a7464" }}>
                Confirm
              </span>
            </div>
          </div>
        </div>

        {/* Stage detail — nested in the same shell */}
        <div
          className="px-5 py-6 sm:px-7 sm:py-7"
          role="region"
          aria-live="polite"
          aria-label={`${active.label} details`}
        >
          <p
            className="text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{ color: "#c8a96b" }}
          >
            Stage detail
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h4
              className="font-display text-xl sm:text-2xl"
              style={{ color: "#5c6e58" }}
            >
              {active.label}
            </h4>
            <p className="text-sm" style={{ color: "#6a7464" }}>
              {active.tech}
            </p>
          </div>
          <p
            className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base"
            style={{ color: "#2f382c" }}
          >
            {active.body}
          </p>
        </div>

        {/* Outcome strip inside shell */}
        <div
          className="flex flex-col gap-4 border-t px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"
          style={{ borderColor: "#e4e8df", background: "#f3f6f1" }}
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
              style={{ background: "rgba(143,162,138,0.3)", color: "#5c6e58" }}
            >
              ✓
            </span>
            <p className="font-display text-base sm:text-lg" style={{ color: "#5c6e58" }}>
              Pickup ready for neighbors
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:gap-6">
            {metrics.map((m) => (
              <div key={m.label} className="min-w-0">
                <p
                  className="font-display text-lg leading-none sm:text-xl"
                  style={{ color: "#5c6e58" }}
                >
                  {m.value}
                </p>
                <p className="mt-1 text-[11px]" style={{ color: "#6a7464" }}>
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p
        className="mx-auto mt-3 max-w-5xl text-center text-[11px] sm:text-left"
        style={{ color: "#6a7464" }}
      >
        *After the local model is warm; first classify may download weights.
      </p>
    </div>
  );
}
