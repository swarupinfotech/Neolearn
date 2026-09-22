import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/services/auth";
import { prisma } from "@/lib/db";
import { OnboardingFlow } from "@/components/onboarding-flow";

export const metadata: Metadata = { title: "Onboarding | NeoLearn" };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const existing = await prisma.onboarding.findUnique({ where: { userId: user.id } });
  if (existing) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-2 font-bold text-lg mb-10">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white dark:text-[#052e16]">
            CL
          </span>
          NeoLearn
        </div>
        <OnboardingFlow />
      </div>
    </div>
  );
}