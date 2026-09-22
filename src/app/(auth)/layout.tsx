import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white dark:text-[#052e16]">
              CL
            </span>
            NeoLearn
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="card p-6 sm:p-8">{children}</div>
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-muted">
        NeoLearn — interactive coding, real sandboxes, verifiable certificates.
      </footer>
    </div>
  );
}