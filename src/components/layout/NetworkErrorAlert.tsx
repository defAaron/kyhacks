import { Alert, Button } from "@/components/ui";

export type NetworkErrorAlertProps = {
  /** Override default body copy */
  message?: string;
  /** Optional retry handler (explore reload, claim retry, etc.) */
  onRetry?: () => void;
  /** Retry button label */
  retryLabel?: string;
  className?: string;
  title?: string;
};

/**
 * Shared network / fetch failure state for explore + listing detail (S10.3).
 */
export function NetworkErrorAlert({
  message = "We couldn’t reach the server. Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
  className,
  title = "Connection problem",
}: NetworkErrorAlertProps) {
  return (
    <Alert variant="error" title={title} className={className}>
      <div className="space-y-3">
        <p>{message}</p>
        {onRetry ? (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </Alert>
  );
}
