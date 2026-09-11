"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { submitDistributionProof, completePickup } from "@/lib/actions";
import { BoxIcon, CameraIcon, LeafIcon } from "@/components/icons";

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
  const [releasing, setReleasing] = useState(false);
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

  async function handleRelease() {
    setReleasing(true);
    await completePickup(listingId);
    router.refresh();
    setReleasing(false);
  }

  return (
    <Card className="mt-6 border-sage/30">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-charcoal">
          {listingStatus === "picked_up"
            ? "Submit distribution proof"
            : "Step 1: Confirm you picked up the food"}
        </h2>
        <p className="mt-1 text-sm text-charcoal-muted">
          Self-reported proof. This will be labeled as{" "}
          <em className="text-sage-dark">&quot;submitted&quot;</em>, not &quot;verified&quot;.
        </p>

        {listingStatus === "claimed" && (
          <div className="mt-4">
            <Button variant="secondary" onClick={handleRelease} disabled={releasing}>
              <BoxIcon size={15} />
              {releasing ? "Marking…" : "I picked up the food"}
            </Button>
          </div>
        )}

        {listingStatus === "picked_up" && (
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
      </CardContent>
    </Card>
  );
}