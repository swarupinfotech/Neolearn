import { prisma } from "@/lib/db";

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Simple sliding-window rate limiter backed by the database.
 * Keys must include a stable actor + action identity (e.g. ip:login).
 */
export async function rateLimit(
  key: string,
  opts: { limit: number; windowSec: number }
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - opts.windowSec * 1000);

  const row = await prisma.rateLimit.findUnique({ where: { key } });
  if (!row) {
    await prisma.rateLimit.create({ data: { key, count: 1, windowStart: now } });
    return { ok: true, limit: opts.limit, remaining: opts.limit - 1, retryAfterSec: 0 };
  }

  if (row.windowStart < windowStart) {
    await prisma.rateLimit.update({
      where: { key },
      data: { count: 1, windowStart: now },
    });
    return { ok: true, limit: opts.limit, remaining: opts.limit - 1, retryAfterSec: 0 };
  }

  if (row.count >= opts.limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((row.windowStart.getTime() + opts.windowSec * 1000 - now.getTime()) / 1000)
    );
    return { ok: false, limit: opts.limit, remaining: 0, retryAfterSec };
  }

  const updated = await prisma.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 }, updatedAt: new Date() },
  });
  return {
    ok: true,
    limit: opts.limit,
    remaining: Math.max(0, opts.limit - updated.count),
    retryAfterSec: 0,
  };
}

export function actorKey(action: string, id: string) {
  return `${action}:${id}`;
}