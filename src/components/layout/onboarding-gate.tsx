"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/states";

/**
 * Client-side gate: if the session user has no onboarding record yet,
 * redirect to onboarding. Runs once on mount to avoid SSR/user id mixups.
 */
export function OnboardingGate({
  needsOnboarding,
  userId,
  children,
}: {
  needsOnboarding: boolean;
  userId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/status", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          if (!data.completed) router.replace("/onboarding");
          else setState("ready");
        }
      } catch {
        if (!cancelled) setState("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, userId]);

  if (state === "checking") {
    return (
      <div className="min-h-screen grid place-items-center">
        <LoadingState label="Preparing your workspace…" />
      </div>
    );
  }
  return <>{children}</>;
}