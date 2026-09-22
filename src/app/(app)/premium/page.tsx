import type { Metadata } from "next";
import Link from "next/link";
import { Check, Crown, X } from "lucide-react";
import { requireUser } from "@/services/auth";
import { isPremiumUser } from "@/services/premium";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Premium | NeoLearn" };

const free = ["All core courses", "Daily missions", "Community access", "XP & achievements"];
const premiumAdds = [
  "AI mentor with hints & explanations",
  "Unlimited challenge attempts",
  "Advanced project reviews",
  "Ad-free learning experience",
  "Priority support",
];

export default async function PremiumPage() {
  const user = await requireUser();
  const premium = isPremiumUser(user);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-amber-500 font-semibold">
          <Crown className="h-6 w-6" /> NeoLearn Premium
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">Learn faster, together with AI</h1>
        <p className="text-muted max-w-lg mx-auto">
          Unlock the AI mentor and advanced features. Billing state is simulated on this deployment —
          no real charges occur.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4 items-stretch">
        <Card className="p-6 flex flex-col">
          <h2 className="font-semibold mb-1">Free</h2>
          <p className="text-2xl font-bold mb-4">$0</p>
          <ul className="space-y-2 flex-1">
            {free.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </Card>

        <Card className={cn("p-6 flex flex-col border-primary-strong relative", premium ? "bg-primary-soft/40" : "")}>
          {premium ? (
            <span className="absolute -top-3 right-4 text-xs font-semibold text-white bg-primary px-2.5 py-1 rounded-full">
              You&apos;re Premium
            </span>
          ) : null}
          <h2 className="font-semibold mb-1 flex items-center gap-1.5">
            <Crown className="h-4 w-4 text-amber-500" /> Premium
          </h2>
          <p className="text-2xl font-bold mb-4">$9 / month</p>
          <ul className="space-y-2 flex-1">
            {premiumAdds.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" /> {f}
              </li>
            ))}
            {free.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted">
                <Check className="h-4 w-4 text-emerald-500/60 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="card p-6 text-center space-y-3">
        <div className="inline-flex items-center gap-2 text-amber-500 text-sm font-medium">
          <X className="h-4 w-4" /> Subscription is not wired to a real payment provider.
        </div>
        <p className="text-sm text-muted max-w-md mx-auto">
          {premium
            ? "Your Premium state is active in this demo environment."
            : "To simulate Premium, set PREMIUM_BOOTSTRAP_EMAIL in the environment, or contact support."}
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          {premium ? (
            <Button onClick={async () => {}}>Manage subscription</Button>
          ) : (
            <Button disabled title="Demo placeholder">
              Upgrade — demo
            </Button>
          )}
          <Link href="/dashboard">
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}