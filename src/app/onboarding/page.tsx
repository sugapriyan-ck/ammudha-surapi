"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { completeOnboarding } from "@/lib/actions";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/cn";
import { UtensilsIcon, HeartHandIcon } from "@/components/icons";

export default function OnboardingPage() {
  const [role, setRole] = useState<Role>("donor");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const res = await completeOnboarding(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-charcoal">Tell us about you</h1>
          <p className="mt-2 text-charcoal-muted">
            One last step before you join the rescue.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form action={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(["donor", "rescuer"] as Role[]).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-center transition-all",
                      role === r
                        ? "border-terracotta bg-terracotta/5"
                        : "border-charcoal/10 bg-white hover:border-charcoal/30"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                        role === r
                          ? "bg-terracotta/15 text-terracotta"
                          : "bg-charcoal/5 text-charcoal-muted"
                      )}
                    >
                      {r === "donor" ? <UtensilsIcon size={20} /> : <HeartHandIcon size={20} />}
                    </span>
                    <span className="text-sm font-semibold text-charcoal">
                      {r === "donor" ? "Food Donor" : "Food Rescuer"}
                    </span>
                    <span className="text-[11px] text-charcoal-muted">
                      {r === "donor" ? "I have surplus food" : "I redistribute food"}
                    </span>
                  </button>
                ))}
              </div>

              <input type="hidden" name="role" value={role} />

              <div>
                <Label>Your name</Label>
                <Input
                  name="name"
                  required
                  placeholder="Your name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Organization</Label>
                <Input
                  name="organization"
                  required
                  placeholder="Restaurant, NGO, shelter…"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Saving…" : "Finish setup"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}