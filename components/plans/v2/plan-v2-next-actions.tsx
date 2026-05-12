"use client";

import { AlertTriangle, ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DailyTask } from "@/types";
import { classifyQueueTasks, formatTaskDate, statusLabel, statusTone } from "./utils";

interface PlanV2NextActionsProps {
  planId: string;
  tasks: DailyTask[];
  onStartTask: (taskId: string) => void;
}

export function PlanV2NextActions({
  planId,
  tasks,
  onStartTask,
}: PlanV2NextActionsProps) {
  const queue = classifyQueueTasks(tasks)
    .filter((task) => task.status !== "completed" && task.status !== "skipped")
    .slice(0, 3);

  if (!queue.length) {
    return (
      <section className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-[var(--shadow-1)]">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#5858CC]" />
          <h3 className="text-sm font-semibold text-[#414141]">Next Actions</h3>
        </div>
        <p className="text-sm text-[#414141]/75">No pending actions. You’re clear to plan your next sprint.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-[var(--shadow-1)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#5858CC]" />
          <h3 className="text-sm font-semibold text-[#414141]">Next Actions</h3>
        </div>
        <Badge variant="outline" className="rounded-full border-black/15 bg-white/90 text-[10px] font-medium uppercase tracking-[0.12em]">
          {queue.length} ready
        </Badge>
      </div>

      <div className="space-y-2">
        {queue.map((task, index) => {
          const urgency = task.bucket === "overdue";
          return (
            <article
              key={task.id}
              className="rounded-2xl border border-black/10 bg-[#FAEDCD]/45 p-3"
            >
              <div className="mb-1 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#414141]">{task.title}</p>
                  <p className="text-xs text-[#414141]/70">{formatTaskDate(task)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {urgency ? <AlertTriangle className="h-3.5 w-3.5 text-[#EC5B13]" /> : null}
                  <Badge className={`rounded-full border text-[10px] font-medium ${statusTone(task.status)}`}>
                    {statusLabel(task.status)}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 rounded-full bg-[#5858CC] px-3 text-xs text-white hover:bg-[#4d4db3]"
                  onClick={() => onStartTask(task.id)}
                >
                  <PlayCircle className="mr-1 h-3.5 w-3.5" />
                  {index === 0 ? "Start now" : "Queue now"}
                </Button>
                <Button asChild size="sm" variant="ghost" className="h-7 rounded-full px-2.5 text-xs text-[#414141]/80 hover:bg-black/5">
                  <Link href={`/plans/${planId}/playground?task=${task.id}`}>
                    Open
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
