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
            className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ${
              active
                ? "bg-teal text-void"
                : "text-ink-muted hover:bg-green-50 hover:text-mist"
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
