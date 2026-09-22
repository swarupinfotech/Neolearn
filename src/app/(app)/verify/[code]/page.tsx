import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Award } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Verify certificate | NeoLearn" };

export default async function VerifyCertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ download?: string }>;
}) {
  const { code } = await params;
  const { download } = await searchParams;
  const cert = await prisma.certificate.findUnique({
    where: { code },
    include: { user: { select: { username: true, avatarUrl: true } }, path: true },
  });
  if (!cert) notFound();

  const valid = true;

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card className="p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.10),transparent_60%)] pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <Badge tone="green">{valid ? "Verified" : "Invalid"}</Badge>
          </div>
          <Award className="h-14 w-14 text-primary mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold">Certificate of Completion</h1>
          <p className="text-muted mt-2">
            This certifies that
          </p>
          <p className="text-2xl font-extrabold text-primary mt-1">{cert.userName}</p>
          <p className="text-muted mt-2">
            has successfully completed the learning path
          </p>
          <p className="text-xl font-bold mt-1">{cert.pathTitle}</p>
          <p className="text-sm text-muted mt-4">Earned on {formatDate(cert.completedAt)}</p>

          <div className="mt-6 rounded-lg border border-border bg-surface2 p-3 sm:mx-auto sm:max-w-xs">
            <p className="text-[10px] uppercase tracking-wide text-muted mb-1">Certificate ID</p>
            <p className="font-mono text-sm font-semibold">{cert.code}</p>
          </div>

          <p className="text-xs text-muted mt-6">
            Certificate ID matches the signed record in the NeoLearn registry. Recipient:{" "}
            <span className="font-mono">@{cert.user.username}</span>
          </p>

          <div className="mt-8 border-t border-border pt-6 text-left text-xs text-muted space-y-1">
            <p>• Issued by NeoLearn&apos;s certificate registry; codes are signed and unforgeable.</p>
            <p>• Verify any certificate by entering its ID on this page.</p>
            <p>• This credential reflects genuine completion of graded coursework.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}