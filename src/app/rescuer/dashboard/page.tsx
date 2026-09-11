import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import DiscoveryFeed from "@/app/rescuer/dashboard/discovery-feed";
import { BoxIcon } from "@/components/icons";
import { fetchRescuerClaims } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function RescuerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "rescuer") redirect("/signup?role=rescuer");

  const claims = await fetchRescuerClaims(user.id);
  const inProgress = claims.filter((c) => c.status !== "distribution_completed");

  return (
    <main className="flex-1 px-4 pb-24 pt-16 lg:pt-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-charcoal">
              {profile.organization}
            </h1>
            <p className="text-charcoal-muted">Find nearby food and rescue it.</p>
          </div>
          {inProgress.length > 0 && (
            <Badge variant="warning">{inProgress.length} in progress</Badge>
          )}
        </div>

        {/* Active rescues strip */}
        {inProgress.length > 0 && (
          <Card className="mb-8 border-terracotta/20 bg-terracotta/5">
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-terracotta">
                Your active rescues
              </h2>
              <div className="flex flex-wrap gap-2">
                {inProgress.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-charcoal ring-1 ring-terracotta/20">
                    <BoxIcon size={13} />
                    {c.listing?.food_name} · {c.listing?.quantity} {c.listing?.unit} · {c.status.replace("_", " ")}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Available food nearby
        </h2>
        <DiscoveryFeed />
      </div>
    </main>
  );
}