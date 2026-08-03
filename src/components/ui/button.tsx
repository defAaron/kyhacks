import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "default" | "outline" | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "default" | "xs";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-teal text-void shadow-[0_0_0_0_rgba(143,162,138,0.35)] hover:bg-green-600 hover:shadow-[0_8px_28px_rgba(143,162,138,0.35)]",
  default:
    "bg-teal text-void shadow-[0_0_0_0_rgba(143,162,138,0.35)] hover:bg-green-600 hover:shadow-[0_8px_28px_rgba(143,162,138,0.35)]",
  secondary:
    "border border-border bg-surface/90 text-ink hover:border-sage/50 hover:bg-sage-light/60",
  outline:
    "border border-border bg-transparent text-ink hover:border-gold/50 hover:bg-sage-light/40",
  ghost: "text-ink-muted hover:bg-green-50 hover:text-mist",
  destructive: "bg-danger/15 text-danger hover:bg-danger/25",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs",
  sm: "h-9 min-h-9 px-3 text-sm",
  md: "h-11 min-h-11 px-4 text-sm",
  default: "h-11 min-h-11 px-4 text-sm",
  lg: "h-12 min-h-12 px-6 text-base",
};

/** Shared class string for Button and Link-styled CTAs. */
export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClassName({ variant, size, className })}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
