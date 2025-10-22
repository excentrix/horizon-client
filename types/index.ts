
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
  type: "supportive" | "analytical" | "creative" | "practical" | "socratic" | "motivational" | "specialized";
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
  created_at: string;
  updated_at: string;
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
  adaptive_difficulty: boolean;
  status: TaskStatus;
  started_at?: string | null;
  completed_at?: string | null;
  actual_duration_minutes?: number | null;
  effectiveness_rating?: number | null;
  difficulty_rating?: number | null;
  completion_notes?: string;
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
  learning_plan_id?: UUID;
  mentor_id?: UUID | null;
  plan_title?: string;
  task_count?: number;
  estimated_duration?: number;
  crew_execution_summary?: Record<string, unknown>;
  error?: string;
}
