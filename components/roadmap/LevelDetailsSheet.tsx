"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, Play, Lock, CheckCircle, ArrowRight } from "lucide-react";
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
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start plan";
    throw new Error(message);
  }
}

export function LevelDetailsSheet({ level, isOpen, onClose }: LevelDetailsSheetProps) {
  const router = useRouter();

  const { mutate: requestPlan, isPending } = useMutation({
    mutationFn: startLevelPlan,
    onSuccess: () => {
      toast.success("Plan generation started!", {
        description: "Your AI mentor is crafting a custom plan for this level.",
      });
      // Close sheet after succesfull request
      onClose();
    },
    onError: (error) => {
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

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full overflow-hidden pb-12">
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

            <div className="grid grid-cols-2 gap-4 pt-4">
               <div className="p-4 rounded-lg bg-muted/30 border space-y-1">
                 <div className="text-xs text-muted-foreground uppercase tracking-wider">Duration</div>
                 <div className="font-semibold text-lg">{level.duration_weeks} Weeks</div>
               </div>
               <div className="p-4 rounded-lg bg-muted/30 border space-y-1">
                 <div className="text-xs text-muted-foreground uppercase tracking-wider">Difficulty</div>
                 <div className="font-semibold text-lg">Intermediate</div> 
               </div>
            </div>
          </div>
        </ScrollArea>

        <div className="pt-6 mt-auto border-t">
             {isLocked ? (
                <Button disabled className="w-full gap-2" size="lg" variant="secondary">
                  <Lock className="w-4 h-4" /> Component Locked
                </Button>
             ) : isInProgress || isCompleted ? (
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
