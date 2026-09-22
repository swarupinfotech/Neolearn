import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { verifyEmail, toSafeUser } from "@/services/auth";
import { hashToken } from "@/lib/tokens";
import { hashPassword, verifyPassword } from "@/lib/password";
import { freshUser } from "./helpers";

describe("email verification", () => {
  it("verifies a valid token once", async () => {
    await freshUser(async (userId) => {
      const raw = "raw-verify-token-abc123";
      await prisma.verificationToken.create({
        data: {
          userId,
          tokenHash: hashToken(raw),
          purpose: "email_verification",
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      const res = await verifyEmail(raw);
      expect(res.ok).toBe(true);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(user.emailVerified).toBeTruthy();

      // replay
      expect((await verifyEmail(raw)).ok).toBe(false);
    });
  });

  it("rejects expired tokens", async () => {
    await freshUser(async (userId) => {
      const raw = "raw-expired-token-xyz";
      await prisma.verificationToken.create({
        data: {
          userId,
          tokenHash: hashToken(raw),
          purpose: "email_verification",
          expiresAt: new Date(Date.now() - 60_000),
        },
      });
      expect((await verifyEmail(raw)).ok).toBe(false);
    });
  });

  it("rejects a token used for the wrong purpose", async () => {
    await freshUser(async (userId) => {
      const raw = "raw-reset-token-abc";
      await prisma.verificationToken.create({
        data: {
          userId,
          tokenHash: hashToken(raw),
          purpose: "password_reset",
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      expect((await verifyEmail(raw)).ok).toBe(false);
    });
  });
});

describe("auth helpers", () => {
  beforeAll(() => {
    // ensure a deterministic base for password checks
  });

  it("hashes and verifies passwords (DemoPass123! path)", async () => {
    const hash = await hashPassword("DemoPass123!");
    expect(await verifyPassword("DemoPass123!", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("shapes safe users without leaking the password hash", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "demo_user" } });
    const safe = toSafeUser(user);
    expect((safe as { passwordHash?: string }).passwordHash).toBeUndefined();
    expect(safe.username).toBe("demo_user");
    expect(typeof safe.xp).toBe("number");
  });
});