import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { getPost } from "@/lib/blog";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found", robots: { index: false } };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4" /> All posts
      </Link>
      <header>
        <div className="flex items-center gap-3 text-xs text-muted mb-3">
          <Badge tone="green">{post.tag}</Badge>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {post.readMins} min
          </span>
          <span>
            {new Date(post.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{post.title}</h1>
        <p className="text-lg text-muted mt-3">{post.excerpt}</p>
      </header>
      <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-fg/90">
        {post.body.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
