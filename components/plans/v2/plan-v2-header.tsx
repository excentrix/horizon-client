"use client";

import { CheckCircle2, ChevronDown, Clock3, Flame, PlayCircle, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { LearningPlan } from "@/types";
import { cn } from "@/lib/utils";
import { planContext } from "./utils";
import { useGamificationSummary } from "@/hooks/use-gamification";

interface PlanV2HeaderProps {
  plans: LearningPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (id: string) => void;
  onPrimaryAction: () => void;
  onOpenCurrentTask: () => void;
  primaryActionLabel: string;
  primaryActionLoading?: boolean;
}

export function PlanV2Header({
  plans,
  selectedPlanId,
  onSelectPlan,
  onPrimaryAction,
  onOpenCurrentTask,
  primaryActionLabel,
  primaryActionLoading,
}: PlanV2HeaderProps) {
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const context = selectedPlan ? planContext(selectedPlan) : null;
  const { data: gamification } = useGamificationSummary();
  const profile = gamification?.profile;
  const badges = gamification?.badge_count ?? gamification?.recent_badges?.length ?? 0;
  const level = profile?.level ?? 1;
  const xpTotal = profile?.total_points ?? 0;
  const streak = profile?.current_streak ?? 0;
  const levelProgress = profile?.level_progress ?? 0;
  const xpForNextLevel = profile?.xp_for_next_level ?? 100;
  const levelProgressPct = Math.max(
    0,
    Math.min(100, profile?.level_progress_percentage ?? 0),
  );
  const xpRemaining = Math.max(0, xpForNextLevel - levelProgress);

  return (
    <header className="rounded-3xl border border-black/10 bg-white/70 p-4 shadow-[var(--shadow-1)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#414141]/60">
            Plans V2 Workspace
          </p>

          <div className="hidden md:block">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 rounded-full border-black/15 bg-white/90 px-3">
                  <span className="max-w-[320px] truncate text-left text-sm font-medium">
                    {selectedPlan?.title ?? "Select a plan"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-[#414141]/70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[420px] rounded-2xl border-black/10 p-2">
                <ul className="space-y-1">
                  {plans.map((plan) => {
                    const selected = plan.id === selectedPlanId;
                    return (
                      <li key={plan.id}>
                        <button
                          type="button"
                          onClick={() => onSelectPlan(plan.id)}
                          className={cn(
                            "w-full rounded-xl border px-3 py-2 text-left transition",
                            selected
                              ? "border-[#5858CC]/35 bg-[#5858CC]/10"
                              : "border-transparent bg-white hover:border-black/10 hover:bg-[#FAEDCD]/50",
                          )}
                        >
                          <p className="truncate text-sm font-semibold text-[#414141]">{plan.title}</p>
                          <p className="truncate text-xs text-[#414141]/70">{plan.description}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </PopoverContent>
            </Popover>
          </div>

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 rounded-full border-black/15 bg-white/90 px-3">
                  <span className="max-w-[220px] truncate text-left text-sm font-medium">
                    {selectedPlan?.title ?? "Select a plan"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-[#414141]/70" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl border-black/10 p-4">
                <SheetHeader className="mb-3">
                  <SheetTitle>Switch plan</SheetTitle>
                </SheetHeader>
                <ul className="space-y-2">
                  {plans.map((plan) => {
                    const selected = plan.id === selectedPlanId;
                    return (
                      <li key={plan.id}>
                        <button
                          type="button"
                          onClick={() => onSelectPlan(plan.id)}
                          className={cn(
                            "w-full rounded-xl border px-3 py-2 text-left transition",
                            selected
                              ? "border-[#5858CC]/35 bg-[#5858CC]/10"
                              : "border-black/10 bg-white",
                          )}
                        >
                          <p className="truncate text-sm font-semibold text-[#414141]">{plan.title}</p>
                          <p className="truncate text-xs text-[#414141]/70">{plan.description}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </SheetContent>
            </Sheet>
          </div>

          {context ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#414141]/80">
              <Badge variant="outline" className="rounded-full border-black/15 bg-white/80 font-normal">
                {context.status}
              </Badge>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {context.mentor}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {context.todayCount} for today
              </span>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={onOpenCurrentTask}
              className="h-9 rounded-full border-black/15 bg-white/90 px-4"
              disabled={!selectedPlan}
            >
              <PlayCircle className="mr-1.5 h-4 w-4" />
              Open playground
            </Button>
            <Button
              onClick={onPrimaryAction}
              disabled={!selectedPlan || primaryActionLoading}
              className="h-9 rounded-full bg-[#EC5B13] px-4 text-white hover:bg-[#d44f10]"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {primaryActionLoading ? "Working…" : primaryActionLabel}
            </Button>
          </div>

          <div className="ml-auto flex h-9 w-full max-w-[420px] items-center gap-2 rounded-full border border-black/10 bg-[linear-gradient(130deg,rgba(250,237,205,0.92),rgba(88,88,204,0.10))] px-2.5">
            <div className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#414141]/70">
              <Sparkles className="h-3.5 w-3.5 text-[#5858CC]" />
              Momentum
            </div>

            <Badge
              variant="outline"
              className="shrink-0 rounded-full border-black/15 bg-white/85 px-2 py-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#414141]"
            >
              L{level}
            </Badge>

            <div className="inline-flex shrink-0 items-center gap-3 text-[11px] text-[#414141]/80">
              <span className="font-medium">XP {xpTotal}</span>
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-[#EC5B13]" />
                {streak}d
              </span>
              <span className="inline-flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-[#5858CC]" />
                {badges}
              </span>
            </div>

            <div className="ml-auto hidden min-w-0 flex-1 items-center gap-2 md:flex">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#5858CC,#EC5B13)] transition-[width] duration-300"
                  style={{ width: `${levelProgressPct}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] font-medium text-[#414141]/70">
                {xpRemaining} XP
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
