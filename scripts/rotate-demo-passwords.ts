// Rotates the passwords of the seeded demo accounts in the live database.
//
// The demo accounts are documented in the README, so their old passwords
// are public knowledge. This resets them to fresh random values and prints
// the new ones, which is the only way to recover them afterwards.
//
// Run with: npx tsx scripts/rotate-demo-passwords.ts
//
// The generated values are not written to disk or logged anywhere except
// this command's stdout.
import { randomBytes, randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

// Matches DEMO_USERS in prisma/seed.ts.
const DEMO_EMAILS = [
  "admin@neolearn.dev",
  "demo@neolearn.dev",
  "sara@neolearn.dev",
  "dev@neolearn.dev",
];

/** Ambiguous characters (0/O, 1/l/I) are left out so it can be read aloud. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

function generatePassword(length = 24): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    if (i < 4) {
      // Guarantee the first four characters span all four classes.
      const pools = [
        "ABCDEFGHJKLMNPQRSTUVWXYZ",
        "abcdefghijkmnopqrstuvwxyz",
        "23456789",
        "!@#$%^&*",
      ];
      out += pools[i][randomInt(pools[i].length)];
    } else {
      out += ALPHABET[bytes[i] % ALPHABET.length];
    }
  }
  return out;
}

async function main() {
  const rotated: Array<{ email: string; password: string }> = [];

  for (const email of DEMO_EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`skip  ${email} (not present)`);
      continue;
    }
    const password = generatePassword();
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
    // Existing sessions stay valid, which is intentional: rotating a
    // password should not sign the demo users out mid-demo.
    rotated.push({ email, password });
    console.log(`ok    ${email} (${user.role})`);
  }

  console.log("\n--- new passwords (shown once) ---");
  for (const r of rotated) console.log(`${r.email}\t${r.password}`);
  console.log("\nCopy these somewhere safe now; they are not stored anywhere.");
}

main()
  .catch((e) => {
    console.error("rotation failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
