import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchGlobalImpact, fetchActiveListings } from "@/lib/data";
import { getUrgencyInfo, countdownText } from "@/lib/rescue-score";
import {
  UtensilsIcon,
  HeartHandIcon,
  ShareIcon,
  BoxIcon,
  WheatIcon,
  ArrowRightIcon,
  StatusDot,
  ClockIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    Icon: UtensilsIcon,
    title: "Cook. Surplus.",
    body: "Restaurants, bakeries and cafeterias list leftover edible food in under a minute — before it spoils.",
    bullet: "Prepared meals, bakery, produce, packaged goods",
  },
  {
    Icon: ShareIcon,
    title: "List. Share. Alert.",
    body: "A listing goes live instantly to nearby NGOs, shelters, community kitchens and food banks, ranked by urgency.",
    bullet: "Urgency-based matching — critical food surfaces first",
  },
  {
    Icon: BoxIcon,
    title: "Pickup. Distribute. Serve.",
    body: "Rescuers claim, pick up, and redistribute food. Every rescue is tracked end-to-end with proof of distribution.",
    bullet: "Each completed rescue becomes shareable impact",
  },
];

export default async function HomePage() {
  const impact = await fetchGlobalImpact();
  const active = await fetchActiveListings();

  return (
    <main className="flex-1 overflow-hidden">
      {/* Hero */}
      <section className="relative">
        {/* Warm decorative glows */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          <div className="absolute -left-32 top-8 h-96 w-96 rounded-full bg-terracotta/15 blur-3xl" />
          <div className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-sage/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-20 text-center lg:py-28">
          <Badge variant="primary" className="mb-6">
            Community food rescue network
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-charcoal sm:text-5xl lg:text-6xl">
            Good food <span className="text-terracotta">shouldn&apos;t</span> go
            to waste.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-charcoal-muted">
            Ammudha Surapi connects food businesses with surplus edible food to
            nearby community organizations that rescue and redistribute it to
            people in need — from listing to pickup to distribution proof.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup?role=donor">
              <Button size="lg" className="w-full gap-2.5 sm:w-auto">
                <UtensilsIcon size={18} />
                Donate Surplus Food
              </Button>
            </Link>
            <Link href="/signup?role=rescuer">
              <Button
                size="lg"
                variant="success"
                className="w-full gap-2.5 sm:w-auto"
              >
                <HeartHandIcon size={18} />
                Rescue Food
              </Button>
            </Link>
          </div>

          {/* Live impact strip */}
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            <ImpactStat value={impact.mealsRescued} label="Meals Rescued" />
            <ImpactStat value={impact.kgDiverted} label="Kg Diverted" />
            <ImpactStat value={impact.peopleServed} label="People Served" />
            <ImpactStat value={impact.successfulRescues} label="Rescues Done" />
          </div>
        </div>
      </section>

      {/* Live listings */}
      {active.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-charcoal">
                Food available right now
              </h2>
              <p className="text-sm text-charcoal-muted">
                Surplus meals awaiting rescue nearby
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-terracotta/10 px-3 py-1 text-xs font-semibold text-terracotta">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terracotta opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-terracotta" />
              </span>
              Live
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.slice(0, 6).map((listing) => {
              const u = getUrgencyInfo(listing.pickup_deadline);
              return (
                <Link key={listing.id} href="/signup?role=rescuer">
                  <div className="group h-full rounded-2xl border border-charcoal/10 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg hover:shadow-charcoal/5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-charcoal">
                        {listing.food_name}
                      </h3>
                      <Badge
                        variant={
                          u.tier === "critical"
                            ? "danger"
                            : u.tier === "at_risk"
                            ? "warning"
                            : "success"
                        }
                      >
                        <StatusDot
                          tone={
                            u.tier === "critical"
                              ? "red"
                              : u.tier === "at_risk"
                              ? "amber"
                              : "green"
                          }
                        />
                        {countdownText(u.minutesLeft)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-charcoal-muted">
                      {listing.quantity} {listing.unit} · {listing.category} ·{" "}
                      {listing.dietary_type}
                    </p>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta transition-all group-hover:gap-2.5">
                      Ready for rescue
                      <ArrowRightIcon size={14} />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="relative overflow-hidden bg-white py-20">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-warm-cream blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-sage">
              <WheatIcon size={15} />
              How it works
            </span>
            <h2 className="mt-3 text-3xl font-bold text-charcoal">
              One rescue, three steps
            </h2>
            <p className="mt-3 text-charcoal-muted">
              Surplus food refused to be wasted.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.Icon;
              return (
                <div
                  key={step.title}
                  className="group relative overflow-hidden rounded-3xl border border-charcoal/10 bg-white p-7 transition-shadow hover:shadow-lg hover:shadow-charcoal/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta transition-colors group-hover:bg-terracotta group-hover:text-white">
                      <Icon size={22} />
                    </span>
                    <span className="text-5xl font-extrabold text-charcoal/5">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-charcoal">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-muted">
                    {step.body}
                  </p>
                  <p className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-sage">
                    <StatusDot tone="green" size={6} />
                    {step.bullet}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Impact / CTA */}
      <section className="relative overflow-hidden bg-charcoal py-20 text-white">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-terracotta/20 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-sage/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold">
            Every rescue is measurable. Every meal matters.
          </h2>
          <p className="mt-4 text-white/70">
            From surplus to served — track meals rescued, kilograms diverted,
            and people served across your community.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup?role=donor">
              <Button size="lg" className="w-full gap-2.5 sm:w-auto">
                <UtensilsIcon size={18} />
                Become a donor
              </Button>
            </Link>
            <Link href="/signup?role=rescuer">
              <Button size="lg" variant="success" className="w-full gap-2.5 sm:w-auto">
                <HeartHandIcon size={18} />
                Become a rescuer
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-charcoal/10 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-charcoal-muted sm:flex-row">
          <p>© 2026 Ammudha Surapi · Good food shouldn&apos;t go to waste.</p>
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon size={14} />
            Always something to rescue
          </span>
        </div>
      </footer>
    </main>
  );
}

function ImpactStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-charcoal/5 transition-transform hover:-translate-y-0.5">
      <p className="text-3xl font-extrabold text-terracotta">
        {Number(value).toLocaleString()}
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-charcoal-muted">
        {label}
      </p>
    </div>
  );
}