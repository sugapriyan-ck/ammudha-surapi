import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timeline } from "@/components/timeline";
import { fetchRescuerClaims } from "@/lib/data";
import { estimateKgDiverted, formatRescueId } from "@/lib/rescue-score";
import { claimStatusLabel, claimStatusVariant } from "@/lib/status";
import { LeafIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function MyRescuesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const claims = await fetchRescuerClaims(user.id);
  const completed = claims.filter((c) => c.status === "distribution_completed");

  const mealsRescued = completed.reduce((s, c) => s + (c.listing?.quantity ?? 0), 0);
  const kgDiverted = Math.round(
    completed.reduce((s, c) => s + estimateKgDiverted(c.listing?.quantity ?? 0, c.listing?.unit ?? "Meals"), 0)
  );
  const peopleServed = completed.reduce((s, c) => {
    const p = Array.isArray(c.proof) ? c.proof[0] : c.proof;
    return s + (p?.people_served ?? 0);
  }, 0);

  return (
    <main className="flex-1 px-4 pb-24 pt-16 lg:pt-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-charcoal">My Rescues</h1>
        <p className="mt-1 text-charcoal-muted">
          Every rescue you complete is here, tracked end-to-end.
        </p>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <MiniStat value={Math.round(mealsRescued)} label="Meals" />
          <MiniStat value={kgDiverted} label="Kg Diverted" />
          <MiniStat value={peopleServed} label="People Served" />
        </div>

        {claims.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="py-12 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/10 text-sage">
                <LeafIcon size={28} />
              </span>
              <p className="mt-4 font-medium text-charcoal">No rescues yet</p>
              <p className="mt-1 text-sm text-charcoal-muted">
                Claim food from the dashboard to start rescuing.
              </p>
              <Link href="/rescuer/dashboard">
                <Button className="mt-5">Find food to rescue</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-4">
            {claims.map((claim) => {
              const listing = claim.listing;
              if (!listing) return null;
              const proof = Array.isArray(claim.proof) ? claim.proof[0] : claim.proof;
              return (
                <Link key={claim.id} href={`/rescuer/rescue/${listing.id}`} className="block">
                  <Card className="transition hover:shadow-md">
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
                          {listing.donor && (
                            <p className="mt-1 text-xs text-charcoal-muted">
                              Donated by <span className="font-medium text-charcoal">{listing.donor.organization}</span>
                            </p>
                          )}
                        </div>
                        <Badge variant={claimStatusVariant(claim.status)}>
                          {claimStatusLabel(claim.status)}
                        </Badge>
                      </div>

                      <Timeline currentStatus={claim.status} className="mt-4" />

                      {proof && (
                        <div className="mt-3 rounded-xl bg-sage/10 p-3 text-sm text-sage-dark">
                          Served <strong>{proof.people_served}</strong> people
                          {proof.distribution_location
                            ? ` at ${proof.distribution_location}`
                            : ""}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-xl font-extrabold text-sage">{Number(value).toLocaleString()}</p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-charcoal-muted">{label}</p>
      </CardContent>
    </Card>
  );
}