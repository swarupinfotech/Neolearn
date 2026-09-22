import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/services/auth";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Log in | NeoLearn" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
      <p className="text-sm text-muted mb-6">Log in to continue learning.</p>
      <LoginForm />
      <p className="mt-5 text-sm text-muted text-center">
        New to NeoLearn?{" "}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-xs text-muted text-center">
        <Link href="/forgot-password" className="hover:underline">
          Forgot your password?
        </Link>
      </p>
    </>
  );
}