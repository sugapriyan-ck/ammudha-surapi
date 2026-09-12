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
import { statusLabel, statusVariant } from "@/lib/status";
import { RescueScoreVisual } from "@/components/rescue-score-visual";
import { UrgencyBar } from "@/components/urgency-bar";

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
  const isExpired = urgency.minutesLeft <= 0;
  const distKm = userLat != null && userLng != null ? distanceKm(userLat, userLng, listing.lat, listing.lng) : null;

  return (
    <Card className="overflow-hidden">
      {listing.photo_url && (
        <div className="relative aspect-[16/7] w-full overflow-hidden bg-warm-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.photo_url}
            alt={listing.food_name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}
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
        </div>

        {listing.description && (
          <p className="mt-2 line-clamp-2 text-sm text-charcoal/70">{listing.description}</p>
        )}

        {listing.status === "available" && listing.safety_confirmed && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage-dark">
            <StatusDot tone="green" /> Safety declared
            {listing.storage_condition ? ` · ${listing.storage_condition}` : ""}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {distKm != null && listing.status === "available" && (
            <span className="font-medium text-charcoal/80">{formatDistance(distKm)}</span>
          )}
        </div>

        {listing.status === "available" && <UrgencyBar deadline={listing.pickup_deadline} createdAt={listing.created_at} className="mt-2" />}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={urgency.tier === "critical" ? "danger" : urgency.tier === "at_risk" ? "warning" : "success"}>
            <StatusDot
              tone={urgency.tier === "critical" ? "red" : urgency.tier === "at_risk" ? "amber" : "green"}
            />
            {countdownText(urgency.minutesLeft)}
          </Badge>
          {isExpired && listing.status === "available" && (
            <Badge variant="danger">Expired — no claims</Badge>
          )}
          {listing.status !== "available" && listing.claim?.rescuer && (
            <Badge variant="primary">Rescued by {listing.claim.rescuer.organization}</Badge>
          )}
          <Badge variant={statusVariant(listing.status)}>{statusLabel(listing.status)}</Badge>
        </div>

        {listing.status === "available" && factors && <RescueScoreVisual factors={factors} />}

        {listing.status === "available" && !isExpired && (
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

        {listing.status === "available" && isExpired && (
          <Button type="button" disabled className="mt-3 w-full" size="sm">
            Deadline passed
          </Button>
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