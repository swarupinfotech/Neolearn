import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset password | NeoLearn" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold mb-1">Reset your password</h1>
      <p className="text-sm text-muted mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <ForgotPasswordForm />
      <p className="mt-5 text-sm text-muted text-center">
        <Link href="/login" className="text-primary font-medium hover:underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}