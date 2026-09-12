import { cn } from "@/lib/cn";

/**
 * Recurring journey motif: SURPLUS → RESCUE → COMMUNITY.
 * Used as a subtle eyebrow/trail across timelines, impact and rescue cards.
 */
export function JourneyMotif({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "light";
}) {
  const steps = ["Surplus", "Rescue", "Community"];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest",
        tone === "light" ? "text-white/70" : "text-charcoal/50",
        className
      )}
    >
      {steps.map((step, i) => (
        <span key={step} className="inline-flex items-center gap-1.5">
          {i > 0 && (
            <span className={cn("h-px w-4", tone === "light" ? "bg-white/40" : "bg-charcoal/25")} />
          )}
          <span
            className={
              i === 1
                ? tone === "light"
                  ? "text-white/90"
                  : "text-terracotta"
                : ""
            }
          >
            {step}
          </span>
        </span>
      ))}
    </span>
  );
}