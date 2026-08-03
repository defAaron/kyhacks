"use client";

import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import Image from "next/image";
import type { ReactNode } from "react";
import { InteractiveHoverLink } from "@/components/ui/interactive-hover-button";
import { buttonClassName } from "@/components/ui/button";
import Link from "next/link";

type ParallaxHeroProps = {
  children?: ReactNode;
};

/**
 * Inspired by 21st.dev Smooth Scroll Hero — clip-path + parallax layers.
 * Initial state: map + copy fully fitted in the viewport (no crop).
 * Scroll: zoom in from that baseline.
 */
export function ParallaxHero({ children }: ParallaxHeroProps) {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const scrollHeight = 900;
  // Fully open at rest so nothing is clipped on load; expands with scroll (noop once open).
  const clipStart = useTransform(scrollY, [0, scrollHeight], [0, 0]);
  const clipEnd = useTransform(scrollY, [0, scrollHeight], [100, 100]);
  const clipPath = useMotionTemplate`polygon(${clipStart}% ${clipStart}%, ${clipEnd}% ${clipStart}%, ${clipEnd}% ${clipEnd}%, ${clipStart}% ${clipEnd}%)`;
  const imageY = useTransform(scrollY, [0, scrollHeight], ["0%", "18%"]);
  // Baseline = fitted (1); scroll zooms in — never start already scaled up.
  const imageScale = useTransform(scrollY, [0, scrollHeight], [1, 1.2]);
  const mistY = useTransform(scrollY, [0, 600], ["0%", "35%"]);
  const contentY = useTransform(scrollY, [0, 500], ["0%", "22%"]);
  const contentOpacity = useTransform(scrollY, [0, 420], [1, 0]);

  return (
    <div className="relative">
      <div
        className="relative w-full"
        style={{
          height: reduceMotion ? "100dvh" : `calc(${scrollHeight}px + 70vh)`,
        }}
      >
        {/* Sticky viewport: no overflow clip on the outer shell so hero text can fully paint */}
        <div className="sticky top-[3.75rem] h-[calc(100dvh-3.75rem)] w-full bg-parchment">
          {/* Media layer only — overflow + clip-path contain the zoom-in crop */}
          <motion.div
            className="absolute inset-0 overflow-hidden"
            style={reduceMotion ? undefined : { clipPath }}
          >
            <motion.div
              className="absolute inset-0 origin-center"
              style={
                reduceMotion
                  ? undefined
                  : { y: imageY, scale: imageScale }
              }
            >
              <Image
                src="/hero-food-map.svg"
                alt=""
                fill
                priority
                unoptimized
                className="object-contain object-center"
                sizes="100vw"
              />
            </motion.div>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-parchment via-parchment/70 to-parchment/10" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_15%_20%,rgba(143,162,138,0.18),transparent_60%)]" />
            <motion.div
              aria-hidden
              className="surplus-glow pointer-events-none absolute -right-10 top-16 h-64 w-64 rounded-full bg-gold/25 blur-3xl"
              style={reduceMotion ? undefined : { y: mistY }}
            />
          </motion.div>

          {/* Copy sits above the clipped media layer so it is never cropped by overflow/scale */}
          <motion.div
            className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col justify-end px-6 pb-[max(1.5rem,4dvh)] pt-[max(1.25rem,3dvh)] sm:pb-24"
            style={
              reduceMotion
                ? undefined
                : { y: contentY, opacity: contentOpacity }
            }
          >
            <div className="max-w-xl">
              <p
                className="surplus-hero-enter font-display text-[clamp(2.25rem,min(11vw,12dvh),5.75rem)] leading-[0.9] tracking-tight text-mist"
                aria-label="SurplusLink"
              >
                SurplusLink
              </p>

              <h1 className="surplus-hero-enter surplus-hero-enter-1 mt-[clamp(0.75rem,2dvh,1.25rem)] font-display text-[clamp(1.15rem,min(3.6vw,4.2dvh),2rem)] font-semibold leading-snug text-ink">
                Rescue surplus food nearby
              </h1>

              <p className="surplus-hero-enter surplus-hero-enter-2 mt-[clamp(0.5rem,1.5dvh,1rem)] max-w-md text-[clamp(0.9375rem,2.2dvh,1.125rem)] leading-relaxed text-ink-muted">
                Restaurants list leftovers. Neighbors claim pickups before good
                food goes to waste.
              </p>

              <div className="surplus-hero-enter surplus-hero-enter-3 mt-[clamp(1.25rem,3.5dvh,2.25rem)] flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center">
                <InteractiveHoverLink href="/explore" text="Explore" />
                <Link
                  href="/login"
                  className={buttonClassName({
                    variant: "secondary",
                    size: "lg",
                    className: "w-full sm:w-auto",
                  })}
                >
                  Login
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {children}
    </div>
  );
}
