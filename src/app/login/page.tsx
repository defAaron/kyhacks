import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to SurplusLink with a demo donor or recipient account.",
};

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="relative mx-auto flex w-full max-w-lg flex-col px-4 py-10 sm:px-6 sm:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 h-64 bg-[radial-gradient(ellipse_70%_80%_at_50%_0%,rgba(143,162,138,0.2),transparent_70%)]"
      />
      <div className="relative mb-8">
        <h1 className="font-display text-3xl tracking-tight text-mist sm:text-4xl">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Use a demo account to list surplus or claim nearby pickups.
        </p>
      </div>

      <div className="relative">
        <LoginForm callbackUrl={callbackUrl} />
      </div>

      <p className="relative mt-8 text-center text-sm text-ink-muted">
        Just browsing?{" "}
        <Link
          href="/explore"
          className="font-medium text-mist underline-offset-2 hover:underline"
        >
          Explore available food
        </Link>
      </p>
    </main>
  );
}
