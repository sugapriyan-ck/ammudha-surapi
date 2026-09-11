import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateProfile } from "@/lib/actions";
import { UtensilsIcon, HeartHandIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
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

  if (!profile) redirect("/signup");

  return (
    <main className="flex-1 px-4 pb-24 pt-16 lg:pt-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-charcoal">Profile</h1>
        <p className="mt-1 text-charcoal-muted">Manage your organization info.</p>

        <Card className="mt-6">
          <CardContent className="p-6">
            <form
              action={async (formData: FormData) => {
                await updateProfile(formData);
              }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant={profile.role === "donor" ? "primary" : "success"} className="gap-1.5">
                  {profile.role === "donor" ? (
                    <><UtensilsIcon size={13} /> Food Donor</>
                  ) : (
                    <><HeartHandIcon size={13} /> Food Rescuer</>
                  )}
                </Badge>
                </div>
                <p className="text-xs text-charcoal-muted">Signed in as {profile.email}</p>
              </div>

              <div>
                <Label>Full name</Label>
                <Input name="name" required defaultValue={profile.name} />
              </div>
              <div>
                <Label>Organization</Label>
                <Input name="organization" required defaultValue={profile.organization} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Latitude</Label>
                  <Input name="lat" type="number" step="any" defaultValue={profile.lat ?? ""} placeholder="12.9716" />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input name="lng" type="number" step="any" defaultValue={profile.lng ?? ""} placeholder="77.5946" />
                </div>
              </div>
              <p className="text-xs text-charcoal-muted">
                Location powers your hyper-local matching. It&apos;s shown to rescuers
                only as a distance, never as a map pin of your office.
              </p>

              <Button type="submit" className="w-full">
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}