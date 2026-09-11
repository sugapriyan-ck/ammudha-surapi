"use client";

import { Button } from "@/components/ui/button";
import { markNotificationsRead } from "@/lib/actions";

export function MarkReadButton({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => markNotificationsRead(ids)}
    >
      Mark all read
    </Button>
  );
}