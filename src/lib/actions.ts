"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type {
  ListingCategory,
  DietaryType,
  QuantityUnit,
  Role,
  StorageCondition,
} from "@/lib/types";
import { estimateKgDiverted } from "@/lib/rescue-score";

const STORAGE_CONDITIONS: StorageCondition[] = [
  "Refrigerated",
  "Room Temperature",
  "Frozen",
  "Other",
];

function parseCheckbox(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "1" || value === "true";
}

function assertString(v: FormDataEntryValue | null, label: string): string {
  if (!v) throw new Error(`${label} is required`);
  return String(v);
}

// ---------------- Auth ----------------

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const name = assertString(formData.get("name"), "Name");
  const organization = assertString(formData.get("organization"), "Organization");
  const email = assertString(formData.get("email"), "Email");
  const password = assertString(formData.get("password"), "Password");
  const role = assertString(formData.get("role"), "Role") as Role;
  let lat: number | null = null;
  let lng: number | null = null;
  if (formData.get("lat")) lat = Number(formData.get("lat"));
  if (formData.get("lng")) lng = Number(formData.get("lng"));

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, organization, role },
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Signup failed. Please try again." };

  // The handle_new_user trigger in schema.sql automatically creates the
  // profile from auth metadata. Only do a client-side upsert when there
  // is an active session (email confirmation disabled), because RLS
  // requires auth.uid() = id and without a session that check fails.
  if (data.session) {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        name,
        organization,
        email,
        role,
        lat,
        lng,
      },
      { onConflict: "id" }
    );
    if (profileError) return { error: profileError.message };
  }

  // No session means Supabase is set to email-confirmation mode.
  if (!data.session) {
    redirect(`/login?message=Please confirm your email to get started.&email=${encodeURIComponent(email)}`);
  }

  revalidatePath("/", "layout");
  redirect(role === "donor" ? "/donor/dashboard" : "/rescuer/dashboard");
}

export async function logIn(formData: FormData) {
  const supabase = await createClient();
  const email = assertString(formData.get("email"), "Email");
  const password = assertString(formData.get("password"), "Password");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const isUnconfirmed =
      error.message.toLowerCase().includes("email not confirmed") ||
      error.message.toLowerCase().includes("not verified");
    return { error: isUnconfirmed ? "Please confirm your email before signing in." : error.message };
  }

  const requestedRedirect = formData.get("redirect");
  if (requestedRedirect && typeof requestedRedirect === "string") {
    const safe =
      requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
        ? requestedRedirect
        : null;
    if (safe) {
      revalidatePath("/", "layout");
      redirect(safe);
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  // Self-heal: users created before the handle_new_user trigger existed
  // have an auth account but no profile row. Create it from auth metadata.
  let effectiveRole: Role | undefined = profile?.role as Role | undefined;
  if (!profile) {
    const meta = data.user.user_metadata ?? {};
    const name = String(meta.name ?? meta.full_name ?? data.user.email?.split("@")[0] ?? "Member");
    const role = (meta.role as Role) ?? "rescuer";
    effectiveRole = role;
    await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        name,
        organization: String(meta.organization ?? "Home"),
        email: data.user.email ?? "",
        role,
      },
      { onConflict: "id" }
    );
    revalidatePath("/", "layout");
  }

  redirect(effectiveRole === "donor" ? "/donor/dashboard" : "/rescuer/dashboard");
}

export async function signInWithGoogle(role?: string) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback${role ? `?role=${role}` : ""}`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) return { error: error.message };
  if (!data.url) return { error: "Could not start Google sign-in. Please try again." };

  return { url: data.url };
}

// ---------------- Password reset ----------------

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = assertString(formData.get("name"), "Name");
  const organization = assertString(formData.get("organization"), "Organization");
  const role = assertString(formData.get("role"), "Role") as Role;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    name,
    organization,
    email: user.email ?? "",
    role,
  });

  if (profileError) return { error: profileError.message };

  await supabase.auth.updateUser({
    data: { name, organization, role },
  });

  revalidatePath("/", "layout");
  redirect(role === "donor" ? "/donor/dashboard" : "/rescuer/dashboard");
}

export async function sendPasswordResetEmail(email: string) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) return { error: error.message };
  return { ok: true };
}

// ---------------- Listings ----------------

export async function createListing(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: donorCheck } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (donorCheck?.role !== "donor") {
    return { error: "Only food donors can create listings." };
  }

  const food_name = assertString(formData.get("food_name"), "Food name");
  const category = assertString(formData.get("category"), "Category") as ListingCategory;
  const quantity = Number(formData.get("quantity"));
  const unit = assertString(formData.get("unit"), "Unit") as QuantityUnit;
  const dietary_type = assertString(formData.get("dietary_type"), "Dietary type") as DietaryType;
  const description = (formData.get("description") as string) || null;
  const pickup_deadline = assertString(formData.get("pickup_deadline"), "Pickup deadline");
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!quantity || quantity <= 0) return { error: "Quantity must be greater than 0" };
  if (!lat || !lng) return { error: "Location is required" };

  // ---- Food safety declaration ----
  const safetyHandled = parseCheckbox(formData.get("safety_handled"));
  const safetyInDate = parseCheckbox(formData.get("safety_in_date"));
  const safetySafe = parseCheckbox(formData.get("safety_safe"));

  if (!safetyHandled || !safetyInDate || !safetySafe) {
    return { error: "All food safety declarations must be confirmed before listing." };
  }

  const storageCondition = formData.get("storage_condition") as StorageCondition | null;
  if (
    !storageCondition ||
    !STORAGE_CONDITIONS.includes(storageCondition)
  ) {
    return { error: "Storage condition is required." };
  }

  const preparedAt = formData.get("prepared_at") ? new Date(String(formData.get("prepared_at"))).toISOString() : null;

  if (new Date(pickup_deadline).getTime() <= Date.now()) {
    return { error: "Pickup deadline must be in the future." };
  }

  const { error } = await supabase.from("food_listings").insert({
    donor_id: user.id,
    food_name,
    category,
    quantity,
    unit,
    dietary_type,
    description,
    pickup_deadline: new Date(pickup_deadline).toISOString(),
    prepared_at: preparedAt,
    storage_condition: storageCondition,
    safety_confirmed: true,
    lat,
    lng,
    status: "available",
  });

  if (error) return { error: error.message };
  revalidatePath("/donor/dashboard");
  revalidatePath("/rescuer/dashboard");
  redirect("/donor/dashboard");
}

export async function updateListingStatus(listingId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("food_listings")
    .update({ status })
    .eq("id", listingId);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
}

// ---------------- Claims ----------------

export async function claimListing(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const listingId = assertString(formData.get("listing_id"), "Listing id");

  // A listing can only be claimed while available and before its deadline.
  const { data: listing, error: listingError } = await supabase
    .from("food_listings")
    .select("id, donor_id, food_name, pickup_deadline, status")
    .eq("id", listingId)
    .single();

  if (listingError || !listing) return { error: "This listing is no longer available." };
  if (listing.status !== "available") return { error: "This listing has already been claimed." };
  if (listing.donor_id === user.id) return { error: "You cannot claim your own listing." };
  if (new Date(listing.pickup_deadline).getTime() <= Date.now()) {
    return { error: "This listing has expired and can no longer be claimed." };
  }

  // Transactional-ish: insert claim + update listing status.
  const { error: claimError } = await supabase
    .from("claims")
    .insert({ listing_id: listingId, rescuer_id: user.id, status: "claimed" });

  if (claimError) return { error: claimError.message };

  await supabase.from("food_listings").update({ status: "claimed" }).eq("id", listingId);

  // Notify the donor.
  const { data: rescuer } = await supabase
    .from("profiles")
    .select("organization")
    .eq("id", user.id)
    .single();

  if (listing) {
    await supabase.from("notifications").insert({
      user_id: listing.donor_id,
      title: "Your food was claimed 🎉",
      message: `${rescuer?.organization ?? "An organization"} claimed your "${listing.food_name}" listing.`,
      type: "claim",
    });
  }

  revalidatePath("/", "layout");
  redirect("/rescuer/dashboard");
}

export async function startPickup(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: claim } = await supabase
    .from("claims")
    .select("id, rescuer_id, listing:food_listings(donor_id, food_name, status)")
    .eq("listing_id", listingId)
    .single();

  const listing = claim?.listing as { donor_id: string; food_name: string; status: string } | undefined;
  if (!claim || !listing) return { error: "No claim exists for this listing" };
  if (claim.rescuer_id !== user.id) return { error: "Only the claiming organization can start pickup." };
  if (listing.status !== "claimed") return { error: "Pickup can only start after a claim." };

  await supabase.from("food_listings").update({ status: "pickup_in_progress" }).eq("id", listingId);
  await supabase
    .from("claims")
    .update({ status: "pickup_in_progress", pickup_in_progress_at: new Date().toISOString() })
    .eq("listing_id", listingId);

  if (listing.donor_id) {
    await supabase.from("notifications").insert({
      user_id: listing.donor_id,
      title: "Pickup in progress 🚚",
      message: `A rescuer is on their way to pick up "${listing.food_name}". Confirm the pickup when they arrive.`,
      type: "pickup",
    });
  }

  revalidatePath("/", "layout");
}

export async function startDistribution(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: claim } = await supabase
    .from("claims")
    .select("id, rescuer_id, listing:food_listings(donor_id, food_name, status)")
    .eq("listing_id", listingId)
    .single();

  const listing = claim?.listing as { donor_id: string; food_name: string; status: string } | undefined;
  if (!claim || !listing) return { error: "No claim exists for this listing" };
  if (claim.rescuer_id !== user.id) return { error: "Only the claiming organization can start distribution." };
  if (listing.status !== "picked_up") return { error: "Distribution can only start after pickup." };

  await supabase.from("food_listings").update({ status: "distribution_in_progress" }).eq("id", listingId);
  await supabase
    .from("claims")
    .update({ status: "distribution_in_progress", distribution_in_progress_at: new Date().toISOString() })
    .eq("listing_id", listingId);

  if (listing.donor_id) {
    await supabase.from("notifications").insert({
      user_id: listing.donor_id,
      title: "Distribution in progress 🥗",
      message: `"${listing.food_name}" is being distributed to people in need.`,
      type: "pickup",
    });
  }

  revalidatePath("/", "layout");
}

export async function confirmPickup(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Donor confirms pickup.
  const { data: listing } = await supabase
    .from("food_listings")
    .select("donor_id")
    .eq("id", listingId)
    .single();
  if (!listing || listing.donor_id !== user.id) {
    return { error: "Only the listing donor can confirm pickup." };
  }

  await supabase.from("food_listings").update({ status: "picked_up" }).eq("id", listingId);

  const { data: claim } = await supabase
    .from("claims")
    .update({ status: "picked_up", picked_up_at: new Date().toISOString() })
    .eq("listing_id", listingId)
    .select("rescuer_id")
    .single();

  if (claim) {
    await supabase.from("notifications").insert({
      user_id: claim.rescuer_id,
      title: "Pickup confirmed ✅",
      message: "The donor confirmed your pickup. Submit distribution proof when done.",
      type: "pickup",
    });
  }

  revalidatePath("/", "layout");
}

export async function completePickup(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Rescuer self-marks pickup (used in flow if donor hasn't confirmed).
  await supabase.from("food_listings").update({ status: "picked_up" }).eq("id", listingId);
  await supabase
    .from("claims")
    .update({ status: "picked_up", picked_up_at: new Date().toISOString() })
    .eq("listing_id", listingId);

  revalidatePath("/", "layout");
}

// ---------------- Distribution proof ----------------

export async function submitDistributionProof(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const listingId = assertString(formData.get("listing_id"), "Listing id");
  const peopleServed = Number(formData.get("people_served"));
  const distributionLocation = (formData.get("distribution_location") as string) || null;
  const note = (formData.get("note") as string) || null;

  const photoFiles = formData.getAll("photos").filter((f) => f instanceof File) as File[];

  const photos: string[] = [];
  if (photoFiles.length > 0) {
    for (const file of photoFiles) {
      if (!file.size) continue;
      const path = `proofs/${listingId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("distribution-proofs")
        .upload(path, file);
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("distribution-proofs")
          .getPublicUrl(path);
        photos.push(urlData.publicUrl);
      }
    }
  }

  const { data: claim } = await supabase
    .from("claims")
    .select("id, rescuer_id, listing_id, listing:food_listings(status)")
    .eq("listing_id", listingId)
    .single();

  if (!claim) return { error: "No claim exists for this listing" };
  if ((claim.listing as { status?: string } | undefined)?.status !== "distribution_in_progress") {
    return { error: "Distribution must be in progress before submitting proof." };
  }

  const { data: proof, error: proofError } = await supabase
    .from("distribution_proofs")
    .insert({
      claim_id: claim.id,
      rescue_id: listingId,
      organization_id: claim.rescuer_id,
      photos,
      people_served: peopleServed,
      distribution_location: distributionLocation,
      note,
    })
    .select()
    .single();

  if (proofError) return { error: proofError.message };

  await supabase.from("food_listings").update({ status: "distribution_completed" }).eq("id", listingId);
  await supabase
    .from("claims")
    .update({ status: "distribution_completed", completed_at: new Date().toISOString() })
    .eq("listing_id", listingId);

  // Notify donor.
  const { data: listing } = await supabase
    .from("food_listings")
    .select("donor_id, food_name, quantity, unit")
    .eq("id", listingId)
    .single();

  if (listing) {
    const kg = estimateKgDiverted(listing.quantity, listing.unit);
    await supabase.from("notifications").insert({
      user_id: listing.donor_id,
      title: "Rescue completed 🌱",
      message: `Your "${listing.food_name}" rescued ${listing.quantity} ${listing.unit} (~${kg} kg diverted) and served ${peopleServed} people.`,
      type: "completed",
    });
  }

  revalidatePath("/", "layout");
  return { success: true, proofId: proof.id };
}

// ---------------- Notifications ----------------

export async function markNotificationsRead(ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || ids.length === 0) return;
  await supabase
    .from("notifications")
    .update({ read: true })
    .in("id", ids)
    .eq("user_id", user.id);
  revalidatePath("/notifications");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = assertString(formData.get("name"), "Name");
  const organization = assertString(formData.get("organization"), "Organization");
  const lat = Number(formData.get("lat") || null);
  const lng = Number(formData.get("lng") || null);

  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      organization,
      lat: lat || null,
      lng: lng || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  redirect("/profile");
}