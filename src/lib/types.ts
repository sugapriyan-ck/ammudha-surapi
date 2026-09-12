export type Role = "donor" | "rescuer";

export type ListingCategory =
  | "Prepared Meal"
  | "Bakery"
  | "Produce"
  | "Packaged Food"
  | "Other";

export type QuantityUnit = "Meals" | "Packs" | "Kg" | "Boxes";

export type DietaryType = "Vegetarian" | "Non-Vegetarian" | "Vegan" | "Other";

export type ListingStatus = "available" | "claimed" | "picked_up" | "distribution_completed";

export type ClaimStatus = "claimed" | "picked_up" | "distribution_completed";

export type StorageCondition = "Refrigerated" | "Room Temperature" | "Frozen" | "Other";

export interface Profile {
  id: string;
  name: string;
  organization: string;
  email: string;
  role: Role;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
}

export interface FoodListing {
  id: string;
  donor_id: string;
  food_name: string;
  category: ListingCategory;
  quantity: number;
  unit: QuantityUnit;
  dietary_type: DietaryType;
  description?: string | null;
  pickup_deadline: string;
  prepared_at?: string | null;
  storage_condition?: StorageCondition | null;
  safety_confirmed?: boolean | null;
  photo_url?: string | null;
  lat: number;
  lng: number;
  status: ListingStatus;
  created_at: string;
  donor?: Profile | null;
  claim?: Claim | null;
}

export interface Claim {
  id: string;
  listing_id: string;
  rescuer_id: string;
  claimed_at: string;
  picked_up_at?: string | null;
  completed_at?: string | null;
  status: ClaimStatus;
  rescuer?: Profile | null;
  listing?: FoodListing | null;
  proof?: DistributionProof | DistributionProof[] | null;
}

export interface DistributionProof {
  id: string;
  claim_id: string;
  rescue_id: string;
  organization_id: string;
  photos: string[];
  people_served: number;
  distribution_location?: string | null;
  note?: string | null;
  submitted_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface RescueCardData {
  rescueId: string;
  mealsRescued: number;
  kgDiverted: number;
  peopleServed: number;
  organizationName: string;
  foodName?: string;
  created_at: string;
}