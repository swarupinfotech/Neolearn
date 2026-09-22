import { cookies } from "next/headers";
import { CSRF_COOKIE } from "@/lib/constants";
import { safeEqual } from "@/lib/tokens";

export async function getCsrfCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(CSRF_COOKIE)?.value ?? null;
}

/**
 * Double-submit CSRF check for state-changing requests.
 * Next.js server actions already enforce origin checks; this is
 * defense-in-depth for route handlers and older browsers.
 */
export async function verifyCsrf(supplied: string | undefined | null): Promise<boolean> {
  if (!supplied) return false;
  const cookie = await getCsrfCookie();
  if (!cookie) return false;
  return safeEqual(supplied, cookie);
}

export async function isSafeStateChange(request: Request): Promise<boolean> {
  const header = request.headers.get("x-csrf") ?? "";
  return verifyCsrf(header);
}