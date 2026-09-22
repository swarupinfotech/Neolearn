import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "NeoLearn — Learn. Code. Practice. Build.",
    template: "%s | NeoLearn",
  },
  description:
    "NeoLearn is a gamified coding learning platform: interactive lessons, quizzes, coding challenges, projects, XP, streaks and certificates. Learn. Code. Practice. Build.",
  keywords: ["learn to code", "coding courses", "python", "javascript", "sql", "programming"],
  openGraph: {
    type: "website",
    siteName: "NeoLearn",
    title: "NeoLearn — Learn. Code. Practice. Build.",
    description: "Interactive lessons, quizzes, coding challenges and real projects.",
  },
  twitter: { card: "summary_large_image", title: "NeoLearn", description: "Learn to code with NeoLearn." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1210" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-fg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}