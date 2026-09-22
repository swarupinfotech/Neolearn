"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllReadAction } from "@/actions/notifications";
import { CheckCheck } from "lucide-react";

export function NotificationsClient({ hasUnread }: { hasUnread: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (!hasUnread || done) return null;

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={isPending}
      onClick={() =>
        startTransition(() =>
          markAllReadAction().then((r) => {
            if (r.ok) {
              setDone(true);
              toast.success("All marked as read");
            }
          })
        )
      }
    >
      <CheckCheck className="h-3.5 w-3.5" /> Mark all read
    </Button>
  );
}