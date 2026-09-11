"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  computeRescueScore,
  distanceKm,
  formatDistance,
  getUrgencyInfo,
  countdownText,
} from "@/lib/rescue-score";
import type { FoodListing } from "@/lib/types";
import { claimListing } from "@/lib/actions";
import { StatusDot } from "@/components/icons";

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "#7EA172" : score >= 40 ? "#E2725B" : "#D8A48F";
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ backgroundColor: color }}
      title={`Rescue Score: ${score}/100`}
    >
      {score}
    </div>
  );
}

function statusVariant(status: string) {
  switch (status) {
    case "available":
      return "success";
    case "claimed":
      return "warning";
    case "picked_up":
      return "primary";
    case "distribution_completed":
      return "neutral";
    default:
      return "neutral";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "available":
      return "Available";
    case "claimed":
      return "Claimed";
    case "picked_up":
      return "Picked Up";
    case "distribution_completed":
      return "Distribution Completed";
    default:
      return status;
  }
}

export function ListingCard({
  listing,
  userLat,
  userLng,
}: {
  listing: FoodListing;
  userLat?: number;
  userLng?: number;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const factors = useMemo(() => {
    if (!listing.claim && listing.status === "available" && userLat != null && userLng != null) {
      return computeRescueScore(
        listing,
        {
          userLat,
          userLng,
          maxQuantity: 100,
          preferredCategories: [],
          preferredDietary: [],
          rescuerCapacity: 500,
        },
        now
      );
    }
    return null;
  }, [listing, userLat, userLng, now]);

  const urgency = getUrgencyInfo(listing.pickup_deadline, now);
  const distKm = userLat != null && userLng != null ? distanceKm(userLat, userLng, listing.lat, listing.lng) : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold text-charcoal">{listing.food_name}</h3>
              <Badge variant="neutral">{listing.category}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-charcoal/60">
              {listing.quantity} {listing.unit} · {listing.dietary_type}
            </p>
          </div>
          {listing.status === "available" && factors && <ScoreRing score={factors.total} />}
        </div>

        {listing.description && (
          <p className="mt-2 line-clamp-2 text-sm text-charcoal/70">{listing.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {distKm != null && listing.status === "available" && (
            <span className="font-medium text-charcoal/80">{formatDistance(distKm)}</span>
          )}
          <Badge variant={urgency.tier === "critical" ? "danger" : urgency.tier === "at_risk" ? "warning" : "success"}>
            <StatusDot
              tone={urgency.tier === "critical" ? "red" : urgency.tier === "at_risk" ? "amber" : "green"}
            />
            {countdownText(urgency.minutesLeft)}
          </Badge>
          {listing.status !== "available" && listing.claim?.rescuer && (
            <Badge variant="primary">Rescued by {listing.claim.rescuer.organization}</Badge>
          )}
          <Badge variant={statusVariant(listing.status)}>{statusLabel(listing.status)}</Badge>
        </div>

        {listing.status === "available" && factors && factors.reasons.length > 0 && (
          <ul className="mt-3 space-y-0.5 border-t border-charcoal/5 pt-2 text-xs text-charcoal/70">
            {factors.reasons.slice(0, 4).map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        )}

        {listing.status === "available" && (
          <form
            action={async (formData) => {
              await claimListing(formData);
            }}
            className="mt-3"
          >
            <input type="hidden" name="listing_id" value={listing.id} />
            <Button type="submit" className="w-full" size="sm">
              Claim Food
            </Button>
          </form>
        )}

        {listing.status !== "available" && listing.claim?.rescuer_id && (
          <Link href={`/rescuer/rescue/${listing.id}`}>
            <Button variant="outline" size="sm" className="mt-3 w-full">
              View rescue details
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}