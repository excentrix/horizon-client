
import { useEffect } from "react";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { planningApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

import { useRef } from "react";

export function usePlanSessionPoller() {
  const { 
    planSessionId, 
    lastPlanActivityAt, 
    planBuildStatus,
    setPlanBuildStatus,
    updateLastPlanActivity,
    pushPlanUpdate,
    planUpdates
  } = useMentorLoungeStore();

  const queryClient = useQueryClient();
  const runtimeEventsLoadedRef = useRef(false);

  useEffect(() => {
    if (!planSessionId || planBuildStatus === "completed" || planBuildStatus === "failed" || planBuildStatus === "idle") {
      return;
    }

    const checkStatus = async () => {
      const now = Date.now();
      // If we've had recent WS activity (last 10s), skip polling
      if (lastPlanActivityAt && (now - lastPlanActivityAt < 10000)) {
        return;
      }

      try {
        const session = await planningApi.getPlanSession(planSessionId);
        
        if (session.crew_status === "completed" && session.resulting_plan) {
            setPlanBuildStatus("completed", "Plan ready!", session.resulting_plan);
            queryClient.invalidateQueries({ queryKey: ["learning-plans"] });
        } else if (session.crew_results && typeof session.crew_results === "object") {
             const events = (session.crew_results as Record<string, unknown>).runtime_events as Array<Record<string, unknown>> | undefined;
             if (events && events.length && !runtimeEventsLoadedRef.current && planUpdates.length === 0) {
               events.forEach((event) => {
                 pushPlanUpdate({
                   type: "plan_update",
                   data: {
                     id: (event.event_id as string) ?? `runtime-${Date.now()}`,
                     conversation_id: event.conversation_id as string | undefined,
                     status: (event.status as string) ?? "in_progress",
                     message: (event.message as string) ?? "Working on your plan...",
                     plan_id: event.plan_id as string | undefined,
                     plan_title: event.plan_title as string | undefined,
                     task_count: event.task_count as number | undefined,
                     timestamp: (event.timestamp as string) ?? new Date().toISOString(),
                     agent: event.agent as string | undefined,
                     tool: event.tool as string | undefined,
                     step_type: event.step_type as string | undefined,
                   },
                 });
               });
               runtimeEventsLoadedRef.current = true;
             }
             updateLastPlanActivity();
        } else if (session.crew_status === "error") {
             setPlanBuildStatus("failed", "Plan generation failed");
        } else {
             // Just update heartbeat
             updateLastPlanActivity();
        }

      } catch (error) {
        console.error("Poll failed", error);
      }
    };

    const interval = setInterval(checkStatus, 5000); // Poll every 5s if WS is quiet
    return () => clearInterval(interval);
  }, [planSessionId, planBuildStatus, lastPlanActivityAt, setPlanBuildStatus, updateLastPlanActivity, queryClient, pushPlanUpdate, planUpdates.length]);
}
