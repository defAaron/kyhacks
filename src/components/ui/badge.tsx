import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "muted";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-green-100 text-mist",
  success: "bg-green-50 text-teal",
  warning: "bg-gold/15 text-amber-600",
  danger: "bg-danger/15 text-danger",
  muted: "bg-cream-deep text-ink-muted",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
