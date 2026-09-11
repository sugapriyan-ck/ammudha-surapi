import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkReadButton } from "@/components/mark-read-button";
import { fetchNotifications } from "@/lib/data";
import { BellIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const notifications = await fetchNotifications(user.id);
  const unread = notifications.filter((n) => !n.read);

  return (
    <main className="flex-1 px-4 pb-24 pt-16 lg:pt-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Notifications</h1>
            <p className="mt-1 text-charcoal-muted">Stay updated on your rescues.</p>
          </div>
          <MarkReadButton ids={unread.map((n) => n.id)} />
        </div>

        {notifications.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="py-12 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
                <BellIcon size={28} />
              </span>
              <p className="mt-4 font-medium text-charcoal">No notifications yet</p>
              <p className="mt-1 text-sm text-charcoal-muted">
                Claim listings and make rescues to see activity here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-3">
            {notifications.map((n) => (
              <Card key={n.id} className={!n.read ? "border-terracotta/40" : ""}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-charcoal">{n.title}</p>
                    <p className="mt-0.5 text-sm text-charcoal-muted">{n.message}</p>
                    <p className="mt-1.5 text-xs text-charcoal/40">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.read && <Badge variant="primary">New</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}