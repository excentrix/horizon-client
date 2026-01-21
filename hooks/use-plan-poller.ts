
import { useEffect } from "react";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { planningApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { telemetry } from "@/lib/telemetry";
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
        
        // Map backend crew_status to our frontend status
        // Backend: "queued", "running", "completed", "error"
        // Frontend: "queued", "in_progress", "completed", "failed"
        let status: "queued" | "in_progress" | "completed" | "failed" = "in_progress";
        
        if (session.crew_status === "queued" || session.crew_status === "initializing") status = "queued";
        else if (session.crew_status === "running" || session.crew_status === "processing") status = "in_progress";
        else if (session.crew_status === "completed") status = "completed";
        else if (session.crew_status === "error" || session.crew_status === "failed") status = "failed";

        // Only update if status changed or we just want to refresh message?
        // Actually, let's update if we're not completed yet.
        // If completed, we need the plan ID.
        
        if (session.crew_status === "completed" && session.resulting_plan) {
            setPlanBuildStatus("completed", "Plan ready!", session.resulting_plan);
            queryClient.invalidateQueries({ queryKey: ["learning-plans"] });
            // Should we clear the poller? setting status to completed stops the effect.
        } else if (session.crew_results && typeof session.crew_results === "object") {
             const events = (session.crew_results as any).runtime_events as Array<Record<string, unknown>> | undefined;
             if (events && events.length && !runtimeEventsLoadedRef.current && planUpdates.length === 0) {
               events.forEach((event) => {
                 pushPlanUpdate({
                   type: "plan_update",
                   data: {
                     id: (event.event_id as string) ?? `runtime-${Date.now()}`,
                     conversation_id: event.conversation_id as string | undefined,
                     status: (event.status as any) ?? "in_progress",
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
             // Maybe update message if we can get it? Backend doesn't show message in list detail view easily unless we add it. 
             // The simple view I saw returns serializer data. Let's assume it's basic.
        }

      } catch (error) {
        console.error("Poll failed", error);
      }
    };

    const interval = setInterval(checkStatus, 5000); // Poll every 5s if WS is quiet
    return () => clearInterval(interval);
  }, [planSessionId, planBuildStatus, lastPlanActivityAt, setPlanBuildStatus, updateLastPlanActivity, queryClient]);
}
