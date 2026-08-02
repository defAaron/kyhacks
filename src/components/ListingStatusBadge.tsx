import { Badge, type BadgeVariant } from "@/components/ui";
import {
  getListingAvailability,
  type ListingAvailabilityInput,
} from "@/lib/listing-status";

export type ListingStatusBadgeProps = {
  listing: ListingAvailabilityInput;
  /** Override clock (tests / SSR snapshot). */
  now?: Date;
  className?: string;
};

/**
 * Compact status chip for explore cards, detail, and donor inbox.
 * Treats past pickupEnd as expired even if the API has not flipped status yet.
 */
export function ListingStatusBadge({
  listing,
  now,
  className,
}: ListingStatusBadgeProps) {
  const availability = getListingAvailability(listing, now);
  const variant = availability.badgeVariant as BadgeVariant;

  return (
    <Badge variant={variant} className={className}>
      {availability.label}
    </Badge>
  );
}
