import Link from "next/link";

export default function ListingNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl tracking-tight text-green-700">
        Listing not found
      </h1>
      <p className="mt-2 text-ink-muted">
        This surplus listing may have been removed or the link is incorrect.
      </p>
      <Link
        href="/explore"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-green-600 px-5 text-base font-medium text-surface transition-colors hover:bg-green-700"
      >
        Back to explore
      </Link>
    </main>
  );
}
