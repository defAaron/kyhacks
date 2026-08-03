"use client";

import Link from "next/link";
import { ParallaxHero } from "@/components/motion/ParallaxHero";
import { Reveal } from "@/components/motion/Reveal";
import { InteractiveHoverLink } from "@/components/ui/interactive-hover-button";

const steps = [
  {
    title: "List surplus",
    body: "Donors snap a photo, set portions, and open a pickup window in minutes.",
  },
  {
    title: "Claim nearby",
    body: "Neighbors browse a live map, filter allergens, and reserve what they can use.",
  },
  {
    title: "Pick up with purpose",
    body: "Optimize a multi-stop run so good food reaches people — not the bin.",
  },
] as const;

export function HomeExperience() {
  return (
    <main className="relative isolate overflow-x-hidden">
      <ParallaxHero />

      <section className="relative z-10 border-t border-border bg-parchment/95 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="font-display text-3xl tracking-tight text-mist sm:text-4xl">
              How SurplusLink moves food
            </h2>
            <p className="mt-3 max-w-xl text-ink-muted">
              One calm loop from kitchen leftover to neighborhood pickup.
            </p>
          </Reveal>

          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.08}>
                <li className="relative">
                  <p className="font-display text-5xl text-teal/40">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 font-display text-xl text-mist">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">
                    {step.body}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative overflow-hidden px-6 py-24 sm:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_70%_40%,rgba(200,169,107,0.18),transparent_65%)]"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <h2 className="max-w-lg font-display text-3xl tracking-tight text-mist sm:text-4xl">
              Start with what is available tonight
            </h2>
            <p className="mt-3 max-w-md text-ink-muted">
              Browse live surplus near Louisville, or sign in to list and claim.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-wrap gap-3">
            <InteractiveHoverLink href="/explore" text="Explore" />
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm font-semibold text-ink transition-all duration-300 hover:border-gold/50 hover:bg-sage-light/50"
            >
              Login
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
