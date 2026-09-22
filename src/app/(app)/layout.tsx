import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/services/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { OnboardingGate } from "@/components/layout/onboarding-gate";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const needsOnboarding = user.role !== "ADMIN" ? true : true;

  return (
    <OnboardingGate needsOnboarding={needsOnboarding} userId={user.id}>
      <div className="min-h-screen bg-bg">
        <div className="flex">
          <AppSidebar role={user.role} />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar
              user={{
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                level: user.level,
                xp: user.xp,
                role: user.role,
              }}
            />
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
        <MobileBottomNav />
      </div>
      <Link href="/dashboard" className="sr-only">
        Dashboard
      </Link>
    </OnboardingGate>
  );
}