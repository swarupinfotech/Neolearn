import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/services/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata = { title: "Admin | NeoLearn" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Console</h1>
        </div>
        <p className="text-sm text-muted mt-1">
          Signed in as {admin.displayName} ({admin.email})
        </p>
      </header>

      <AdminNav />

      <div className="min-w-0">{children}</div>
    </div>
  );
}
