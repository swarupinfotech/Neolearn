import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, Plus } from "lucide-react";
import { requireUser } from "@/services/auth";
import { listFeed } from "@/services/community";
import { EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Community | NeoLearn" };

export default async function CommunityPage() {
  const user = await requireUser();
  const posts = await listFeed(30);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessagesSquare className="h-6 w-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">Community</h1>
          </div>
          <p className="text-muted">Questions, tips and projects — share with fellow learners.</p>
        </div>
        <Link href="/community/new">
          <Button>
            <Plus className="h-4 w-4" /> New post
          </Button>
        </Link>
      </header>

      {posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Be the first to start a discussion."
          icon={<MessagesSquare className="h-8 w-8" />}
        />
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/community/${p.id}`} className="card p-5 block card-hover">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold leading-snug">{p.title}</h2>
                    <p className="text-sm text-muted mt-1 line-clamp-2">{p.body}</p>
                  </div>
                  {p.answerCount > 0 ? <Badge tone="green">{p.answerCount} answers</Badge> : null}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Avatar name={p.author.displayName} src={p.author.avatarUrl} size={22} />
                    <span className="font-medium text-fg">{p.author.displayName}</span>
                    <span>· {timeAgo(p.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{p.likes} likes</span>
                    {p.tags.slice(0, 3).map((t) => (
                      <Badge key={t} tone="neutral">{t}</Badge>
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}