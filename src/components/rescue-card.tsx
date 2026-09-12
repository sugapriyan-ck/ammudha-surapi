"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import type { RescueCardData } from "@/lib/types";
import { formatRescueId } from "@/lib/rescue-score";
import { BRAND_COLORS } from "@/components/nav";
import { DownloadIcon, ShareIcon } from "@/components/icons";

export function RescueCard({ data }: { data: RescueCardData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);

  const rescueId = formatRescueId(data.rescueId);

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const img = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: BRAND_COLORS.terracotta,
      });
      const a = document.createElement("a");
      a.href = img;
      a.download = `rescue-${rescueId}.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    const title = `Rescue ${rescueId} — ${data.organizationName}`;
    const text = `${data.mealsRescued} meals rescued · ${data.kgDiverted} kg food diverted · ${data.peopleServed} people served. Good food shouldn't go to waste. — Ammudha Surapi`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        setShared(true);
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${title}\n${text}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        className="aspect-[3/4] w-full max-w-sm overflow-hidden rounded-3xl text-white shadow-xl"
        style={{
          background: `linear-gradient(160deg, ${BRAND_COLORS.terracotta}, #cf5b43)`,
          fontFamily: "inherit",
        }}
      >
        <div className="flex h-full flex-col justify-between p-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-base font-bold">
                ஊ
              </span>
              <span className="text-sm font-semibold tracking-wide">
                AMMUDHA SURAPI
              </span>
            </div>
            <p className="mt-6 text-xs uppercase tracking-widest text-white/70">
              Rescue Card · Completed Rescue
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{rescueId}</p>
            {data.foodName && (
              <p className="mt-1 truncate text-sm font-medium text-white/85">{data.foodName}</p>
            )}
          </div>

          <div>
            <div className="grid grid-cols-3 gap-3">
              <Stat value={data.mealsRescued} label="Meals\nRescued" />
              <Stat value={data.kgDiverted} label="Kg\nDiverted" unit="kg" />
              <Stat value={data.peopleServed} label="People\nServed" />
            </div>
            <div className="mt-5 border-t border-white/20 pt-4 text-center">
              <p className="text-sm font-semibold">{data.organizationName}</p>
              <p className="mt-1 text-xs text-white/80">
                Good food shouldn&apos;t go to waste. #RescueFood #FoodForAll
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex max-w-sm gap-2">
        <Button onClick={handleDownload} disabled={downloading} className="flex-1 gap-2">
          <DownloadIcon size={16} />
          {downloading ? "Generating…" : "Download card"}
        </Button>
        <Button variant="success" onClick={handleShare} className="flex-1 gap-2">
          <ShareIcon size={16} />
          {shared ? "Shared" : "Share"}
        </Button>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  unit,
}: {
  value: number;
  label: string;
  unit?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 text-center">
      <p className="text-2xl font-bold">
        {value}
        {unit ? <span className="text-base font-semibold"> {unit}</span> : null}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/80">
        {label}
      </p>
    </div>
  );
}