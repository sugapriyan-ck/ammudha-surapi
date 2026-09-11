"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { signUp, signInWithGoogle } from "@/lib/actions";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/cn";
import { UtensilsIcon, HeartHandIcon, GoogleIcon } from "@/components/icons";

function SignupForm() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>(() =>
    searchParams.get("role") === "rescuer" ? "rescuer" : "donor"
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const res = await signUp(formData);
    if (res?.error) setError(res.error);
    setLoading(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    const res = await signInWithGoogle(role);
    if (res?.error) {
      setError(res.error);
      setGoogleLoading(false);
      return;
    }
    if (res?.url) {
      window.location.href = res.url;
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="role" value={role} />

      <div className="mb-5 grid grid-cols-2 gap-2">
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

      <div className="mb-1 space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full gap-2.5"
          size="lg"
        >
          <GoogleIcon size={18} />
          {googleLoading ? "Redirecting to Google…" : `Sign up with Google`}
        </Button>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-charcoal/10" />
          <span className="text-xs uppercase tracking-wide text-charcoal-muted">
            or with email
          </span>
          <span className="h-px flex-1 bg-charcoal/10" />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Full name</Label>
          <Input name="name" required placeholder="Your name" autoComplete="name" />
        </div>
        <div>
          <Label>Organization</Label>
          <Input name="organization" required placeholder="Restaurant, NGO, shelter…" />
        </div>
        <div>
          <Label>Email</Label>
          <Input name="email" type="email" required placeholder="you@org.org" autoComplete="email" />
        </div>
        <div>
          <Label>Password</Label>
          <Input name="password" type="password" required minLength={6} autoComplete="new-password" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Latitude (optional)</Label>
            <Input name="lat" type="number" step="any" placeholder="e.g. 12.9716" />
          </div>
          <div>
            <Label>Longitude (optional)</Label>
            <Input name="lng" type="number" step="any" placeholder="e.g. 77.5946" />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <Button type="submit" className="mt-6 w-full" size="lg" disabled={loading}>
        {loading ? "Creating account…" : `Create ${role === "donor" ? "Donor" : "Rescuer"} account`}
      </Button>

      <p className="mt-4 text-center text-sm text-charcoal-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-terracotta hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-charcoal">Join the rescue</h1>
          <p className="mt-2 text-charcoal-muted">
            Good food shouldn&apos;t go to waste.
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <Suspense fallback={<p className="py-8 text-center text-sm text-charcoal-muted">Loading…</p>}>
              <SignupForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}