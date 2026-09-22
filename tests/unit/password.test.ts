import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

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