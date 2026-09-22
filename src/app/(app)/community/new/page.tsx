import type { Metadata } from "next";
import { requireUser } from "@/services/auth";
import { PostComposer } from "@/components/community/post-composer";

export const metadata: Metadata = { title: "New post | NeoLearn" };

export default async function NewPostPage() {
  await requireUser();
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">New post</h1>
      <PostComposer />
    </div>
  );
}