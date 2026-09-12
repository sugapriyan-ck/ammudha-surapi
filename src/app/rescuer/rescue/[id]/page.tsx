import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timeline } from "@/components/timeline";
import { ProofForm } from "@/components/proof-form";
import { RescueCard } from "@/components/rescue-card";
import { fetchListingWithDetails } from "@/lib/data";
import {
  estimateKgDiverted,
  distanceKm,
  formatDistance,
  getUrgencyInfo,
  countdownText,
  formatRescueId,
} from "@/lib/rescue-score";
import { statusLabel, statusVariant } from "@/lib/status";
import { HeartHandIcon, LeafIcon, ShieldCheckIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function RescueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const listing = await fetchListingWithDetails(id);
  if (!listing) return <p className="p-8 text-charcoal-muted">Listing not found.</p>;

  const claim = listing.claim;
  const isRescuer = profile?.role === "rescuer" && claim?.rescuer_id === user.id;
  const isDonor = profile?.role === "donor" && listing.donor_id === user.id;
  const proof = Array.isArray(claim?.proof)
    ? (claim?.proof as unknown[])[0]
    : (claim?.proof as unknown);

  const isCompleted = listing.status === "distribution_completed";

  if (!isRescuer && !isDonor && listing.status === "available") {
    redirect("/rescuer/dashboard");
  }

  const urgency = getUrgencyInfo(listing.pickup_deadline);
  const kg = estimateKgDiverted(listing.quantity, listing.unit);
  const dist =
    profile?.lat != null && profile.lng != null
      ? formatDistance(distanceKm(profile.lat, profile.lng, listing.lat, listing.lng))
      : null;

  const proofData = proof as {
    id?: string;
    people_served?: number;
    distribution_location?: string | null;
    note?: string | null;
    photos?: string[];
    submitted_at?: string;
  } | null;

  return (
    <main className="flex-1 px-4 pb-24 pt-16 lg:pt-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-charcoal">{listing.food_name}</h1>
                  <Badge variant="neutral">{listing.category}</Badge>
                </div>
                <p className="mt-1 text-sm text-charcoal-muted">
                  <span className="font-mono text-xs">{formatRescueId(listing.id)}</span> ·{" "}
                  {listing.quantity} {listing.unit} · {listing.dietary_type} · ~{kg} kg
                </p>
              </div>
              <Badge variant={statusVariant(listing.status)}>{statusLabel(listing.status)}</Badge>
            </div>

            {listing.description && (
              <p className="mt-3 rounded-xl bg-warm-cream p-3 text-sm text-charcoal/80">
                {listing.description}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Detail label="Donor" value={listing.donor?.organization ?? "—"} />
              <Detail label="Distance" value={dist ?? "—"} />
              <Detail
                label="Deadline"
                value={`${countdownText(urgency.minutesLeft)} · ${urgency.label}`}
              />
              <Detail label="Status" value={statusLabel(listing.status)} />
            </div>

            <Timeline currentStatus={listing.status} className="mt-6" />

            {claim?.rescuer && (
              <div className="mt-5 rounded-xl bg-terracotta/5 p-4 text-sm">
                <p className="flex items-center gap-2 font-medium text-charcoal">
                  <HeartHandIcon size={16} className="text-terracotta" />
                  Rescued by{" "}
                  <span className="text-terracotta">{claim.rescuer.organization}</span>
                </p>
                <ChainOfCustody listing={listing} claim={claim} />
              </div>
            )}

            {listing.safety_confirmed && (
              <div className="mt-4 rounded-xl bg-sage/10 p-4">
                <p className="flex items-center gap-2 font-medium text-sage-dark">
                  <ShieldCheckIcon size={16} />
                  Food safety declared by the donor
                </p>
                <p className="mt-1 text-sm text-sage-dark">
                  {listing.prepared_at
                    ? `Prepared ${new Date(listing.prepared_at).toLocaleString()}`
                    : "Preparation time not recorded"}
                  {listing.storage_condition ? ` · Stored: ${listing.storage_condition}` : ""}
                </p>
              </div>
            )}

            {proofData?.people_served != null && (
              <div className="mt-4 rounded-xl bg-sage/10 p-4">
                <p className="flex items-center gap-2 font-medium text-sage-dark">
                  <LeafIcon size={16} />
                  Distribution proof submitted — <em>not verified</em>
                </p>
                <p className="mt-1 text-sm text-sage-dark">
                  {proofData.people_served} people served
                  {proofData.distribution_location ? ` at ${proofData.distribution_location}` : ""}
                </p>
                {proofData.note && (
                  <p className="mt-1 text-sm text-sage-dark">
                    &quot;{proofData.note}&quot;
                  </p>
                )}
                {proofData.photos && proofData.photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {proofData.photos.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Distribution proof ${i + 1}`}
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {isRescuer && listing.status !== "distribution_completed" && !proofData && (
          <ProofForm listingId={listing.id} listingStatus={listing.status} />
        )}

        {/* Shareable Rescue Card on completion */}
        {isCompleted && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-charcoal">
              Your Rescue Card
            </h2>
            <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-charcoal/5" />}>
              <RescueCard
                data={{
                  rescueId: formatRescueId(listing.id),
                  mealsRescued: mealsEstimate(listing.quantity, listing.unit),
                  kgDiverted: Math.round(estimateKgDivertedNumber(listing.quantity, listing.unit)),
                  peopleServed: (proofData?.people_served ?? 0) as number,
                  organizationName: claim?.rescuer?.organization ?? "",
                  foodName: listing.food_name,
                  created_at: listing.created_at,
                }}
              />
            </Suspense>
          </div>
        )}
      </div>
    </main>
  );
}

function estimateKgDivertedNumber(quantity: number, unit: string) {
  const multipliers: Record<string, number> = {
    Meals: 0.4,
    Packs: 0.8,
    Kg: 1,
    Boxes: 5,
  };
  return quantity * (multipliers[unit] ?? 1);
}

function mealsEstimate(quantity: number, unit: string): number {
  if (unit === "Meals") return Math.round(quantity);
  return Math.round(quantity * (unit === "Boxes" ? 8 : unit === "Packs" ? 4 : 2));
}

function ChainOfCustody({
  listing,
  claim,
}: {
  listing: { created_at: string };
  claim: {
    claimed_at: string;
    picked_up_at?: string | null;
    completed_at?: string | null;
  };
}) {
  const steps: Array<{ label: string; at?: string | null }> = [
    { label: "Listed", at: listing.created_at },
    { label: "Claimed", at: claim.claimed_at },
    { label: "Picked up", at: claim.picked_up_at },
    { label: "Completed", at: claim.completed_at },
  ];
  return (
    <ul className="mt-2 space-y-1 border-t border-terracotta/10 pt-2 text-xs text-charcoal-muted">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center justify-between gap-3">
          <span>{s.label}</span>
          <span className={s.at ? "font-medium text-charcoal" : "text-charcoal/30"}>
            {s.at ? new Date(s.at).toLocaleString() : "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-charcoal-muted">{label}</p>
      <p className="mt-0.5 font-medium text-charcoal">{value}</p>
    </div>
  );
}