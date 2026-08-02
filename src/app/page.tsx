import Image from "next/image";
import Link from "next/link";
import { buttonClassName } from "@/components/ui";

export default function Home() {
  return (
    <main className="relative isolate min-h-[calc(100dvh-3.75rem)] overflow-hidden">
      {/* Full-bleed hero visual plane */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <Image
          src="/hero-surplus.svg"
          alt=""
          fill
          priority
          unoptimized
          className="surplus-hero-media object-cover object-[center_40%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--cream)] via-[color:var(--cream)]/85 to-[color:var(--cream)]/35" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_15%_20%,rgba(216,232,207,0.45),transparent_60%)]" />
      </div>

      <div className="mx-auto flex min-h-[calc(100dvh-3.75rem)] w-full max-w-6xl flex-col justify-end px-6 pb-14 pt-20 sm:pb-20 sm:pt-24">
        <div className="max-w-xl">
          <p
            className="surplus-hero-enter font-display text-[clamp(3rem,12vw,5.75rem)] leading-[0.9] tracking-tight text-green-700"
            aria-label="SurplusLink"
          >
            SurplusLink
          </p>

          <h1 className="surplus-hero-enter surplus-hero-enter-1 mt-5 font-display text-[clamp(1.35rem,3.8vw,2rem)] font-semibold leading-snug text-green-600">
            Rescue surplus food nearby
          </h1>

          <p className="surplus-hero-enter surplus-hero-enter-2 mt-4 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
            Restaurants list leftovers. Neighbors claim pickups before good food
            goes to waste.
          </p>

          <div className="surplus-hero-enter surplus-hero-enter-3 mt-9 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center">
            <Link
              href="/explore"
              className={buttonClassName({
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              Explore
            </Link>
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
      </div>
    </main>
  );
}
