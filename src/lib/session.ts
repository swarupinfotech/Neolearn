import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/constants";

const encoder = new TextEncoder();
const secret = () => encoder.encode(process.env.AUTH_SECRET ?? "insecure-dev-secret");

export interface SessionPayload extends JWTPayload {
  sub: string;
  role?: string;
}

export function isSecure() {
  return process.env.NODE_ENV === "production";
}

export async function createSessionToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function readSessionUserId(): Promise<string | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const payload = await verifySessionToken(token);
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

export async function destroySessionCookies() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete("cl_csrf");
}