"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { cn } from "@/lib/utils";

type InteractiveHoverButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  text?: string;
};

const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Button", className, children, ...props }, ref) => {
  const label = typeof children === "string" ? children : text;

  return (
    <button
      ref={ref}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-full border border-sage/35 bg-surface px-6 py-3 text-center font-semibold text-ink",
        className,
      )}
      {...props}
    >
      <span className="inline-block translate-x-1 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
        {label}
      </span>
      <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-parchment opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100">
        <span>{label}</span>
        <ArrowRight className="size-4" />
      </div>
      <div className="absolute left-[20%] top-[40%] h-2 w-2 scale-[1] rounded-lg bg-teal transition-all duration-300 group-hover:left-0 group-hover:top-0 group-hover:h-full group-hover:w-full group-hover:scale-[1.8] group-hover:bg-teal" />
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

function InteractiveHoverLink({
  href,
  text,
  className,
  children,
}: {
  href: string;
  text?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const label = typeof children === "string" ? children : (text ?? "Explore");

  return (
    <Link
      href={href}
      className={cn(
        "group relative inline-flex min-h-12 min-w-[9.5rem] cursor-pointer items-center justify-center overflow-hidden rounded-full border border-sage/35 bg-surface px-6 py-3 text-center font-semibold text-ink no-underline",
        className,
      )}
    >
      <span className="relative z-20 inline-block translate-x-1 text-ink transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
        {label}
      </span>
      <div className="absolute top-0 z-20 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-parchment opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100">
        <span>{label}</span>
        <ArrowRight className="size-4" />
      </div>
      <div className="absolute left-[20%] top-[40%] z-10 h-2 w-2 scale-[1] rounded-lg bg-teal transition-all duration-300 group-hover:left-0 group-hover:top-0 group-hover:h-full group-hover:w-full group-hover:scale-[1.8] group-hover:bg-teal" />
    </Link>
  );
}

export { InteractiveHoverButton, InteractiveHoverLink };
