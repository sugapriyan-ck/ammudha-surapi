import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchGlobalImpact, fetchRecentRescues, fetchPersonalImpact } from "@/lib/data";
import { formatRescueId, estimateKgDiverted } from "@/lib/rescue-score";
import {
  UtensilsIcon,
  ScaleIcon,
  HeartHandIcon,
  CheckCircleIcon,
  LeafIcon,
  ClockIcon,
  SparkIcon,
  UsersIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ImpactPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const impact = await fetchGlobalImpact();
  const recent = await fetchRecentRescues(10);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const personal =
    profile?.role === "donor" || profile?.role === "rescuer"
      ? await fetchPersonalImpact(user.id, profile.role)
      : null;

  return (
    <main className="flex-1 px-4 pb-24 pt-16 lg:pt-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold text-charcoal">Community Impact</h1>
        <p className="mt-1 text-charcoal-muted">
          Real impact, tracked across every completed rescue.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <GlobalStat Icon={UtensilsIcon} value={impact.mealsRescued} label="Meals Rescued" />
          <GlobalStat Icon={ScaleIcon} value={impact.kgDiverted} label="Kg Diverted" />
          <GlobalStat Icon={HeartHandIcon} value={impact.peopleServed} label="People Served" />
          <GlobalStat Icon={CheckCircleIcon} value={impact.successfulRescues} label="Rescues Done" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <EfficiencyStat
            Icon={SparkIcon}
            value={impact.successRate != null ? `${impact.successRate}%` : "—"}
            label="Rescue success rate"
            hint={`${impact.successfulRescues} of ${impact.totalListings} listed rescues completed`}
          />
          <EfficiencyStat
            Icon={ClockIcon}
            value={formatDuration(impact.avgTimeToClaimMinutes)}
            label="Avg time to claim"
            hint="Listing created to first claim"
          />
          <EfficiencyStat
            Icon={UsersIcon}
            value={String(impact.totalListings)}
            label="Listings created"
            hint="Total surplus food listings on the platform"
          />
        </div>

        {personal && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-charcoal">Your contribution</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <GlobalStat Icon={UtensilsIcon} value={personal.mealsRescued} label="Meals" />
              <GlobalStat Icon={ScaleIcon} value={personal.kgDiverted} label="Kg Diverted" />
              <GlobalStat Icon={HeartHandIcon} value={personal.peopleServed} label="People" />
              <GlobalStat
                Icon={SparkIcon}
                value={personal.successRate != null ? `${personal.successRate}%` : "—"}
                label="Success rate"
              />
            </div>
          </section>
        )}

        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">Recent rescues</h2>
          {recent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/10 text-sage">
                  <LeafIcon size={28} />
                </span>
                <p className="mt-4 font-medium text-charcoal">No completed rescues yet</p>
                <p className="mt-1 text-sm text-charcoal-muted">
                  Every completed rescue appears here — with full transparency.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recent.map((claim) => {
                const listing = claim.listing;
                if (!listing) return null;
                const kilos = estimateKgDiverted(listing.quantity, listing.unit);
                const proof = Array.isArray(claim.proof) ? claim.proof[0] : claim.proof;
                return (
                  <Card key={claim.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage/15 text-sage">
                          <LeafIcon size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-charcoal">
                            {listing.food_name}
                          </p>
                          <p className="text-xs text-charcoal-muted">
                            <span className="font-mono">{formatRescueId(listing.id)}</span> ·{" "}
                            {listing.donor?.organization ?? "Donor"} → {claim.rescuer?.organization ?? "Rescuer"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-terracotta">{listing.quantity}</p>
                          <p className="text-[10px] uppercase text-charcoal-muted">Meals</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-sage">{kilos}kg</p>
                          <p className="text-[10px] uppercase text-charcoal-muted">Diverted</p>
                        </div>
                        {proof ? (
                          <div className="text-center">
                            <p className="font-bold text-charcoal">
                              {proof.people_served}
                            </p>
                            <p className="text-[10px] uppercase text-charcoal-muted">Served</p>
                          </div>
                        ) : null}
                        {claim.completed_at && (
                          <Badge variant="success">{new Date(claim.completed_at).toLocaleDateString()}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-10 rounded-3xl bg-charcoal p-8 text-white">
          <h2 className="text-xl font-bold">Good food shouldn&apos;t go to waste.</h2>
          <p className="mt-2 text-sm text-white/70">
            This page grows with every single rescue. Share your impact and
            inspire your community to join.
          </p>
          <Link href="/signup" className="mt-4 inline-block">
            <span className="rounded-xl bg-sage px-5 py-2.5 text-sm font-semibold text-white">
              Join the movement
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}

function GlobalStat({
  Icon,
  value,
  label,
}: {
  Icon: React.ComponentType<{ size?: number }>;
  value: number | string;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
          <Icon size={18} />
        </span>
        <p className="mt-3 text-3xl font-extrabold text-charcoal">
          {typeof value === "number" ? Number(value).toLocaleString() : value}
        </p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-charcoal-muted">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

function EfficiencyStat({
  Icon,
  value,
  label,
  hint,
}: {
  Icon: React.ComponentType<{ size?: number }>;
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage/10 text-sage">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-extrabold text-charcoal">{value}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal-muted">
            {label}
          </p>
          <p className="mt-0.5 truncate text-xs text-charcoal/50">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}