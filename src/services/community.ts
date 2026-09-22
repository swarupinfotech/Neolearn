import { prisma } from "@/lib/db";
import { notify } from "@/services/notifications";
import { track } from "@/lib/events";
import type { Prisma } from "@prisma/client";

export interface FeedPost {
  id: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  courseId: string | null;
  lessonId: string | null;
  likes: number;
  answerCount: number;
  status: string;
  createdAt: Date;
  author: { username: string; displayName: string; avatarUrl: string | null };
}

type FeedPostRow = Prisma.CommunityPostGetPayload<{
  include: { user: { select: { username: true; displayName: true; avatarUrl: true } } };
}>;

function mapPost(p: FeedPostRow): FeedPost {
  return {
    id: p.id,
    authorId: p.authorId,
    title: p.title,
    body: p.body,
    tags: (p.tags as unknown as string[]) ?? [],
    courseId: p.courseId,
    lessonId: p.lessonId,
    likes: p.likes,
    answerCount: p.answerCount,
    status: p.status,
    createdAt: p.createdAt,
    author: p.user ? { username: p.user.username, displayName: p.user.displayName, avatarUrl: p.user.avatarUrl } : { username: "deleted", displayName: "[deleted]", avatarUrl: null },
  };
}

export async function listFeed(take = 30, skip = 0, courseId?: string) {
  const posts = await prisma.communityPost.findMany({
    where: { status: "OPEN", ...(courseId ? { courseId } : {}) },
    include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });
  return posts.map(mapPost);
}

export async function getPost(postId: string) {
  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
  });
  return post ? mapPost(post) : null;
}

export async function getPostWithComments(postId: string, userId: string) {
  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
  });
  if (!post) return null;
  const mapped = mapPost(post);

  const comments = await prisma.comment.findMany({
    where: { postId },
    include: {
      user: { select: { username: true, displayName: true, avatarUrl: true } },
      children: {
        include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      likesRef: { where: { userId }, select: { id: true } },
    },
    orderBy: [{ isAnswer: "desc" }, { createdAt: "asc" }],
  });

  return {
    post: mapped,
    comments,
    userLikedPost: (await prisma.like.count({ where: { userId, targetType: "POST", postId } })) > 0,
  };
}

export async function createPost(userId: string, data: { title: string; body: string; tags: string[]; courseId?: string; lessonId?: string }) {
  const post = await prisma.communityPost.create({
    data: {
      authorId: userId,
      title: data.title,
      body: data.body,
      tags: data.tags,
      courseId: data.courseId,
      lessonId: data.lessonId,
    },
  });
  await track("community_post", { postId: post.id }, userId);
  return post;
}

export async function addComment(
  userId: string,
  data: { postId: string; parentId?: string; body: string; isAnswer?: boolean }
) {
  const post = await prisma.communityPost.findUnique({ where: { id: data.postId } });
  if (!post) return { ok: false, error: "Post not found." };

  const isAnswer = boolean(data.isAnswer) && data.parentId == null && post.authorId !== userId;
  const comment = await prisma.comment.create({
    data: {
      postId: data.postId,
      parentId: data.parentId ?? null,
      authorId: userId,
      body: data.body,
      isAnswer,
    },
  });

  const [deltaTarget, recipientId] = isAnswer
    ? [prisma.communityPost.update({ where: { id: data.postId }, data: { answerCount: { increment: 1 } } }), post.authorId]
    : [undefined, undefined];

  void deltaTarget;
  if (recipientId && recipientId !== userId) {
    await notify({
      userId: recipientId,
      type: "community",
      title: "Marked as answer",
      body: "One of your posts got an accepted answer.",
      link: `/community/${data.postId}`,
    });
  }

  if (!isAnswer && post.authorId !== userId) {
    await notify({
      userId: post.authorId,
      type: "community",
      title: "New comment on your post",
      body: post.title.slice(0, 80),
      link: `/community/${data.postId}`,
    });
  }
  if (!isAnswer && data.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: data.parentId }, select: { authorId: true } });
    if (parent && parent.authorId !== userId) {
      await notify({
        userId: parent.authorId,
        type: "community",
        title: "New reply to your comment",
        body: post.title.slice(0, 80),
        link: `/community/${data.postId}#comment-${data.parentId}`,
      });
    }
  }

  return { ok: true, commentId: comment.id, isAnswer };
}

export async function toggleLike(userId: string, targetType: "POST" | "COMMENT", postId?: string, commentId?: string) {
  const existing = await prisma.like.findFirst({
    where: {
      userId,
      targetType,
      postId: postId ?? null,
      commentId: commentId ?? null,
    },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    if (targetType === "POST" && postId) {
      await prisma.communityPost.update({ where: { id: postId }, data: { likes: { decrement: 1 } } });
    } else if (commentId) {
      await prisma.comment.update({ where: { id: commentId }, data: { likes: { decrement: 1 } } });
    }
    return { liked: false };
  }

  await prisma.like.create({
    data: { userId, targetType, postId: postId ?? null, commentId: commentId ?? null },
  });
  if (targetType === "POST" && postId) {
    await prisma.communityPost.update({ where: { id: postId }, data: { likes: { increment: 1 } } });
  } else if (commentId) {
    await prisma.comment.update({ where: { id: commentId }, data: { likes: { increment: 1 } } });
  }
  return { liked: true };
}

export async function createReport(
  userId: string,
  data: { targetType: "post" | "comment"; targetId: string; reason: string }
) {
  return prisma.communityReport.create({
    data: {
      reporterId: userId,
      targetType: data.targetType.toUpperCase(),
      targetId: data.targetId,
      reason: data.reason,
    },
  });
}

function boolean(v: unknown): boolean {
  return v === true || v === "true";
}