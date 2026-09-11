import { createClient } from "@/lib/supabase/server";
import { estimateKgDiverted } from "@/lib/rescue-score";
import type { FoodListing, DistributionProof, Claim } from "@/lib/types";

export async function fetchGlobalImpact() {
  const supabase = await createClient();

  const { data: listings } = await supabase
    .from("food_listings")
    .select("*")
    .eq("status", "distribution_completed");

  const { data: proofs } = await supabase
    .from("distribution_proofs")
    .select("*, claims(*, listings:food_listings(*))");

  const completed = (listings as FoodListing[] | null) ?? [];
  const distributionProofs = (proofs as DistributionProof[] | null) ?? [];

  const mealsRescued = completed.reduce((sum, l) => {
    if (l.unit === "Meals") return sum + l.quantity;
    return sum + Math.round(l.quantity * (l.unit === "Boxes" ? 8 : l.unit === "Packs" ? 4 : 2));
  }, 0);

  const kgDiverted = Math.round(
    completed.reduce((sum, l) => sum + estimateKgDiverted(l.quantity, l.unit), 0)
  );

  const peopleServed = distributionProofs.reduce(
    (sum, p) => sum + (p.people_served || 0),
    0
  );

  const successfulRescues = completed.length;

  return { mealsRescued, kgDiverted, peopleServed, successfulRescues };
}

export async function fetchRecentRescues(limit = 10) {
  const supabase = await createClient();

  const { data: claims } = await supabase
    .from("claims")
    .select(
      "id, claimed_at, picked_up_at, completed_at, status, rescuer:profiles!claims_rescuer_id_fkey(id, organization), listing:food_listings(*, donor:profiles!food_listings_donor_id_fkey(id, organization))"
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