import type { AxiosResponse } from "axios";
import { http } from "./http-client";
import {
  AIPersonality,
  ChatMessage,
  Conversation,
  DailyTask,
  LearningPlan,
  LoginPayload,
  LoginResponse,
  PlanCreationResponse,
  RegisterPayload,
  PaginatedResponse,
  ToastNotification,
  UserPreferences,
  UserProfileDetail,
  UserSummary,
  MultiDomainDashboard,
  WellnessMonitoring,
  AcademicProgressOverview,
  CareerReadinessAssessment,
  UniversalGoalsManagement,
  InsightsFeedResponse,
  ComprehensiveProgressReport,
  MemoryItem,
  ConversationAnalysis,
} from "@/types";

const extract = <T>(promise: Promise<AxiosResponse<T>>) =>
  promise.then((response) => response.data);

const normalizeList = <T>(data: T[] | PaginatedResponse<T>): T[] =>
  Array.isArray(data) ? data : (data?.results ?? []);

// AUTH -----------------------------------------------------------------------
export const authApi = {
  login: (payload: LoginPayload) =>
    extract<LoginResponse>(http.post("/auth/login/", payload)),

  register: (payload: RegisterPayload) =>
    extract<UserSummary>(http.post("/auth/register/", payload)),

  logout: () => extract<{ message: string }>(http.post("/auth/logout/")),

  me: () => extract<UserSummary>(http.get("/auth/profile/")),

  updateProfile: (payload: Partial<UserSummary>) =>
    extract<UserSummary>(http.patch("/auth/profile/", payload)),

  getProfileDetail: () =>
    extract<UserProfileDetail>(http.get("/auth/profile/detail/")),

  updateProfileDetail: (payload: Partial<UserProfileDetail>) =>
    extract<UserProfileDetail>(
      http.patch("/auth/profile/detail/", payload ?? {})
    ),

  getPreferences: () =>
    extract<UserPreferences>(http.get("/auth/preferences/")),

  updatePreferences: (payload: Partial<UserPreferences>) =>
    extract<UserPreferences>(http.patch("/auth/preferences/", payload)),

  completeOnboarding: () =>
    extract<{ message: string }>(http.post("/auth/onboarding/complete/")),

  requestPasswordReset: (email: string) =>
    extract<{ message: string }>(
      http.post("/auth/password/reset/", { email })
    ),

  changePassword: (payload: {
    old_password: string;
    new_password: string;
    new_password_confirm: string;
  }) =>
    extract<{ message: string }>(
      http.post("/auth/password/change/", payload)
    ),
};

// CHAT -----------------------------------------------------------------------
export const chatApi = {
  listConversations: () =>
    extract<Conversation[] | PaginatedResponse<Conversation>>(
      http.get("/chat/conversations/")
    ).then(normalizeList),

  getConversation: (conversationId: string) =>
    extract<Conversation>(http.get(`/chat/conversations/${conversationId}/`)),

  createConversation: (payload: Partial<Conversation>) =>
    extract<Conversation>(http.post("/chat/conversations/", payload)),

  pinConversation: (conversationId: string) =>
    extract<{ message: string; is_pinned: boolean }>(
      http.post(`/chat/conversations/${conversationId}/pin/`)
    ),

  fetchMessagesPage: (
    conversationId: string,
    params: Record<string, unknown> = {}
  ) =>
    extract<PaginatedResponse<ChatMessage>>(
      http.get(`/chat/conversations/${conversationId}/messages/`, { params })
    ),

  fetchMessages: (conversationId: string, params?: Record<string, unknown>) =>
    extract<PaginatedResponse<ChatMessage>>(
      http.get(`/chat/conversations/${conversationId}/messages/`, { params })
    ).then((response) => response.results ?? []),

  sendMessage: (
    conversationId: string,
    payload: { content: string; message_type?: string; parent_message?: string }
  ) =>
    extract<ChatMessage>(
      http.post(`/chat/conversations/${conversationId}/messages/`, payload)
    ),

  getAIPersonalities: () =>
    extract<AIPersonality[]>(http.get("/chat/ai-personalities/")),

  getConversationSummary: (conversationId: string) =>
    extract<{ summary: string }>(
      http.get(`/chat/conversations/${conversationId}/summary/`)
    ),

  wellnessCheck: (conversationId: string) =>
    extract<Record<string, unknown>>(
      http.get(`/chat/conversations/${conversationId}/wellness_check/`)
    ),

  getMemories: () =>
    extract<{ memories: MemoryItem[]; count: number }>(
      http.get("/chat/memories/")
    ),
};

// PLANNING -------------------------------------------------------------------
export const planningApi = {
  listPlans: () =>
    extract<LearningPlan[] | PaginatedResponse<LearningPlan>>(
      http.get("/planning/plans/")
    ).then(normalizeList),

  getPlan: (planId: string) =>
    extract<LearningPlan>(http.get(`/planning/plans/${planId}/`)),

  createPlan: (payload: Record<string, unknown>) =>
    extract<LearningPlan>(http.post("/planning/plans/", payload)),

  createPlanFromConversation: (payload: {
    conversation_id: string;
    user_requirements?: Record<string, unknown>;
  }) =>
    extract<PlanCreationResponse>(
      http.post("/planning/plans/create_from_conversation/", payload)
    ),

  startPlan: (planId: string) =>
    extract<{ message: string; status: string; started_at?: string }>(
      http.post(`/planning/plans/${planId}/start_plan/`)
    ),

  pausePlan: (planId: string) =>
    extract<{ message: string; status: string }>(
      http.post(`/planning/plans/${planId}/pause_plan/`)
    ),

  resumePlan: (planId: string) =>
    extract<{ message: string; status: string }>(
      http.post(`/planning/plans/${planId}/resume_plan/`)
    ),

  completePlan: (planId: string) =>
    extract<{ message: string; status: string }>(
      http.post(`/planning/plans/${planId}/complete_plan/`)
    ),

  updateTaskStatus: (
    planId: string,
    taskId: string,
    payload: Partial<DailyTask>
  ) =>
    extract<DailyTask>(
      http.patch(`/planning/plans/${planId}/tasks/${taskId}/`, payload ?? {})
    ),

  rescheduleTask: (
    planId: string,
    taskId: string,
    payload: { scheduled_date: string; scheduled_time?: string | null }
  ) =>
    extract<DailyTask>(
      http.post(
        `/planning/plans/${planId}/tasks/${taskId}/reschedule/`,
        payload
      )
    ),

  mentorSwitch: (planId: string, payload: { mentor_id: string }) =>
    extract<{ message: string; mentor_id: string }>(
      http.post(`/planning/plans/${planId}/switch_mentor/`, payload)
    ),

  getPlanSession: (sessionId: string) =>
    extract<{
      id: string;
      crew_status: string;
      task_id: string;
      resulting_plan?: string;
      requirements_gathered?: Record<string, unknown>;
    }>(http.get(`/planning/plan-sessions/${sessionId}/`)),
};

// INTELLIGENCE ---------------------------------------------------------------
export const intelligenceApi = {
  getMultiDomainDashboard: (params?: {
    period?: number;
    include_projections?: boolean;
    stakeholder_type?: string;
  }) =>
    extract<MultiDomainDashboard>(
      http.get("/intelligence/multi_domain_dashboard/", { params })
    ),

  getWellnessMonitoring: (params?: {
    alert_level?: string;
    include_history?: boolean;
    days?: number;
  }) =>
    extract<WellnessMonitoring>(
      http.get("/intelligence/wellness_monitoring/", { params })
    ),

  getAcademicProgressOverview: (params?: {
    period?: number;
    include_subjects?: boolean;
    include_predictions?: boolean;
  }) =>
    extract<AcademicProgressOverview>(
      http.get("/intelligence/academic_progress_overview/", { params })
    ),

  getCareerReadinessAssessment: (params?: {
    target_career?: string;
    include_gaps?: boolean;
    include_recommendations?: boolean;
  }) =>
    extract<CareerReadinessAssessment>(
      http.get("/intelligence/career_readiness_assessment/", { params })
    ),

  getUniversalGoalsManagement: (params?: {
    status?: string;
    priority?: string;
    domain?: string;
  }) =>
    extract<UniversalGoalsManagement>(
      http.get("/intelligence/universal_goals_management/", { params })
    ),

  getInsightsFeed: (params?: {
    stakeholder_type?: string;
    urgency?: string;
    domain?: string;
    limit?: number;
  }) =>
    extract<InsightsFeedResponse>(
      http.get("/intelligence/insights_feed/", { params })
    ),

  getComprehensiveProgressReport: (params?: {
    period?: number;
    format?: string;
    include_projections?: boolean;
  }) =>
    extract<ComprehensiveProgressReport>(
      http.get("/intelligence/comprehensive_progress_report/", { params })
    ),

  analyzeConversation: (payload: {
    conversationId: string;
    forceReanalysis?: boolean;
    includeInsights?: boolean;
    updateProgress?: boolean;
  }) =>
    extract<Record<string, unknown>>(
      http.post("/intelligence/analyze-comprehensive/", {
        conversation_id: payload.conversationId,
        force_reanalysis: payload.forceReanalysis ?? false,
        include_insights: payload.includeInsights ?? true,
        update_progress: payload.updateProgress ?? true,
      })
    ),

  getConversationAnalysis: (conversationId: string) =>
    extract<ConversationAnalysis>(
      http.get("/intelligence/conversation_analysis/", {
        params: { conversation_id: conversationId },
      })
    ),

  previewCortexRouting: (conversationId: string, message: string) =>
    extract<{
      agent: string;
      confidence: number;
      reason: string;
      suggested_actions?: unknown[];
    }>(
      http.post(`/chat/conversations/${conversationId}/cortex-preview/`, {
        message,
      })
    ),

  // Legacy helpers / aliases
  getDashboard(params?: { period?: number }) {
    return this.getMultiDomainDashboard(params);
  },
  getProgressReport(params?: { period?: number }) {
    return this.getComprehensiveProgressReport(params);
  },
};

// NOTIFICATIONS --------------------------------------------------------------
export const notificationApi = {
  list: () =>
    extract<{ notifications: ToastNotification[] }>(
      http.get("/notifications/feed/")
    ),
};
