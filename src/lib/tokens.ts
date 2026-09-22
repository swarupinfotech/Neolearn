import crypto from "node:crypto";

/** Hash a raw security token so plaintext tokens are never stored. */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateRawToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/** Constant-time comparison helper. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(String(a ?? ""));
  const bb = Buffer.from(String(b ?? ""));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}