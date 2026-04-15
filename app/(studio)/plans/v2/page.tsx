"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlan, usePlanMutations, usePlans } from "@/hooks/use-plans";
import { telemetry } from "@/lib/telemetry";
import { toast } from "sonner";
import type { DailyTask } from "@/types";
import { PlanV2Header } from "@/components/plans/v2/plan-v2-header";
import { PlanV2Context } from "@/components/plans/v2/plan-v2-context";
import { PlanV2NextActions } from "@/components/plans/v2/plan-v2-next-actions";
import { PlanV2TaskQueue } from "@/components/plans/v2/plan-v2-task-queue";
import { PlanV2InsightsRail } from "@/components/plans/v2/plan-v2-insights-rail";
import { PlanV2ScheduleManager } from "@/components/plans/v2/plan-v2-schedule-manager";
import { PlanV2FocusConsole } from "@/components/plans/v2/plan-v2-focus-console";

function PlansV2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const {
    data: plans = [],
    isLoading: plansLoading,
    isError: plansError,
  } = usePlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [rightRailTop, setRightRailTop] = useState(108);

  useEffect(() => {
    const queryPlan = searchParams.get("plan");
    if (queryPlan && plans.some((plan) => plan.id === queryPlan)) {
      setSelectedPlanId(queryPlan);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lastPlanId", queryPlan);
      }
      return;
    }

    if (!selectedPlanId && plans.length) {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem("lastPlanId")
          : null;
      if (stored && plans.some((plan) => plan.id === stored)) {
        setSelectedPlanId(stored);
      } else {
        setSelectedPlanId(plans[0].id);
      }
    }
  }, [plans, searchParamsString, selectedPlanId, searchParams]);

  const {
    data: plan,
    isLoading: planLoading,
    isError: planError,
  } = usePlan(selectedPlanId ?? undefined);

  const {
    startPlan,
    pausePlan,
    resumePlan,
    updateTaskStatus,
    switchMentor,
    rescheduleTask,
  } = usePlanMutations(selectedPlanId ?? undefined);

  const tasks = useMemo(() => plan?.daily_tasks ?? [], [plan?.daily_tasks]);

  const nextPlayableTask = useMemo(() => {
    return (
      tasks.find((task) => task.status === "in_progress") ??
      tasks.find((task) => task.status === "scheduled") ??
      tasks.find((task) => task.status === "overdue") ??
      tasks[0]
    );
  }, [tasks]);

  useEffect(() => {
    telemetry.track("plans_v2_open", {
      plan_id: selectedPlanId,
      plans_count: plans.length,
    });
  }, [selectedPlanId, plans.length]);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("plan", planId);
    router.replace(`?${params.toString()}`, { scroll: false });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lastPlanId", planId);
    }
    telemetry.track("plans_v2_select_plan", { plan_id: planId });
  };

  const handleOpenCurrentTask = () => {
    if (!plan) return;
    const href = `/plans/${plan.id}/playground${nextPlayableTask ? `?task=${nextPlayableTask.id}` : ""}`;
    telemetry.track("plans_v2_open_playground", {
      plan_id: plan.id,
      task_id: nextPlayableTask?.id,
    });
    router.push(href);
  };

  const handlePrimaryAction = () => {
    if (!plan) return;

    if (plan.status === "active") {
      pausePlan.mutate(undefined, {
        onSuccess: () =>
          telemetry.track("plans_v2_pause_plan", { plan_id: plan.id }),
      });
      return;
    }

    if (plan.status === "paused") {
      resumePlan.mutate(undefined, {
        onSuccess: () =>
          telemetry.track("plans_v2_resume_plan", { plan_id: plan.id }),
      });
      return;
    }

    if (!plan.pre_assessed) {
      toast.info("Take the pre-assessment to personalize your plan first.");
      router.push(`/plans/${plan.id}/assessment`);
      return;
    }

    startPlan.mutate(undefined, {
      onSuccess: () =>
        telemetry.track("plans_v2_start_plan", { plan_id: plan.id }),
    });
  };

  const primaryActionLabel =
    plan?.status === "active"
      ? "Pause plan"
      : plan?.status === "paused"
        ? "Resume plan"
        : "Start plan";

  const primaryActionLoading =
    startPlan.isPending || pausePlan.isPending || resumePlan.isPending;

  const handleStartTask = (taskId: string) => {
    if (!plan) return;

    updateTaskStatus.mutate(
      { taskId, status: "in_progress" },
      {
        onSuccess: () => {
          telemetry.track("plans_v2_start_task", {
            plan_id: plan.id,
            task_id: taskId,
          });
          router.push(`/plans/${plan.id}/playground?task=${taskId}`);
        },
      },
    );
  };

  const handleSetTaskStatus = (taskId: string, status: DailyTask["status"]) => {
    if (!plan) return;

    updateTaskStatus.mutate(
      { taskId, status },
      {
        onSuccess: () => {
          telemetry.track("plans_v2_update_task", {
            plan_id: plan.id,
            task_id: taskId,
            status,
          });
        },
      },
    );
  };

  const handleQuickReschedule = (taskId: string, date: string) => {
    if (!plan) return;

    rescheduleTask.mutate(
      { taskId, scheduled_date: date },
      {
        onSuccess: () => {
          telemetry.track("plans_v2_reschedule_task", {
            plan_id: plan.id,
            task_id: taskId,
            scheduled_date: date,
          });
          toast.success(`Rescheduled to ${format(new Date(date), "MMM d")}`);
        },
      },
    );
  };

  useEffect(() => {
    const recalcStickyTop = () => {
      const stickyHeaderOffset = 16;
      const interSectionGap = 12;
      const headerHeight = headerRef.current?.offsetHeight ?? 92;
      setRightRailTop(stickyHeaderOffset + headerHeight + interSectionGap);
    };

    recalcStickyTop();
    window.addEventListener("resize", recalcStickyTop);
    return () => window.removeEventListener("resize", recalcStickyTop);
  }, []);

  if (plansError) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white/80 p-6 text-sm text-[#414141] shadow-[var(--shadow-1)]">
        Couldn&apos;t load plans right now. Refresh and try again.
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-4 p-4">
      <div ref={headerRef} className="sticky top-4 z-20">
        <PlanV2Header
          plans={plans}
          selectedPlanId={selectedPlanId}
          onSelectPlan={handleSelectPlan}
          onPrimaryAction={handlePrimaryAction}
          onOpenCurrentTask={handleOpenCurrentTask}
          primaryActionLabel={primaryActionLabel}
          primaryActionLoading={primaryActionLoading}
        />
      </div>

      {plansLoading || planLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.5fr_0.9fr]">
            <Skeleton className="h-36 rounded-3xl" />
            <Skeleton className="h-36 rounded-3xl" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.5fr_0.9fr]">
            <Skeleton className="h-[560px] rounded-3xl" />
            <Skeleton className="h-[560px] rounded-3xl" />
          </div>
        </div>
      ) : null}

      {!plansLoading && !planLoading && !plan ? (
        <section className="rounded-3xl border border-dashed border-black/20 bg-white/60 p-6 text-sm text-[#414141]/75">
          No plan selected. Choose a plan to open the workspace.
        </section>
      ) : null}

      {!plansLoading && !planLoading && plan ? (
        <div className="grid min-h-0 flex-1 items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]">
          <main className="min-w-0 space-y-4">
            <PlanV2Context plan={plan} />
            <PlanV2NextActions
              planId={plan.id}
              tasks={tasks}
              onStartTask={handleStartTask}
            />
            <PlanV2TaskQueue
              planId={plan.id}
              tasks={tasks}
              milestones={plan.milestones}
              isUpdating={
                updateTaskStatus.isPending || rescheduleTask.isPending
              }
              onStartTask={handleStartTask}
              onSetStatus={handleSetTaskStatus}
              onQuickReschedule={handleQuickReschedule}
            />
          </main>

          <aside
            className="min-w-0 space-y-4 xl:sticky xl:self-start xl:overflow-y-auto xl:pr-1"
            style={{
              top: `${rightRailTop + 12}px`,
              maxHeight: `calc(100dvh - ${rightRailTop}px - 12px)`,
            }}
          >
            <PlanV2InsightsRail
              plan={plan}
              tasks={tasks}
              onSwitchMentor={(mentorId) => {
                switchMentor.mutate(mentorId, {
                  onSuccess: () => {
                    telemetry.track("plans_v2_switch_mentor", {
                      plan_id: plan.id,
                      mentor_id: mentorId,
                    });
                  },
                });
              }}
              switchMentorLoading={switchMentor.isPending}
            />
            <PlanV2ScheduleManager
              className=""
              planId={plan.id}
              tasks={tasks}
              isUpdating={
                updateTaskStatus.isPending || rescheduleTask.isPending
              }
              onQuickReschedule={handleQuickReschedule}
            />
            <PlanV2FocusConsole />
          </aside>
        </div>
      ) : null}

      {planError ? (
        <section className="rounded-3xl border border-black/10 bg-white/80 p-4 text-sm text-[#414141] shadow-[var(--shadow-1)]">
          Couldn&apos;t load this plan. Try selecting another one.
        </section>
      ) : null}
    </div>
  );
}

export default function PlansV2Page() {
  return (
    <Suspense fallback={<div className="p-4">Loading plans workspace…</div>}>
      <PlansV2Content />
    </Suspense>
  );
}
