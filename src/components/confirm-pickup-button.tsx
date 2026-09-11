"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { confirmPickup } from "@/lib/actions";

export function ConfirmPickupButton({
  listingId,
  orgName,
}: {
  listingId: string;
  orgName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    const res = await confirmPickup(listingId);
    if (!res?.error) {
      setDone(true);
      router.refresh();
    }
    setLoading(false);
  }

  if (done) {
    return (
      <p className="mt-3 rounded-xl bg-green-50 p-3 text-center text-sm font-medium text-green-700">
        ✓ Pickup confirmed. The rescue is now in distribution.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <Button
        variant="secondary"
        className="w-full"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Confirming…" : `Confirm pickup — ${orgName} arrived`}
      </Button>
    </div>
  );
}