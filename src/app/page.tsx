import Link from "next/link";

const ctaBase =
  "inline-flex h-11 w-full items-center justify-center rounded-lg px-5 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:w-auto";

export default function Home() {
  return (
    <>
      <style>{`
        @keyframes surplus-fade-up {
          from {
            opacity: 0;
            transform: translateY(0.75rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .surplus-hero-enter {
          opacity: 0;
          animation: surplus-fade-up 0.6s ease-out forwards;
        }
        .surplus-hero-enter-1 {
          animation-delay: 0.08s;
        }
        .surplus-hero-enter-2 {
          animation-delay: 0.16s;
        }
        .surplus-hero-enter-3 {
          animation-delay: 0.24s;
        }
        @media (prefers-reduced-motion: reduce) {
          .surplus-hero-enter {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      <main className="flex min-h-[calc(100dvh-3.75rem)] flex-col items-center justify-center px-6 py-12 sm:py-16">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <p
            className="surplus-hero-enter font-display text-[clamp(2.75rem,11vw,5.25rem)] leading-[0.92] tracking-tight text-green-700"
            aria-label="SurplusLink"
          >
            SurplusLink
          </p>

          <h1 className="surplus-hero-enter surplus-hero-enter-1 mt-5 max-w-lg font-display text-[clamp(1.25rem,3.5vw,1.875rem)] font-semibold leading-snug text-green-600">
            Rescue surplus food nearby
          </h1>

          <p className="surplus-hero-enter surplus-hero-enter-2 mt-4 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
            Connect restaurants and pantries with people who can pick up edible
            surplus before it goes to waste.
          </p>

          <div className="surplus-hero-enter surplus-hero-enter-3 mt-10 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:gap-4">
            <Link
              href="/explore"
              className={`${ctaBase} bg-green-600 text-surface hover:bg-green-700`}
            >
              Explore
            </Link>
            <Link
              href="/login"
              className={`${ctaBase} border border-border bg-surface text-ink hover:bg-cream-deep`}
            >
              Login
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
