import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { requireUser } from "@/services/auth";
import { SettingsClient } from "@/components/settings/settings-client";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Settings | NeoLearn" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-muted">Manage your profile, password and account.</p>
      </header>

      <SettingsClient
        initial={{
          username: user.username,
          displayName: user.displayName,
          bio: user.bio ?? "",
          avatarUrl: user.avatarUrl,
          email: user.email,
          emailVerified: Boolean(user.emailVerified),
          skills: (user.skills as unknown as string[]) ?? [],
          premium: user.isPremium,
        }}
      />

      <section className="card p-5">
        <h2 className="font-semibold mb-1">Account</h2>
        <ul className="text-sm space-y-1.5 text-muted">
          <li>Signed in as <span className="text-fg font-medium">@{user.username}</span></li>
          <li>
            Email <span className="text-fg font-medium">{user.email}</span>{" "}
            {user.emailVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Unverified</Badge>}
          </li>
          {user.isPremium ? <li><Badge tone="amber">Premium</Badge></li> : null}
        </ul>
      </section>
    </div>
  );
}