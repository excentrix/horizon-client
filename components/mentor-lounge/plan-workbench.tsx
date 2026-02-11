"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PlanCreationResponse } from "@/types";
import {
  Plan,
  PlanDescription,
  PlanHeader,
  PlanTitle,
} from "@/components/ai-elements/plan";
import { Loader } from "@/components/ai-elements/loader";

interface PlanWorkbenchProps {
  planData: Partial<PlanCreationResponse>;
  progress?: number;
  status: "idle" | "queued" | "in_progress" | "warning" | "completed" | "failed";
  statusMessage?: string;
  statusMeta?: { agent?: string; tool?: string; stepType?: string };
}

export function PlanWorkbench({ 
  planData, 
  progress = 0,
  status,
  statusMessage,
  statusMeta
}: PlanWorkbenchProps) {
  
  const hint = (() => {
    switch (status) {
      case "queued":
        return "Queueing your plan and loading your context.";
      case "in_progress":
        return "Drafting milestones and daily tasks.";
      case "warning":
        return "Waiting on your answers to continue.";
      case "completed":
        return "Plan is ready. You can start now.";
      case "failed":
        return "Something went wrong. Try again in a moment.";
      default:
        return "Ready when you are.";
    }
  })();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (status === "completed") {
      setIsOpen(false);
    }
  }, [status]);

  return (
    <Plan
      isStreaming={status === "in_progress" || status === "queued"}
      open={isOpen}
      onOpenChange={setIsOpen}
      className="overflow-hidden rounded-[24px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,250,252,0.9))] backdrop-blur shadow-[var(--shadow-2)]"
    >
      <PlanHeader className="flex-col gap-4 pb-3">
        <div className="flex w-full items-center gap-3">
          <div className="flex items-center gap-3">
            {status === "in_progress" || status === "queued" ? (
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
                <Loader size={14} />
              </div>
            ) : (
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
            )}
            <div className="space-y-0.5">
              <PlanTitle className="text-sm font-semibold tracking-tight">
                {planData.plan_title || "New Learning Plan"}
              </PlanTitle>
              <PlanDescription className="text-[11px] text-muted-foreground">
                {statusMessage ?? hint}
              </PlanDescription>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge
              variant={status === "completed" ? "default" : "secondary"}
              className="text-[10px] uppercase tracking-[0.18em]"
            >
              {status === "completed" ? "Ready" : status.replace("_", " ")}
            </Badge>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-[var(--shadow-1)]">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="uppercase tracking-[0.22em]">Progress</span>
            <span className="font-medium text-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 rounded-full" />
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <span className="rounded-full border border-white/80 bg-white/70 px-2 py-1">
              {planData.task_count ? `${planData.task_count} tasks` : "Drafting tasks"}
            </span>
            <span className="rounded-full border border-white/80 bg-white/70 px-2 py-1">
              {statusMeta?.tool
                ? `Using ${statusMeta.tool}`
                : statusMeta?.agent
                  ? `Agent: ${statusMeta.agent}`
                  : "Building"}
            </span>
          </div>
        </div>
        {planData.learning_plan_id ? (
          <div className="flex justify-end">
            <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-[11px]">
              <Link href={`/plans?plan=${planData.learning_plan_id}`}>
                Open <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        ) : null}
      </PlanHeader>
    </Plan>
  );
}
