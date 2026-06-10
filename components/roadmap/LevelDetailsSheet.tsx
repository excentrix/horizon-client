"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Play,
  Lock,
  CheckCircle2,
  ArrowRight,
  Clock3,
  Target,
  BookOpen,
  Trophy,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

import { RoadmapLevel } from "@/types";
import { roadmapApi } from "@/lib/api";

interface LevelDetailsSheetProps {
  level: RoadmapLevel | null;
  isOpen: boolean;
  onClose: () => void;
}

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

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-500",
    progressClass: "[&>div]:bg-emerald-500",
  },
  in_progress: {
    label: "In Progress",
    chipClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
    dotClass: "bg-indigo-500 animate-pulse",
    progressClass: "[&>div]:bg-indigo-500",
  },
  available: {
    label: "Available",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
    dotClass: "bg-sky-500",
    progressClass: "",
  },
  locked: {
    label: "Locked",
    chipClass: "border-slate-200 bg-slate-50 text-slate-500",
    dotClass: "bg-slate-400",
    progressClass: "",
  },
} as const;

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-600">
      {icon}
      {label}
    </span>
  );
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
      onClose();
    },
    onError: (error) => {
      const handoffUrl = (error as Error & { handoff_url?: string; code?: string }).handoff_url;
      if (handoffUrl) {
        toast.error("Mentor context required", { description: error.message });
        router.push(handoffUrl);
        return;
      }
      toast.error("Failed to start level", { description: error.message });
    },
  });

  if (!level) return null;

  const handleStart = () => requestPlan(level.id);
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
  const objectiveCount = level.objectives?.length ?? 0;
  const completionValue = isCompleted ? 100 : isInProgress ? 50 : 0;
  const cfg = STATUS_CONFIG[level.status] ?? STATUS_CONFIG.locked;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex h-full w-[460px] flex-col overflow-hidden p-0 sm:w-[520px]">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="relative shrink-0 border-b border-slate-100 bg-slate-50/60 px-6 pb-6 pt-8">
          {/* Level index watermark */}
          <span className="absolute left-6 top-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 select-none">
            Level {String(level.level_index).padStart(2, "0")}
          </span>

          {/* Status + tag row */}
          <div className="mb-4 mt-4 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.chipClass}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
              {cfg.label}
            </span>
            {level.exam_required && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                <Trophy className="h-3 w-3" />
                Exam required
              </span>
            )}
            {level.proof_required && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                <Zap className="h-3 w-3" />
                Proof required
              </span>
            )}
          </div>

          <SheetHeader className="gap-0 p-0">
            <SheetTitle className="text-[21px] font-bold leading-snug tracking-tight text-slate-900">
              {level.title}
            </SheetTitle>
            {level.description && (
              <SheetDescription className="mt-2 text-sm leading-relaxed text-slate-500">
                {level.description}
              </SheetDescription>
            )}
          </SheetHeader>

          {completionValue > 0 && (
            <div className="mt-5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>Level progress</span>
                <span className="tabular-nums">{completionValue}%</span>
              </div>
              <Progress value={completionValue} className={`h-2 rounded-full bg-slate-100 ${cfg.progressClass}`} />
            </div>
          )}
        </div>

        {/* ── Stat pills ────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatPill icon={<Clock3 className="h-3.5 w-3.5" />} label={`${level.duration_weeks} ${level.duration_weeks !== 1 ? "weeks" : "week"}`} />
            <StatPill icon={<Target className="h-3.5 w-3.5" />} label={`${objectiveCount} objective${objectiveCount !== 1 ? "s" : ""}`} />
            <StatPill icon={<BookOpen className="h-3.5 w-3.5" />} label={`Stage ${level.level_index}`} />
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-6 py-6">
            {objectiveCount > 0 ? (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Learning Objectives
                </h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {level.objectives.map((obj, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3.5 transition-colors hover:bg-slate-50"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600">
                        {i + 1}
                      </span>
                      <p className="text-[13px] leading-relaxed text-slate-700">{obj}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center">
                <BookOpen className="mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">No objectives defined yet.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── Action footer ─────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
          {isLocked ? (
            <Button disabled className="h-12 w-full gap-2 text-sm font-semibold" size="lg" variant="secondary">
              <Lock className="h-4 w-4" />
              Level Locked
            </Button>
          ) : isInProgress || isCompleted || level.learning_plan_id ? (
            <Button
              onClick={handleContinue}
              className="h-12 w-full gap-2 text-sm font-semibold"
              size="lg"
              variant={isCompleted ? "outline" : "default"}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Review Completed Plan
                </>
              ) : (
                <>
                  Continue Learning
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              disabled={isPending}
              className="h-12 w-full gap-2 text-sm font-semibold"
              size="lg"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Start This Level
                </>
              )}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
