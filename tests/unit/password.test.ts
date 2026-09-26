import { describe, it, expect } from "vitest";
import { fakeVerify, hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies the correct password", async () => {
    const hash = await hashPassword("Kangaroo99");
    expect(hash).not.toBe("Kangaroo99");
    expect(await verifyPassword("Kangaroo99", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("Kangaroo99");
    expect(await verifyPassword("Platypus42", hash)).toBe(false);
  });

  it("avoids collisions between users", async () => {
    const a = await hashPassword("S3cretOne");
    const b = await hashPassword("S3cretTwo");
    expect(a).not.toBe(b);
  });
});

describe("login timing equalisation", () => {
  // fakeVerify stands in for a real comparison when the account does not
  // exist. If it did not take comparable time, response timing would tell
  // an attacker which addresses are registered.
  it("takes roughly as long as a real comparison", async () => {
    const hash = await hashPassword("Kangaroo99");
    await verifyPassword("warmup", hash); // exclude first-call JIT cost

    const samples = 3;
    let realTotal = 0;
    let decoyTotal = 0;
    for (let i = 0; i < samples; i += 1) {
      let t = Date.now();
      await verifyPassword(`wrong-${i}`, hash);
      realTotal += Date.now() - t;

      t = Date.now();
      await fakeVerify(`wrong-${i}`);
      decoyTotal += Date.now() - t;
    }

    const real = realTotal / samples;
    const decoy = decoyTotal / samples;
    // bcrypt jitter is real, so this is a loose band rather than equality.
    expect(Math.abs(real - decoy)).toBeLessThan(Math.max(real, decoy) * 0.5);
  });

  it("never resolves true, since there is no account behind it", async () => {
    await expect(fakeVerify("anything")).resolves.toBeUndefined();
  });
});