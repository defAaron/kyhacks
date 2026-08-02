import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to SurplusLink with a demo donor or recipient account.",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-tight text-green-700 sm:text-4xl">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Use a demo account to list surplus or claim nearby pickups.
        </p>
      </div>

      <LoginForm />

      <p className="mt-8 text-center text-sm text-ink-muted">
        Just browsing?{" "}
        <Link href="/explore" className="font-medium underline-offset-2 hover:underline">
          Explore available food
        </Link>
      </p>
    </main>
  );
}
