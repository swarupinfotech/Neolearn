"use server";

import { revalidatePath } from "next/cache";
import { readSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/services/auth";
import { track } from "@/lib/events";

export async function adminSetUserStatusAction(input: { userId: string; status: "active" | "suspended" }): Promise<{
  ok: boolean;
  error?: string;
}> {
  const admin = await requireAdmin();
  if (input.userId === admin.id) return { ok: false, error: "You can't change your own status." };
  await prisma.user.update({ where: { id: input.userId }, data: { status: input.status } });
  await track("admin_user_status", { userId: input.userId, status: input.status }, admin.id);
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminResolveReportAction(input: { reportId: string; status: "RESOLVED" | "DISMISSED" }): Promise<{
  ok: boolean;
  error?: string;
}> {
  const admin = await requireAdmin();
  const report = await prisma.communityReport.findUnique({ where: { id: input.reportId } });
  if (!report) return { ok: false, error: "Report not found." };

  await prisma.$transaction([
    prisma.communityReport.update({ where: { id: input.reportId }, data: { status: input.status } }),
    ...(input.status === "RESOLVED"
      ? [
          prisma.communityPost.updateMany({
            where: { id: report.targetType === "POST" ? report.targetId : "" },
            data: { status: "REMOVED" },
          }),
          prisma.comment.updateMany({
            where: { id: report.targetType === "COMMENT" ? report.targetId : "" },
            data: { body: "[removed by moderator]" },
          }),
        ]
      : []),
  ]);

  await track("admin_report", { reportId: input.reportId, status: input.status }, admin.id);
  revalidatePath("/admin");
  return { ok: true };
}

export async function requireAdminForPage() {
  return requireAdmin();
}

export async function adminActorId() {
  return readSessionUserId();
}