import Link from "next/link";
import type { ReactNode } from "react";
import { Code2 } from "lucide-react";
import { PublicNav } from "@/components/layout/public-nav";
import { Footer } from "@/components/layout/footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <PublicNav />
      <div className="flex-1">{children}</div>
      <Footer />
      <Link href="/dashboard" className="sr-only">
        Dashboard
      </Link>
      <div className="sr-only">
        <Code2 />
      </div>
    </div>
  );
}