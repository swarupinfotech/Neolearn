import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * A valid bcrypt hash of a value nobody knows, used to spend the same
 * time as a real comparison when the account does not exist. Without it,
 * a login for an unknown email returns noticeably faster than a wrong
 * password for a real one, which lets an attacker enumerate registered
 * addresses from response timing alone.
 */
const DECOY_HASH = "$2b$12$7czXzpal1JoYzQtGjHMnge.bs3T918GnzEmb9qBxjRvSqihVe1tVa";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Burn comparable time when there is no user to compare against. */
export async function fakeVerify(plain: string): Promise<void> {
  try {
    await bcrypt.compare(plain, DECOY_HASH);
  } catch {
    // Never throws; the point is only to consume the same CPU time.
  }
}