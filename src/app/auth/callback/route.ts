import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Role } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const roleParam = searchParams.get("role");

  if (!code) return NextResponse.redirect(`${origin}/login?error=auth`);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore — server component.
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=auth`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?error=auth`);

  // Does the user already have a profile?
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const metadata = user.user_metadata ?? {};
  const role = (roleParam as Role) ?? (metadata.role as Role);

  if (!existing) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      name: String(metadata.name ?? metadata.full_name ?? metadata.email ?? "New member"),
      organization: String(metadata.organization ?? "Home"),
      email: user.email ?? "",
      role: role ?? "rescuer",
    });
    if (insertError) {
      return NextResponse.redirect(`${origin}/login?error=profile`);
    }
    if (!role) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "donor") {
    return NextResponse.redirect(`${origin}/donor/dashboard`);
  }

  // If next is set, it takes priority (e.g. "login?redirect=/impact")
  if (next) {
    const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    return NextResponse.redirect(`${origin}${safe}`);
  }

  return NextResponse.redirect(`${origin}/rescuer/dashboard`);
}