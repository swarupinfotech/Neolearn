"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminDeleteUserAction,
  adminResolveReportAction,
  adminSetPremiumAction,
  adminSetCourseStatusAction,
  adminSetPostStatusAction,
  adminSetUserRoleAction,
  adminSetUserStatusAction,
  adminVerifyUserEmailAction,
} from "@/actions/admin";

export function AdminUserRow({ userId, status }: { userId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const toggle = status === "active" ? "suspended" : "active";
  return (
    <Button
      size="sm"
      variant={status === "active" ? "outline" : "secondary"}
      disabled={isPending}
      onClick={() =>
        startTransition(() =>
          adminSetUserStatusAction({ userId, status: toggle }).then((res) => {
            if (res.ok) toast.success(`User ${toggle}`);
            else toast.error(res.error ?? "Failed");
          })
        )
      }
    >
      {status === "active" ? "Suspend" : "Reactivate"}
    </Button>
  );
}

type MenuItem = { label: string; onSelect: () => void; danger?: boolean };

/** Full account controls: role, premium, email verification, status, delete. */
export function AdminUserMenu({
  userId,
  displayName,
  role,
  status,
  isPremium,
  emailVerified,
  isSelf,
}: {
  userId: string;
  displayName: string;
  role: string;
  status: string;
  isPremium: boolean;
  emailVerified: boolean;
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        setOpen(false);
      } else {
        toast.error(res.error ?? "Action failed");
      }
    });

  const items: MenuItem[] = [
    ...(role === "USER"
      ? [
          {
            label: "Make moderator",
            onSelect: () =>
              run(() => adminSetUserRoleAction({ userId, role: "MODERATOR" }), "Promoted to moderator"),
          },
        ]
      : []),
    ...(role === "MODERATOR"
      ? [
          {
            label: "Make admin",
            onSelect: () => run(() => adminSetUserRoleAction({ userId, role: "ADMIN" }), "Promoted to admin"),
          },
        ]
      : []),
    ...(role === "ADMIN" && !isSelf
      ? [{ label: "Demote to user", onSelect: () => run(() => adminSetUserRoleAction({ userId, role: "USER" }), "Role updated") }]
      : []),
    {
      label: isPremium ? "Remove premium" : "Grant premium",
      onSelect: () =>
        run(
          () => adminSetPremiumAction({ userId, isPremium: !isPremium }),
          isPremium ? "Premium removed" : "Premium granted"
        ),
    },
    ...(!emailVerified
      ? [
          {
            label: "Mark email verified",
            onSelect: () => run(() => adminVerifyUserEmailAction({ userId }), "Email marked verified"),
          },
        ]
      : []),
    ...(!isSelf
      ? [
          {
            label: status === "active" ? "Suspend account" : "Reactivate account",
            danger: status === "active",
            onSelect: () =>
              run(
                () =>
                  adminSetUserStatusAction({
                    userId,
                    status: status === "active" ? "suspended" : "active",
                  }),
                status === "active" ? "Account suspended" : "Account reactivated"
              ),
          },
          {
            label: "Delete account",
            danger: true,
            onSelect: () => {
              if (!confirm(`Permanently delete ${displayName} and all of their data? This cannot be undone.`)) return;
              run(() => adminDeleteUserAction({ userId }), "Account deleted");
            },
          },
        ]
      : []),
  ];

  if (items.length === 0) {
    return <span className="text-xs text-muted">You</span>;
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Actions for ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-border bg-surface shadow-lg py-1"
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              disabled={isPending}
              onClick={item.onSelect}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface2 disabled:opacity-50 ${
                item.danger ? "text-rose-600 dark:text-rose-400" : ""
              }`}
            >
              {item.danger ? <Trash2 className="h-3.5 w-3.5" /> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminCourseMenu({ courseId, title, status }: { courseId: string; title: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const next = status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(() =>
          adminSetCourseStatusAction({
            courseId,
            status: next as "DRAFT" | "PUBLISHED",
          }).then((res) => {
            if (res.ok) toast.success(`${title} → ${next}`);
            else toast.error(res.error ?? "Failed");
          })
        )
      }
    >
      {next === "PUBLISHED" ? "Publish" : "Unpublish"}
    </Button>
  );
}

export function AdminPostMenu({ postId, title, status }: { postId: string; title: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const next = status === "REMOVED" ? "OPEN" : "REMOVED";

  return (
    <Button
      size="sm"
      variant={status === "REMOVED" ? "secondary" : "outline"}
      disabled={isPending}
      onClick={() =>
        startTransition(() =>
          adminSetPostStatusAction({
            postId,
            status: next as "OPEN" | "REMOVED",
          }).then((res) => {
            if (res.ok) toast.success(next === "REMOVED" ? "Post removed" : "Post restored");
            else toast.error(res.error ?? "Failed");
          })
        )
      }
    >
      {next === "REMOVED" ? "Remove" : "Restore"}
    </Button>
  );
}

export function AdminReportRow({ reportId, status }: { reportId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(() =>
            adminResolveReportAction({ reportId, status: "RESOLVED" }).then((res) => {
              if (res.ok) toast.success("Report resolved");
              else toast.error(res.error ?? "Failed");
            })
          )
        }
      >
        Remove content
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() =>
          startTransition(() =>
            adminResolveReportAction({ reportId, status: "DISMISSED" }).then((res) => {
              if (res.ok) toast.success("Report dismissed");
              else toast.error(res.error ?? "Failed");
            })
          )
        }
      >
        Dismiss
      </Button>
    </div>
  );
}