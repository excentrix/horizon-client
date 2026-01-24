
export type UUID = string;

export interface ApiMetadata {
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface UserSummary {
  id: UUID;
  username: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone_number?: string;
  user_type: "student" | "parent" | "educator" | "admin";
  university?: string;
  major?: string;
  year?: string;
  gpa?: string;
  graduation_year?: number;
  career_goals?: string;
  interests?: string[];
  learning_style?: string;
  is_profile_public: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  onboarding_completed: boolean;
  last_activity: string | null;
  created_at: string;
  profile_completion: number;
}

export interface LoginResponse extends ApiMetadata {
  user: UserSummary;
  session: SessionTokens;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember_me?: boolean;
  device_info?: Record<string, unknown>;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  user_type?: UserSummary["user_type"];
  university?: string;
  major?: string;
  year?: string;
  graduation_year?: number;
  career_goals?: string;
  interests?: string[];
  terms_accepted: boolean;
  privacy_policy_accepted: boolean;
}

export interface UserPreferences {
  email_digest_frequency: "daily" | "weekly" | "monthly" | "never";
  conversation_style: "formal" | "casual" | "friendly" | "professional";
  ai_personality: "supportive" | "challenging" | "analytical" | "creative";
  data_sharing_consent: boolean;
  analytics_consent: boolean;
  marketing_consent: boolean;
  dark_mode: boolean;
  language: string;
  accessibility_features: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileDetail {
  previous_education: unknown[];
  academic_achievements: unknown[];
  extracurricular_activities: unknown[];
  work_experience: unknown[];
  skills: string[];
  certifications: string[];
  languages: string[];
  bio?: string;
  website?: string;
  linkedin_url?: string;
  github_url?: string;
  timezone?: string;
  preferred_communication_hours: Record<string, unknown>;
  mentor_preferences: Record<string, unknown>;
  resume_url?: string;
  transcript_url?: string;
  portfolio_url?: string;
  created_at?: string;
  updated_at?: string;
}

export type ConversationStatus =
  | "active"
  | "paused"
  | "completed"
  | "archived";

export type ConversationPriority = "low" | "normal" | "high" | "urgent";

export interface AIPersonality {
  id: UUID;
  name: string;
  type: "general" | "supportive" | "analytical" | "creative" | "practical" | "socratic" | "motivational" | "specialized";
  description: string;
  system_prompt?: string;
  avatar_url?: string;
  creativity_level: number;
  formality_level: "casual" | "professional" | "academic";
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export interface ConversationSummary {
  id: UUID;
  summary: string;
  key_points: string[];
  action_items: string[];
  sentiment_analysis: Record<string, unknown>;
  messages_included: number;
  summary_type: "periodic" | "manual" | "completion";
  ai_model_used: string;
  tokens_used: number;
  created_at: string;
}

export interface Conversation {
  id: UUID;
  title: string;
  topic: string;
  description?: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  is_pinned: boolean;
  notifications_enabled: boolean;
  context_window: number;
  message_count: number;
  user_satisfaction_rating?: number;
  last_activity: string;
  created_at: string;
  updated_at: string;
  ai_personality: AIPersonality;
  recent_messages?: ChatMessage[];
  last_message?: {
    id: UUID;
    content: string;
    sender_type: SenderType;
    created_at: string;
  } | null;
}

export interface ConversationAnalysis {
  id: UUID;
  conversation_id: UUID;
  conversation_title?: string;
  user_name?: string;
  primary_domain?: UUID | null;
  primary_domain_name?: string | null;
  secondary_domains_names?: string[];
  urgency_level?: string | null;
  engagement_score?: number | null;
  overall_sentiment?: string | null;
  key_insights?: string[];
  analysis_metadata?: Record<string, unknown> | null;
  analysis_results?: Record<string, unknown> | null;
  analyzed_at?: string | null;
  analysis_version?: string | null;
}

export type MessageType =
  | "text"
  | "file"
  | "image"
  | "voice"
  | "system";

export type SenderType = "user" | "ai" | "system";

export interface ChatMessage {
  id: UUID;
  conversation?: UUID;
  content: string;
  message_type: MessageType;
  sender_type: SenderType;
  sender_name?: string;
  sequence_number: number;
  ai_model_used?: string;
  tokens_used?: number;
  processing_time?: number;
  is_edited: boolean;
  is_flagged: boolean;
  flag_reason?: string;
  attachments?: unknown[];
  metadata?: {
    graph_learning_snapshot?: GraphLearningSnapshot;
    graph_career_snapshot?: GraphCareerSnapshot;
    guardrails?: GuardrailsMetadata;
    safety?: SafetyMetadata;
    agent_tools?: string[];
    tool_invocations?: ToolInvocation[];
    tool_runtime_invocations?: ToolInvocation[];
    [key: string]: unknown;
  } | null;
  cortex?: {
    agent: string;
    confidence: number;
    reason: string;
    suggested_actions?: MentorAction[];
  };
  created_at: string;
  updated_at: string;
}

export interface GraphLearningSnapshot {
  focus_concepts: Array<{
    name: string;
    type: string;
    domain?: string;
  }>;
  mastery_map: Record<
    string,
    {
      level: string;
      confidence: number;
      updated_at: string;
    }
  >;
  missing_prerequisites: Record<string, string[]>;
}

export interface GraphCareerSnapshot {
  goals: Array<{
    id: string;
    title: string;
    status: string;
    type: string;
    domains: string[];
    competencies: string[];
  }>;
}

export interface GuardrailsMetadata {
  enforced: boolean;
  risk_level: string;
  notes?: string;
  triggered_categories?: string[];
}

export interface SafetyMetadata {
  score: number;
  flagged: boolean;
  label: string;
  categories?: string[];
  block_reason?: string;
}

export interface ToolInvocation {
  tool: string;
  input: string;
  output: string;
  status: "success" | "error";
  timestamp: string;
}

export interface MentorAction {
  type: "view_plan" | "open_plan_task" | "confirm_plan_intent" | "open_link";
  label: string;
  description?: string;
  data?: Record<string, unknown>;
  plan_id?: UUID | string | null;
  task_id?: UUID | string | null;
  task_title?: string;
  href?: string;
  message_template?: string;
  payload?: Record<string, unknown>;
}

export type PlanBuildStatus = "idle" | "queued" | "in_progress" | "warning" | "completed" | "failed";

export interface PlanUpdateEvent {
  type: "plan_update";
  data: {
    id: string;
    conversation_id?: string;
    status: string;
    message: string;
    plan_id?: string;
    plan_title?: string;
    task_count?: number;
    timestamp?: string;
    agent?: string;
    tool?: string;
    step_type?: string;
  };
}

export type TaskStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "skipped"
  | "rescheduled"
  | "overdue";

export type TaskType =
  | "practice"
  | "reading"
  | "video"
  | "application"
  | "project"
  | "review"
  | "assessment"
  | "discussion"
  | "research"
  | "hands_on";

export interface DailyTask {
  id: UUID;
  learning_plan: UUID;
  title: string;
  description: string;
  task_type: TaskType;
  scheduled_date: string;
  scheduled_time?: string | null;
  estimated_duration_minutes: number;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  prerequisites: string[];
  resources_needed: string[];
  environment_requirements: Record<string, unknown>;
  ai_generated_hints: string[];
  ai_generated_examples: unknown[];
  online_resources: unknown[];
  current_tools_versions: Record<string, unknown>;
  kpis?: Array<{ metric?: string; target?: string }>;
  verification?: { method?: string; criteria?: string };
  adaptive_difficulty: boolean;
  status: TaskStatus;
  started_at?: string | null;
  completed_at?: string | null;
  actual_duration_minutes?: number | null;
  effectiveness_rating?: number | null;
  difficulty_rating?: number | null;
  completion_notes?: string;
  milestone_id?: string | null;
  milestone_title?: string | null;
  created_at: string;
  updated_at: string;
}

export type PlanStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "abandoned";

export interface LearningPlan {
  id: UUID;
  user: UUID;
  title: string;
  description: string;
  plan_type:
    | "academic"
    | "career"
    | "hybrid"
    | "skill_building"
    | "project_based";
  difficulty_level: "beginner" | "intermediate" | "advanced" | "expert";
  estimated_duration_weeks: number;
  total_estimated_hours: number;
  status: PlanStatus;
  progress_percentage: number;
  plan_generation_method: string;
  ai_confidence_score: number;
  industry_standards_validated: boolean;
  standards_validation_date?: string | null;
  standards_notes?: string;
  researched_resources: unknown[];
  current_industry_trends: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  daily_tasks?: DailyTask[];
  milestones?: {
    id: UUID;
    milestone_id: string;
    week: number;
    title: string;
    description?: string | null;
    objectives?: string[];
  }[];
  specialized_mentor?: AIPersonality | null;
  specialized_mentor_data?: (AIPersonality & { created_at?: string }) | null;
  primary_domain_name?: string | null;
  user_schedule_snapshot?: Record<string, unknown> | null;
  user_preferences_snapshot?: Record<string, unknown> | null;
  available_resources_snapshot?: string[];
  target_competencies_data?: unknown;
  daily_tasks_summary?: unknown;
  progress_summary?: unknown;
  user_schedule?: unknown;
}

export interface ToastNotification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  action?: {
    text: string;
    url: string;
  };
  timestamp: string;
  auto_dismiss: boolean;
  duration: number;
}

export interface InsightCard {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  created_at: string;
  tags?: string[];
}

export interface IntelligenceOverview {
  insights: InsightCard[];
  alerts: InsightCard[];
  recommendations: InsightCard[];
  crisis_detected: boolean;
  intervention_required: boolean;
}

export interface PlanCreationResponse extends ApiMetadata {
  success: boolean;
  status?: string;
  session_id?: string;
  task_id?: string;
  learning_plan_id?: UUID;
  mentor_id?: UUID | null;
  specialized_conversation_id?: UUID;
  plan_title?: string;
  task_count?: number;
  estimated_duration?: number;
  crew_execution_summary?: Record<string, unknown>;
  error?: string;
}

export interface MultiDomainDashboard {
  user_info: Record<string, unknown>;
  academic_overview: Record<string, unknown>;
  career_overview: Record<string, unknown>;
  wellness_overview: Record<string, unknown>;
  domain_integration: Record<string, unknown>;
  cross_domain_insights: Array<Record<string, unknown>>;
  competency_growth: Record<string, unknown>;
  goal_progression: Record<string, unknown>;
  wellness_trends: Record<string, unknown>;
  urgent_alerts: Array<Record<string, unknown>>;
  recommendations: Array<Record<string, unknown>>;
  overall_progress_score: number;
  domain_balance_score: number;
  wellness_risk_level: string;
  generated_at: string;
  data_completeness: Record<string, unknown>;
}

export interface WellnessMonitoring {
  profile: Record<string, unknown> | null;
  recent_assessments: number;
  crisis_alerts: Array<Record<string, unknown>>;
  wellness_trends: Record<string, unknown>;
  support_recommendations: Array<Record<string, unknown>>;
  intervention_priority: Record<string, unknown>;
  assessment_history?: Array<Record<string, unknown>>;
}

export interface AcademicProgressOverview {
  learning_trajectory: Record<string, unknown>;
  engagement_trends: Record<string, unknown>;
  comprehension_progression: Record<string, unknown>;
  academic_competencies: Array<Record<string, unknown>>;
  academic_wellness_correlation: Record<string, unknown>;
  subject_performance?: Record<string, unknown>;
  performance_predictions?: Record<string, unknown>;
}

export interface CareerReadinessAssessment {
  overall_readiness_score: number;
  competency_breakdown: Record<string, unknown>;
  career_stage_assessment: Record<string, unknown>;
  industry_interest_analysis: Record<string, unknown>;
  professional_development_recommendations: Array<Record<string, unknown>>;
  target_career_analysis?: Record<string, unknown>;
  skill_gaps?: Array<Record<string, unknown>>;
}

export interface UniversalGoalsManagement {
  goals: Array<Record<string, unknown>>;
  goals_summary: Record<string, unknown>;
  domain_distribution: Record<string, unknown>;
  progress_analytics: Record<string, unknown>;
  achievement_insights: Array<Record<string, unknown>>;
  recommendations: Array<Record<string, unknown>>;
}

export interface IntelligenceInsightItem {
  id: string;
  title: string;
  description: string;
  insight_type: string;
  urgency_level: string;
  confidence_score: number;
  recommended_actions: Array<string | Record<string, unknown>>;
  generation_method?: string;
  stakeholder_type: string;
  is_active: boolean;
  is_read: boolean;
  generated_at: string;
  expires_at?: string | null;
  related_subjects_names?: string[];
  related_skills_names?: string[];
  related_goals_titles?: string[];
  supporting_data?: Record<string, unknown>;
}

export interface InsightsFeedResponse {
  insights: IntelligenceInsightItem[];
  insights_summary: Record<string, unknown>;
  domain_breakdown: Record<string, unknown>;
  urgency_distribution: Record<string, unknown>;
  action_items: Array<Record<string, unknown>>;
}

export interface ComprehensiveProgressReport {
  period_start: string;
  period_end: string;
  executive_summary: Record<string, unknown>;
  domain_progress: Record<string, unknown>;
  competency_development: Record<string, unknown>;
  goal_achievements: Record<string, unknown>;
  cross_domain_insights: Array<Record<string, unknown>>;
  areas_for_improvement: Array<Record<string, unknown>>;
  strengths_and_achievements: Array<Record<string, unknown>>;
  future_projections?: Record<string, unknown>;
  overall_growth_rate?: number;
  domain_growth_rates?: Record<string, unknown>;
}

export interface MemoryItem {
  id?: string;
  memory?: string;
  content?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface AgentRuntimeStep {
  id: string;
  agent: string;
  step: string;
  status: "running" | "completed" | "failed" | "waiting_for_input";
  timestamp: string;
  details?: string;
  input?: unknown;
  output?: unknown;
  confidence?: number;
}

export interface InsightEvent {
  id: string;
  type: "crisis" | "trend" | "milestone" | "recommendation";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  is_read: boolean;
}

export interface MissingInformationItem {
  id: string;
  field: string;
  question: string;
  context?: string;
  status: "pending" | "resolved" | "skipped";
  timestamp: string;
}
