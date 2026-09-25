import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  createSessionToken,
  destroySessionCookies,
  readSessionUserId,
  isSecure,
} from "@/lib/session";
import { generateRawToken, hashToken } from "@/lib/tokens";
import { track } from "@/lib/events";
import { CSRF_COOKIE, SESSION_COOKIE, STRICT_RATE_LIMITS } from "@/lib/constants";
import { rateLimit, actorKey } from "@/lib/rate-limit";
import {
  registerInput,
  loginInput,
  forgotInput,
  resetInput,
} from "@/lib/validation";

type Action = { ok: boolean; error?: string; code?: string };

export { readSessionUserId };

/** Public-facing safe user shape. */
export type SafeUser = Pick<
  User,
  | "id"
  | "username"
  | "displayName"
  | "avatarUrl"
  | "email"
  | "bio"
  | "role"
  | "isPremium"
  | "xp"
  | "level"
  | "createdAt"
>;

export function toSafeUser(u: User): SafeUser {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    email: u.email,
    bio: u.bio,
    role: u.role,
    isPremium: u.isPremium,
    xp: u.xp,
    level: u.level,
    createdAt: u.createdAt,
  };
}

export async function setSession(userId: string) {
  const token = await createSessionToken(userId);
  const csrf = generateRawToken(16);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  store.set(CSRF_COOKIE, csrf, {
    httpOnly: false,
    secure: isSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function getIp(): Promise<string> {
  const headers = await import("next/headers");
  try {
    const h = await headers.headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  } catch {
    return "local";
  }
}

export async function signup(input: unknown): Promise<Action & { user?: SafeUser }> {
  const parsed = registerInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, password, username, displayName } = parsed.data;

  const rl = await rateLimit(actorKey("register", await getIp()), STRICT_RATE_LIMITS.register);
  if (!rl.ok) return { ok: false, error: "Too many signups. Try again later." };

  const [emailExists, usernameExists] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { username } }),
  ]);
  if (emailExists) return { ok: false, error: "An account with this email already exists." };
  if (usernameExists) return { ok: false, error: "That username is taken." };

  const passwordHash = await hashPassword(password);
  const bootstrap = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
  const firstUser = (await prisma.user.count()) === 0;

  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName,
      passwordHash,
      role: firstUser || (bootstrap && email === bootstrap) ? "ADMIN" : "USER",
      streak: { create: {} },
    },
  });

  await setSession(user.id);
  await track("register", { role: user.role }, user.id);
  void sendVerificationEmail(user.id);
  return { ok: true, user: toSafeUser(user) };
}

export async function verifyEmail(token: string): Promise<Action> {
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.purpose !== "email_verification") return { ok: false, error: "Invalid token" };
  if (record.usedAt) return { ok: false, error: "Token already used" };
  if (record.expiresAt < new Date()) return { ok: false, error: "Token expired" };

  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
  ]);
  return { ok: true };
}

export async function requestEmailVerification(userId: string): Promise<Action> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found" };
  await sendVerificationEmail(user.id);
  return { ok: true };
}

async function sendVerificationEmail(userId: string) {
  const raw = generateRawToken();
  await prisma.verificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      purpose: "email_verification",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (process.env.SMTP_HOST) {
    try {
      const { sendMail } = await import("@/lib/email");
      await sendMail({
        to: (await prisma.user.findUnique({ where: { id: userId } }))?.email ?? "",
        subject: "Verify your email",
        html: `<p>Click <a href="${base}/verify-email?token=${raw}">here</a> to verify your email.</p>`,
      });
    } catch {
      console.warn(`[email] verification link: ${base}/verify-email?token=${raw}`);
    }
  } else {
    console.warn(`[email] dev mode — verification link: ${base}/verify-email?token=${raw}`);
  }
}

export async function login(input: unknown, ip?: string): Promise<Action & { user?: SafeUser }> {
  const parsed = loginInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email/username and password." };

  const rl = await rateLimit(actorKey("login", ip ?? (await getIp())), STRICT_RATE_LIMITS.login);
  if (!rl.ok) return { ok: false, error: "Too many attempts. Try again later." };

  const { identifier, password } = parsed.data;
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: "Invalid credentials." };
  }
  if (user.status === "suspended") return { ok: false, error: "This account is suspended." };

  await setSession(user.id);
  await track("login", undefined, user.id);
  return { ok: true, user: toSafeUser(user) };
}

export async function logout(): Promise<Action> {
  await destroySessionCookies();
  return { ok: true };
}

export async function requestPasswordReset(email: string): Promise<Action> {
  const parsed = forgotInput.safeParse({ email });
  if (!parsed.success) return { ok: false, error: "Invalid email." };
  const rl = await rateLimit(actorKey("forgot", await getIp()), STRICT_RATE_LIMITS.forgot);
  if (!rl.ok) return { ok: false, error: "Too many requests. Try again later." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const raw = generateRawToken();
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw),
        purpose: "password_reset",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    if (process.env.SMTP_HOST) {
      try {
        const { sendMail } = await import("@/lib/email");
        await sendMail({
          to: user.email,
          subject: "Reset your password",
          html: `<p>Click <a href="${base}/reset-password?token=${raw}">here</a> to reset your password.</p>`,
        });
      } catch {
        console.warn(`[email] reset link for ${user.email}: ${base}/reset-password?token=${raw}`);
      }
    } else {
      console.warn(`[email] dev mode — reset link for ${user.email}: ${base}/reset-password?token=${raw}`);
    }
  }
  // Always return ok to avoid user enumeration.
  return { ok: true };
}

export async function resetPassword(token: string, password: string): Promise<Action> {
  const parsed = resetInput.safeParse({ token, password });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const rl = await rateLimit(actorKey("reset", await getIp()), STRICT_RATE_LIMITS.reset);
  if (!rl.ok) return { ok: false, error: "Too many requests. Try again later." };

  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.purpose !== "password_reset") return { ok: false, error: "Invalid token" };
  if (record.usedAt) return { ok: false, error: "Token already used" };
  if (record.expiresAt < new Date()) return { ok: false, error: "Token expired" };

  const hash = await hashPassword(parsed.data.password);
  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: hash } }),
  ]);
  return { ok: true };
}

/** Current signed-in user loaded fresh from DB, or null. */
export async function getSessionUser(): Promise<User | null> {
  const id = await readSessionUserId();
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.status !== "active") return null;
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export function isAdminLike(role: string | undefined) {
  return role === "ADMIN" || role === "MODERATOR";
}