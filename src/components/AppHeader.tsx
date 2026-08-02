import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button, buttonClassName } from "@/components/ui";

const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/donor", label: "Donor" },
  { href: "/claims", label: "Claims" },
] as const;

function NavLinks({ className }: { className?: string }) {
  return (
    <>
      {navLinks.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={buttonClassName({
            variant: "ghost",
            size: "sm",
            className: `min-h-11 px-3 ${className ?? ""}`,
          })}
        >
          {label}
        </Link>
      ))}
    </>
  );
}

function AuthControl({
  isLoggedIn,
  className,
}: {
  isLoggedIn: boolean;
  className?: string;
}) {
  if (isLoggedIn) {
    return (
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className={`min-h-11 px-3 ${className ?? ""}`}
        >
          Logout
        </Button>
      </form>
    );
  }

  return (
    <Link
      href="/login"
      className={buttonClassName({
        variant: "primary",
        size: "sm",
        className: `min-h-11 px-3 ${className ?? ""}`,
      })}
    >
      Login
    </Link>
  );
}

export async function AppHeader() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[3.75rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-green-700 transition-colors hover:text-green-600"
        >
          SurplusLink
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Main navigation"
        >
          <NavLinks />
          <AuthControl isLoggedIn={isLoggedIn} />
        </nav>

        <details className="group relative md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg border border-border bg-cream px-3 text-sm font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Close</span>
          </summary>
          <nav
            className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] rounded-lg border border-border bg-surface p-2 shadow-lg"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-0.5">
              <NavLinks className="w-full justify-start" />
              <div className="mt-1 border-t border-border pt-1">
                <AuthControl
                  isLoggedIn={isLoggedIn}
                  className="w-full justify-start"
                />
              </div>
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}
