"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { usePlans, usePlan, usePlanMutations } from "@/hooks/use-plans";
import { PlanList } from "@/components/plans/plan-list";
import { PlanDetail } from "@/components/plans/plan-detail";
import { PlanIntelligencePanel } from "@/components/plans/plan-intelligence-panel";
import { TaskList } from "@/components/plans/task-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers } from "lucide-react";
import { Suspense } from "react";

function PlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isPlanDrawerOpen, setPlanDrawerOpen] = useState(false);

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
  }, [plans, searchParamsString, selectedPlanId]);

  const { data: plan, isLoading: planLoading } = usePlan(
    selectedPlanId ?? undefined,
  );
  const {
    startPlan,
    pausePlan,
    resumePlan,
    completePlan,
    updateTaskStatus,
    switchMentor,
  } = usePlanMutations(selectedPlanId ?? undefined);

  const actionStatus = useMemo(
    () => ({
      starting: startPlan.isPending,
      pausing: pausePlan.isPending,
      resuming: resumePlan.isPending,
      completing: completePlan.isPending,
      switchingMentor: switchMentor.isPending,
    }),
    [
      startPlan.isPending,
      pausePlan.isPending,
      resumePlan.isPending,
      completePlan.isPending,
      switchMentor.isPending,
    ],
  );

  const tasks = plan?.daily_tasks ?? [];

  const handleUpdateTask = (
    taskId: string,
    payload: Partial<(typeof tasks)[number]>,
  ) => {
    updateTaskStatus.mutate({ taskId, ...payload });
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("plan", planId);
    router.replace(`?${params.toString()}`, { scroll: false });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lastPlanId", planId);
    }
    setPlanDrawerOpen(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col gap-4 overflow-hidden p-2">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/70 p-4 shadow-sm">
        <div>
          <h2 className="text-base font-semibold">Your learning plan</h2>
          <p className="text-xs text-muted-foreground">
            Pick a plan and focus on what’s next.
          </p>
        </div>
        <Sheet open={isPlanDrawerOpen} onOpenChange={setPlanDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Layers className="h-4 w-4" />
              All plans
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[360px] p-0 sm:w-[420px]">
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle>Learning plans</SheetTitle>
              <SheetDescription className="text-xs">
                Switch between plans anytime.
              </SheetDescription>
            </SheetHeader>
            <div className="h-full overflow-y-auto px-4 py-4">
              {plansLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-28 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <PlanList
                  plans={plans}
                  selectedPlanId={selectedPlanId}
                  onSelect={handleSelectPlan}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <section className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {planLoading || !plan ? (
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            {selectedPlanId
              ? "Loading plan…"
              : "Select a plan to see its details."}
          </div>
        ) : (
          <Tabs
            defaultValue="overview"
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>
            <TabsContent
              value="overview"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
                <div className="h-full min-h-0 overflow-y-auto overscroll-contain pr-1">
                  <PlanDetail
                    plan={plan}
                    tasks={tasks}
                    onStart={() => {
                      startPlan.mutate();
                      // Capture plan started event
                      posthog.capture('plan_started', {
                        plan_id: plan.id,
                        plan_title: plan.title,
                        total_tasks: tasks.length,
                        estimated_hours: plan.total_estimated_hours,
                      });
                    }}
                    onPause={() => pausePlan.mutate()}
                    onResume={() => resumePlan.mutate()}
                    onComplete={() => completePlan.mutate()}
                    onActivateMentor={(mentorId) =>
                      switchMentor.mutate(mentorId)
                    }
                    actionStatus={actionStatus}
                  />
                </div>
                <div className="h-full self-start overflow-hidden lg:sticky lg:top-4">
                  <PlanIntelligencePanel
                    plan={plan}
                    onSessionComplete={(durationMinutes) => {
                      const firstActiveTask =
                        tasks.find((task) => task.status === "in_progress") ??
                        tasks.find((task) => task.status === "scheduled");
                      if (!firstActiveTask) {
                        return;
                      }
                      updateTaskStatus.mutate({
                        taskId: firstActiveTask.id,
                        actual_duration_minutes: durationMinutes,
                      });
                    }}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="tasks" className="min-h-0 flex-1">
              <div className="flex h-full min-h-0 flex-col rounded-xl border bg-card/80 p-4 shadow">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">All tasks</h3>
                  <span className="text-xs text-muted-foreground">
                    {tasks.length ? `${tasks.length} total` : "No tasks yet"}
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <TaskList
                    tasks={tasks}
                    onUpdateTask={handleUpdateTask}
                    isUpdating={updateTaskStatus.isPending}
                    planId={plan.id}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </section>
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading plans...</div>}>
      <PlansContent />
    </Suspense>
  );
}
