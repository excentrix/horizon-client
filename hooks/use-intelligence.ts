import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { intelligenceApi } from "@/lib/api";
import {
  AcademicProgressOverview,
  CareerReadinessAssessment,
  ComprehensiveProgressReport,
  InsightsFeedResponse,
  MultiDomainDashboard,
  UniversalGoalsManagement,
  WellnessMonitoring,
} from "@/types";
import { telemetry } from "@/lib/telemetry";

export const useMultiDomainDashboard = (params?: {
  period?: number;
  include_projections?: boolean;
  stakeholder_type?: string;
}) =>
  useQuery<MultiDomainDashboard>({
    queryKey: ["intelligence", "dashboard", params],
    queryFn: async () => {
      try {
        return await intelligenceApi.getMultiDomainDashboard(params);
      } catch (error) {
        telemetry.error("Failed to load dashboard", { error, params });
        throw error;
      }
    },
  });

export const useWellnessMonitoring = (params?: {
  alert_level?: string;
  include_history?: boolean;
  days?: number;
}) =>
  useQuery<WellnessMonitoring>({
    queryKey: ["intelligence", "wellness", params],
    queryFn: async () => {
      try {
        return await intelligenceApi.getWellnessMonitoring(params);
      } catch (error) {
        telemetry.error("Failed to load wellness monitoring", { error, params });
        throw error;
      }
    },
  });

export const useAcademicProgress = (params?: {
  period?: number;
  include_subjects?: boolean;
  include_predictions?: boolean;
}) =>
  useQuery<AcademicProgressOverview>({
    queryKey: ["intelligence", "academic-progress", params],
    queryFn: async () => {
      try {
        return await intelligenceApi.getAcademicProgressOverview(params);
      } catch (error) {
        telemetry.error("Failed to load academic progress", { error, params });
        throw error;
      }
    },
  });

export const useCareerReadiness = (params?: {
  target_career?: string;
  include_gaps?: boolean;
  include_recommendations?: boolean;
}) =>
  useQuery<CareerReadinessAssessment>({
    queryKey: ["intelligence", "career-readiness", params],
    queryFn: async () => {
      try {
        return await intelligenceApi.getCareerReadinessAssessment(params);
      } catch (error) {
        telemetry.error("Failed to load career readiness", { error, params });
        throw error;
      }
    },
  });

export const useUniversalGoals = (params?: {
  status?: string;
  priority?: string;
  domain?: string;
}) =>
  useQuery<UniversalGoalsManagement>({
    queryKey: ["intelligence", "goals", params],
    queryFn: async () => {
      try {
        return await intelligenceApi.getUniversalGoalsManagement(params);
      } catch (error) {
        telemetry.error("Failed to load goals management", { error, params });
        throw error;
      }
    },
  });

export const useInsightsFeed = (params?: {
  stakeholder_type?: string;
  urgency?: string;
  domain?: string;
  limit?: number;
}) =>
  useQuery<InsightsFeedResponse>({
    queryKey: ["intelligence", "insights", params],
    queryFn: async () => {
      try {
        return await intelligenceApi.getInsightsFeed(params);
      } catch (error) {
        telemetry.error("Failed to load insights feed", { error, params });
        throw error;
      }
    },
  });

export const useComprehensiveProgressReport = (params?: {
  period?: number;
  format?: string;
  include_projections?: boolean;
}) =>
  useQuery<ComprehensiveProgressReport>({
    queryKey: ["intelligence", "progress-report", params],
    queryFn: async () => {
      try {
        return await intelligenceApi.getComprehensiveProgressReport(params);
      } catch (error) {
        telemetry.error("Failed to load comprehensive report", { error, params });
        throw error;
      }
    },
  });

export const useAnalyzeConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      conversationId: string;
      forceReanalysis?: boolean;
      includeInsights?: boolean;
      updateProgress?: boolean;
    }) => intelligenceApi.analyzeConversation(payload),
    onSuccess: (data) => {
      telemetry.toastInfo("Analysis complete", "Mentor insights refreshed.");
      queryClient.invalidateQueries({ queryKey: ["intelligence"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["memories"], exact: false });
    },
    onError: (error) => {
      telemetry.toastError(
        "Analysis failed",
        error instanceof Error ? error.message : undefined,
      );
    },
  });
};
