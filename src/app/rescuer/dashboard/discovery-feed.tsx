"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ListingCard } from "@/components/listing-card";
import { RescueMap } from "@/components/rescue-map";
import { Badge } from "@/components/ui/badge";
import type { FoodListing } from "@/lib/types";
import { computeRescueScore } from "@/lib/rescue-score";
import { MapPinIcon, WheatIcon } from "@/components/icons";

const CATEGORY_FILTERS = [
  "All",
  "Prepared Meal",
  "Bakery",
  "Produce",
  "Packaged Food",
  "Other",
];

const DIETARY_FILTERS = ["All", "Vegetarian", "Non-Vegetarian", "Vegan", "Other"];

export default function DiscoveryFeed() {
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [category, setCategory] = useState("All");
  const [dietary, setDietary] = useState("All");
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("food_listings")
      .select("*, donor:profiles!food_listings_donor_id_fkey(id, organization, name)")
      .eq("status", "available")
      .order("pickup_deadline", { ascending: true });

    if (error) setError(error.message);
    setListings((data as FoodListing[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const getCoords = (): Promise<{ lat: number | null; lng: number | null }> => {
      if (!navigator.geolocation) {
        return Promise.resolve({ lat: null, lng: null });
      }
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 13.0827, lng: 80.2707 }),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    };

    void getCoords().then((coords) => {
      setUserLat(coords.lat);
      setUserLng(coords.lng);
      setLocating(false);
      void load();
    });

    // Realtime updates
    const supabase = createClient();
    const channel = supabase
      .channel("available-listings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_listings" },
        () => {
          setNow(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const sorted = useMemo(() => {
    const defaultLat = userLat ?? 13.0827;
    const defaultLng = userLng ?? 80.2707;
    const filtered = listings.filter((l) => {
      if (category !== "All" && l.category !== category) return false;
      if (dietary !== "All" && l.dietary_type !== dietary) return false;
      if (new Date(l.pickup_deadline).getTime() <= now.getTime()) return false;
      return true;
    });
    return filtered
      .map((l) => ({
        listing: l,
        score: computeRescueScore(
          l,
          {
            userLat: defaultLat,
            userLng: defaultLng,
            maxQuantity: 100,
            preferredCategories: [],
            preferredDietary: [],
            rescuerCapacity: 500,
          },
          now
        ).total,
      }))
      .sort((a, b) => b.score - a.score);
  }, [listings, userLat, userLng, category, dietary, now]);

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        Could not load listings: {error}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((c) => (
          <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </FilterChip>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {DIETARY_FILTERS.map((d) => (
          <FilterChip key={d} active={dietary === d} onClick={() => setDietary(d)}>
            {d === "All" ? "All diets" : d}
          </FilterChip>
        ))}
      </div>

      {!loading && sorted.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
              Nearby on the map
            </p>
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-charcoal ring-1 ring-charcoal/10 transition-colors hover:bg-warm-cream"
            >
              {showMap ? "Hide map" : "Show map"}
            </button>
          </div>
          {showMap && (
            <RescueMap
              listings={sorted.map(({ listing }) => listing)}
              userLat={userLat ?? 13.0827}
              userLng={userLng ?? 80.2707}
            />
          )}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-charcoal-muted">
          {locating
            ? "Locating you…"
            : sorted.length === 0
            ? "No matching food right now"
            : `Showing ${sorted.length} listing${sorted.length === 1 ? "" : "s"} ranked by Rescue Score`}
        </p>
        {!locating && userLat != null && (
          <Badge variant="primary">
            <MapPinIcon size={12} />
            Nearby
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-charcoal/5" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-charcoal/20 bg-white p-10 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/10 text-sage">
            <WheatIcon size={28} />
          </span>
          <p className="mt-4 font-medium text-charcoal">No food available right now</p>
          <p className="mt-1 text-sm text-charcoal-muted">
            New listings appear here instantly. Check back soon.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(({ listing }) => (
            <div key={listing.id} id={`listing-${listing.id}`} className="scroll-mt-24">
              <ListingCard
                listing={listing}
                userLat={userLat ?? 13.0827}
                userLng={userLng ?? 80.2707}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
        (active
          ? "bg-terracotta text-white"
          : "bg-white text-charcoal-muted ring-1 ring-charcoal/10 hover:bg-warm-cream")
      }
    >
      {children}
    </button>
  );
}