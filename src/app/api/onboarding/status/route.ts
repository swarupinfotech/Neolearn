import { NextResponse } from "next/server";
import { readSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const userId = await readSessionUserId();
  if (!userId) return NextResponse.json({ completed: true, authorized: false }, { status: 401 });
  const onboarding = await prisma.onboarding.findUnique({ where: { userId } });
  return NextResponse.json({ completed: Boolean(onboarding), authorized: true });
}