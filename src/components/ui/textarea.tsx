import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const textareaClasses =
  "flex min-h-28 w-full rounded-xl border border-border bg-cream-deep px-3 py-2 text-base text-ink placeholder:text-ink-muted transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

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
