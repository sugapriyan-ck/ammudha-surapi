"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

function formatRemaining(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  if (totalMin === 0) return "under a minute left";
  if (totalMin === 1) return "1 minute left";
  if (totalMin < 60) return `${totalMin} min left`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m left` : `${h}h left`;
  const d = Math.floor(h / 24);
  return d === 1 ? `1 day ${h % 24}h left` : `${d} days ${h % 24}h left`;
}

function urgencyTone(ms: number): "red" | "amber" | "green" {
  const minutes = ms / 60000;
  if (minutes <= 30) return "red";
  if (minutes <= 4 * 60) return "amber";
  return "green";
}

/** Live countdown that ticks every second, colored by food-safety urgency. */
export function CountdownTimer({
  deadline,
  showDeadlineTime = false,
  className,
}: {
  deadline: string | Date;
  showDeadlineTime?: boolean;
  className?: string;
}) {
  const target = new Date(deadline).getTime();

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = target - now;
  const expired = remaining <= 0;
  const tone = urgencyTone(remaining);

  const toneClasses: Record<"red" | "amber" | "green", string> = {
    red: "bg-red-50 text-red-700 ring-red-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    green: "bg-sage/10 text-sage-dark ring-sage/20",
  };

  const dotColors: Record<"red" | "amber" | "green", string> = {
    red: "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-sage",
  };

  return (
    <span
      aria-live="off"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ring-1",
        expired ? "bg-red-50 text-red-700 ring-red-200" : toneClasses[tone],
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          expired ? "bg-red-500" : dotColors[tone],
          !expired && tone === "red" && "animate-pulse"
        )}
      />
      {expired ? "Deadline passed" : formatRemaining(remaining)}
      {showDeadlineTime && !expired && (
        <span className="font-medium text-charcoal/50">
          · by {new Date(deadline).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </span>
      )}
    </span>
  );
}