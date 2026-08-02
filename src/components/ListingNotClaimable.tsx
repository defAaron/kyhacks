import { Alert } from "@/components/ui";
import {
  getListingAvailability,
  type ListingAvailabilityInput,
} from "@/lib/listing-status";

export type ListingNotClaimableProps = {
  listing: ListingAvailabilityInput;
  now?: Date;
  className?: string;
};

/**
 * Empty / blocked claim state for listing detail (S10.3 / S12.1).
 * Returns null when the listing is still claimable.
 */
export function ListingNotClaimable({
  listing,
  now,
  className,
}: ListingNotClaimableProps) {
  const availability = getListingAvailability(listing, now);
  if (availability.claimable) return null;

  const variant = availability.kind === "sold_out" ? "error" : "info";

  return (
    <Alert
      variant={variant}
      className={className}
      role="status"
      title={availability.label}
    >
      {availability.message}
    </Alert>
  );
}
