import { prisma } from "@/lib/db";
import { dateKey, addDays } from "@/lib/utils";

/**
 * Daily-learning streak. Server-authoritative: is computed from the
 * database last-activity date, never from the client clock.
 *
 * "Today" uses the UTC calendar day as the shared server timezone.
 */

export async function recordActivity(userId: string) {
  const today = dateKey(new Date());

  const streak = await prisma.streak.findUnique({ where: { userId } });
  if (streak && streak.lastActivityDate) {
    if (today === streak.lastActivityDate.toISOString().slice(0, 10)) {
      // Already counted today — no change (prevents refarming).
      return streak;
    }
  }

  const yesterday = dateKey(addDays(new Date(), -1));

  let current = 1;
  let longest = streak?.longest ?? 0;
  const last = streak?.lastActivityDate;
  if (last && dateKey(last) === yesterday) {
    current = (streak?.current ?? 0) + 1;
  }

  longest = Math.max(longest, current);

  const weekDates = buildWeekDates(longest, current, today);

  const updated = await prisma.streak.upsert({
    where: { userId },
    update: { current, longest, lastActivityDate: new Date(today + "T00:00:00.000Z"), weekDates },
    create: { userId, current, longest, lastActivityDate: new Date(today + "T00:00:00.000Z"), weekDates },
  });
  return updated;
}

export interface StreakView {
  current: number;
  longest: number;
  today: boolean;
  days: { date: string; active: boolean }[];
}

export async function getStreak(userId: string): Promise<StreakView> {
  const streak = await prisma.streak.findUnique({ where: { userId } });
  const today = dateKey(new Date());
  const active = new Set<string>();
  if (streak?.weekDates) {
    for (const d of Object.keys(streak.weekDates as Record<string, boolean>)) {
      if ((streak.weekDates as Record<string, boolean>)[d]) active.add(d);
    }
  }
  if (streak?.lastActivityDate && dateKey(streak.lastActivityDate) === today) {
    active.add(today);
  }
  const days: { date: string; active: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = dateKey(addDays(new Date(), -i));
    days.push({ date: d, active: active.has(d) });
  }
  return {
    current: streak?.current ?? 0,
    longest: streak?.longest ?? 0,
    today: active.has(today),
    days,
  };
}

function buildWeekDates(longest: number, current: number, today: string): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (let i = 6; i >= 0; i--) {
    map[dateKey(addDays(new Date(), -i))] = false;
  }
  // Reconstruct plausibly-active trailing days using current streak length,
  // capped at 7 so the map reflects the active window (calendar view).
  for (let i = 0; i < Math.min(current, 7); i++) {
    map[dateKey(addDays(new Date(today + "T00:00:00.000Z"), -i))] = true;
  }
  map[today] = map[today] ?? current > 0;
  return map;
}