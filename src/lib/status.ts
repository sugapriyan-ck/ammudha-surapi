export type StatusVariant = "success" | "warning" | "danger" | "neutral" | "primary";

const LISTING_STATUSES: Record<string, { label: string; variant: StatusVariant }> = {
  available: { label: "Available", variant: "success" },
  claimed: { label: "Claimed", variant: "warning" },
  picked_up: { label: "Picked Up", variant: "primary" },
  distribution_completed: { label: "Distribution Completed", variant: "neutral" },
};

const CLAIM_STATUSES: Record<string, { label: string; variant: StatusVariant }> = {
  claimed: { label: "Claimed", variant: "warning" },
  picked_up: { label: "Picked Up", variant: "primary" },
  distribution_completed: { label: "Distribution Completed", variant: "success" },
};

export function statusLabel(status: string): string {
  return LISTING_STATUSES[status]?.label ?? status;
}

export function statusVariant(status: string): StatusVariant {
  return LISTING_STATUSES[status]?.variant ?? "neutral";
}

export function claimStatusLabel(status: string): string {
  return CLAIM_STATUSES[status]?.label ?? status;
}

export function claimStatusVariant(status: string): StatusVariant {
  return CLAIM_STATUSES[status]?.variant ?? "neutral";
}