import type { User } from "@prisma/client";

export function isPremiumUser(user: Pick<User, "isPremium">): boolean {
  return user.isPremium ?? false;
}

export function premiumGate(user: Pick<User, "isPremium">): { allowed: boolean; premium: boolean } {
  const premium = isPremiumUser(user);
  return { allowed: premium, premium };
}