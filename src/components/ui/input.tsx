import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const inputClasses =
  "flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-50";

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
