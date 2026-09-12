import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmPickupButton } from "@/components/confirm-pickup-button";
import { Timeline } from "@/components/timeline";
import { fetchDonorListings } from "@/lib/data";
import { estimateKgDiverted, formatRescueId } from "@/lib/rescue-score";
import { statusLabel, statusVariant } from "@/lib/status";
import { UtensilsIcon } from "@/components/icons";
import { CountdownTimer } from "@/components/countdown-timer";

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
              const kg = estimateKgDiverted(listing.quantity, listing.unit);
              const proof =
                listing.claim?.status === "distribution_completed"
                  ? listing.claim
                  : null;

              return (
                <Card key={listing.id} className="overflow-hidden">
                  <CardContent className="p-5">
                    {listing.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.photo_url}
                        alt=""
                        className="mb-4 aspect-[16/7] w-full rounded-xl object-cover"
                      />
                    )}
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
                            <CountdownTimer deadline={listing.pickup_deadline} showDeadlineTime />
                            <p className="text-xs text-charcoal-muted">
                              Before the food must go to someone.
                            </p>
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

                    {listing.status === "available" &&
                      new Date(listing.pickup_deadline).getTime() <= new Date().getTime() && (
                        <p className="mt-3 rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-700">
                          Deadline passed — this listing was never claimed
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