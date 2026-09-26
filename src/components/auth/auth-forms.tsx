"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import {
  loginAction,
  signupAction,
  forgotPasswordAction,
  resetPasswordAction,
  verifyEmailAction,
} from "@/actions/auth";

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.ceil(mins / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [lockedFor, setLockedFor] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Count the wait down locally so the form disables itself without
  // another round trip. The server enforces the limit regardless.
  useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setTimeout(() => setLockedFor((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [lockedFor]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = Object.fromEntries(data.entries());
    setError(null);
    startTransition(() => {
      loginAction(payload).then((res) => {
        if (res.ok) {
          toast.success("Welcome back!");
          router.replace("/dashboard");
        } else {
          setError(res.error ?? "Login failed.");
          if (res.retryAfterSec) setLockedFor(res.retryAfterSec);
        }
      });
    });
  }

  const locked = lockedFor > 0;

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Email or username" htmlFor="identifier">
        <Input id="identifier" name="identifier" autoComplete="username" required disabled={locked} />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={locked}
        />
      </Field>
      {error ? (
        <p className="text-sm text-rose-600 mb-4" role="alert">
          {error}
          {locked ? ` Try again in ${formatWait(lockedFor)}.` : ""}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending || locked}>
        {isPending ? "Signing in…" : locked ? `Locked (${lockedFor}s)` : "Log in"}
      </Button>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const payload = {
      email: String(data.get("email") ?? ""),
      username: String(data.get("username") ?? ""),
      displayName: String(data.get("displayName") ?? ""),
      password,
    };
    setError(null);
    startTransition(() => {
      signupAction(payload).then((res) => {
        if (res.ok) {
          toast.success("Account created!");
          router.replace("/dashboard");
        } else {
          setError(res.error ?? "Signup failed.");
        }
      });
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Username" htmlFor="username" hint="Used in your public profile URL.">
        <Input id="username" name="username" autoComplete="username" required minLength={3} maxLength={20} />
      </Field>
      <Field label="Display name" htmlFor="displayName">
        <Input id="displayName" name="displayName" autoComplete="nickname" required />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      {error ? <p className="text-sm text-rose-600 mb-4" role="alert">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    startTransition(() => {
      forgotPasswordAction(Object.fromEntries(data.entries())).then((res) => {
        if (res.ok) {
          setSent(true);
        } else {
          setError(res.error ?? "Could not request reset.");
        }
      });
    });
  }

  if (sent) {
    return (
      <p className="text-sm text-muted">
        If an account exists for that email, we&apos;ve sent a reset link. Check your inbox (and spam
        folder). In dev mode the link is printed to the server console.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      {error ? <p className="text-sm text-rose-600 mb-4" role="alert">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    startTransition(() => {
      resetPasswordAction({ token, password }).then((res) => {
        if (res.ok) {
          toast.success("Password updated. Log in with your new password.");
          router.replace("/login");
        } else {
          setError(res.error ?? "Reset failed.");
        }
      });
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label="New password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      {error ? <p className="text-sm text-rose-600 mb-4" role="alert">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

export function VerifyEmailButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function verify() {
    setError(null);
    startTransition(() => {
      verifyEmailAction(token).then((res) => {
        if (res.ok) {
          setDone(true);
          toast.success("Email verified!");
        } else {
          setError(res.error ?? "Verification failed.");
        }
      });
    });
  }

  if (done) {
    return <p className="text-sm text-primary font-medium">Email verified. You&apos;re all set!</p>;
  }
  return (
    <>
      <Button onClick={verify} disabled={isPending}>
        {isPending ? "Verifying…" : "Verify email"}
      </Button>
      {error ? <p className="text-sm text-rose-600 mt-3" role="alert">{error}</p> : null}
    </>
  );
}