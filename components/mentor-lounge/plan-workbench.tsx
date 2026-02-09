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
      className="border border-primary/10 bg-card/80 backdrop-blur-sm shadow-sm"
    >
      <PlanHeader className="flex-col gap-2 pb-2">
        <div className="flex w-full items-center gap-3">
          <div className="flex items-center gap-2">
            {status === "in_progress" || status === "queued" ? (
              <Loader size={14} />
            ) : (
              <Sparkles className="size-4 text-primary" />
            )}
            <div className="space-y-0.5">
              <PlanTitle className="text-[13px] font-semibold">
                {planData.plan_title || "New Learning Plan"}
              </PlanTitle>
              <PlanDescription className="text-[11px] text-muted-foreground">
                {statusMessage ?? hint}
              </PlanDescription>
            </div>
          </div>
          <Badge
            variant={status === "completed" ? "default" : "secondary"}
            className="ml-auto text-[10px]"
          >
            {status === "completed" ? "Ready" : status.replace("_", " ")}
          </Badge>
        </div>
        <Progress value={progress} className="h-1" />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {planData.task_count ? `${planData.task_count} tasks` : "Drafting tasks"}
          </span>
          <span className="truncate">
            {statusMeta?.tool
              ? `Using ${statusMeta.tool}`
              : statusMeta?.agent
                ? `Agent: ${statusMeta.agent}`
                : "Building"}
          </span>
        </div>
        {planData.learning_plan_id ? (
          <div className="flex justify-end">
            <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-[11px]">
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
