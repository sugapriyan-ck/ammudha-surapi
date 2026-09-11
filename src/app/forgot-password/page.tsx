"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { sendPasswordResetEmail } from "@/lib/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await sendPasswordResetEmail(email);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-charcoal">Reset password</h1>
          <p className="mt-2 text-charcoal-muted">
            We&apos;ll email you a link to set a new one.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            {sent ? (
              <div className="text-center">
                <p className="rounded-xl bg-sage/15 px-4 py-3 text-sm text-charcoal">
                  If an account exists for {email}, a reset link is on its way.
                  Check your inbox and spam folder.
                </p>
                <Link href="/login" className="mt-4 inline-block text-sm font-medium text-terracotta hover:underline">
                  Back to log in
                </Link>
              </div>
            ) : (
              <form action={"#"} onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    required
                    placeholder="you@org.org"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Sending link…" : "Send reset link"}
                </Button>

                <p className="pt-1 text-center text-sm text-charcoal-muted">
                  Remembered it?{" "}
                  <Link href="/login" className="font-medium text-terracotta hover:underline">
                    Log in
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