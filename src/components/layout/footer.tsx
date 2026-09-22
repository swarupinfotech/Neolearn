import Link from "next/link";
import { Code2, Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  const cols = [
    {
      title: "Learn",
      links: [
        { label: "All Courses", href: "/courses" },
        { label: "Learning Paths", href: "/paths" },
        { label: "Challenges", href: "/challenges" },
        { label: "Playground", href: "/playground" },
        { label: "Daily Mission", href: "/daily" },
      ],
    },
    {
      title: "Community",
      links: [
        { label: "Community", href: "/community" },
        { label: "Leaderboard", href: "/leaderboard" },
        { label: "Achievements", href: "/achievements" },
        { label: "Blog", href: "/blog" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Pricing", href: "/pricing" },
        { label: "Projects", href: "/projects" },
        { label: "Certificates", href: "/certificates" },
      ],
    },
    {
      title: "Account",
      links: [
        { label: "Login", href: "/login" },
        { label: "Sign Up", href: "/signup" },
        { label: "Forgot Password", href: "/forgot-password" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-surface mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white dark:text-[#052e16]">
                <Code2 className="h-5 w-5" />
              </span>
              NeoLearn
            </Link>
            <p className="text-sm text-muted mt-3 max-w-xs">
              Learn to code with interactive lessons, real challenges and projects. Earn XP, level
              up and earn verifiable certificates.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="https://github.com" aria-label="GitHub" className="text-muted hover:text-primary">
                <Github className="h-4 w-4" />
              </a>
              <a href="https://twitter.com" aria-label="Twitter" className="text-muted hover:text-primary">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://linkedin.com" aria-label="LinkedIn" className="text-muted hover:text-primary">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted hover:text-primary">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <p>© {new Date().getFullYear()} NeoLearn. An original open learning project.</p>
          <p>Built with Next.js, TypeScript & Tailwind CSS.</p>
        </div>
      </div>
    </footer>
  );
}