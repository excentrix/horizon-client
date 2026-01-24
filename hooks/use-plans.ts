import { useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { planningApi } from "@/lib/api";
import type { DailyTask, LearningPlan } from "@/types";
import { telemetry } from "@/lib/telemetry";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { useEffect } from "react";

const plansKey = ["learning-plans"];
const planKey = (planId: string) => [...plansKey, planId];

export function usePlans() {
  return useQuery<LearningPlan[]>({
    queryKey: plansKey,
    queryFn: async () => {
      try {
        return await planningApi.listPlans();
      } catch (error) {
        telemetry.error("Failed to load learning plans", { error });
        throw error;
      }
    },
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 429) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function usePlan(planId?: string) {
  return useQuery<LearningPlan>({
    queryKey: planId ? planKey(planId) : plansKey,
    queryFn: async () => {
      if (!planId) {
        throw new Error("Missing plan id");
      }
      try {
        return await planningApi.getPlan(planId);
      } catch (error) {
        telemetry.error("Failed to load learning plan", { planId, error });
        throw error;
      }
    },
    enabled: Boolean(planId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 429) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
}

export function useCreatePlanFromConversation() {
  const queryClient = useQueryClient();
  const { setPlanBuildStatus, setPlanSessionId } = useMentorLoungeStore();

  return useMutation({
    mutationFn: (payload: { conversationId: string }) => {
      return planningApi.createPlanFromConversation({
        conversation_id: payload.conversationId,
      });
    },
    onSuccess: (data) => {
      telemetry.toastInfo("Plan started", data.message);
      
      // Store session details
      if (data.session_id) {
        setPlanSessionId(data.session_id);
      }
      
      // Set status to queued/in_progress based on response
      setPlanBuildStatus(
        (data.status as any) || "queued",
        data.message || "Plan creation request accepted"
      );
      
      // Invalidate queries just in case
      queryClient.invalidateQueries({ queryKey: plansKey });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ||
        (error instanceof Error ? error.message : undefined) ||
        "Unknown error";
      telemetry.toastError("Unable to create plan", message);
      setPlanBuildStatus("failed", message);
    },
  });
}

export function usePlanMutations(planId?: string) {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    if (planId) {
      queryClient.invalidateQueries({ queryKey: planKey(planId) });
    }
    queryClient.invalidateQueries({ queryKey: plansKey });
  }, [planId, queryClient]);

  const startPlan = useMutation({
    mutationFn: () => {
      if (!planId) throw new Error("Missing plan id");
      return planningApi.startPlan(planId);
    },
    onSuccess: () => {
      telemetry.toastInfo("Plan started", "Good luck on your journey!");
      invalidate();
    },
    onError: (error) => {
      telemetry.toastError("Unable to start plan", error instanceof Error ? error.message : undefined);
    },
  });

  const pausePlan = useMutation({
    mutationFn: () => {
      if (!planId) throw new Error("Missing plan id");
      return planningApi.pausePlan(planId);
    },
    onSuccess: () => {
      telemetry.toastInfo("Plan paused");
      invalidate();
    },
    onError: (error) => {
      telemetry.toastError("Unable to pause plan", error instanceof Error ? error.message : undefined);
    },
  });

  const resumePlan = useMutation({
    mutationFn: () => {
      if (!planId) throw new Error("Missing plan id");
      return planningApi.resumePlan(planId);
    },
    onSuccess: () => {
      telemetry.toastInfo("Plan resumed");
      invalidate();
    },
    onError: (error) => {
      telemetry.toastError("Unable to resume plan", error instanceof Error ? error.message : undefined);
    },
  });

  const completePlan = useMutation({
    mutationFn: () => {
      if (!planId) throw new Error("Missing plan id");
      return planningApi.completePlan(planId);
    },
    onSuccess: () => {
      telemetry.toastInfo("Plan completed", "Celebrate your win!");
      invalidate();
    },
    onError: (error) => {
      telemetry.toastError("Unable to complete plan", error instanceof Error ? error.message : undefined);
    },
  });

  const updateTaskStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: DailyTask["status"] }) => {
      if (!planId) throw new Error("Missing plan id");
      return planningApi.updateTaskStatus(planId, taskId, { status });
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => {
      telemetry.toastError("Unable to update task status", error instanceof Error ? error.message : undefined);
    },
  });

  const switchMentor = useMutation({
    mutationFn: (mentorId: string) => {
      if (!planId) throw new Error("Missing plan id");
      return planningApi.mentorSwitch(planId, { mentor_id: mentorId });
    },
    onSuccess: () => {
      telemetry.toastInfo("Mentor updated", "You have a new specialist!");
      invalidate();
    },
    onError: (error) => {
      telemetry.toastError("Unable to switch mentor", error instanceof Error ? error.message : undefined);
    },
  });

  return {
    startPlan,
    pausePlan,
    resumePlan,
    completePlan,
    updateTaskStatus,
    switchMentor,
  };
}
