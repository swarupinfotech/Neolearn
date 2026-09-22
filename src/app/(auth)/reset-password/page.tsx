import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Set new password | NeoLearn" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      <h1 className="text-2xl font-bold mb-1">Set a new password</h1>
      <p className="text-sm text-muted mb-6">Choose a strong password you don&apos;t use elsewhere.</p>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-rose-600" role="alert">
          Missing reset token. Use the link from your email.
        </p>
      )}
      <p className="mt-5 text-sm text-muted text-center">
        <Link href="/login" className="text-primary font-medium hover:underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}