"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminResolveReportAction, adminSetUserStatusAction } from "@/actions/admin";

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