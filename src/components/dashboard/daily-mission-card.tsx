"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { claimDailyAction } from "@/actions/daily";
import { CheckCircle2, Gift, Circle } from "lucide-react";

export interface DailyTaskWidget {
  key: string;
  label: string;
  target: number;
  done: number;
}

export function DailyMissionCard({
  tasks,
  rewardXp,
  allComplete,
  claimed,
}: {
  tasks: DailyTaskWidget[];
  rewardXp: number;
  allComplete: boolean;
  claimed: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [didClaim, setDidClaim] = useState(claimed);

  function claim() {
    startTransition(() => {
      claimDailyAction().then((res) => {
        if (res.ok) {
          setDidClaim(true);
          toast.success(`Daily mission complete! +${res.xp} XP`);
        } else {
          toast.error(res.error ?? "Could not claim reward.");
        }
      });
    });
  }

  const doneCount = tasks.filter((t) => t.done >= t.target).length;

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" /> Daily Mission
        </h2>
        <Badge tone={didClaim ? "green" : "amber"}>+{rewardXp} XP</Badge>
      </div>
      <ul className="space-y-2.5">
        {tasks.map((t) => {
          const complete = t.done >= t.target;
          return (
            <li key={t.key} className="flex items-center gap-2 text-sm">
              {complete ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted shrink-0" />
              )}
              <span className={complete ? "text-muted line-through" : ""}>{t.label}</span>
              {complete ? <Badge tone="green" className="ml-auto">Done</Badge> : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">
          {doneCount}/{tasks.length} tasks done
        </span>
        <Button size="sm" disabled={!allComplete || didClaim || isPending} onClick={claim}>
          {didClaim ? "Claimed" : isPending ? "Claiming…" : "Claim reward"}
        </Button>
      </div>
    </section>
  );
}