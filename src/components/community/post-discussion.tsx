"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Check, Flag, Heart, MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/utils";

export interface CommentNode {
  id: string;
  authorName: string;
  authorUsername: string;
  avatarUrl: string | null;
  body: string;
  isAnswer: boolean;
  likes: number;
  createdAt: string;
  userLiked: boolean;
  children: CommentChild[];
}

export interface CommentChild {
  id: string;
  authorName: string;
  authorUsername: string;
  avatarUrl: string | null;
  body: string;
  isAnswer: boolean;
  likes: number;
  createdAt: string;
  userLiked: boolean;
}

export function PostDiscussion({
  postId,
  postAuthorId,
  currentUserId,
  initialLikes,
  userLikedPost,
  initialComments,
}: {
  postId: string;
  postAuthorId: string;
  currentUserId: string;
  initialLikes: number;
  userLikedPost: boolean;
  initialComments: CommentNode[];
}) {
  const [postLiked, setPostLiked] = useState(userLikedPost);
  const [postLikes, setPostLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  function togglePostLike() {
    import("@/actions/community").then((m) => {
      m.likeAction({ targetType: "POST", postId }).then((res) => {
        if (res.ok) {
          setPostLiked(Boolean(res.liked));
          setPostLikes((n) => Math.max(0, n + (res.liked ? 1 : -1)));
        }
      });
    });
  }

  function toggleCommentLike(id: string) {
    import("@/actions/community").then((m) => {
      m.likeAction({ targetType: "COMMENT", commentId: id }).then((res) => {
        if (res.ok) {
          setComments((prev) =>
            prev.map((c) => {
              if (c.id === id) return { ...c, likes: c.likes + (res.liked ? 1 : -1), userLiked: Boolean(res.liked) };
              if (c.children.some((k) => k.id === id)) {
                return { ...c, children: c.children.map((k) => (k.id === id ? { ...k, likes: k.likes + (res.liked ? 1 : -1), userLiked: Boolean(res.liked) } : k)) };
              }
              return c;
            })
          );
        }
      });
    });
  }

  function submitComment(parentId: string | null) {
    const body = parentId ? replyDraft : draft;
    if (!body.trim()) return;
    startTransition(() => {
      import("@/actions/community").then((m) =>
        m
          .commentAction({
            postId,
            parentId: parentId ?? undefined,
            body: body.trim(),
            isAnswer: false,
          })
          .then((res) => {
            if (res.ok) {
              toast.success("Comment posted");
              setDraft("");
              setReplyDraft("");
              setReplyingTo(null);
            } else {
              toast.error(res.error ?? "Could not post comment.");
            }
          })
      );
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" variant={postLiked ? "secondary" : "ghost"} onClick={togglePostLike} disabled={isPending}>
          <Heart className={cn("h-4 w-4", postLiked && "fill-rose-500 text-rose-500")} />
          {postLikes}
        </Button>
        <FlagButton targetType="post" targetId={postId} />
      </div>

      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" /> {comments.length} comments
        </h2>

        <div className="flex gap-2 mb-4">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-sm"
            onKeyDown={(e) => e.key === "Enter" && submitComment(null)}
          />
          <Button size="sm" onClick={() => submitComment(null)} disabled={isPending || !draft.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>

        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} id={`comment-${c.id}`} className="card p-4">
              <CommentRow
                c={c}
                currentUserId={currentUserId}
                isPending={isPending}
                onLike={() => toggleCommentLike(c.id)}
                onReply={() => {
                  setReplyingTo(c.id);
                  setReplyDraft("");
                }}
              />
              {replyingTo === c.id ? (
                <div className="flex gap-2 mt-3">
                  <input
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-surface text-sm"
                    onKeyDown={(e) => e.key === "Enter" && submitComment(c.id)}
                    autoFocus
                  />
                  <Button size="sm" onClick={() => submitComment(c.id)} disabled={isPending || !replyDraft.trim()}>Reply</Button>
                </div>
              ) : null}
              {c.children.length > 0 ? (
                <ul className="mt-3 space-y-3 border-l-2 border-border pl-4">
                  {c.children.map((k) => (
                    <li key={k.id} id={`comment-${k.id}`}>
                      <CommentRow
                        c={k}
                        currentUserId={currentUserId}
                        isPending={isPending}
                        onLike={() => toggleCommentLike(k.id)}
                        onReply={() => {}}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
          {comments.length === 0 ? <p className="text-sm text-muted">No comments yet — be the first.</p> : null}
        </ul>
      </section>
    </>
  );
}

function CommentRow({
  c,
  currentUserId,
  isPending,
  onLike,
  onReply,
}: {
  c: CommentNode | CommentChild;
  currentUserId: string;
  isPending: boolean;
  onLike: () => void;
  onReply: () => void;
}) {
  return (
    <div className="flex gap-3">
      <Avatar name={c.authorName} src={c.avatarUrl} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">@{c.authorUsername}</span>
          <span className="text-xs text-muted">{timeAgo(new Date(c.createdAt))}</span>
          {c.isAnswer ? <Badge tone="green"><Check className="h-3 w-3" /> Accepted answer</Badge> : null}
        </div>
        <p className="text-sm mt-1 whitespace-pre-wrap">{c.body}</p>
        <div className="flex items-center gap-3 mt-2">
          <button onClick={onLike} disabled={isPending} className="text-xs text-muted hover:text-fg flex items-center gap-1">
            <Heart className={cn("h-3.5 w-3.5", c.userLiked && "fill-rose-500 text-rose-500")} />
            {c.likes}
          </button>
          <button onClick={onReply} className="text-xs text-muted hover:text-fg">
            Reply
          </button>
          <FlagButton targetType="comment" targetId={c.id} />
        </div>
      </div>
    </div>
  );
}

function FlagButton({ targetType, targetId }: { targetType: "post" | "comment"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!reason.trim()) return;
    startTransition(() => {
      import("@/actions/community").then((m) =>
        m.reportAction({ targetType, targetId, reason: reason.trim() }).then((res) => {
          if (res.ok) {
            toast.success("Report submitted — thanks for keeping things civil.");
            setOpen(false);
            setReason("");
          } else {
            toast.error(res.error ?? "Could not submit report.");
          }
        })
      );
    });
  }

  return (
    <span className="relative inline-flex">
      <button onClick={() => setOpen((v) => !v)} className="text-xs text-muted hover:text-fg flex items-center gap-1" aria-label="Report">
        <Flag className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <span className="absolute right-0 top-6 z-20 w-64 card p-3 space-y-2">
          <p className="text-xs font-medium">Report this content</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full min-h-16 px-2 py-1.5 rounded-md border border-border bg-surface text-xs"
            placeholder="Why are you reporting this?"
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="text-xs text-muted" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="text-xs text-rose-600 font-medium" onClick={submit} disabled={isPending || !reason.trim()}>
              Submit report
            </button>
          </div>
        </span>
      ) : null}
    </span>
  );
}

function requireCommunity() {
  return import("@/actions/community");
}