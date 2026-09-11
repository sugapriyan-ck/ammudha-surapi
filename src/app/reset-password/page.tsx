"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // The recovery link from Supabase lands on this page with the session
  // tokens in the URL hash fragment (#access_token=...&type=recovery).
  useEffect(() => {
    async function applySession() {
      try {
        const hash = window.location.hash;
        if (!hash || !hash.includes("type=recovery")) {
          setError("This link is invalid or expired. Request a new one to reset your password.");
          return;
        }
        const params = new URLSearchParams(hash.slice(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (!accessToken) {
          setError("This link is invalid or expired. Request a new one to reset your password.");
          return;
        }
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? "",
        });
        setReady(true);
      } catch {
        setError("This link is invalid or expired. Request a new one to reset your password.");
      }
    }
    applySession();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/login?message=Password updated. You can log in now.");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-charcoal">Choose a new password</h1>
          <p className="mt-2 text-charcoal-muted">Make it at least 6 characters long.</p>
        </div>

        <Card>
          <CardContent className="p-6">
            {!ready ? (
              <p className="py-6 text-center text-sm text-charcoal-muted">
                {error ?? "Checking your link…"}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>New password</Label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Updating…" : "Update password"}
                </Button>

                <p className="pt-1 text-center text-sm text-charcoal-muted">
                  <Link href="/login" className="font-medium text-terracotta hover:underline">
                    Back to log in
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}