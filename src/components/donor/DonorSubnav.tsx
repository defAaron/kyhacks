import Link from "next/link";

const links: { href: string; label: string; exact?: boolean }[] = [
  { href: "/donor", label: "Inbox", exact: true },
  { href: "/donor/listings/new", label: "New listing" },
  { href: "/donor/profile", label: "Profile" },
];

export function DonorSubnav({ current }: { current: string }) {
  return (
    <nav
      aria-label="Donor"
      className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3"
    >
      {links.map(({ href, label, exact }) => {
        const active = exact ? current === href : current.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-green-100 text-green-700"
                : "text-ink-muted hover:bg-green-50 hover:text-green-600"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
