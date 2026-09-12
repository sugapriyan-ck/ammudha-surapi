"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { getUrgencyInfo } from "@/lib/rescue-score";

function pct(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

/**
 * Visualizes the remaining rescue window as a shrinking bar whose color
 * escalates as the deadline approaches. Never decorative — it communicates
 * how much time is left before the food must be claimed.
 */
export function UrgencyBar({
  deadline,
  createdAt,
  className,
}: {
  deadline: string | Date;
  createdAt?: string | null;
  className?: string;
}) {
  const target = new Date(deadline).getTime();
  const created = createdAt ? new Date(createdAt).getTime() : null;
  const fallbackWindow = 24 * 60 * 60 * 1000; // use 24h when a window isn't known
  const windowMs = created != null ? Math.max(60 * 60 * 1000, target - created) : fallbackWindow;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const remaining = target - now;
  const expired = remaining <= 0;
  const fill = expired ? 0 : (remaining / windowMs) * 100;

  const urgency = getUrgencyInfo(new Date(target), new Date(now));
  const barColor =
    urgency.tier === "critical" ? "#D96C5B" : urgency.tier === "at_risk" ? "#E2A24B" : "#7EA172";
  const textColor =
    urgency.tier === "critical"
      ? "text-red-700"
      : urgency.tier === "at_risk"
      ? "text-amber-800"
      : "text-sage-dark";

  const label =
    expired
      ? "Rescue window closed"
      : urgency.minutesLeft < 60
      ? `${urgency.minutesLeft}m left`
      : urgency.minutesLeft < 24 * 60
      ? `${Math.floor(urgency.minutesLeft / 60)}h ${urgency.minutesLeft % 60}m left`
      : `${Math.floor(urgency.minutesLeft / 1440)}d ${Math.floor((urgency.minutesLeft % 1440) / 60)}h left`;


  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-[10px] font-semibold uppercase tracking-wide", textColor)}>
          {expired ? "Expired" : urgency.label}
        </span>
        <span className="text-[10px] font-medium tabular-nums text-charcoal/50">{label}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-charcoal/10">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: pct(fill), backgroundColor: expired ? "#D96C5B" : barColor }}
        />
      </div>
    </div>
  );
}