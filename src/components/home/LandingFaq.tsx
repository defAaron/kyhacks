"use client";

import { Reveal } from "@/components/motion/Reveal";

const faqs = [
  {
    q: "Who is SurplusLink for?",
    a: "Restaurants and pantries (donors) who have edible surplus, and neighbors (recipients) who can pick it up during an open window. Both use the same mobile-friendly web app.",
  },
  {
    q: "How does the food photo recognition work?",
    a: "A free local Food-101 classifier (ONNX via Hugging Face transformers) runs on the server — no cloud vision billing. It suggests a dish name, categories, allergen heuristics, and quantity. Staff always confirm before publishing.",
  },
  {
    q: "Are allergen suggestions guaranteed?",
    a: "No. Allergens are assistive heuristics from the dish label, not visual detection or lab tests. Donors must review and edit them. Recipients should still use their own judgment.",
  },
  {
    q: "Is my personal information shown on the public map?",
    a: "No. Explore does not expose recipient identity. A donor’s phone number is revealed only after a successful claim, so pickup contact stays private until it is needed.",
  },
  {
    q: "What if several people claim the last portion?",
    a: "Claims update stock in a database transaction. Only requests that still have enough remaining portions succeed — so the last tray cannot be oversold in the demo.",
  },
  {
    q: "Can I pick up from more than one place?",
    a: "Yes. Reserve multiple listings, open Claims, select two or more stops, and SurplusLink orders a pickup run (nearest-neighbor + OSRM). If routing is unavailable, you still get a straight-line fallback order.",
  },
  {
    q: "Who is responsible for food safety?",
    a: "Donors remain responsible for handling and safety. SurplusLink is a coordination tool for sharing surplus — not a certification, delivery service, or medical guarantee.",
  },
] as const;

export function LandingFaq() {
  return (
    <div className="mx-auto max-w-3xl">
      <Reveal>
        <h2 className="font-display text-3xl tracking-tight text-mist sm:text-4xl">
          FAQ
        </h2>
        <p className="mt-3 max-w-xl text-ink-muted">
          Straight answers for donors, recipients, and demo judges.
        </p>
      </Reveal>

      <div className="mt-10 divide-y divide-border/80 border-y border-border/80">
        {faqs.map((item, index) => (
          <Reveal key={item.q} delay={Math.min(index * 0.04, 0.2)}>
            <details className="group py-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-4 font-display text-base text-mist marker:content-none sm:text-lg [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <span
                  aria-hidden
                  className="mt-1 shrink-0 font-sans text-lg leading-none text-gold transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl pr-8 text-sm leading-relaxed text-ink-muted sm:text-base">
                {item.a}
              </p>
            </details>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
