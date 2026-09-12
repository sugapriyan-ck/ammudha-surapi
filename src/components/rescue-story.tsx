import { formatDistanceToNow } from "date-fns";
import { fetchRecentRescues } from "@/lib/data";
import { estimateKgDiverted } from "@/lib/rescue-score";
import { JourneyMotif } from "@/components/journey-motif";

function mealsFromListing(quantity: number, unit: string): number {
  if (unit === "Meals") return Math.round(quantity);
  return Math.round(quantity * (unit === "Boxes" ? 8 : unit === "Packs" ? 4 : 2));
}

/**
 * Featured "rescue story" on the public side — always a real, completed
 * rescue straight from the database. Renders nothing when there is no data.
 */
export async function RescueStory() {
  const recent = await fetchRecentRescues(1);
  const claim = recent[0];
  const listing = claim?.listing;
  if (!claim || !listing) return null;

  const proof = Array.isArray(claim.proof) ? claim.proof[0] : claim.proof;
  const photo = proof?.photos?.[0] ?? listing.photo_url ?? null;

  const meals = mealsFromListing(listing.quantity, listing.unit);
  const kg = Math.round(estimateKgDiverted(listing.quantity, listing.unit));
  const peopleServed = proof?.people_served ?? 0;

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col-reverse items-stretch gap-6 overflow-hidden rounded-3xl border border-charcoal/10 bg-white shadow-sm lg:flex-row">
        <div className="flex flex-1 flex-col justify-center p-7 sm:p-9">
          <JourneyMotif className="mb-3" tone="default" />
          <p className="text-xs font-semibold uppercase tracking-widest text-terracotta">
            Tonight&apos;s rescue
          </p>
          <h2 className="mt-2 text-2xl font-bold text-charcoal sm:text-3xl">
            {listing.food_name}
          </h2>
          <p className="mt-2 text-sm text-charcoal-muted">
            Every rescue is captured end-to-end: from surplus listing to proof
            of distribution.
          </p>

          <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
            <StoryStat value={meals} unit="meals" label="rescued" accent="terracotta" />
            <StoryStat value={peopleServed} unit="people" label="served" accent="sage" />
            <StoryStat value={`${kg} kg`} label="diverted" accent="charcoal" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-charcoal-muted">
            {claim.rescuer?.organization && (
              <span>
                Rescued by{" "}
                <span className="font-semibold text-charcoal">
                  {claim.rescuer.organization}
                </span>
              </span>
            )}
            {claim.completed_at && (
              <span>
                Completed{" "}
                {formatDistanceToNow(new Date(claim.completed_at), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>

        <div className="relative min-h-[180px] flex-1 lg:min-h-0">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={`${listing.food_name} rescued and distributed`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-warm-cream">
              <JourneyMotif tone="default" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StoryStat({
  value,
  unit,
  label,
  accent,
}: {
  value: number | string;
  unit?: string;
  label: string;
  accent: "terracotta" | "sage" | "charcoal";
}) {
  const colors = {
    terracotta: "text-terracotta",
    sage: "text-sage-dark",
    charcoal: "text-charcoal",
  };
  return (
    <div>
      <p className={`text-2xl font-extrabold ${colors[accent]}`}>
        {value}
        {unit ? <span className="text-sm font-semibold"> {unit}</span> : null}
      </p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-charcoal-muted">
        {label}
      </p>
    </div>
  );
}