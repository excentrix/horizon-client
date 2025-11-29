import { useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { planningApi } from "@/lib/api";
import type { DailyTask, LearningPlan } from "@/types";
import { telemetry } from "@/lib/telemetry";

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
  });
}

export function useCreatePlanFromConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { conversationId: string }) => {
      return planningApi.createPlanFromConversation({
        conversation_id: payload.conversationId,
      });
    },
    onSuccess: (data) => {
      telemetry.toastInfo("Plan created!", data.message);
      queryClient.invalidateQueries({ queryKey: plansKey });
    },
    onError: (error) => {
      telemetry.toastError(
        "Unable to create plan",
        error instanceof Error ? error.message : undefined
      );
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
