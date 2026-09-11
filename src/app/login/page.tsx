"use client";

import { useState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { logIn, signInWithGoogle } from "@/lib/actions";
import { GoogleIcon } from "@/components/icons";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const searchParams = useSearchParams();

  const redirect = searchParams.get("redirect");
  const message = searchParams.get("message");
  const prefilledEmail = searchParams.get("email");
  const confirmError = searchParams.get("error");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const res = await logIn(formData);
if (res?.error) setError(res.error);
    setLoading(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    const res = await signInWithGoogle();
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
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-charcoal">Welcome back</h1>
          <p className="mt-2 text-charcoal-muted">Continue your rescue work.</p>
        </div>

        {message && (
          <p className="mb-4 rounded-xl bg-sage/15 px-4 py-3 text-sm text-charcoal">
            {message}
          </p>
        )}
        {confirmError && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {confirmError === "profile"
              ? "We could not finish setting up your account. Please try again."
              : "Sign-in failed. Please try again."}
          </p>
        )}

        <Card>
          <CardContent className="space-y-4 p-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full gap-2.5"
              size="lg"
            >
              <GoogleIcon size={18} />
              {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
            </Button>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-charcoal/10" />
              <span className="text-xs uppercase tracking-wide text-charcoal-muted">
                or with email
              </span>
              <span className="h-px flex-1 bg-charcoal/10" />
            </div>

            <form action={handleSubmit} className="space-y-4">
              <input type="hidden" name="redirect" value={redirect ?? ""} />
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" required placeholder="you@org.org" autoComplete="email" defaultValue={prefilledEmail ?? ""} />
              </div>
              <div>
                <Label>Password</Label>
                <Input name="password" type="password" required autoComplete="current-password" />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Logging in…" : "Log in"}
              </Button>

              <div className="pt-1 text-center text-sm text-charcoal-muted">
                <Link href="/forgot-password" className="font-medium text-terracotta hover:underline">
                  Forgot your password?
                </Link>
              </div>

              <p className="pt-1 text-center text-sm text-charcoal-muted">
                New here?{" "}
                <Link href="/signup" className="font-medium text-terracotta hover:underline">
                  Create an account
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}