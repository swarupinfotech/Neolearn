import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Certificates | NeoLearn" };

export default async function CertificatesPage() {
  const user = await requireUser();
  const certs = await prisma.certificate.findMany({
    where: { userId: user.id },
    orderBy: { completedAt: "desc" },
    include: { path: true },
  });

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Award className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Certificates</h1>
        </div>
        <p className="text-muted max-w-2xl">
          Verifiable, forgery-resistant credentials earned by completing learning paths. Anyone can verify a
          certificate by its code.
        </p>
      </header>

      {certs.length === 0 ? (
        <EmptyState
          title="No certificates yet"
          description="Finish a learning path to earn your first verifiable certificate."
          action={
            <Link href="/paths">
              <Button>Browse learning paths</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {certs.map((c) => (
            <Card key={c.id} className="p-6 border-t-4 border-t-primary">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-primary" />
                <Badge tone="green">Verified credential</Badge>
              </div>
              <h2 className="text-xl font-bold">{c.pathTitle}</h2>
              <p className="text-sm text-muted mt-1">
                Awarded to <span className="text-fg font-medium">{c.userName}</span>
              </p>
              <p className="text-xs text-muted mt-2">Earned {formatDate(c.completedAt)}</p>
              <div className="mt-4 rounded-lg border border-border bg-surface2 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted mb-1">Certificate ID</p>
                <p className="font-mono text-sm font-semibold text-primary">{c.code}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/verify/${c.code}`}>
                  <Button size="sm" variant="outline">Verify</Button>
                </Link>
                <Link href={`/verify/${c.code}?download=1`}>
                  <Button size="sm" variant="secondary">View printable</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}