"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import {
  HomeIcon,
  UtensilsIcon,
  ClipboardIcon,
  LeafIcon,
  UserIcon,
  BoxIcon,
} from "@/components/icons";

export const BRAND_COLORS = {
  terracotta: "#E2725B",
  cream: "#FAF6F0",
  sage: "#7EA172",
  charcoal: "#2E2E2E",
};

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold text-white"
        style={{ backgroundColor: BRAND_COLORS.terracotta }}
      >
        ஊ
      </span>
      <span className="text-lg font-bold text-charcoal">
        Ammudha&nbsp;Surapi
      </span>
    </Link>
  );
}

function donorLinks(active: string) {
  return [
    { href: "/donor/dashboard", label: "Dashboard", icon: HomeIcon },
    { href: "/donor/listings/new", label: "List Food", icon: UtensilsIcon },
    { href: "/donor/listings", label: "My Listings", icon: ClipboardIcon },
    { href: "/impact", label: "Impact", icon: LeafIcon },
    { href: "/profile", label: "Profile", icon: UserIcon },
  ].map((l) => ({
    ...l,
    active:
      active === l.href ||
      (l.href === "/donor/dashboard" && active.startsWith("/donor/dashboard")) ||
      (l.href === "/donor/listings" && active.startsWith("/donor/listings") && active !== "/donor/listings/new"),
  }));
}

function rescuerLinks(active: string) {
  return [
    { href: "/rescuer/dashboard", label: "Home", icon: HomeIcon },
    { href: "/rescuer/my-rescues", label: "My Rescues", icon: BoxIcon },
    { href: "/impact", label: "Impact", icon: LeafIcon },
    { href: "/profile", label: "Profile", icon: UserIcon },
  ].map((l) => ({
    ...l,
    active:
      active === l.href ||
      (l.href === "/rescuer/dashboard" && active.startsWith("/rescuer/dashboard")) ||
      (l.href === "/rescuer/my-rescues" && active.startsWith("/rescuer/my-rescues")) ||
      active.startsWith("/rescuer/rescue/"),
  }));
}

export function Nav() {
  const { session, profile, signOut, loading } = useAuth();
  const pathname = usePathname();

  const links = profile?.role === "donor" ? donorLinks(pathname) : rescuerLinks(pathname);

  return (
    <>
      {/* Desktop sidebar for donors */}
      {profile?.role === "donor" && session && (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-charcoal/10 bg-white px-6 py-8 lg:flex">
          <div className="flex items-center justify-between">
            <Logo />
            <NotificationBell />
          </div>
          <nav className="mt-10 flex-1 space-y-1">
            {links.map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                    l.active
                      ? "bg-terracotta/10 text-terracotta"
                      : "text-charcoal/70 hover:bg-warm-cream hover:text-charcoal"
                  )}
                >
                  <Icon size={18} />
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-charcoal/10 pt-4">
            <div className="mb-3 px-2">
              <p className="truncate text-sm font-medium text-charcoal">{profile.organization}</p>
              <p className="truncate text-xs text-charcoal/50">{profile.email}</p>
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => signOut()}>
              Log out
            </Button>
          </div>
        </aside>
      )}

      {/* Desktop top bar for rescuers */}
      {profile?.role === "rescuer" && session && (
        <header className="fixed inset-x-0 top-0 z-40 hidden border-b border-charcoal/10 bg-white px-6 py-4 lg:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Logo />
            <nav className="flex items-center gap-1">
              <NotificationBell />
              {links.map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                      l.active
                        ? "bg-terracotta/10 text-terracotta"
                        : "text-charcoal/70 hover:bg-warm-cream hover:text-charcoal"
                    )}
                  >
                    <Icon size={17} />
                    {l.label}
                  </Link>
                );
              })}
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Log out
              </Button>
            </nav>
          </div>
        </header>
      )}

      {/* Public top bar (landing/auth) */}
      {!session && !loading && (
        <header className="sticky top-0 z-40 border-b border-charcoal/10 bg-cream/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Logo />
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Mobile bottom nav for authenticated users */}
      {session && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-charcoal/10 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
                  l.active ? "text-terracotta" : "text-charcoal/50"
                )}
              >
                <Icon size={20} />
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}