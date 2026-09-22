"use server";

import { revalidatePath } from "next/cache";
import {
  login,
  logout,
  resetPassword,
  requestPasswordReset,
  signup,
  verifyEmail,
} from "@/services/auth";

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export async function loginAction(input: unknown): Promise<AuthResult> {
  const res = await login(input);
  if (res.ok) {
    revalidatePath("/", "layout");
  }
  return { ok: res.ok, error: res.error };
}

export async function signupAction(input: unknown): Promise<AuthResult> {
  const res = await signup(input);
  if (res.ok) {
    revalidatePath("/", "layout");
  }
  return { ok: res.ok, error: res.error };
}

export async function logoutAction(): Promise<AuthResult> {
  const res = await logout();
  revalidatePath("/", "layout");
  return { ok: res.ok, error: res.error };
}

export async function forgotPasswordAction(input: unknown): Promise<AuthResult> {
  const email = (input as { email?: string })?.email;
  if (!email) return { ok: false, error: "Email is required." };
  const res = await requestPasswordReset(email);
  return { ok: res.ok, error: res.error };
}

export async function resetPasswordAction(input: unknown): Promise<AuthResult> {
  const { token, password } = (input as { token?: string; password?: string }) ?? {};
  if (!token || !password) return { ok: false, error: "Token and password are required." };
  const res = await resetPassword(token, password);
  return { ok: res.ok, error: res.error };
}

export async function verifyEmailAction(token: string): Promise<AuthResult> {
  const res = await verifyEmail(token);
  return { ok: res.ok, error: res.error };
}