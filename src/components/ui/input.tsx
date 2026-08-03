import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const inputClasses =
  "flex h-11 min-h-11 w-full rounded-xl border border-border bg-cream-deep px-3 py-2 text-base text-ink placeholder:text-ink-muted transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(inputClasses, className)}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
