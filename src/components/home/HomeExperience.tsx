"use client";

import Link from "next/link";
import { ArchitectureDiagrams } from "@/components/home/ArchitectureDiagrams";
import { LandingFaq } from "@/components/home/LandingFaq";
import { ParallaxHero } from "@/components/motion/ParallaxHero";
import { Reveal } from "@/components/motion/Reveal";
import { InteractiveHoverLink } from "@/components/ui/interactive-hover-button";

const problemPoints = [
  {
    title: "Edible food still gets tossed",
    body: "Restaurants and pantries discard surplus at closing while nearby people face food insecurity.",
  },
  {
    title: "Discovery is fragmented",
    body: "What is available, where, and until when rarely lives in one place people can check on a phone.",
  },
  {
    title: "Pickup logistics stall",
    body: "Time windows are short, portions change fast, and multi-stop runs are hard to plan by hand.",
  },
] as const;

const solutionBeats = [
  "Donors photograph leftovers; local Food-101 suggests listing details.",
  "Staff confirm allergens, portions, and a pickup window — then publish.",
  "Recipients browse a live map, claim what they can use, and optimize a route.",
] as const;

export function HomeExperience() {
  return (
    <main className="relative">
      <ParallaxHero />

      {/* Problem — one job: name the pain */}
      <section
        id="problem"
        className="relative z-20 border-t border-border bg-[#f7f4ed] px-6 py-24 sm:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-gold">
              The problem
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl tracking-tight text-mist sm:text-4xl">
              Good food disappears before the people who need it know it exists
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
              Surplus is time-sensitive. Without a shared board and clear pickup
              windows, kitchens waste edible food and neighbors never get the
              chance.
            </p>
          </Reveal>

          <ul className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
            {problemPoints.map((point, index) => (
              <Reveal key={point.title} delay={index * 0.08}>
                <li>
                  <p className="font-display text-4xl text-teal/35">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 font-display text-xl text-mist">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">
                    {point.body}
                  </p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Solution — one job: state the product answer */}
      <section
        id="solution"
        className="relative z-20 border-t border-border bg-[#f3f0e7] px-6 py-24 sm:py-32"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_0%_40%,rgba(143,162,138,0.16),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-gold">
              The solution
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl tracking-tight text-mist sm:text-4xl">
              SurplusLink turns closing trays into claimable pickups
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
              A mobile-friendly web app for donors and recipients: photograph
              surplus, publish a window, claim nearby, and run an efficient
              multi-stop route — with free local vision, not a paid cloud API.
            </p>
          </Reveal>

          <ol className="mt-14 max-w-2xl space-y-8">
            {solutionBeats.map((beat, index) => (
              <Reveal key={beat} delay={index * 0.07}>
                <li className="flex gap-4">
                  <span className="font-display text-2xl text-teal/45">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="pt-1 text-base leading-relaxed text-ink sm:text-lg">
                    {beat}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* How it works + architecture */}
      <section
        id="how-it-works"
        className="relative z-20 border-t border-border bg-[#f7f4ed] px-6 py-24 sm:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <div className="md:mx-auto md:max-w-2xl md:text-center">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-gold">
              How it works
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight text-mist sm:text-4xl">
              From camera to curb in one calm loop
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
              Donors list in minutes. Recipients see what is available tonight,
              reserve portions, and get an ordered pickup run — click through the
              pipeline to see each layer of the stack.
            </p>
          </div>

          <ArchitectureDiagrams />
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="relative z-20 border-t border-border bg-[#f3f0e7] px-6 py-24 sm:py-32"
      >
        <LandingFaq />
      </section>

      {/* Closing CTA */}
      <section className="relative z-20 overflow-hidden border-t border-border bg-[#f7f4ed] px-6 py-24 sm:py-28">
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
