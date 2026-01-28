import { useMutation, useQuery } from "@tanstack/react-query";
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

const getStatus = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status;

const buildEmptyDashboard = (): MultiDomainDashboard => ({
  user_info: {},
  academic_overview: {},
  career_overview: {},
  wellness_overview: {},
  domain_integration: {},
  cross_domain_insights: [],
  competency_growth: {},
  goal_progression: {},
  wellness_trends: {},
  urgent_alerts: [],
  recommendations: [],
  overall_progress_score: 0,
  domain_balance_score: 0,
  wellness_risk_level: "unknown",
  generated_at: new Date().toISOString(),
  data_completeness: {},
});

const buildEmptyWellness = (): WellnessMonitoring => ({
  profile: null,
  recent_assessments: 0,
  crisis_alerts: [],
  wellness_trends: {},
  support_recommendations: [],
  intervention_priority: {},
});

const buildEmptyProgressReport = (): ComprehensiveProgressReport => ({
  period_start: new Date().toISOString(),
  period_end: new Date().toISOString(),
  executive_summary: {},
  domain_progress: {},
  competency_development: {},
  goal_achievements: {},
  cross_domain_insights: [],
  areas_for_improvement: [],
  strengths_and_achievements: [],
});

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
        const status = getStatus(error);
        if (status === 404 || (status && status >= 500)) {
          telemetry.warn("Dashboard unavailable", { status, params });
          return buildEmptyDashboard();
        }
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
        const status = getStatus(error);
        if (status === 404 || (status && status >= 500)) {
          telemetry.warn("Wellness monitoring unavailable", { status, params });
          return buildEmptyWellness();
        }
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
        const status = getStatus(error);
        if (status === 404 || (status && status >= 500)) {
          telemetry.warn("Insights feed unavailable", { params });
          return {
            insights: [],
            insights_summary: {},
            domain_breakdown: {},
            urgency_distribution: {},
            action_items: [],
          };
        }
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
        const status = getStatus(error);
        if (status === 404 || (status && status >= 500)) {
          telemetry.warn("Comprehensive report unavailable", { status, params });
          return buildEmptyProgressReport();
        }
        telemetry.error("Failed to load comprehensive report", { error, params });
        throw error;
      }
    },
  });

export const useAnalyzeConversation = () => {
  return useMutation({
    mutationFn: (payload: {
      conversationId: string;
      forceReanalysis?: boolean;
      includeInsights?: boolean;
      updateProgress?: boolean;
    }) => intelligenceApi.analyzeConversation(payload),
    onSuccess: () => {
      telemetry.toastInfo("Analysis started", "Intelligence analysis has been started in the background.");
    },
    onError: (error) => {
      telemetry.toastError(
        "Analysis failed",
        error instanceof Error ? error.message : undefined,
      );
    },
  });
};
