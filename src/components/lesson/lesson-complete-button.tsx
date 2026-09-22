"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export function LessonCompleteButton({ lessonId, isCompleted }: { lessonId: string; isCompleted: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(isCompleted);

  function complete() {
    startTransition(() => {
      fetch("/api/lessons/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lessonId, progressPct: 100, completed: true }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            setDone(true);
            toast.success(data.xp > 0 ? `Lesson complete! +${data.xp} XP` : "Lesson complete!");
          } else {
            toast.error(data.error ?? "Could not save progress");
          }
        })
        .catch(() => toast.error("Network error"));
    });
  }

  if (done) {
    return (
      <Button variant="secondary" disabled className="text-primary">
        <CheckCircle2 className="h-4 w-4" /> Completed
      </Button>
    );
  }
  return (
    <Button onClick={complete} disabled={isPending}>
      {isPending ? "Saving…" : "Mark lesson complete"}
    </Button>
  );
}