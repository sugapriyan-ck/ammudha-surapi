"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { createListing } from "@/lib/actions";
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

  const now = new Date();
  now.setHours(now.getHours() + 2);
  const defaultDeadline = now.toISOString().slice(0, 16);

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

              <div>
                <Label>Pickup deadline *</Label>
                <Input name="pickup_deadline" type="datetime-local" required defaultValue={defaultDeadline} />
                <p className="mt-1 text-xs text-charcoal-muted">
                  How long the food remains available for rescue.
                </p>
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