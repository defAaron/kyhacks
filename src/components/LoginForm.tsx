"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getSession, signIn } from "next-auth/react";

const DEMO_ACCOUNTS = [
  {
    label: "Donor",
    email: "donor@demo.com",
    password: "demo1234",
    hint: "Restaurant / pantry staff",
  },
  {
    label: "Recipient",
    email: "recipient@demo.com",
    password: "demo1234",
    hint: "Browse & claim surplus",
  },
] as const;

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid email or password. Try a demo account below.");
        setPending(false);
        return;
      }

      const session = await getSession();
      const role = session?.user?.role;
      const destination = role === "DONOR" ? "/donor" : "/explore";
      router.replace(destination);
      router.refresh();
    } catch {
      setError("Something went wrong signing in. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-border bg-surface/90 p-5 shadow-sm sm:p-6"
        noValidate
      >
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-ink"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-border bg-cream px-3.5 py-2.5 text-base text-ink outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-ink"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-border bg-cream px-3.5 py-2.5 text-base text-ink outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            placeholder="••••••••"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-xl bg-green-600 px-4 py-2.5 text-base font-semibold text-cream transition hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <section
        aria-labelledby="demo-accounts-heading"
        className="rounded-2xl border border-amber-400/40 bg-cream-deep/60 p-4 sm:p-5"
      >
        <h2
          id="demo-accounts-heading"
          className="font-display text-lg text-green-700"
        >
          Demo accounts
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Tap an account to fill the form — password for both is{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 text-ink">
            demo1234
          </code>
          .
        </p>
        <ul className="mt-3 space-y-2">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                onClick={() => fillDemo(account)}
                className="flex min-h-11 w-full items-start justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition hover:border-amber-500 hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
              >
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    {account.label}
                  </span>
                  <span className="mt-0.5 block font-mono text-sm text-green-600">
                    {account.email}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {account.hint}
                  </span>
                </span>
                <span className="shrink-0 self-center text-xs font-medium text-amber-600">
                  Use
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
