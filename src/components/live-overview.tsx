import { fetchLiveOverview } from "@/lib/data";

/**
 * Subtle live strip of real database activity — active rescues, listings
 * available, organizations on the move, and completed rescues.
 */
export async function LiveOverview() {
  const live = await fetchLiveOverview();

  const stats: Array<{ value: number | string; label: string }> = [
    { value: live.activeRescues, label: "Active rescues" },
    { value: live.activeListings, label: "Listings available" },
    { value: live.activeOrganizations, label: "Organizations rescuing" },
    { value: live.completedRescues.toLocaleString(), label: "Rescues completed" },
  ];

  return (
    <div className="rounded-2xl border border-charcoal/10 bg-white/70 shadow-sm">
      <div className="flex items-center gap-2 border-b border-charcoal/5 px-5 py-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-sage" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-charcoal-muted">
          Live right now
        </span>
      </div>
      <div className="grid grid-cols-2 divide-charcoal/10 sm:grid-cols-4 sm:divide-x">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-3 text-center sm:text-left">
            <p className="text-xl font-extrabold text-charcoal">{s.value}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-charcoal-muted">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}