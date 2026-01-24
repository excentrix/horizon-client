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
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanFooter,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import { Loader } from "@/components/ai-elements/loader";
import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/components/ai-elements/checkpoint";

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
      className="border border-muted bg-card/70 backdrop-blur-sm"
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
              <PlanTitle className="text-sm">
                {planData.plan_title || "New Learning Plan"}
              </PlanTitle>
              <PlanDescription className="text-xs">
                {statusMessage ?? hint}
              </PlanDescription>
            </div>
          </div>
          <PlanAction className="ml-auto">
            <Badge
              variant={status === "completed" ? "default" : "secondary"}
              className="text-[11px]"
            >
              {status === "completed" ? "Ready" : status.replace("_", " ")}
            </Badge>
          </PlanAction>
        </div>
        <div className="space-y-2">
          <Progress value={progress} className="h-1.5" />
        </div>
      </PlanHeader>

      <PlanContent className="pt-0">
        <div className="space-y-2">
          <Checkpoint className="text-[11px]">
            <CheckpointIcon className="text-muted-foreground" />
            <CheckpointTrigger
              tooltip={statusMeta?.stepType || "Live plan status"}
              className="px-2"
            >
              {statusMeta?.tool
                ? `Using ${statusMeta.tool}`
                : statusMeta?.agent
                  ? `Agent: ${statusMeta.agent}`
                  : "Working on your plan"}
            </CheckpointTrigger>
          </Checkpoint>
          <div className="text-[11px] text-muted-foreground">
            {statusMessage ?? hint}
          </div>
        </div>
      </PlanContent>

      <PlanFooter className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-muted-foreground">
          {planData.task_count
            ? `${planData.task_count} tasks`
            : "Drafting tasks"}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <PlanTrigger />
            <span>Details</span>
          </div>
          <Button asChild size="sm" className="gap-2">
            <Link
              href={
                planData.learning_plan_id
                  ? `/plans?plan=${planData.learning_plan_id}`
                  : "/plans"
              }
            >
              Start <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </PlanFooter>
    </Plan>
  );
}
