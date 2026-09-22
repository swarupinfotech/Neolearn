import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/services/auth";
import { getPostWithComments } from "@/services/community";
import { PostDiscussion } from "@/components/community/post-discussion";
import { EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Community post | NeoLearn" };

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = await getPostWithComments(id, user.id);
  if (!data) notFound();
  const { post, comments, userLikedPost } = data;
  const tags = (post.tags as unknown as string[]) ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <article className="card p-6">
        <div className="flex items-center gap-2 text-sm text-muted mb-3">
          <Link href={`/profile/${post.author.username}`} className="flex items-center gap-2 group">
            <Avatar name={post.author.displayName} src={post.author.avatarUrl} size={32} />
            <span className="font-medium text-fg group-hover:text-primary transition-colors">{post.author.displayName}</span>
            <span>@{post.author.username}</span>
          </Link>
          <span>· {timeAgo(post.createdAt)}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold mb-2">{post.title}</h1>
        <p className="text-fg/90 whitespace-pre-wrap leading-relaxed">{post.body}</p>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {tags.map((t) => (
              <Badge key={t} tone="neutral">{t}</Badge>
            ))}
          </div>
        ) : null}
      </article>

      <PostDiscussion
        postId={post.id}
        postAuthorId={post.authorId}
        currentUserId={user.id}
        initialLikes={post.likes}
        userLikedPost={userLikedPost}
        initialComments={comments.map((c) => ({
          id: c.id,
          authorName: c.user.displayName,
          authorUsername: c.user.username,
          avatarUrl: c.user.avatarUrl,
          body: c.body,
          isAnswer: c.isAnswer,
          likes: c.likes,
          createdAt: c.createdAt.toISOString(),
          userLiked: c.likesRef.length > 0,
          children: c.children.map((k) => ({
            id: k.id,
            authorName: k.user.displayName,
            authorUsername: k.user.username,
            avatarUrl: k.user.avatarUrl,
            body: k.body,
            isAnswer: false,
            likes: k.likes,
            createdAt: k.createdAt.toISOString(),
            userLiked: false,
          })),
        }))}
      />

      {comments.length === 0 ? (
        <EmptyState title="No comments yet" description="Start the discussion." />
      ) : null}
    </div>
  );
}