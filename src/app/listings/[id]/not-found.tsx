import Link from "next/link";

export default function ListingNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl tracking-tight text-mist">
        Listing not found
      </h1>
      <p className="mt-2 text-ink-muted">
        This surplus listing may have been removed or the link is incorrect.
      </p>
      <Link
        href="/explore"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-teal px-5 text-base font-medium text-void transition-all duration-300 hover:bg-green-600 hover:shadow-[0_8px_28px_rgba(143,162,138,0.35)] active:scale-[0.98]"
      >
        Back to explore
      </Link>
    </main>
  );
}
