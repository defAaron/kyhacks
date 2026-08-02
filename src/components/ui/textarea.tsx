import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "./utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const textareaClasses =
  "flex min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-50";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(textareaClasses, className)}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
