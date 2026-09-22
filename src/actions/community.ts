"use server";

import { revalidatePath } from "next/cache";
import { readSessionUserId } from "@/lib/session";
import { postInput, commentInput, reportInput } from "@/lib/validation";
import { addComment, createPost, createReport, toggleLike } from "@/services/community";

export async function createPostAction(input: unknown): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  const parsed = postInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid post." };
  const post = await createPost(userId, parsed.data);
  revalidatePath("/community");
  return { ok: true, postId: post.id };
}

export async function commentAction(input: unknown): Promise<{ ok: boolean; commentId?: string; error?: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  const parsed = commentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid comment." };
  const res = await addComment(userId, parsed.data);
  if (!res.ok) return res;
  revalidatePath(`/community/${parsed.data.postId}`);
  return { ok: true, commentId: res.commentId };
}

export async function likeAction(input: { targetType: "POST" | "COMMENT"; postId?: string; commentId?: string }): Promise<{
  ok: boolean;
  liked?: boolean;
  error?: string;
}> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  const res = await toggleLike(userId, input.targetType, input.postId, input.commentId);
  if (input.postId) revalidatePath(`/community/${input.postId}`);
  return { ok: true, liked: res.liked };
}

export async function reportAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  const parsed = reportInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid report." };
  await createReport(userId, parsed.data);
  return { ok: true };
}