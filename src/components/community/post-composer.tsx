"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/form";

export function PostComposer() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3 || body.trim().length < 10) {
      toast.error("Title (min 3 chars) and body (min 10 chars) required.");
      return;
    }
    startTransition(() => {
      import("@/actions/community")
        .then((m) =>
          m.createPostAction({
            title,
            body,
            tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
          })
        )
        .then((res) => {
          if (res.ok && res.postId) {
            toast.success("Post published!");
            router.push(`/community/${res.postId}`);
          } else {
            toast.error(res.error ?? "Could not create post.");
          }
        });
    });
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's on your mind?" maxLength={120} />
      </div>
      <div>
        <Label htmlFor="body">Body</Label>
        <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe your question, share a tip, or show off a project…" />
      </div>
      <div>
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="python, functions, loops" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Publishing…" : "Publish post"}
        </Button>
      </div>
    </form>
  );
}