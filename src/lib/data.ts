import { createClient } from "@/lib/supabase/server";
import { estimateKgDiverted } from "@/lib/rescue-score";
import type { FoodListing, DistributionProof, Claim, Role } from "@/lib/types";

export interface GlobalImpact {
  mealsRescued: number;
  kgDiverted: number;
  peopleServed: number;
  successfulRescues: number;
  successRate: number | null;
  avgTimeToClaimMinutes: number | null;
  totalListings: number;
}

export interface LiveOverview {
  activeRescues: number;
  activeListings: number;
  activeOrganizations: number;
  completedRescues: number;
}

export async function fetchLiveOverview(): Promise<LiveOverview> {
  const supabase = await createClient();

  const [available, inMotion, completed, activeRescuers] = await Promise.all([
    supabase
      .from("food_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "available"),
    supabase
      .from("food_listings")
      .select("id", { count: "exact", head: true })
      .in("status", ["claimed", "picked_up"]),
    supabase
      .from("food_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "distribution_completed"),
    supabase
      .from("claims")
      .select("rescuer:profiles!claims_rescuer_id_fkey(id, organization)")
      .in("status", ["claimed", "picked_up"]),
  ]);

  const organizations = new Set(
    ((activeRescuers.data ?? []) as unknown as Array<{
      rescuer: { id: string; organization: string }[] | null;
    }>)
      .map((r) => r.rescuer?.[0]?.organization)
      .filter((o): o is string => Boolean(o))
  ).size;

  return {
    activeRescues: inMotion.count ?? 0,
    activeListings: available.count ?? 0,
    activeOrganizations: organizations,
    completedRescues: completed.count ?? 0,
  };
}

function mealsFromListing(quantity: number, unit: string): number {
  if (unit === "Meals") return quantity;
  return Math.round(quantity * (unit === "Boxes" ? 8 : unit === "Packs" ? 4 : 2));
}

function peopleFromProof(p: DistributionProof | null): number {
  return p?.people_served ?? 0;
}

export async function fetchGlobalImpact(): Promise<GlobalImpact> {
  const supabase = await createClient();

  const { data: listings } = await supabase.from("food_listings").select("*");

  const { data: proofs } = await supabase
    .from("distribution_proofs")
    .select("*, claims(*, listings:food_listings(*))");

  const all = (listings as FoodListing[] | null) ?? [];
  const completed = all.filter((l) => l.status === "distribution_completed");
  const distributionProofs = (proofs as DistributionProof[] | null) ?? [];

  const mealsRescued = completed.reduce((sum, l) => sum + mealsFromListing(l.quantity, l.unit), 0);

  const kgDiverted = Math.round(
    completed.reduce((sum, l) => sum + estimateKgDiverted(l.quantity, l.unit), 0)
  );

  const peopleServed = distributionProofs.reduce((sum, p) => sum + peopleFromProof(p), 0);

  const successfulRescues = completed.length;

  const successRate =
    all.length > 0 ? Math.round((completed.length / all.length) * 100) : null;

  let avgTimeToClaimMinutes: number | null = null;
  const { data: claimRows } = await supabase
    .from("claims")
    .select("claimed_at, listing:food_listings(created_at)");

  if (claimRows && claimRows.length > 0) {
    const rows = claimRows as Array<{
      claimed_at: string;
      listing: { created_at?: string } | null;
    }>;
    const deltas = rows
      .map((c) => {
        if (!c.listing?.created_at) return null;
        return new Date(c.claimed_at).getTime() - new Date(c.listing.created_at).getTime();
      })
      .filter((d): d is number => typeof d === "number" && d > 0);
    if (deltas.length > 0) {
      avgTimeToClaimMinutes = Math.round(deltas.reduce((s, d) => s + d, 0) / deltas.length / 60000);
    }
  }

  return {
    mealsRescued,
    kgDiverted,
    peopleServed,
    successfulRescues,
    successRate,
    avgTimeToClaimMinutes,
    totalListings: all.length,
  };
}

export async function fetchPersonalImpact(userId: string, role: Role): Promise<GlobalImpact> {
  const supabase = await createClient();

  if (role === "donor") {
    const { data } = await supabase
      .from("food_listings")
      .select("*")
      .eq("donor_id", userId);
    const all = (data as FoodListing[] | null) ?? [];
    const completed = all.filter((l) => l.status === "distribution_completed");

    const { data: proofs } = await supabase
      .from("distribution_proofs")
      .select("people_served")
      .in(
        "rescue_id",
        completed.map((l) => l.id)
      );
    const peopleServed = (proofs ?? []).reduce((s, p) => s + (p.people_served ?? 0), 0);

    return {
      mealsRescued: all.reduce((sum, l) => sum + mealsFromListing(l.quantity, l.unit), 0),
      kgDiverted: Math.round(all.reduce((s, l) => s + estimateKgDiverted(l.quantity, l.unit), 0)),
      peopleServed,
      successfulRescues: completed.length,
      successRate: all.length > 0 ? Math.round((completed.length / all.length) * 100) : null,
      avgTimeToClaimMinutes: null,
      totalListings: all.length,
    };
  }

  const { data } = await supabase
    .from("claims")
    .select("*, listing:food_listings(*), proof:distribution_proofs(*)")
    .eq("rescuer_id", userId);
  const claims = (data as Claim[] | null) ?? [];
  const completed = claims.filter((c) => c.status === "distribution_completed");

  const peopleServed = completed.reduce((sum, c) => {
    const p = Array.isArray(c.proof) ? c.proof[0] : c.proof;
    return sum + peopleFromProof(p ?? null);
  }, 0);

  return {
    mealsRescued: Math.round(completed.reduce((s, c) => s + (c.listing?.quantity ?? 0), 0)),
    kgDiverted: Math.round(
      completed.reduce((s, c) => s + estimateKgDiverted(c.listing?.quantity ?? 0, c.listing?.unit ?? "Meals"), 0)
    ),
    peopleServed,
    successfulRescues: completed.length,
    successRate: claims.length > 0 ? Math.round((completed.length / claims.length) * 100) : null,
    avgTimeToClaimMinutes: null,
    totalListings: claims.length,
  };
}

export async function fetchRecentRescues(limit = 10) {
  const supabase = await createClient();

  const { data: claims } = await supabase
    .from("claims")
    .select(
      "id, claimed_at, picked_up_at, completed_at, status, rescuer:profiles!claims_rescuer_id_fkey(id, organization), listing:food_listings(*, donor:profiles!food_listings_donor_id_fkey(id, organization)), proof:distribution_proofs(*)"
    )
    .eq("status", "distribution_completed")
    .order("completed_at", { ascending: false })
    .limit(limit);

  return (claims as Claim[] | null) ?? [];
}

export async function fetchActiveListings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_listings")
    .select("*")
    .eq("status", "available")
    .order("pickup_deadline", { ascending: true });
  return (data as FoodListing[] | null) ?? [];
}

export async function fetchNearbyListings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_listings")
    .select("*, donor:profiles!food_listings_donor_id_fkey(id, organization, name)")
    .eq("status", "available")
    .order("pickup_deadline", { ascending: true });
  return (data as FoodListing[] | null) ?? [];
}

export async function fetchDonorListings(donorId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("food_listings")
    .select("*, claim:claims(*, rescuer:profiles!claims_rescuer_id_fkey(id, organization))")
    .eq("donor_id", donorId)
    .order("created_at", { ascending: false });
  return (data as FoodListing[] | null) ?? [];
}

export async function fetchRescuerClaims(rescuerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("claims")
    .select("*, listing:food_listings(*, donor:profiles!food_listings_donor_id_fkey(id, organization, name)), proof:distribution_proofs(*)")
    .eq("rescuer_id", rescuerId)
    .order("claimed_at", { ascending: false });
  return (data as Claim[] | null) ?? [];
}

export async function fetchListingWithDetails(listingId: string) {
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("food_listings")
    .select("*, donor:profiles!food_listings_donor_id_fkey(id, organization, name), claim:claims(*, rescuer:profiles!claims_rescuer_id_fkey(id, organization, name), proof:distribution_proofs(*))")
    .eq("id", listingId)
    .single();
  return (listing as FoodListing | null) ?? null;
}

export async function fetchNotifications(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    created_at: string;
  }>;
}