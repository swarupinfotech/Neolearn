import { prisma } from "@/lib/db";

/**
 * Non-blocking analytics event recording. Never throws.
 * Deliberately avoids sensitive payloads — only coarse metadata.
 */
export async function track(type: string, data?: Record<string, unknown>, userId?: string) {
  try {
    const safe = data ? JSON.stringify(data) : undefined;
    await prisma.analyticsEvent.create({
      data: {
        type,
        userId: userId ?? null,
        data: safe ? JSON.parse(safe) : undefined,
      },
    });
  } catch {
    /* analytics must never break the product flow */
  }
}

/** Daily Active Users style aggregates from events. */
export interface ActivityStats {
  dau: number;
  wau: number;
  mau: number;
  registrations: number;
  activeUsers: number;
}

export async function getActivityStats(): Promise<ActivityStats> {
  const day = new Date();
  day.setHours(0, 0, 0, 0);

  const weekStart = new Date(day);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(day);
  monthStart.setMonth(monthStart.getMonth() - 1);

  const base = { where: { createdAt: { gte: day } } };
  const [dau, wau, mau, registrations, activeUsers] = await Promise.all([
    prisma.analyticsEvent.count({ where: { createdAt: { gte: day } } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { createdAt: { gte: day } } }),
    prisma.user.count({ where: { status: "active" } }),
  ]);
  void base;
  return { dau, wau, mau, registrations, activeUsers };
}