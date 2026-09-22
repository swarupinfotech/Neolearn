import { NextResponse } from "next/server";
import { getSessionUser } from "@/services/auth";
import { completeLesson } from "@/services/progress";

/** Lesson completion endpoint (server-validated). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }
  const { lessonId, ...rest } = (body as { lessonId?: string }) ?? {};
  if (!lessonId) return NextResponse.json({ ok: false, error: "Missing lessonId." }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const result = await completeLesson(user.id, lessonId, rest, ip);
  if ("error" in result && !result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  const { ok: _ok, ...payload } = result;
  return NextResponse.json({ ok: true, ...payload });
}