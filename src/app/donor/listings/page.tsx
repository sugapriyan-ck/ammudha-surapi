import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmPickupButton } from "@/components/confirm-pickup-button";
import { Timeline } from "@/components/timeline";
import { fetchDonorListings } from "@/lib/data";
import { estimateKgDiverted, getUrgencyInfo, countdownText, formatRescueId } from "@/lib/rescue-score";
import { UtensilsIcon, StatusDot } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function MyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "donor") redirect("/signup?role=donor");

  const listings = await fetchDonorListings(user.id);

  return (
    <main className="flex-1 px-4 pb-24 pt-6 lg:ml-64 lg:px-8 lg:pb-8 lg:pt-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-charcoal">My Listings</h1>
        <p className="mt-1 text-charcoal-muted">Track every rescue from listing to distribution.</p>

        {listings.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="py-12 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
                <UtensilsIcon size={28} />
              </span>
              <p className="mt-4 font-medium text-charcoal">No listings yet</p>
              <p className="mt-1 text-sm text-charcoal-muted">
                When you list surplus food, it will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-4">
            {listings.map((listing) => {
              const u = getUrgencyInfo(listing.pickup_deadline);
              const kg = estimateKgDiverted(listing.quantity, listing.unit);
              const proof =
                listing.claim?.status === "distribution_completed"
                  ? listing.claim
                  : null;

              return (
                <Card key={listing.id} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-charcoal">{listing.food_name}</h3>
                          <Badge variant="neutral">{listing.category}</Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-charcoal-muted">
                          {listing.quantity} {listing.unit} · {listing.dietary_type} ·{" "}
                          <span className="font-mono text-xs">{formatRescueId(listing.id)}</span>
                        </p>
                      </div>
                      <Badge variant={statusVariant(listing.status)}>
                        {statusLabel(listing.status)}
                      </Badge>
                    </div>

                    {/* Timeline */}
                    <Timeline currentStatus={listing.status} className="mt-4" />

                    <div className="mt-4 rounded-xl bg-warm-cream p-3 text-sm">
                      {listing.status === "distribution_completed" && proof ? (
                        <p className="text-center font-medium text-sage-dark">
                          {listing.quantity} {listing.unit} rescued · ~{kg} kg diverted
                          {proof.rescuer ? ` · Rescued by ${proof.rescuer.organization}` : ""}
                        </p>
                      ) : listing.claim?.rescuer ? (
                        <p className="text-center font-medium text-charcoal">
                          Rescued by <span className="text-terracotta">{listing.claim.rescuer.organization}</span>
                        </p>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-charcoal-muted">
                            {countdownText(u.minutesLeft)} until pickup deadline
                          </p>
                          <Badge variant={u.tier === "critical" ? "danger" : u.tier === "at_risk" ? "warning" : "success"}>
                            <StatusDot tone={u.tone} />
                            {u.label}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Donor confirm pickup */}
                    {listing.status === "claimed" && listing.claim?.rescuer && (
                      <ConfirmPickupButton listingId={listing.id} orgName={listing.claim.rescuer.organization} />
                    )}

                    {listing.status === "picked_up" && (
                      <p className="mt-3 rounded-xl bg-sage/10 p-3 text-center text-sm font-medium text-sage-dark">
                        Food picked up{listing.claim?.picked_up_at ? ` on ${new Date(listing.claim.picked_up_at).toLocaleString()}` : ""} — awaiting distribution proof
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
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