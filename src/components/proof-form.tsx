"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { submitDistributionProof, startPickup, completePickup, startDistribution } from "@/lib/actions";
import { BoxIcon, CameraIcon, LeafIcon, UsersIcon } from "@/components/icons";

export function ProofForm({
  listingId,
  listingStatus,
}: {
  listingId: string;
  listingStatus: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [working, setWorking] = useState(false);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    setPhotos(Array.from(files).slice(0, 5));
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    for (const photo of photos) {
      formData.append("photos", photo);
    }
    const res = await submitDistributionProof(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    router.refresh();
    router.push(`/rescuer/rescue/${listingId}?completed=1`);
    setLoading(false);
  }

  async function run(action: () => Promise<{ error?: string } | undefined>) {
    setWorking(true);
    setError(null);
    const res = await action();
    if (res?.error) setError(res.error);
    router.refresh();
    setWorking(false);
  }

  return (
    <Card className="mt-6 border-sage/30">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-charcoal">
          {listingStatus === "claimed" && "Step 1: Head to the pickup"}
          {listingStatus === "pickup_in_progress" && "Pickup in progress"}
          {listingStatus === "picked_up" && "Step 3: Distribute the food"}
          {listingStatus === "distribution_in_progress" && "Submit distribution proof"}
        </h2>
        <p className="mt-1 text-sm text-charcoal-muted">
          Self-reported proof. This will be labeled as{" "}
          <em className="text-sage-dark">&quot;submitted&quot;</em>, not &quot;verified&quot;.
        </p>

        {listingStatus === "claimed" && (
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => run(() => startPickup(listingId))}
              disabled={working}
            >
              <BoxIcon size={15} />
              {working ? "Starting…" : "Pickup in progress — I&apos;m on the way"}
            </Button>
            <p className="mt-2 text-xs text-charcoal-muted">
              Lets the donor know you&apos;re en route so they can confirm pickup.
            </p>
          </div>
        )}

        {listingStatus === "pickup_in_progress" && (
          <div className="mt-4">
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              The donor has been notified to confirm your arrival. In the meantime you can mark
              the food as picked up yourself.
            </p>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => run(() => completePickup(listingId))}
              disabled={working}
            >
              <BoxIcon size={15} />
              {working ? "Marking…" : "Food is now with me (mark as picked up)"}
            </Button>
          </div>
        )}

        {listingStatus === "picked_up" && (
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => run(() => startDistribution(listingId))}
              disabled={working}
            >
              <UsersIcon size={15} />
              {working ? "Starting…" : "Distribution in progress — I&apos;m sharing the food"}
            </Button>
          </div>
        )}

        {listingStatus === "distribution_in_progress" && (
          <form action={handleSubmit} className="mt-4 space-y-5">
            <input type="hidden" name="listing_id" value={listingId} />

            <div>
              <Label>Proof photos (up to 5)</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-charcoal/20 bg-warm-cream p-6 text-charcoal-muted transition hover:border-sage hover:text-sage-dark"
              >
                <CameraIcon size={28} />
                <span className="text-sm font-medium">
                  {photos.length > 0
                    ? `${photos.length} photo${photos.length === 1 ? "" : "s"} selected`
                    : "Tap to add photos of the distribution"}
                </span>
                <span className="text-xs">Photos are stored securely</span>
              </button>
              {photos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {photos.slice(0, 5).map((p, i) => (
                    <span
                      key={i}
                      className="rounded-xl bg-terracotta/10 px-2.5 py-1 text-xs font-medium text-terracotta"
                    >
                      {p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>People served *</Label>
              <Input
                name="people_served"
                type="number"
                min={0}
                required
                placeholder="e.g. 45"
              />
            </div>

            <div>
              <Label>Distribution location</Label>
              <Input
                name="distribution_location"
                placeholder="e.g. Women's shelter, Anna Nagar"
              />
            </div>

            <div>
              <Label>Note (optional)</Label>
              <Textarea
                name="note"
                rows={3}
                placeholder="How was the food received? Any feedback from beneficiaries?"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}

            <Button type="submit" variant="success" className="w-full gap-2" disabled={loading}>
              <LeafIcon size={16} />
              {loading ? "Submitting proof…" : "Submit distribution proof"}
            </Button>
          </form>
        )}

        {listingStatus !== "distribution_in_progress" && error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}