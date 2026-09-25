"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { readSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/services/auth";
import { invalidateAdminStats } from "@/lib/admin-stats";
import { track } from "@/lib/events";

type Result = { ok: boolean; error?: string };

const ADMIN_REVALIDATE = ["/admin", "/admin/users", "/admin/moderation", "/admin/system"];

function revalidateAdmin() {
  invalidateAdminStats();
  for (const p of ADMIN_REVALIDATE) revalidatePath(p);
}

// ---------------------------------------------------------------- users

export async function adminSetUserStatusAction(input: {
  userId: string;
  status: "active" | "suspended";
}): Promise<Result> {
  const admin = await requireAdmin();
  if (input.userId === admin.id) return { ok: false, error: "You can't change your own status." };

  const target = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } });
  if (!target) return { ok: false, error: "User not found." };

  await prisma.user.update({ where: { id: input.userId }, data: { status: input.status } });

  await track("admin_user_status", { userId: input.userId, status: input.status }, admin.id);
  revalidateAdmin();
  return { ok: true };
}

export async function adminSetUserRoleAction(input: {
  userId: string;
  role: "USER" | "MODERATOR" | "ADMIN";
}): Promise<Result> {
  const admin = await requireAdmin();
  if (input.userId === admin.id && input.role !== "ADMIN") {
    return { ok: false, error: "You can't remove your own admin role." };
  }

  const before = await prisma.user.findUnique({ where: { id: input.userId }, select: { role: true } });
  if (!before) return { ok: false, error: "User not found." };

  if (before.role === "ADMIN" && input.role !== "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN", status: "active" } });
    if (admins <= 1) return { ok: false, error: "At least one admin must remain." };
  }

  await prisma.user.update({ where: { id: input.userId }, data: { role: input.role } });
  await track("admin_user_role", { userId: input.userId, role: input.role }, admin.id);
  revalidateAdmin();
  return { ok: true };
}

export async function adminSetPremiumAction(input: { userId: string; isPremium: boolean }): Promise<Result> {
  const admin = await requireAdmin();
  await prisma.user.update({
    where: { id: input.userId },
    data: { isPremium: input.isPremium, premiumUntil: input.isPremium ? null : undefined },
  });
  await track("admin_user_premium", { userId: input.userId, isPremium: input.isPremium }, admin.id);
  revalidateAdmin();
  return { ok: true };
}

export async function adminVerifyUserEmailAction(input: { userId: string }): Promise<Result> {
  const admin = await requireAdmin();
  await prisma.user.update({ where: { id: input.userId }, data: { emailVerified: new Date() } });
  await track("admin_user_email_verified", { userId: input.userId }, admin.id);
  revalidateAdmin();
  return { ok: true };
}

export async function adminBulkUserStatusAction(input: {
  userIds: string[];
  status: "active" | "suspended";
}): Promise<Result> {
  const admin = await requireAdmin();
  const ids = input.userIds.filter((id) => id !== admin.id);
  if (ids.length === 0) return { ok: false, error: "No eligible users selected." };

  await prisma.user.updateMany({ where: { id: { in: ids } }, data: { status: input.status } });

  await track("admin_bulk_user_status", { count: ids.length, status: input.status }, admin.id);
  revalidateAdmin();
  return { ok: true };
}

export async function adminDeleteUserAction(input: { userId: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (input.userId === admin.id) return { ok: false, error: "You can't delete your own account." };

  const target = await prisma.user.findUnique({ where: { id: input.userId }, select: { role: true } });
  if (!target) return { ok: false, error: "User not found." };
  if (target.role === "ADMIN") return { ok: false, error: "Demote the admin before deleting." };

  await prisma.user.delete({ where: { id: input.userId } });
  await track("admin_user_deleted", { userId: input.userId }, admin.id);
  revalidateAdmin();
  return { ok: true };
}

// ---------------------------------------------------------------- content

export async function adminSetCourseStatusAction(input: {
  courseId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}): Promise<Result> {
  const admin = await requireAdmin();
  const course = await prisma.course.findUnique({ where: { id: input.courseId }, select: { id: true } });
  if (!course) return { ok: false, error: "Course not found." };

  await prisma.course.update({ where: { id: input.courseId }, data: { status: input.status } });
  await track("admin_course_status", { courseId: input.courseId, status: input.status }, admin.id);
  invalidateAdminStats();
  revalidatePath("/admin/content");
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminToggleCourseFeaturedAction(input: { courseId: string }): Promise<Result> {
  const admin = await requireAdmin();
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    select: { id: true, isPremium: true, status: true },
  });
  if (!course) return { ok: false, error: "Course not found." };

  await prisma.course.update({ where: { id: input.courseId }, data: { isPremium: !course.isPremium } });
  await track("admin_course_premium", { courseId: input.courseId }, admin.id);
  invalidateAdminStats();
  revalidatePath("/admin/content");
  return { ok: true };
}

// ---------------------------------------------------------------- moderation

export async function adminResolveReportAction(input: { reportId: string; status: "RESOLVED" | "DISMISSED" }): Promise<Result> {
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
  revalidateAdmin();
  return { ok: true };
}

export async function adminSetPostStatusAction(input: {
  postId: string;
  status: "OPEN" | "CLOSED" | "REMOVED";
}): Promise<Result> {
  const admin = await requireAdmin();
  await prisma.communityPost.update({ where: { id: input.postId }, data: { status: input.status } });
  await track("admin_post_status", { postId: input.postId, status: input.status }, admin.id);
  revalidateAdmin();
  return { ok: true };
}

export async function adminDeletePostAction(input: { postId: string }): Promise<Result> {
  const admin = await requireAdmin();
  await prisma.communityPost.delete({ where: { id: input.postId } });
  await track("admin_post_deleted", { postId: input.postId }, admin.id);
  revalidateAdmin();
  return { ok: true };
}

// ---------------------------------------------------------------- system

export async function adminSetSettingAction(input: { key: string; value: string }): Promise<Result> {
  const admin = await requireAdmin();
  const key = input.key.trim();
  if (!key) return { ok: false, error: "Setting key is required." };

  await prisma.setting.upsert({
    where: { key },
    create: { key, value: parseSettingValue(input.value) },
    update: { value: parseSettingValue(input.value) },
  });
  await track("admin_setting_update", { key }, admin.id);
  invalidateAdminStats();
  revalidatePath("/admin/system");
  return { ok: true };
}

export async function adminDeleteSettingAction(input: { key: string }): Promise<Result> {
  const admin = await requireAdmin();
  await prisma.setting.deleteMany({ where: { key: input.key } });
  await track("admin_setting_delete", { key: input.key }, admin.id);
  invalidateAdminStats();
  revalidatePath("/admin/system");
  return { ok: true };
}

// ---------------------------------------------------------------- helpers

/** Setting values are stored as JSON - parse structured input, fall back to a plain string. */
function parseSettingValue(raw: string): Prisma.InputJsonValue {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  if (/^[[{]/.test(trimmed)) {
    try {
      return JSON.parse(trimmed) as Prisma.InputJsonValue;
    } catch {
      return raw;
    }
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return raw;
}

export async function requireAdminForPage() {
  return requireAdmin();
}

export async function adminActorId() {
  return readSessionUserId();
}
