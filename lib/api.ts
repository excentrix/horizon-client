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
  PortfolioArtifact,
  PortfolioProfile,
  PortfolioSkillTranscript,
  BrainMapSnapshot,
  LearnerModelSnapshot,
  MentorEngagementNudge,
  GamificationSummary,
  GamificationBadge,
  GamificationUserBadge,
  GamificationLeaderboard,
  GamificationActivity,
  HomeDashboard,
  RoadmapResponse,
} from "@/types";

const extract = <T>(promise: Promise<AxiosResponse<T>>) =>
  promise.then((response) => response.data);

const normalizeList = <T>(data: T[] | PaginatedResponse<T>): T[] =>
  Array.isArray(data) ? data : (data?.results ?? []);

// AUTH -----------------------------------------------------------------------
export const authApi = {
  login: (payload: LoginPayload) =>
    extract<LoginResponse>(http.post("/auth/login/", payload)),

  loginWithGoogle: (payload: { access_token: string; refresh_token: string; device_info?: Record<string, unknown> }) =>
    extract<LoginResponse>(http.post("/auth/google/", payload)),

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
    payload: {
      content: string;
      message_type?: string;
      parent_message?: string;
      context?: string;
      metadata?: Record<string, unknown>;
    }
  ) =>
    extract<ChatMessage>(
      http.post(`/chat/conversations/${conversationId}/messages/`, payload)
    ),
  recordPlaygroundEvent: (payload: {
    conversation_id: string;
    event_type: string;
    payload?: Record<string, unknown>;
  }) =>
    extract<{ status: string }>(
      http.post("/chat/mentor-sessions/playground-event/", payload)
    ),
  getEngagementNudge: (conversationId: string) =>
    extract<{ nudge: MentorEngagementNudge }>(
      http.get("/chat/mentor-sessions/nudge/", {
        params: { conversation_id: conversationId },
      })
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
  recheckPlanResources: (planId: string) =>
    extract<{ message: string; plan_id: string }>(
      http.post(`/planning/plans/${planId}/recheck-resources/`)
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
  submitMilestoneCheck: (
    planId: string,
    milestoneId: string,
    payload: { score: number; total: number; summary?: string }
  ) =>
    extract<{ message: string; milestone_id: string; feedback?: Record<string, unknown> }>(
      http.post(`/planning/plans/${planId}/milestones/${milestoneId}/check/`, payload)
    ),
  submitTaskProof: (
    taskId: string,
    payload:
      | {
          submission_type: "link" | "text" | "file";
          content: string;
          metadata?: Record<string, unknown>;
        }
      | FormData
  ) =>
    extract<{ message: string; proof: Record<string, unknown>; artifact_id?: string }>(
      http.post(`/planning/tasks/${taskId}/submit-proof/`, payload, {
        headers: payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
      })
    ),
  generateTaskLesson: (
    taskId: string,
    payload?: { scope?: "task" | "milestone"; force?: boolean }
  ) =>
    extract<{
      message: string;
      milestone_id?: string;
      task?: DailyTask;
      tasks?: DailyTask[];
    }>(http.post(`/planning/tasks/${taskId}/generate-lesson/`, payload ?? {})),

  getPlanSession: (sessionId: string) =>
    extract<{
      id: string;
      crew_status: string;
      task_id: string;
      resulting_plan?: string;
      requirements_gathered?: Record<string, unknown>;
      crew_results?: Record<string, unknown>;
    }>(http.get(`/planning/plan-sessions/${sessionId}/`)),
  submitMissingInfo: (
    sessionId: string,
    payload: { field?: string; value?: string; updates?: Record<string, unknown> }
  ) =>
    extract<{ success: boolean; requirements_gathered?: Record<string, unknown> }>(
      http.post(`/planning/plan-sessions/${sessionId}/missing-info/`, payload)
    ),
};

// PORTFOLIO ------------------------------------------------------------------
export const portfolioApi = {
  listArtifacts: () =>
    extract<PortfolioArtifact[] | PaginatedResponse<PortfolioArtifact>>(
      http.get("/portfolio/artifacts/")
    ).then(normalizeList),
  getProfile: () =>
    extract<{ profile: PortfolioProfile }>(
      http.get("/portfolio/profiles/my_profile/")
    ),
  updateProfile: (profileId: string, payload: Record<string, unknown>) =>
    extract(http.patch(`/portfolio/profiles/${profileId}/`, payload ?? {})),
  createArtifactFromProof: (payload: { proof_id: string }) =>
    extract<{ message: string; artifact: PortfolioArtifact }>(
      http.post("/portfolio/artifacts/from-proof/", payload)
    ),
  createArtifact: (payload: Partial<PortfolioArtifact>) =>
    extract<PortfolioArtifact>(http.post("/portfolio/artifacts/", payload)),
  getSkillsTranscript: () =>
    extract<{ skills: PortfolioSkillTranscript[] }>(
      http.get("/portfolio/profiles/skills-transcript/")
    ),
  getPublicPortfolio: (username: string) =>
    extract<import("@/types").PublicPortfolioResponse>(
      http.get(`/portfolio/public/${username}/`)
    ),
};

// INTELLIGENCE ---------------------------------------------------------------
export const intelligenceApi = {
  getMultiDomainDashboard: (params?: {
    period?: number;
    include_projections?: boolean;
    stakeholder_type?: string;
  }) =>
    extract<MultiDomainDashboard>(
      http.get("/intelligence/dashboard/", { params })
    ),

  getWellnessMonitoring: (params?: {
    alert_level?: string;
    include_history?: boolean;
    days?: number;
  }) =>
    extract<WellnessMonitoring>(
      http.get("/intelligence/wellness-monitoring/", { params })
    ),

  getAcademicProgressOverview: (params?: {
    period?: number;
    include_subjects?: boolean;
    include_predictions?: boolean;
  }) =>
    extract<AcademicProgressOverview>(
      http.get("/intelligence/academic-progress/", { params })
    ),

  getCareerReadinessAssessment: (params?: {
    target_career?: string;
    include_gaps?: boolean;
    include_recommendations?: boolean;
  }) =>
    extract<CareerReadinessAssessment>(
      http.get("/intelligence/career-readiness/", { params })
    ),

  getUniversalGoalsManagement: (params?: {
    status?: string;
    priority?: string;
    domain?: string;
  }) =>
    extract<UniversalGoalsManagement>(
      http.get("/intelligence/goals-management/", { params })
    ),

  getInsightsFeed: (params?: {
    stakeholder_type?: string;
    urgency?: string;
    domain?: string;
    limit?: number;
  }) =>
    extract<InsightsFeedResponse>(
      http.get("/intelligence/insights/", { params })
    ),

  getComprehensiveProgressReport: (params?: {
    period?: number;
    format?: string;
    include_projections?: boolean;
  }) =>
    extract<ComprehensiveProgressReport>(
      http.get("/intelligence/progress-report/", { params })
    ),

  getBrainMapSnapshot: (params?: { plan_id?: string }) =>
    extract<BrainMapSnapshot>(
      http.get("/intelligence/brain-map/", { params })
    ),
  getLearnerModel: () =>
    extract<LearnerModelSnapshot>(
      http.get("/intelligence/learner-model/")
    ),
  syncBrainMap: (payload: { plan_id: string }) =>
    extract<{ status: string; plan_id: string }>(
      http.post("/intelligence/brain-map/sync/", payload)
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

  getCareerReadiness: (params?: {
    target_career?: string;
    include_gaps?: boolean;
    include_recommendations?: boolean;
  }) =>
    extract<{
      overall_readiness_score: number;
      competency_breakdown: Record<string, Record<string, number>>;
      career_stage_assessment: { stage: string; completed_roadmap_levels: number; advanced_competency_count: number };
      industry_interest_analysis: { top_areas: { area: string; weight: number }[]; total_areas_detected: number };
      skill_gaps?: Array<{ competency: string; competency_type: string; current_level: string; gap_size: number; related_goal: string }>;
      professional_development_recommendations: Array<{ competency: string; action: string; priority: string; related_goal: string | null }>;
      target_career_analysis?: { target: string; match_found: boolean; match_percentage?: number };
    }>(
      http.get("/intelligence/career_readiness_assessment/", { params })
    ),

  getCompetencyAssessments: () =>
    extract<Array<{
      id: string;
      competency: { id: string; name: string; competency_type: string };
      proficiency_level: string;
      numeric_level: number;
      evidence_count: number;
      last_updated: string;
    }>>(http.get("/intelligence/competency_assessments/")),
};

// GAMIFICATION ---------------------------------------------------------------
export const gamificationApi = {
  getSummary: () =>
    extract<GamificationSummary>(http.get("/gamification/points/summary/")),
  listBadges: () =>
    extract<GamificationBadge[]>(http.get("/gamification/badges/")),
  getEarnedBadges: () =>
    extract<GamificationUserBadge[]>(http.get("/gamification/badges/earned/")),
  getAvailableBadges: () =>
    extract<GamificationBadge[]>(http.get("/gamification/badges/available/")),
  getLeaderboard: () =>
    extract<GamificationLeaderboard>(http.get("/gamification/points/leaderboard/")),
  getHistory: (page = 1) =>
    extract<{ entries: GamificationActivity[]; page: number; per_page: number; total: number; has_more: boolean }>(
      http.get("/gamification/points/history/", { params: { page } })
    ),
};

// DASHBOARDS --------------------------------------------------------------
export const dashboardApi = {
  getHome: () => extract<HomeDashboard>(http.get("/dashboards/home/")),
};

type CohortStudentInsight = {
  user_id: string;
  email: string;
  name: string;
  plan_progress: number;
  plan_title?: string | null;
  plan_status?: string | null;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  last_task_completed_at?: string | null;
  days_inactive?: number | null;
  last_activity: string | null;
  engagement_trend: "up" | "down" | "flat";
  engagement_last_7: number;
  engagement_prev_7: number;
  risk_flags: string[];
  risk_level: "low" | "medium" | "high";
  top_skill_gap?: string | null;
  next_best_action?: string | null;
  engagement_series?: { date: string; value: number }[];
  completion_series?: { date: string; value: number }[];
};

export type StudentIntervention = {
  id: string;
  student: string;
  action_type: "check_in" | "schedule_1on1" | "assign_remediation" | "pacing_review" | "celebrate_win";
  notes?: string;
  status: "queued" | "sent" | "completed" | "dismissed";
  metadata?: Record<string, unknown>;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
};

export type OrgUser = {
  id: string;
  email: string;
  name: string;
  user_type: string;
  role: "admin" | "educator" | "student";
  is_active: boolean;
  last_login: string | null;
  last_activity: string | null;
  cohorts: { id: string; name: string }[];
};

export type CohortReport = {
  cohort_id: string;
  cohort_name: string;
  total_students: number;
  avg_progress: number;
  engagement_delta: number;
  risk_distribution: { on_track: number; at_risk: number };
  risk_levels: { low: number; medium: number; high: number };
  progress_buckets: { range: string; count: number }[];
  inactivity_buckets: { range: string; count: number }[];
  engagement_trend_mix: { up: number; flat: number; down: number };
  top_skill_gaps: { gap: string; count: number }[];
};

// INSTITUTIONS --------------------------------------------------------------
export const institutionsApi = {
  listCohorts: () =>
    extract<{ id: string; name: string; mentor_name?: string | null; student_count?: number; is_active?: boolean }[]>(
      http.get("/institutions/cohorts/")
    ),
  createCohort: (payload: { name: string; mentor_user?: string | null }) =>
    extract<{ id: string; name: string }>(http.post("/institutions/cohorts/", payload)),
  cohortDashboard: (cohortId: string) =>
    extract<{ cohort_id: string; cohort_name: string; total_students: number; students: CohortStudentInsight[] }>(
      http.get(`/institutions/cohorts/${cohortId}/dashboard/`)
    ),
  studentInsight: (studentId: string) =>
    extract<CohortStudentInsight>(
      http.get(`/institutions/students/${studentId}/insight/`)
    ),
  listStudentInterventions: (studentId: string) =>
    extract<StudentIntervention[]>(
      http.get(`/institutions/students/${studentId}/interventions/`)
    ),
  createStudentIntervention: (
    studentId: string,
    payload: { action_type: StudentIntervention["action_type"]; notes?: string }
  ) =>
    extract<StudentIntervention>(
      http.post(`/institutions/students/${studentId}/interventions/`, payload)
    ),
  inviteCohortCSV: (cohortId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return extract<{ message: string; task_id: string }>(
      http.post(`/institutions/cohorts/${cohortId}/invite-csv/`, formData)
    );
  },
  createOrganization: (payload: { name: string; slug: string; domain?: string }) =>
    extract<{ id: string; name: string; slug: string }>(
      http.post("/institutions/orgs/", payload)
    ),
  getOrgSummary: () =>
    extract<Organization>(http.get("/institutions/org/")),
  listEducators: () =>
    extract<{ id: string; email: string; name: string; role: string }[]>(http.get("/institutions/educators/")),
  listOrgUsers: (params?: { role?: string }) =>
    extract<OrgUser[]>(http.get("/institutions/users/", { params })),
  updateOrgUser: (userId: string, payload: { role?: string; is_active?: boolean }) =>
    extract<OrgUser>(http.patch(`/institutions/users/${userId}/`, payload)),
  resetOrgUserPassword: (userId: string) =>
    extract<{ message: string }>(http.post(`/institutions/users/${userId}/reset-password/`)),
  getCohortReport: (cohortId: string) =>
    extract<CohortReport>(http.get(`/institutions/cohorts/${cohortId}/report/`)),
  getSupportTickets: () =>
    extract<SupportTicket[]>(http.get("/institutions/support-tickets/")),
  createSupportTicket: (payload: { subject: string; description: string; ticket_type: string; priority: string; metadata?: Record<string, unknown> }) =>
    extract<SupportTicket>(http.post("/institutions/support-tickets/", payload)),
  updateSupportTicketStatus: (ticketId: string, status: string) =>
    extract<SupportTicket>(http.patch(`/institutions/support-tickets/${ticketId}/`, { status })),
  exportCohortCSV: (cohortId: string) =>
    http.get(`/institutions/cohorts/${cohortId}/export/`, { responseType: "blob" }),
};

export interface SupportTicket {
  id: string;
  user_email: string;
  user_name: string;
  ticket_type: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  subject: string;
  description: string;
  metadata: Record<string, unknown> | null;
  attachment_url: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string;
  logo_url?: string | null;
  contact_email: string;
  notes: string;
  plan_tier: "free" | "starter" | "growth" | "enterprise";
  plan_expires_at?: string | null;
  is_active: boolean;
  max_cohorts: number;
  max_students_per_cohort: number;
  max_educators: number;
  cohort_count: number;
  student_count: number;
  educator_count: number;
  cohort_usage_pct: number;
  student_usage_pct: number;
  created_at: string;
  updated_at: string;
}

export interface HQPlatformStats {
  users: { total: number; active: number; students: number; educators: number; new_last_7_days: number };
  organizations: { total: number; active: number; by_tier: Record<string, number> };
  tickets: { open: number; critical: number; total: number };
  plans: { active: number; completed: number };
}

export interface HQOrgPerformance {
  org_id: string;
  org_name: string;
  plan_tier: string;
  is_active: boolean;
  total_students: number;
  avg_progress: number;
  at_risk_ratio: number;
  engagement_delta: number;
  inactive_7d: number;
}

export interface HQRiskRetention {
  risk_mix: { low: number; medium: number; high: number };
  inactivity_buckets: { range: string; count: number }[];
  top_declining_orgs: { org_id: string; org_name: string; engagement_delta: number; avg_progress: number; at_risk_ratio: number }[];
}

export interface HQEducatorEffectiveness {
  educator_id: string;
  educator_name: string;
  org_id: string;
  org_name: string;
  students: number;
  avg_progress: number;
  at_risk: number;
  interventions_14d: number;
}

export interface GlobalUser {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  user_type: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  last_activity: string | null;
  created_at: string;
}

export interface InviteAuditLog {
  id: string;
  email: string;
  result: "created" | "existing" | "quota_exceeded" | "failed";
  error_detail: string;
  invited_by_email: string;
  cohort_name?: string | null;
  created_at: string;
}

// HQ MASTER ADMIN API ---------------------------------------------------
export const hqApi = {
  getPlatformStats: () =>
    extract<HQPlatformStats>(http.get("/institutions/hq/stats/")),

  getOrgPerformance: () =>
    extract<HQOrgPerformance[]>(http.get("/institutions/hq/org-performance/")),

  getRiskRetention: () =>
    extract<HQRiskRetention>(http.get("/institutions/hq/risk-retention/")),

  getEducatorEffectiveness: () =>
    extract<HQEducatorEffectiveness[]>(http.get("/institutions/hq/educator-effectiveness/")),

  listOrganizations: (params?: { search?: string; tier?: string; active?: string; page?: number }) =>
    extract<{ count: number; results: Organization[] }>(http.get("/institutions/hq/orgs/", { params })),

  getOrganization: (orgId: string) =>
    extract<Organization>(http.get(`/institutions/hq/orgs/${orgId}/`)),

  updateOrganization: (orgId: string, payload: Partial<Organization>) =>
    extract<Organization>(http.patch(`/institutions/hq/orgs/${orgId}/`, payload)),

  createOrganization: (payload: { name: string; slug: string; domain?: string; contact_email?: string; plan_tier?: string; max_cohorts?: number; max_students_per_cohort?: number; max_educators?: number }) =>
    extract<Organization>(http.post("/institutions/orgs/", payload)),

  listUsers: (params?: { search?: string; user_type?: string; is_active?: string; page?: number }) =>
    extract<{ count: number; results: GlobalUser[] }>(http.get("/institutions/hq/users/", { params })),

  updateUser: (userId: string, payload: { is_active?: boolean; is_staff?: boolean; is_superuser?: boolean; user_type?: string }) =>
    extract<GlobalUser>(http.patch(`/institutions/hq/users/${userId}/`, payload)),

  getInviteAuditLog: (params?: { org?: string; result?: string; page?: number }) =>
    extract<{ count: number; results: InviteAuditLog[] }>(http.get("/institutions/hq/invite-logs/", { params })),

  // Tickets with HQ filters
  getSupportTickets: (params?: { status?: string; priority?: string; ticket_type?: string; page?: number }) =>
    extract<{ count: number; results: SupportTicket[] }>(http.get("/institutions/support-tickets/", { params })),

  resolveTicket: (ticketId: string, resolution_notes: string) =>
    extract<SupportTicket>(http.post(`/institutions/support-tickets/${ticketId}/resolve/`, { resolution_notes })),

  updateTicket: (ticketId: string, payload: Partial<Pick<SupportTicket, "status" | "priority" | "assigned_to">>) =>
    extract<SupportTicket>(http.patch(`/institutions/support-tickets/${ticketId}/`, payload)),
};

// ROADMAP ---------------------------------------------------------------
export const roadmapApi = {
  getRoadmap: () => extract<RoadmapResponse>(http.get("/roadmap/")),
  generateLevelPlan: (levelId: string) => 
    extract<{ message: string; plan_id: string }>(http.post(`/roadmap/levels/${levelId}/generate_plan/`)),
};

// NOTIFICATIONS --------------------------------------------------------------
export const notificationApi = {
  list: () =>
    extract<{ notifications: ToastNotification[] }>(
      http.get("/notifications/feed/")
    ),
};
