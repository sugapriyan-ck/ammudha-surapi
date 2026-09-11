import { cn } from "@/lib/cn";
import { UtensilsIcon, HeartHandIcon, BoxIcon, LeafIcon, CheckIcon } from "@/components/icons";

type Status = "available" | "claimed" | "picked_up" | "distribution_completed";

const STEPS: { key: Status; label: string; Icon: typeof UtensilsIcon }[] = [
  { key: "available", label: "Listed", Icon: UtensilsIcon },
  { key: "claimed", label: "Claimed", Icon: HeartHandIcon },
  { key: "picked_up", label: "Picked Up", Icon: BoxIcon },
  { key: "distribution_completed", label: "Distributed", Icon: LeafIcon },
];

export function Timeline({
  currentStatus,
  className,
}: {
  currentStatus: Status;
  className?: string;
}) {
  const activeIndex = STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className={cn("flex items-center", className)}>
      {STEPS.map((step, i) => {
        const active = i === activeIndex;
        const done = i < activeIndex;
        const Icon = step.Icon;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                  done && "bg-sage text-white",
                  active && "bg-terracotta text-white ring-4 ring-terracotta/20",
                  !done && !active && "bg-charcoal/10 text-charcoal/40"
                )}
              >
                {done ? <CheckIcon size={15} /> : <Icon size={15} />}
              </div>
              <span
                className={cn(
                  "mt-1 text-center text-[10px] font-medium leading-tight",
                  active ? "text-terracotta" : done ? "text-sage-dark" : "text-charcoal/40"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-1 mb-4 h-0.5 flex-1 rounded-full",
                  i < activeIndex ? "bg-sage" : "bg-charcoal/10"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}