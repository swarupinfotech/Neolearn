import type { Metadata } from "next";
import Link from "next/link";
import { VerifyEmailButton } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Verify email | NeoLearn" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      <h1 className="text-2xl font-bold mb-1">Verify your email</h1>
      <p className="text-sm text-muted mb-6">
        Confirm it&apos;s really you to secure your account and enable password resets.
      </p>
      {token ? (
        <VerifyEmailButton token={token} />
      ) : (
        <p className="text-sm text-rose-600" role="alert">
          Missing verification token.
        </p>
      )}
      <p className="mt-5 text-sm text-muted text-center">
        <Link href="/dashboard" className="text-primary font-medium hover:underline">
          Go to dashboard
        </Link>
      </p>
    </>
  );
}