import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchDonorListings } from "@/lib/data";
import { estimateKgDiverted, getUrgencyInfo, countdownText } from "@/lib/rescue-score";
import { PlusIcon, UtensilsIcon, StatusDot } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DonorDashboardPage() {
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

  if (!profile || profile.role !== "donor") redirect("/signup?role=donor");

  const listings = await fetchDonorListings(user.id);

  const completed = listings.filter((l) => l.status === "distribution_completed");
  const active = listings.filter((l) => l.status !== "distribution_completed");

  const mealsDonated = completed.reduce((s, l) => s + l.quantity, 0);
  const kgDiverted = Math.round(
    completed.reduce((s, l) => s + estimateKgDiverted(l.quantity, l.unit), 0)
  );

  return (
    <main className="flex-1 px-4 pb-24 pt-6 lg:ml-64 lg:px-8 lg:pb-8 lg:pt-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-charcoal">
              Namaste, {profile.name.split(" ")[0]}
            </h1>
            <p className="text-charcoal-muted">{profile.organization}</p>
          </div>
          <Link href="/donor/listings/new">
            <Button className="gap-2">
              <PlusIcon size={16} />
              <span className="lg:hidden">List</span>
              <span className="hidden lg:inline">List Surplus Food</span>
            </Button>
          </Link>
        </div>

        {/* Impact summary */}
        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard value={Math.round(mealsDonated)} label="Meals Donated" />
          <StatCard value={kgDiverted} label="Kg Diverted" />
          <StatCard value={completed.length} label="Rescues Done" />
        </div>

        {/* Active listings */}
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">
            Active listings{" "}
            <Badge variant="primary" className="ml-1">{active.length}</Badge>
          </h2>
          {active.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
                  <UtensilsIcon size={28} />
                </span>
                <p className="mt-4 font-medium text-charcoal">No active listings</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-charcoal-muted">
                  List your surplus food and nearby rescuers will find it instantly.
                </p>
                <Link href="/donor/listings/new">
                  <Button className="mt-5">List surplus food</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {active.map((listing) => {
                const u = getUrgencyInfo(listing.pickup_deadline);
                const statusVariant =
                  listing.status === "claimed"
                    ? "warning"
                    : listing.status === "picked_up"
                    ? "primary"
                    : "success";
                return (
                  <Link key={listing.id} href={`/donor/listings`} className="block">
                    <Card className="transition hover:shadow-md">
                      <CardContent className="flex items-center justify-between gap-4 p-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate font-semibold text-charcoal">
                              {listing.food_name}
                            </h3>
                            <Badge variant={statusVariant as "warning" | "primary" | "success"}>
                              {listing.status === "claimed" ? "Claimed" : listing.status === "picked_up" ? "Picked Up" : "Available"}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-sm text-charcoal-muted">
                            {listing.quantity} {listing.unit} · {listing.category} · {listing.dietary_type}
                          </p>
                          {listing.claim?.rescuer && (
                            <p className="mt-1 text-xs font-medium text-sage">
                              Rescued by {listing.claim.rescuer.organization}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <Badge variant={u.tier === "critical" ? "danger" : u.tier === "at_risk" ? "warning" : "success"}>
                            <StatusDot tone={u.tone} />
                            {countdownText(u.minutesLeft)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-extrabold text-terracotta sm:text-3xl">
          {Number(value).toLocaleString()}
        </p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-charcoal-muted">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}