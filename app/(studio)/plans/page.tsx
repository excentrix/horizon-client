"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlans, usePlan, usePlanMutations } from "@/hooks/use-plans";
import { PlanList } from "@/components/plans/plan-list";
import { PlanDetail } from "@/components/plans/plan-detail";
import { TaskList } from "@/components/plans/task-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlansPage() {
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPlanId && plans.length) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const { data: plan, isLoading: planLoading } = usePlan(selectedPlanId ?? undefined);
  const { startPlan, pausePlan, resumePlan, completePlan, updateTaskStatus, switchMentor } =
    usePlanMutations(selectedPlanId ?? undefined);

  const actionStatus = useMemo(
    () => ({
      starting: startPlan.isLoading,
      pausing: pausePlan.isLoading,
      resuming: resumePlan.isLoading,
      completing: completePlan.isLoading,
      switchingMentor: switchMentor.isLoading,
    }),
    [
      startPlan.isLoading,
      pausePlan.isLoading,
      resumePlan.isLoading,
      completePlan.isLoading,
      switchMentor.isLoading,
    ],
  );

  const tasks = plan?.daily_tasks ?? [];

  const handleToggleTask = (taskId: string, currentStatus: typeof tasks[number]["status"]) => {
    const nextStatus = currentStatus === "completed" ? "scheduled" : "completed";
    updateTaskStatus.mutate({ taskId, status: nextStatus });
  };

  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="flex min-h-0 flex-col gap-4 overflow-hidden rounded-xl border bg-card/70 p-4 shadow-sm">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Learning plans
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {plansLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <PlanList plans={plans} selectedPlanId={selectedPlanId} onSelect={setSelectedPlanId} />
          )}
        </div>
      </aside>

      <section className="flex h-full min-h-0 flex-col gap-4">
        {planLoading || !plan ? (
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            {selectedPlanId ? "Loading plan…" : "Select a plan to see its details."}
          </div>
        ) : (
          <div className="grid min-h-0 gap-4 lg:grid-rows-[auto_1fr]">
            <PlanDetail
              plan={plan}
              onStart={() => startPlan.mutate()}
              onPause={() => pausePlan.mutate()}
              onResume={() => resumePlan.mutate()}
              onComplete={() => completePlan.mutate()}
              onActivateMentor={(mentorId) => switchMentor.mutate(mentorId)}
              actionStatus={actionStatus}
            />
            <div className="min-h-0 overflow-y-auto rounded-xl border bg-card/80 p-4 shadow">
              <TaskList
                tasks={tasks}
                onToggleStatus={(task) => handleToggleTask(task.id, task.status)}
                isUpdating={updateTaskStatus.isLoading}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
