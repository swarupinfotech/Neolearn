import type { Metadata } from "next";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free forever for core learning. Premium for advanced content and certificates.",
};

const plans = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "All foundation courses",
      "Interactive lessons & quizzes",
      "Code playground (Python, JS, SQL, HTML/CSS)",
      "Daily missions & XP",
      "Community access",
      "Leaderboard & achievements",
    ],
    cta: "Start free",
    href: "/signup",
    highlight: false,
  },
  {
    key: "premium",
    name: "Premium",
    price: "$9",
    period: "/month",
    features: [
      "Everything in Free",
      "Advanced courses & challenges",
      "All guided projects with tests",
      "Verifiable certificates",
      "Advanced analytics",
      "AI coding mentor",
      "Extra practice sets",
    ],
    cta: "Go Premium",
    href: "/pricing#premium",
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <header className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-bold">Pricing</h1>
        <p className="text-muted mt-3">
          Start free. Upgrade when you&apos;re ready for advanced content, certificates and the AI
          mentor.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {plans.map((p) => (
          <Card key={p.key} className={p.highlight ? "border-primary ring-2 ring-primary/30 relative" : ""}>
            {p.highlight ? (
              <Badge tone="green" className="absolute -top-3 left-5">
                <Sparkles className="h-3 w-3" /> Popular
              </Badge>
            ) : null}
            <h2 className="text-xl font-bold">{p.name}</h2>
            <p className="mt-2">
              <span className="text-4xl font-extrabold">{p.price}</span>
              <span className="text-muted text-sm"> {p.period}</span>
            </p>
            <ul className="mt-5 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href={p.href} className="block mt-6">
              <Button className="w-full" variant={p.highlight ? "primary" : "secondary"}>
                {p.cta}
              </Button>
            </Link>
          </Card>
        ))}
      </div>

      <section id="premium" className="mt-14 card p-6 max-w-3xl mx-auto">
        <h2 className="font-semibold text-lg">About Premium checkout</h2>
        <p className="text-sm text-muted mt-2">
          Premium checkout is processed by a payment provider and verified <strong>server-side</strong>{" "}
          via signed webhooks — the frontend never decides your subscription status. In this build the
          payment provider is not configured, so upgrading shows an explicit “unavailable” state rather
          than a fake success.
        </p>
        <div className="mt-4">
          <Badge tone="amber">Payment provider: not configured</Badge>
        </div>
      </section>
    </div>
  );
}