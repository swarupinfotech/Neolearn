import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { POSTS_BY_DATE } from "@/lib/blog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = {
  title: "Blog",
  description: "Articles on learning to code, career paths and platform updates.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <header className="mb-10">
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="text-muted mt-2">Learning advice, engineering deep-dives and platform news.</p>
      </header>

      <div className="space-y-5">
        {POSTS_BY_DATE.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`}>
            <Card className="card-hover mb-5">
              <div className="flex items-center gap-3 text-xs text-muted mb-2">
                <Badge tone="green">{p.tag}</Badge>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {p.readMins} min read
                </span>
                <span>
                  {new Date(p.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <h2 className="font-semibold text-lg group-hover:text-primary flex items-center gap-2">
                {p.title} <ArrowRight className="h-4 w-4" />
              </h2>
              <p className="text-sm text-muted mt-1.5">{p.excerpt}</p>
            </Card>
          </Link>
        ))}
      </div>

      {POSTS_BY_DATE.length === 0 ? <EmptyState title="No posts yet" /> : null}
    </div>
  );
}
