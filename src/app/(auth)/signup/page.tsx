import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/services/auth";
import { SignupForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account | NeoLearn" };

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <h1 className="text-2xl font-bold mb-1">Create your account</h1>
      <p className="text-sm text-muted mb-6">Start earning XP right away — it&apos;s free.</p>
      <SignupForm />
      <p className="mt-5 text-sm text-muted text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}