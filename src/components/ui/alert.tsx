import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: AlertVariant;
  title?: ReactNode;
}

const variantClasses: Record<AlertVariant, string> = {
  info: "border-border bg-surface text-ink",
  success: "border-success/30 bg-green-50 text-green-700",
  warning: "border-amber-400/40 bg-amber-400/15 text-amber-600",
  error: "border-danger/30 bg-danger/10 text-danger",
};

export function Alert({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      {children ? (
        <div className="text-[0.9375rem] leading-relaxed">{children}</div>
      ) : null}
    </div>
  );
}
