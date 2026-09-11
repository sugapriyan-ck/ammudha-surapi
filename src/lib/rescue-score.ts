import type { FoodListing } from "./types";

export const URGENCY_LOW_HOURS = 4; // >4h remaining = Low
export const URGENCY_AT_RISK_HOURS = 2; // 1–2h = At Risk
export const URGENCY_CRITICAL_MINUTES = 30; // <30 min = Critical

export const SCORE_WEIGHTS = {
  urgency: 0.4,
  distance: 0.3,
  quantity: 0.15,
  matchQuality: 0.15,
} as const;

export const MAX_SEARCH_RADIUS_KM = 50;

export type UrgencyTier = "low" | "at_risk" | "critical";

export function getUrgencyInfo(deadline: string | Date, now: Date = new Date()): {
  tier: UrgencyTier;
  label: string;
  minutesLeft: number;
  tone: "green" | "amber" | "red";
} {
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  const minutesLeft = Math.max(0, Math.floor((deadlineDate.getTime() - now.getTime()) / 60000));
  const hoursLeft = minutesLeft / 60;

  if (minutesLeft <= URGENCY_CRITICAL_MINUTES) {
    return { tier: "critical", label: "Critical", minutesLeft, tone: "red" };
  }
  if (hoursLeft <= URGENCY_AT_RISK_HOURS) {
    return { tier: "at_risk", label: "At Risk", minutesLeft, tone: "amber" };
  }
  if (hoursLeft <= URGENCY_LOW_HOURS) {
    return { tier: "at_risk", label: "At Risk", minutesLeft, tone: "amber" };
  }
  return { tier: "low", label: "Low", minutesLeft, tone: "green" };
}

export function countdownText(minutesLeft: number): string {
  if (minutesLeft <= 0) return "Deadline passed";
  if (minutesLeft < 60) return `${minutesLeft}m left`;
  const h = Math.floor(minutesLeft / 60);
  const m = minutesLeft % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m left` : `${h}h left`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h left`;
}

export function distanceKm(userLat: number, userLng: number, listingLat: number, listingLng: number): number {
  const R = 6371;
  const dLat = ((listingLat - userLat) * Math.PI) / 180;
  const dLng = ((listingLng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((listingLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export interface RescueScoreFactors {
  urgencyScore: number;
  distanceScore: number;
  quantityScore: number;
  matchQualityScore: number;
  total: number;
  reasons: string[];
}

export function computeRescueScore(
  listing: Pick<
    FoodListing,
    "pickup_deadline" | "lat" | "lng" | "quantity" | "category" | "dietary_type"
  >,
  opts: {
    userLat: number;
    userLng: number;
    maxQuantity: number;
    preferredCategories: string[];
    preferredDietary: string[];
    rescuerCapacity: number;
  },
  now: Date = new Date()
): RescueScoreFactors {
  // ---- Urgency (40%) ----
  const { minutesLeft } = getUrgencyInfo(listing.pickup_deadline, now);
  // Map: expired=0, 1h=peak. Score ramps up as time runs out.
  let urgencyScore: number;
  if (minutesLeft <= 0) urgencyScore = 0;
  else if (minutesLeft <= 60) urgencyScore = 100;
  else urgencyScore = Math.max(0, 100 - (minutesLeft - 60) * 0.15);

  // ---- Distance (30%) ----
  const d = distanceKm(opts.userLat, opts.userLng, listing.lat, listing.lng);
  let distanceScore: number;
  if (d <= 1) distanceScore = 100;
  else if (d >= MAX_SEARCH_RADIUS_KM) distanceScore = 0;
  else distanceScore = Math.max(0, 100 - (d - 1) * (100 / (MAX_SEARCH_RADIUS_KM - 1)));

  // ---- Quantity compatibility (15%) ----
  // Prefer quantities a rescuer can actually handle.
  let quantityScore: number;
  if (listing.quantity <= opts.maxQuantity) {
    quantityScore = 100 - Math.abs(listing.quantity - opts.maxQuantity) * 2;
  } else {
    quantityScore = Math.max(0, 100 - (listing.quantity - opts.maxQuantity) * 5);
  }
  quantityScore = Math.max(0, Math.min(100, quantityScore));

  // ---- Match quality / food-type fit (15%) ----
  const categoryMatch = opts.preferredCategories.includes(listing.category);
  const dietaryMatch = opts.preferredDietary.includes(listing.dietary_type);
  let matchQualityScore = 40; // baseline
  if (categoryMatch) matchQualityScore += 30;
  if (dietaryMatch) matchQualityScore += 30;

  // ---- Weighted total ----
  const total = Math.round(
    urgencyScore * SCORE_WEIGHTS.urgency +
      distanceScore * SCORE_WEIGHTS.distance +
      quantityScore * SCORE_WEIGHTS.quantity +
      matchQualityScore * SCORE_WEIGHTS.matchQuality
  );

  // ---- Human-readable reasons ----
  const reasons: string[] = [];
  if (urgencyScore >= 80) reasons.push("Pickup deadline approaching");
  if (urgencyScore >= 60) reasons.push("High urgency");
  if (distanceScore >= 80) reasons.push("Close to your location");
  if (distanceScore >= 50) reasons.push(`${formatDistance(d)}`);
  if (quantityScore >= 70) reasons.push("Fits your capacity");
  if (categoryMatch) reasons.push(`You look for ${listing.category}`);
  if (dietaryMatch) reasons.push("Matches your dietary type");
  if (reasons.length === 0) reasons.push("Available food nearby");
  if (minutesLeft <= 0) reasons.push("Deadline passed — needs fast action");

  return {
    urgencyScore: Math.round(urgencyScore),
    distanceScore: Math.round(distanceScore),
    quantityScore: Math.round(quantityScore),
    matchQualityScore,
    total: Math.max(0, Math.min(100, total)),
    reasons,
  };
}

export function estimateKgDiverted(quantity: number, unit: string): number {
  // Rough weight estimate per unit used for impact reporting.
  const multipliers: Record<string, number> = {
    Meals: 0.4,
    Packs: 0.8,
    Kg: 1,
    Boxes: 5,
  };
  return Math.round(quantity * (multipliers[unit] ?? 1));
}

export function formatRescueId(id: string): string {
  return `AS-${id.slice(0, 8).toUpperCase()}`;
}