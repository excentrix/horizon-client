"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, Play, Lock, CheckCircle, ArrowRight, Clock3, Crosshair, Shield } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

import { RoadmapLevel } from "@/types";

interface LevelDetailsSheetProps {
  level: RoadmapLevel | null;
  isOpen: boolean;
  onClose: () => void;
}


import { roadmapApi } from "@/lib/api";

async function startLevelPlan(levelId: string) {
  try {
    return await roadmapApi.generateLevelPlan(levelId);
  } catch (error: unknown) {
    const payload = (error as { response?: { data?: { error?: string; message?: string; handoff_url?: string } } })?.response?.data;
    if (payload?.error === "mentor_context_required") {
      const err = new Error(payload.message || "Mentor context required before plan generation.");
      (err as Error & { handoff_url?: string; code?: string }).handoff_url = payload.handoff_url;
      (err as Error & { handoff_url?: string; code?: string }).code = payload.error;
      throw err;
    }
    const message = error instanceof Error ? error.message : "Failed to start plan";
    throw new Error(message);
  }
}

export function LevelDetailsSheet({ level, isOpen, onClose }: LevelDetailsSheetProps) {
  const router = useRouter();

  const { mutate: requestPlan, isPending } = useMutation({
    mutationFn: startLevelPlan,
    onSuccess: (data) => {
      const planId = (data as { plan_id?: string })?.plan_id;
      if (planId) {
        toast.success("Existing plan found", {
            description: "Navigating to your pre-existing plan for this level.",
        });
        onClose();
        router.push(`/plans/${planId}/playground`);
        return;
      }

      toast.success("Plan generation started!", {
        description: "Your AI mentor is crafting a custom plan for this level.",
      });
      // Close sheet after succesfull request
      onClose();
    },
    onError: (error) => {
      const handoffUrl = (error as Error & { handoff_url?: string; code?: string }).handoff_url;
      if (handoffUrl) {
        toast.error("Mentor context required", {
          description: error.message,
        });
        router.push(handoffUrl);
        return;
      }
      toast.error("Failed to start level", {
        description: error.message,
      });
    },
  });

  if (!level) return null;

  const handleStart = () => {
    requestPlan(level.id);
  };

  const handleContinue = () => {
    if (level.learning_plan_id) {
        router.push(`/plans/${level.learning_plan_id}/playground`);
    } else {
        toast.error("Plan not found", { description: "This level is in progress but has no linked plan yet." });
    }
  };

  const isLocked = level.status === "locked";
  const isCompleted = level.status === "completed";
  const isInProgress = level.status === "in_progress";
  const objectiveCount = level.objectives?.length || 0;
  const completionValue = isCompleted ? 100 : isInProgress ? 50 : 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex h-full w-[420px] flex-col overflow-hidden pb-24 sm:w-[560px] px-4">
        <SheetHeader className="space-y-4 pb-4">
          <div className="flex items-center justify-between">
            <Badge 
              variant={isLocked ? "outline" : isInProgress ? "default" : isCompleted ? "default" : "secondary"}
              className="uppercase tracking-wider text-[10px] py-1"
            >
              {level.status.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono pr-8">
              Level {level.level_index}
            </span>
          </div>
          <div>
            <SheetTitle className="text-2xl font-bold leading-tight">{level.title}</SheetTitle>
            <SheetDescription className="mt-2 text-base">
              {level.description}
            </SheetDescription>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Region progress</span>
              <span>{completionValue}%</span>
            </div>
            <Progress value={completionValue} className="h-2.5" />
          </div>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 -mx-6 px-6 py-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Learning Objectives
              </h4>
              <ul className="space-y-3">
                {level.objectives?.map((objective, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-3 bg-muted/20 p-3 rounded-md">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                    <span className="leading-relaxed">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
               <div className="rounded-lg border bg-muted/30 p-3">
                 <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                   <Clock3 className="h-3.5 w-3.5" />
                   Duration
                 </div>
                 <div className="text-base font-semibold">{level.duration_weeks} weeks</div>
               </div>
               <div className="rounded-lg border bg-muted/30 p-3">
                 <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                   <Crosshair className="h-3.5 w-3.5" />
                   Objectives
                 </div>
                 <div className="text-base font-semibold">{objectiveCount}</div>
               </div>
               <div className="rounded-lg border bg-muted/30 p-3">
                 <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                   <Shield className="h-3.5 w-3.5" />
                   Status
                 </div>
                 <div className="text-base font-semibold capitalize">{level.status.replace("_", " ")}</div>
               </div>
            </div>
          </div>
        </ScrollArea>

        <div className="pt-6 mt-auto border-t">
             {isLocked ? (
                <Button disabled className="w-full gap-2" size="lg" variant="secondary">
                  <Lock className="w-4 h-4" /> Component Locked
                </Button>
             ) : isInProgress || isCompleted || level.learning_plan_id ? (
                <Button onClick={handleContinue} className="w-full gap-2" size="lg">
                  {isCompleted ? "Review Completed Plan" : "Continue Learning"} <ArrowRight className="w-4 h-4" />
                </Button>
             ) : (
                <Button onClick={handleStart} disabled={isPending} className="w-full gap-2 py-6 text-base" size="lg">
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                  {isPending ? "Generating Plan..." : "Start This Level"}
                </Button>
             )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
