import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readSessionUserId } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Salt keeps ip hashes non-reversible across the dataset. */
const HASH_SALT = process.env.AUTH_SECRET ?? "neolearn-analytics-fallback-salt";

const BOTS = /bot|crawl|spider|slurp|bingpreview|headless|curl|wget|python-requests|axios|okhttp|go-http/i;

function parseUa(ua: string) {
  const browser =
    /edg\//i.test(ua) ? "Edge"
    : /chrome|crios/i.test(ua) ? "Chrome"
    : /firefox|fxios/i.test(ua) ? "Firefox"
    : /safari/i.test(ua) ? "Safari"
    : "Other";

  const os =
    /windows/i.test(ua) ? "Windows"
    : /android/i.test(ua) ? "Android"
    : /iphone|ipad|ios/i.test(ua) ? "iOS"
    : /mac os/i.test(ua) ? "macOS"
    : /linux/i.test(ua) ? "Linux"
    : "Other";

  const isBot = BOTS.test(ua);
  const mobile = /mobile|android|iphone|ipad/i.test(ua);
  const tablet = /ipad|tablet/i.test(ua);
  const device = isBot ? "bot" : tablet ? "tablet" : mobile ? "mobile" : "desktop";

  return { browser, os, device, isBot };
}

function bucketSource(referrer: string | null) {
  if (!referrer) return "direct";
  let host = "";
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "other";
  }
  if (!host) return "direct";
  if (/google|bing|duckduckgo|baidu|yahoo|ecosia|yandex/.test(host)) return "search";
  if (/facebook|instagram|whatsapp|t\.me|telegram|linkedin|x\.com|twitter|reddit|threads/.test(host)) return "social";
  if (/github|gitlab|stackoverflow|dev\.to|hashnode|medium/.test(host)) return "dev";
  if (/youtube|twitch|vimeo/.test(host)) return "video";
  if (host === "localhost" || /127\.0\.0\.1/.test(host)) return "local";
  return host;
}

/** Collapse dynamic ids so /courses/<slug> groups instead of exploding rows. */
function normalisePath(path: string) {
  if (!path || path.length > 300) return "/";
  const clean = path.split("?")[0] ?? "/";
  return clean
    .replace(/\/courses\/[a-z0-9-]+/i, "/courses/:slug")
    .replace(/\/learn\/[a-z0-9]+/i, "/learn/:id")
    .replace(/\/quiz\/[a-z0-9-]+/i, "/quiz/:id")
    .replace(/\/challenges\/[a-z0-9-]+/i, "/challenges/:slug")
    .replace(/\/paths\/[a-z0-9-]+/i, "/paths/:slug")
    .replace(/\/community\/[a-z0-9-]+/i, "/community/:id")
    .replace(/\/verify\/[a-z0-9-]+/i, "/verify/:code")
    .replace(/\/profile\/[a-z0-9-]+/i, "/profile/:username");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { path?: string; referrer?: string } | null;
    if (!body?.path) return NextResponse.json({ ok: false }, { status: 400 });

    const ua = req.headers.get("user-agent") ?? "";
    const { browser, os, device, isBot } = parseUa(ua);
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    const country =
      req.headers.get("x-vercel-ip-country") ??
      req.headers.get("cf-ipcountry") ??
      null;

    const userId = await readSessionUserId().catch(() => null);
    const sessionId = req.cookies.get(SESSION_COOKIE)?.value?.slice(0, 24) ?? null;

    await prisma.pageView.create({
      data: {
        path: normalisePath(body.path),
        userId: userId ?? null,
        sessionId,
        referrer: body.referrer?.slice(0, 500) ?? null,
        source: bucketSource(body.referrer ?? null),
        device,
        browser: isBot ? null : browser,
        os: isBot ? null : os,
        country: country?.slice(0, 2) ?? null,
        ipHash: ip ? createHash("sha256").update(HASH_SALT + ip).digest("hex").slice(0, 32) : null,
        userAgent: ua.slice(0, 500),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Analytics must never surface as a product error.
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
