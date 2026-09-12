import { getRescueScoreTier, type RescueScoreFactors } from "@/lib/rescue-score";

function ringArcColor(tier: "low" | "moderate" | "high" | "critical") {
  switch (tier) {
    case "critical":
      return "#D96C5B";
    case "high":
      return "#E2A24B";
    case "moderate":
      return "#7EA172";
    default:
      return "#B9B4AC";
  }
}

/**
 * Visual Rescue Score: circular progress ring with a compact breakdown of the
 * four factors (urgency, distance, quantity, match) that make up the score.
 */
export function RescueScoreVisual({ factors }: { factors: RescueScoreFactors }) {
  const tier = getRescueScoreTier(factors.total);
  const color = ringArcColor(tier.key);

  const R = 26;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - factors.total / 100);

  const rows: Array<{ label: string; value: number }> = [
    { label: "Urgency", value: factors.urgencyScore },
    { label: "Distance", value: factors.distanceScore },
    { label: "Quantity", value: factors.quantityScore },
    { label: "Match", value: factors.matchQualityScore },
  ];

  return (
    <div className="rounded-2xl border border-charcoal/5 bg-warm-cream p-3">
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90">
            <circle cx="32" cy="32" r={R} fill="none" stroke="#EEE6DA" strokeWidth="5" />
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold leading-none text-charcoal">
              {factors.total}
            </span>
            <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider" style={{ color }}>
              {tier.label}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-wide text-charcoal/60">
                {row.label}
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-charcoal/10">
                <div
                  className="h-full rounded-full bg-sage/80"
                  style={{ width: `${Math.max(2, row.value)}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-[10px] font-semibold tabular-nums text-charcoal/70">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}