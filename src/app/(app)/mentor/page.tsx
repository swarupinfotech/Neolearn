import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Lock, Loader2 } from "lucide-react";
import { requireUser } from "@/services/auth";
import { isPremiumUser } from "@/services/premium";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "AI Mentor | NeoLearn" };

const AI_ENABLED = Boolean(
  process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.AI_MENTOR_ENDPOINT
);

export default async function MentorPage() {
  const user = await requireUser();
  const premium = isPremiumUser(user);

  if (!AI_ENABLED) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">AI Mentor</h1>
        </header>
        <Card className="p-10 text-center space-y-4">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
            {AI_ENABLED ? <Sparkles className="h-7 w-7 text-primary" /> : <Loader2 className="h-7 w-7 text-muted" />}
          </div>
          <h2 className="text-xl font-bold">Mentor is not available yet</h2>
          <p className="text-sm text-muted max-w-md mx-auto">
            The AI mentor backend is not configured on this deployment. Add an AI provider key to the
            environment to unlock one-on-one tutoring, hints and code explanations.
          </p>
          <p className="text-xs font-mono bg-surface-2 rounded-md px-3 py-2 inline-block text-muted">
            OPENAI_API_KEY · ANTHROPIC_API_KEY · AI_MENTOR_ENDPOINT
          </p>
          <div>
            <Link href="/dashboard">
              <Button variant="secondary">Back to dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">AI Mentor</h1>
        {premium ? <Badge tone="amber">Premium</Badge> : <Badge tone="neutral">Free</Badge>}
      </header>

      <Card className="p-10 text-center space-y-4">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
          {premium ? <Sparkles className="h-7 w-7 text-primary" /> : <Lock className="h-7 w-7 text-muted" />}
        </div>
        <h2 className="text-xl font-bold">{premium ? "Your mentor is ready" : "Premium feature"}</h2>
        <p className="text-sm text-muted max-w-md mx-auto">
          {premium
            ? "Choose a lesson or ask anything — your mentor will guide you with hints and explanations."
            : "Upgrade to Premium to unlock the AI mentor, unlimited hints, and ad-free learning."}
        </p>
        <div>
          <Link href={premium ? "/dashboard" : "/premium"}>
            <Button>{premium ? "Start learning" : "Go Premium"}</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}