import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireUser } from "@/services/auth";
import { listNotifications } from "@/services/notifications";
import { NotificationsClient } from "@/components/notifications/notifications-client";
import { EmptyState } from "@/components/ui/states";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications | NeoLearn" };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const { page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const take = 30;
  const items = await listNotifications(user.id, take, (pageNum - 1) * take);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
        </div>
        {items.length > 0 ? <NotificationsClient hasUnread={items.some((i) => !i.read)} /> : null}
      </header>

      {items.length === 0 ? (
        <EmptyState title="Nothing here yet" description="Achievements, friend requests, replies and results will appear here." />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <a
                href={n.link ?? "#"}
                className={`card p-4 block card-hover ${n.read ? "opacity-70" : "border-primary/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    {n.body ? <p className="text-sm text-muted mt-1">{n.body}</p> : null}
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-between items-center text-sm">
        {pageNum > 1 ? (
          <a href={`/notifications?page=${pageNum - 1}`} className="text-primary hover:underline">← Previous</a>
        ) : <span />}
        {items.length === take ? (
          <a href={`/notifications?page=${pageNum + 1}`} className="text-primary hover:underline">Next →</a>
        ) : <span />}
      </div>
    </div>
  );
}