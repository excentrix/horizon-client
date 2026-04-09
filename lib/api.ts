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
  GamificationPointsProfile,
  HomeDashboard,
  RoadmapResponse,
  SpacedRepetitionCard,
  ExperienceAudit,
  AuditReport,
  AuditQueueSlot,
  AuditInstitutionOverview,
  AuditInstitutionStudentRow,
  AuditInstitutionStudentDetail,
  VeloOnboardingSession,
  VeloMentorReviewResponse,
  VeloOnboardingTrack,
  VeloAuditMode,
  VeloRoadmapEligibility,
} from "@/types";

const extract = <T>(promise: Promise<AxiosResponse<T>>) =>
  promise.then((response) => response.data);

const normalizeList = <T>(data: T[] | PaginatedResponse<T>): T[] =>
  Array.isArray(data) ? data : (data?.results ?? []);

// AUTH -----------------------------------------------------------------------
export const authApi = {
  login: (payload: LoginPayload) =>
    extract<LoginResponse>(http.post("/auth/login/", payload)),

  loginWithGoogle: (payload: { 
    access_token: string; 
    refresh_token: string; 
    provider_token?: string;
    provider_refresh_token?: string;
    device_info?: Record<string, unknown> 
  }) => extract<LoginResponse>(http.post("/auth/google/", payload)),

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

  uploadResume: (payload: FormData) =>
    extract<{
      status: "queued" | "parsed";
      resume_url: string;
      job_id?: string;
      onboarding_completed?: boolean;
      onboarding_marked_complete?: boolean;
    }>(
      http.post("/auth/profile/resume/", payload)
    ),
  getResumeAnalysisStatus: (jobId: string) =>
    extract<{
      job_id: string;
      status: "queued" | "running" | "completed" | "failed";
      error?: string | null;
      started_at?: string | null;
      completed_at?: string | null;
      mirror_snapshot_id?: string | null;
    }>(http.get(`/auth/profile/resume/status/${jobId}/`)),
  initResumeFromOnboarding: (payload: {
    session_key: string;
    target_role?: string;
    target_company?: string;
    timeline?: string;
    constraints?: string;
  }) =>
    extract<{
      status: "queued";
      job_id: string;
      resume_url: string;
      onboarding_completed?: boolean;
      onboarding_marked_complete?: boolean;
    }>(
      http.post("/auth/profile/resume/init-from-onboarding/", payload)
    ),
  confirmResume: (payload: { resume_payload: Record<string, unknown>; projects?: Array<Record<string, unknown>> }) =>
    extract<{ status: string; projects_synced?: string[] }>(
      http.post("/auth/profile/resume/confirm/", payload)
    ),

  reanalyseResume: () =>
    extract<{ status: string; job_id: string }>(
      http.post("/auth/profile/resume/reanalyse/")
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
  activateExamMode: (
    planId: string,
    payload: { exam_date: string; exam_topic: string }
  ) =>
    extract<{ success: boolean; message: string; is_exam_mode: boolean }>(
      http.post(`/planning/plans/${planId}/activate_exam_mode/`, payload)
    ),
  deactivateExamMode: (planId: string) =>
    extract<{ success: boolean; message: string }>(
      http.post(`/planning/plans/${planId}/deactivate_exam_mode/`)
    ),
  syncGoogleCalendar: (planId: string) =>
    extract<{
      connected: boolean;
      auth_url?: string;
      success?: boolean;
      message?: string;
      created?: number;
      updated?: number;
      failed?: number;
      error?: string;
    }>(http.post(`/planning/plans/${planId}/sync_google_calendar/`)),
  getGoogleCalendarStatus: () =>
    extract<{ connected: boolean }>(
      http.get("/integrations/google-calendar/status/")
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
    extract<{
      message: string;
      proof: Record<string, unknown>;
      artifact_id?: string;
      execution_report?: Record<string, unknown> | null;
    }>(
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

  generateMicroPractice: (
    taskId: string,
    options?: { force?: boolean; count?: number; append?: boolean }
  ) =>
    extract<{
      task_id: string;
      questions: Array<{
        id: string;
        question: string;
        options: string[];
        correct_index: number;
        explanation: string;
      }>;
      generated_at: string;
      cached: boolean;
    }>(
      http.post(`/planning/tasks/${taskId}/generate-micro-practice/`, {
        force: options?.force ?? false,
        count: options?.count,
        append: options?.append ?? false,
      })
    ),
  generateFlashcards: (
    taskId: string,
    options?: { force?: boolean; count?: number; append?: boolean }
  ) =>
    extract<{
      task_id: string;
      cards: Array<{
        id: string;
        front: string;
        back: string;
        hint?: string | null;
      }>;
      generated_at: string;
      cached: boolean;
    }>(
      http.post(`/planning/tasks/${taskId}/generate-flashcards/`, {
        force: options?.force ?? false,
        count: options?.count,
        append: options?.append ?? false,
      })
    ),

  getOrCreatePlaygroundConversation: (taskId: string) =>
    extract<{ conversation_id: string }>(
      http.post(`/planning/tasks/${taskId}/playground-conversation/`, {})
    ),

  generateStarterCode: (taskId: string) =>
    extract<{ task_id: string; starter_code: string; language: string; cached: boolean }>(
      http.post(`/planning/tasks/${taskId}/generate-starter-code/`, {})
    ),

  generateChallenge: (taskId: string) =>
    extract<{ task_id: string; verification: Record<string, unknown>; cached: boolean }>(
      http.post(`/planning/tasks/${taskId}/generate-challenge/`, {})
    ),

  getTodaysTasks: async () => {
    const data = await extract<{
      date: string;
      count?: number;
      tasks: DailyTask[];
      summary?: {
        total?: number;
      };
    }>(http.get("/planning/tasks/today/"));

    return {
      date: data.date,
      tasks: data.tasks ?? [],
      count: data.count ?? data.summary?.total ?? (data.tasks?.length ?? 0),
    };
  },

  getPreAssessment: (planId: string) =>
    extract<{
      generated_at: string;
      questions: Array<{
        id: string;
        question: string;
        options: string[];
        correct_index: number | null;
        explanation: string;
        competency_name: string;
        question_type?: string | null;
      }>;
    }>(http.get(`/planning/plans/${planId}/pre-assessment/`)),

  submitPreAssessment: (planId: string, answers: Record<string, number>) =>
    extract<{
      competency_results: Array<{
        competency_name: string;
        score_pct: number;
        correct: number;
        total: number;
        proficiency_level: string;
        self_rating?: boolean;
      }>;
      tasks_marked_skippable: number;
      pre_assessed: boolean;
    }>(http.post(`/planning/plans/${planId}/pre-assessment/`, { answers })),

  submitBlockFeedback: (
    taskId: string,
    blocks: Array<{ block_id: string; helpful: boolean; time_spent_seconds?: number }>
  ) =>
    extract<{ saved: number }>(
      http.post(`/planning/tasks/${taskId}/block-feedback/`, { blocks })
    ),

  getSpacedRepetitionDue: (params?: { plan_id?: string; task_id?: string; limit?: number }) =>
    extract<{ cards: SpacedRepetitionCard[]; count: number; generated_at: string }>(
      http.get("/planning/spaced-repetition/due/", { params })
    ),

  reviewSpacedRepetitionCard: (payload: { card_id: string; quality: number }) =>
    extract<{ card: SpacedRepetitionCard }>(
      http.post("/planning/spaced-repetition/review/", payload)
    ),

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

  createStandalonePlan: (payload: {
    intent: string;
    plan_type: "academic" | "exploration" | "project_based";
  }) =>
    extract<{ success: boolean; session_id: string; message: string }>(
      http.post("/planning/standalone/", payload)
    ),
};

// PLAYGROUND ----------------------------------------------------------------
export const playgroundApi = {
  executeCode: (payload: {
    language: string;
    source_code: string;
    stdin?: string;
    args?: string[];
  }) =>
    extract<{
      status: "queued" | "completed" | "error";
      stdout?: string;
      stderr?: string;
      compile_output?: string;
      time?: number;
      memory?: number;
      exit_code?: number;
      message?: string;
    }>(http.post("/playground/execute/", payload)),
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
  getLedger: (page = 1) =>
    extract<{ entries: GamificationActivity[]; page: number; per_page: number; total: number; has_more: boolean }>(
      http.get("/gamification/points/ledger/", { params: { page } })
    ),
  useStreakFreeze: () =>
    extract<{ profile: GamificationPointsProfile }>(
      http.post("/gamification/points/use_streak_freeze/")
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
  risk_score?: number;
  momentum_score?: number;
  consistency_score?: number;
  completion_velocity_14d?: number;
  completed_last_14d?: number;
  overdue_tasks?: number;
  upcoming_tasks_7d?: number;
  insight_summary?: string;
  recommended_interventions?: string[];
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
  avg_completion_rate: number;
  avg_risk_score: number;
  avg_consistency_score: number;
  avg_momentum_score: number;
  overdue_tasks_total: number;
  students_needing_intervention: number;
  momentum_distribution: { improving: number; stable: number; declining: number };
  intervention_playbook: string[];
  high_momentum_students: { name: string; momentum_score: number }[];
};

// INSTITUTIONS --------------------------------------------------------------
export const institutionsApi = {
  listCohorts: (params?: { org?: string }) =>
    extract<{ id: string; name: string; mentor_name?: string | null; student_count?: number; is_active?: boolean }[]>(
      http.get("/institutions/cohorts/", { params })
    ),
  createCohort: (payload: { name: string; mentor_user?: string | null; org?: string }) =>
    extract<{ id: string; name: string }>(http.post("/institutions/cohorts/", payload)),
  cohortDashboard: (cohortId: string, params?: { org?: string }) =>
    extract<{ cohort_id: string; cohort_name: string; total_students: number; students: CohortStudentInsight[] }>(
      http.get(`/institutions/cohorts/${cohortId}/dashboard/`, { params })
    ),
  studentInsight: (studentId: string, params?: { org?: string }) =>
    extract<CohortStudentInsight>(
      http.get(`/institutions/students/${studentId}/insight/`, { params })
    ),
  listStudentInterventions: (studentId: string, params?: { org?: string }) =>
    extract<StudentIntervention[]>(
      http.get(`/institutions/students/${studentId}/interventions/`, { params })
    ),
  createStudentIntervention: (
    studentId: string,
    payload: { action_type: StudentIntervention["action_type"]; notes?: string; org?: string }
  ) =>
    extract<StudentIntervention>(
      http.post(`/institutions/students/${studentId}/interventions/`, payload)
    ),
  inviteCohortCSV: (cohortId: string, file: File, org?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (org) formData.append("org", org);
    return extract<{ message: string; task_id: string }>(
      http.post(`/institutions/cohorts/${cohortId}/invite-csv/`, formData)
    );
  },
  createOrganization: (payload: { name: string; slug: string; domain?: string }) =>
    extract<{ id: string; name: string; slug: string }>(
      http.post("/institutions/orgs/", payload)
    ),
  getOrgSummary: (params?: { org?: string }) =>
    extract<Organization>(http.get("/institutions/org/", { params })),
  listEducators: (params?: { org?: string }) =>
    extract<{ id: string; email: string; name: string; role: string }[]>(http.get("/institutions/educators/", { params })),
  listOrgUsers: (params?: { role?: string; org?: string }) =>
    extract<OrgUser[]>(http.get("/institutions/users/", { params })),
  updateOrgUser: (userId: string, payload: { role?: string; is_active?: boolean; org?: string }) =>
    extract<OrgUser>(http.patch(`/institutions/users/${userId}/`, payload)),
  resetOrgUserPassword: (userId: string, payload?: { org?: string }) =>
    extract<{ message: string }>(http.post(`/institutions/users/${userId}/reset-password/`, payload ?? {})),
  getCohortReport: (cohortId: string, params?: { org?: string }) =>
    extract<CohortReport>(http.get(`/institutions/cohorts/${cohortId}/report/`, { params })),
  getSupportTickets: (params?: { status?: string; priority?: string; ticket_type?: string; org?: string; page?: number; page_size?: number }) =>
    extract<{ count: number; results: SupportTicket[] }>(http.get("/institutions/support-tickets/", { params })),
  createSupportTicket: (payload: { subject: string; description: string; ticket_type: string; priority: string; metadata?: Record<string, unknown> }) =>
    extract<SupportTicket>(http.post("/institutions/support-tickets/", payload)),
  updateSupportTicketStatus: (ticketId: string, status: string) =>
    extract<SupportTicket>(http.patch(`/institutions/support-tickets/${ticketId}/`, { status })),
  exportCohortCSV: (cohortId: string, params?: { org?: string }) =>
    http.get(`/institutions/cohorts/${cohortId}/export/`, { params, responseType: "blob" }),
};

export interface SupportTicket {
  id: string;
  user_email: string;
  user_name: string;
  organization_id?: string | null;
  organization_name?: string | null;
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
  is_profile_public?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
  weekly_reports?: boolean;
  from_waitlist?: boolean;
  waitlist_tokens?: number;
  waitlist_tokens_imported?: boolean;
  organization_id?: string | null;
  organization_name?: string | null;
  last_activity: string | null;
  created_at: string;
}

export interface HQUserGovernanceDetail {
  user: GlobalUser;
  organization: {
    id: string | null;
    name: string | null;
    role: string | null;
  };
  access_controls: {
    is_active: boolean;
    is_staff: boolean;
    is_superuser: boolean;
    user_type: string;
    is_profile_public: boolean;
    email_notifications: boolean;
    push_notifications: boolean;
    weekly_reports: boolean;
  };
  wishlist_access: {
    enabled: boolean;
    from_waitlist: boolean;
    waitlist_tokens: number;
    waitlist_tokens_imported: boolean;
  };
  portfolio_access: {
    is_public: boolean;
    allow_downloads: boolean;
    slug: string | null;
  };
  token_usage: {
    chat_tokens_total: number;
    chat_tokens_30d: number;
    intelligence_tokens_total: number;
    intelligence_tokens_30d: number;
    combined_tokens_total: number;
    combined_tokens_30d: number;
    chat_messages_with_usage_total: number;
    chat_messages_with_usage_30d: number;
    conversation_count: number;
    active_sessions: number;
  };
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

  listOrganizations: (params?: { search?: string; tier?: string; active?: string; page?: number; page_size?: number }) =>
    extract<{ count: number; results: Organization[] }>(http.get("/institutions/hq/orgs/", { params })),

  getOrganization: (orgId: string) =>
    extract<Organization>(http.get(`/institutions/hq/orgs/${orgId}/`)),

  updateOrganization: (orgId: string, payload: Partial<Organization>) =>
    extract<Organization>(http.patch(`/institutions/hq/orgs/${orgId}/`, payload)),

  createOrganization: (payload: { name: string; slug: string; domain?: string; contact_email?: string; plan_tier?: string; max_cohorts?: number; max_students_per_cohort?: number; max_educators?: number }) =>
    extract<Organization>(http.post("/institutions/orgs/", payload)),

  listUsers: (params?: { search?: string; user_type?: string; is_active?: string; org?: string; page?: number; page_size?: number }) =>
    extract<{ count: number; results: GlobalUser[] }>(http.get("/institutions/hq/users/", { params })),

  updateUser: (userId: string, payload: { is_active?: boolean; is_staff?: boolean; is_superuser?: boolean; user_type?: string }) =>
    extract<GlobalUser>(http.patch(`/institutions/hq/users/${userId}/`, payload)),

  getUserGovernance: (userId: string) =>
    extract<HQUserGovernanceDetail>(http.get(`/institutions/hq/users/${userId}/governance/`)),

  updateUserGovernance: (
    userId: string,
    payload: Partial<{
      is_active: boolean;
      is_staff: boolean;
      is_superuser: boolean;
      user_type: string;
      is_profile_public: boolean;
      email_notifications: boolean;
      push_notifications: boolean;
      weekly_reports: boolean;
      from_waitlist: boolean;
      waitlist_tokens: number;
      waitlist_tokens_imported: boolean;
      wishlist_access_enabled: boolean;
      portfolio_is_public: boolean;
      portfolio_allow_downloads: boolean;
    }>
  ) => extract<HQUserGovernanceDetail>(http.patch(`/institutions/hq/users/${userId}/governance/`, payload)),

  getInviteAuditLog: (params?: { org?: string; result?: string; page?: number; page_size?: number }) =>
    extract<{ count: number; results: InviteAuditLog[] }>(http.get("/institutions/hq/invite-logs/", { params })),

  // Tickets with HQ filters
  getSupportTickets: (params?: { status?: string; priority?: string; ticket_type?: string; org?: string; page?: number; page_size?: number }) =>
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

// AUDIT ----------------------------------------------------------------------
export const auditApi = {
  createAudit: (payload: FormData | Record<string, unknown>) =>
    extract<ExperienceAudit>(http.post("/audits/", payload)),

  getAudit: (auditId: string) =>
    extract<ExperienceAudit>(http.get(`/audits/${auditId}/`)),

  getReport: (auditId: string) =>
    extract<AuditReport>(http.get(`/audits/${auditId}/report/`)),

  getEligibility: (auditId: string) =>
    extract<{
      audit_id: string;
      roadmap_eligibility: VeloRoadmapEligibility;
      verification_tier: "starter" | "full";
      mentor_context_status: "pending" | "confirmed";
      can_generate_roadmap: boolean;
      roadmap_unlocked: boolean;
      can_promote_public: boolean;
    }>(http.get(`/audits/${auditId}/eligibility/`)),

  getPublicReport: (auditId: string) =>
    extract<AuditReport>(http.get(`/audits/${auditId}/public/`)),

  submitNarrative: (auditId: string, payload: FormData) =>
    extract<{ status: string }>(
      http.post(`/audits/${auditId}/submit-narrative/`, payload)
    ),
  mentorHandoff: (auditId: string) =>
    extract<{
      audit_id: string;
      conversation_id: string;
      chat_url: string;
      mentor_context_status: "pending" | "confirmed";
    }>(http.post(`/audits/${auditId}/mentor-handoff/`)),
  confirmMentorContext: (
    auditId: string,
    payload: {
      intake_payload: Record<string, unknown>;
      source?: "chat" | "chat_auto" | "chat_button" | "manual";
    }
  ) =>
    extract<{
      audit_id: string;
      mentor_context_status: "pending" | "confirmed";
      mentor_context_confirmed_at?: string | null;
      roadmap_unlocked?: boolean;
    }>(http.post(`/audits/${auditId}/mentor-context/confirm/`, payload)),

  autoConfirmMentorContext: (auditId: string, payload: { message: string }) =>
    extract<{
      confirmed: boolean;
      reason?: string;
      error?: string;
      missing_fields?: string[];
      mentor_context_status?: "pending" | "confirmed";
      roadmap_unlocked?: boolean;
    }>(http.post(`/audits/${auditId}/mentor-context/auto-confirm/`, payload)),

  onboardingDiscovery: (payload: {
    answers: {
      has_resume?: boolean;
      education_stage?: string;
      domain_family?: string;
      has_projects?: boolean;
    };
  }) =>
    extract<{
      track: VeloOnboardingTrack;
      audit_mode: VeloAuditMode;
      domain_family: string;
      next_step: string;
    }>(http.post("/audits/onboarding/discovery/", payload)),

  onboardingEvidence: (payload: FormData | Record<string, unknown>) =>
    extract<{
      audit_id: string;
      track: VeloOnboardingTrack;
      audit_mode: VeloAuditMode;
      roadmap_eligibility: VeloRoadmapEligibility;
      verification_tier: "starter" | "full";
      next_step: string;
      domain_rubric?: Record<string, unknown>;
    }>(http.post("/audits/onboarding/evidence/", payload)),

  getOnboardingSession: () =>
    extract<VeloOnboardingSession>(http.get("/audits/onboarding/session/")),

  advanceOnboardingSession: (nextStep: VeloOnboardingSession["current_step"]) =>
    extract<{ status: string; current_step: string }>(
      http.post("/audits/onboarding/session/advance/", { next_step: nextStep })
    ),

  saveOnboardingDraft: (payload: { step: string; payload: Record<string, unknown>; client_saved_at?: string }) =>
    extract<{ status: string; step: string; saved_at: string; reason?: string }>(
      http.post("/audits/onboarding/session/save-draft/", payload)
    ),

  getQueueSlots: () =>
    extract<AuditQueueSlot>(http.get("/audit-queue/slots/")),

  claimQueueSlot: (payload: { audit_id: string; quiz_score: number; quiz_payload?: Record<string, unknown> }) =>
    extract<{ status: string; message?: string; remaining?: number }>(
      http.post("/audit-queue/claim/", payload)
    ),

  startInterrogation: (auditId: string) =>
    extract<{
      session_id: string;
      question: string | null;
      question_index: number;
      total_questions: number;
      question_generation?: { source: "ai" | "template" | "static"; fallback_reason: string };
    }>(
      http.post("/interrogations/start/", { audit_id: auditId })
    ),

  answerInterrogation: (sessionId: string, payload: { answer: string; latency_ms?: number }) =>
    extract<{ status: string; next_question: string | null; question_index?: number; total_questions?: number }>(
      http.post(`/interrogations/${sessionId}/answer/`, payload)
    ),

  completeInterrogation: (sessionId: string) =>
    extract<{
      status: string;
      audit_id: string;
      hm_score?: number | null;
      audit_status?: string;
      question_generation?: { source: "ai" | "template" | "static"; fallback_reason: string };
    }>(
      http.post(`/interrogations/${sessionId}/complete/`)
    ),

  getMirrorLatest: () =>
    extract<{
      status: "empty" | "running" | "ready" | "failed";
      analysis_job?: {
        job_id: string;
        status: "queued" | "running" | "completed" | "failed";
        error?: string | null;
      };
      mirror: null | {
        id: string;
        analysis_job_id?: string | null;
        source_resume_payload: Record<string, unknown>;
        normalized_profile: Record<string, unknown>;
        skill_gaps: string[];
        strengths: string[];
        confidence: Record<string, number>;
        missing_prompts: string[];
        role_readiness_narrative: string;
        deep_analysis?: {
          ats_score?: number;
          ats_breakdown?: {
            keyword_match?: { score: number; max: number; present: string[]; missing: string[] };
            impact_statements?: { score: number; max: number; quantified_count: number; total_bullets: number };
            summary_quality?: { score: number; max: number; has_summary: boolean };
            skills_coverage?: { score: number; max: number };
            format_signals?: { score: number; max: number; issues: string[] };
          };
          experience_analysis?: Array<{
            company: string;
            role: string;
            ats_commentary: string;
            impact_score: number;
            quantified_bullets: number;
            total_bullets: number;
            improvement_suggestions: string[];
            relevance_to_target: "high" | "medium" | "low";
          }>;
          project_analysis?: Array<{
            title: string;
            relevance_score: number;
            technical_depth_score: number;
            commentary: string;
            highlighted_skills: string[];
            improvement_suggestions: string[];
          }>;
          skill_gap_details?: Array<{
            skill: string;
            priority: "P1" | "P2" | "P3";
            why_matters: string;
            how_to_fill: string;
            time_estimate: string;
          }>;
          improvement_actions?: Array<{
            priority: number;
            action: string;
            impact: "high" | "medium" | "low";
            effort: "high" | "medium" | "low";
          }>;
          keyword_optimization?: {
            target_role: string;
            present_keywords: string[];
            missing_high_value: string[];
            density_score: number;
          };
        };
        created_at: string;
        updated_at: string;
      };
    }>(http.get("/mirror/latest/")),

  reviewVeloMentorIntake: (auditId: string) =>
    extract<VeloMentorReviewResponse>(http.post(`/audits/${auditId}/mentor-intake/review/`)),

  getAdminMetrics: () =>
    extract<{ total_audits: number; verified: number; narrative_validated: number; unverified: number; completion_rate: number }>(
      http.get("/audits/admin/metrics/")
    ),
  getInstitutionOverview: () =>
    extract<AuditInstitutionOverview>(http.get("/audits/institutions/overview/")),
  getInstitutionStudents: (params?: { page?: number; page_size?: number }) =>
    extract<{ count: number; page: number; page_size: number; results: AuditInstitutionStudentRow[] }>(
      http.get("/audits/institutions/students/", { params })
    ),
  getInstitutionStudentDetail: (studentId: string) =>
    extract<AuditInstitutionStudentDetail>(http.get(`/audits/institutions/students/${studentId}/`)),
};
