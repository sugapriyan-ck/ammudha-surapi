"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { createListing } from "@/lib/actions";
import { CountdownTimer } from "@/components/countdown-timer";
import type { ListingCategory, DietaryType } from "@/lib/types";

const CATEGORIES: ListingCategory[] = [
  "Prepared Meal",
  "Bakery",
  "Produce",
  "Packaged Food",
  "Other",
];

const DIETARY_TYPES: DietaryType[] = [
  "Vegetarian",
  "Non-Vegetarian",
  "Vegan",
  "Other",
];

export default function NewListingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationNote, setLocationNote] = useState(
    () =>
      typeof navigator !== "undefined" && !navigator.geolocation
        ? "Enter coordinates manually"
        : "Fetching your location…"
  );
  const [deadline, setDeadline] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return d.toISOString().slice(0, 16);
  });
  const [preparedAt, setPreparedAt] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 5);
    return d.toISOString().slice(0, 16);
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationNote("Location captured automatically");
      },
      () => setLocationNote("Enable location or enter coordinates manually")
    );
  }, []);

  function useCurrentLocation() {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setLocationNote("Location updated");
          setLocating(false);
        },
        () => {
          setLocationNote("Could not get location");
          setLocating(false);
        }
      );
    }
    setLocating(false);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const res = await createListing(formData);
    if (res?.error) setError(res.error);
    setLoading(false);
  }

  const deadlineLive = deadline ? new Date(deadline) : null;

  return (
    <main className="flex-1 px-4 pb-24 pt-6 lg:ml-64 lg:px-8 lg:pb-8 lg:pt-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-charcoal">List surplus food</h1>
        <p className="mt-1 text-charcoal-muted">
          Under 60 seconds. Your listing goes live to nearby rescuers instantly.
        </p>

        <Card className="mt-6">
          <CardContent className="p-6">
            <form action={handleSubmit} className="space-y-5">
              <input type="hidden" name="lat" value={lat ?? ""} />
              <input type="hidden" name="lng" value={lng ?? ""} />

              <div>
                <Label>Food name *</Label>
                <Input name="food_name" required placeholder='e.g. "Veg biryani", "Bread loaves"' />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label>Category *</Label>
                  <Select name="category" required defaultValue="Prepared Meal">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Dietary type *</Label>
                  <Select name="dietary_type" required defaultValue="Vegetarian">
                    {DIETARY_TYPES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label>Quantity *</Label>
                  <Input name="quantity" type="number" min={1} step="any" required placeholder="e.g. 40" />
                </div>
                <div>
                  <Label>Unit *</Label>
                  <Select name="unit" required defaultValue="Meals">
                    <option value="Meals">Meals</option>
                    <option value="Packs">Packs</option>
                    <option value="Kg">Kg</option>
                    <option value="Boxes">Boxes</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  name="description"
                  rows={3}
                  placeholder="Ingredients, portion sizes, any special instructions…"
                />
              </div>

              {/* Food photo */}
              <div>
                <Label>Food photo (optional)</Label>
                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-warm-cream px-4 py-3 text-sm font-medium text-charcoal ring-1 ring-charcoal/10 transition-colors hover:bg-charcoal/5">
                    <input
                      type="file"
                      name="photo"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setPhotoPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        } else {
                          setPhotoPreview(null);
                        }
                      }}
                    />
                    Upload photo
                  </label>
                  <p className="text-xs text-charcoal-muted">
                    A clear photo helps rescuers judge quantity and freshness.
                  </p>
                </div>
                {photoPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Food photo preview"
                    className="mt-3 aspect-[16/7] w-full max-w-xs rounded-xl object-cover ring-1 ring-charcoal/10"
                  />
                )}
              </div>

              <div>
                <Label>Pickup deadline *</Label>
                <Input
                  name="pickup_deadline"
                  type="datetime-local"
                  required
                  defaultValue={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {deadlineLive && <CountdownTimer deadline={deadlineLive} showDeadlineTime />}
                  <p className="text-xs text-charcoal-muted">
                    How long the food remains available for rescue. Freshness matters —
                    rescuers see this countdown too.
                  </p>
                </div>
              </div>

              {/* Food safety declaration */}
              <div className="rounded-2xl border border-sage/30 bg-sage/5 p-4">
                <Label>Food safety declaration *</Label>
                <p className="mb-4 text-sm text-charcoal-muted">
                  Tell rescuers when the food was prepared and how it was stored. All three
                  declarations must be confirmed.
                </p>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label>
                      Prepared at <span className="text-xs text-charcoal-muted">(approx.)</span> *
                    </Label>
                    <Input
                      name="prepared_at"
                      type="datetime-local"
                      required
                      defaultValue={preparedAt}
                      onChange={(e) => setPreparedAt(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Storage condition *</Label>
                    <Select name="storage_condition" required defaultValue="Room Temperature">
                      <option value="Refrigerated">Refrigerated</option>
                      <option value="Room Temperature">Room Temperature</option>
                      <option value="Frozen">Frozen</option>
                      <option value="Other">Other</option>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {[
                    ["safety_handled", "The food has been safely handled and kept clean."],
                    ["safety_in_date", "The food is within its safe consumption period — no spoilage, contamination, or recalled items."],
                    ["safety_safe", "I confirm this surplus food is safe for human consumption."],
                  ].map(([name, text]) => (
                    <label
                      key={name}
                      className="flex items-start gap-2.5 rounded-xl bg-white p-3 text-sm text-charcoal/80 ring-1 ring-charcoal/5"
                    >
                      <input
                        type="checkbox"
                        name={name}
                        required
                        className="mt-0.5 h-4 w-4 rounded accent-terracotta"
                      />
                      {text}
                    </label>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <Label>Pickup location *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={lat ?? ""}
                    onChange={(e) => setLat(e.target.value ? Number(e.target.value) : null)}
                  />
                  <Input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={lng ?? ""}
                    onChange={(e) => setLng(e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className={`text-xs ${lat != null ? "text-sage" : "text-charcoal-muted"}`}>
                    {locationNote || "Fetching your location…"}
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={useCurrentLocation} disabled={locating}>
                    {locating ? "Locating…" : "Use my location"}
                  </Button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Publishing…" : "Publish listing"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}