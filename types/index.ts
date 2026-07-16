
export type UUID = string;

// ─── Scene Action Model ────────────────────────────────────────────────────
// The playback engine executes a sequence of actions per lesson block.
// Backend generates these; frontend plays them back in order.

export type AgentRole = "teacher" | "peer_curious" | "peer_skeptic" | "narrator";

export interface AgentConfig {
  role: AgentRole;
  name: string;
  avatar: string;         // emoji or URL
  voice?: SpeechSynthesisVoice | null;
  accent_color: string;   // tailwind bg class e.g. "bg-violet-500"
}

// Whiteboard element primitives
export type WbElement =
  | { kind: "circle";   id: string; x: number; y: number; r: number; label?: string; color?: string; fill?: string }
  | { kind: "rect";     id: string; x: number; y: number; w: number; h: number; label?: string; color?: string; fill?: string }
  | { kind: "arrow";    id: string; x1: number; y1: number; x2: number; y2: number; label?: string; color?: string; dashed?: boolean }
  | { kind: "text";     id: string; x: number; y: number; text: string; size?: number; bold?: boolean; color?: string }
  | { kind: "formula";  id: string; x: number; y: number; latex: string; color?: string }
  | { kind: "line";     id: string; x1: number; y1: number; x2: number; y2: number; color?: string; dashed?: boolean }
  | { kind: "callout";  id: string; x: number; y: number; w: number; h: number; text: string; color?: string };

// Individual action types
export type SceneAction =
  | {
      type: "speech";
      agent: AgentRole;
      text: string;
      tts?: boolean;
      highlight_ids?: string[];   // wb element IDs to spotlight while speaking
    }
  | {
      type: "wb_draw";
      elements: WbElement[];
      animate?: boolean;
      stagger_ms?: number;        // delay between each element appearing
    }
  | {
      type: "wb_highlight";
      ids: string[];
      color?: string;
      duration_ms?: number;
    }
  | {
      type: "wb_clear";
      fade?: boolean;
    }
  | {
      type: "pause";
      duration_ms: number;        // 0 = wait for explicit user "Continue"
      prompt?: string;
    }
  | {
      type: "quiz";
      question: string;
      options: string[];
      correct: number;            // index into options
      explanation?: string;
      blocking?: boolean;         // must answer correctly to advance
    }
  | {
      type: "peer_challenge";
      agent: AgentRole;
      text: string;
      tts?: boolean;
    }
  | {
      type: "discussion";
      prompt: string;             // pre-seeds the mentor dock
    }
  | {
      type: "widget";
      widget_type: "simulation" | "code_walkthrough" | "timeline" | "comparison" | "code_lab" | "game" | "explorer";
      config: {
        html_content?: string;
        title?: string;
        description?: string;
        estimated_seconds?: number;
        [key: string]: unknown;
      };
    }
  | {
      type: "spotlight";
      x: number;
      y: number;
      r?: number;
      duration_ms: number;
      color?: string;
    }
  | {
      type: "laser";
      x: number;
      y: number;
      duration_ms?: number;
      color?: string;
    }
  | {
      type: "widget_set_state";
      payload: Record<string, unknown>;
      wait_ms?: number;
    }
  | {
      type: "widget_highlight";
      selector?: string;
      label?: string;
      payload?: Record<string, unknown>;
      wait_ms?: number;
    }
  | {
      type: "widget_annotation";
      text: string;
      x?: number;
      y?: number;
      payload?: Record<string, unknown>;
      wait_ms?: number;
    }
  | {
      type: "widget_reveal";
      target?: string;
      payload?: Record<string, unknown>;
      wait_ms?: number;
    };

export interface LessonBlock {
  id?: string;
  title?: string;
  type?:
    | "objective"
    | "concept"
    | "example"
    | "recap"
    | "exercise"
    | "interactive_sim"
    | "agent_dialogue"
    | "code_challenge"
    | "whiteboard_sketch"
    | "project_brief"
    | "project_checkpoint"
    | "feynman_probe"
    | "quiz";
  content?: string;
  resource_id?: string;
  verified?: boolean;
  source_url?: string | null;
  html_content?: string;
  description?: string;
  // Legacy agent_dialogue support
  turns?: Array<{
    speaker?: string;
    persona_type?: string;
    text?: string;
    voice_hint?: string;
  }>;
  // Legacy code_challenge support
  starter_code?: string;
  language?: string;
  test_cases?: Array<{ input?: string; expected_output?: string }>;
  hints?: string[];
  estimated_seconds?: number;
  // feynman_probe fields
  instructions?: string;
  probes?: Array<{
    id?: string;
    type?: "explain" | "predict" | "contrast" | "apply";
    prompt?: string;
    target_concept?: string;
    reveal_hint?: string;
    depth_question?: string;
  }>;
  // quiz block fields (from _generate_quiz_scene)
  questions?: Array<{
    id?: string;
    type?: "multiple_choice" | "true_false" | "short_answer";
    difficulty?: string;
    points?: number;
    question?: string;
    statement?: string;
    options?: Array<{ id: string; text: string }>;
    correct_option?: string;
    correct_answer?: boolean;
    expected_answer?: string;
    key_concepts?: string[];
    rubric?: { full_marks?: string; partial_marks?: string; no_marks?: string };
    concept_tested?: string;
    commentPrompt?: string;
    explanation?: string;
  }>;
  analysis?: string;
  // NEW: action model — populated by generate_scene_actions endpoint
  actions?: SceneAction[];
  actions_generated?: boolean;
  actions_generating?: boolean;  // frontend-only optimistic flag
}
// ──────────────────────────────────────────────────────────────────────────────

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
  access?: string;
  refresh?: string;
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
  is_staff?: boolean;
  is_superuser?: boolean;
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
  resume_payload?: Record<string, unknown>;
  resume_parsed_at?: string;
  resume_source?: string;
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
  type: "general" | "supportive" | "analytical" | "creative" | "practical" | "socratic" | "motivational" | "specialized" | "plan_generated";
  description: string;
  system_prompt?: string;
  avatar_url?: string;
  creativity_level: number;
  formality_level: "casual" | "professional" | "academic";
  is_active: boolean;
  usage_count: number;
  created_at: string;
  archetype?: string;
  is_generated?: boolean;
  persona_preview?: string;
  mentor_profile?: {
    age?: number | null;
    current_role?: string | null;
    years_in_domain?: number | null;
    domain?: string | null;
    career_entry_story?: string | null;
    how_i_got_in?: string | null;
    biggest_time_wasters?: string[];
    what_actually_worked?: string[];
    current_honest_gaps?: string[];
    communication_texture?: string | null;
    teaching_philosophy?: string | null;
    adaptation_overlay?: {
      bridging_paragraph?: string;
      tone_adjustment?: string;
      priority_gap_framing?: string;
      relevant_waster_indices?: number[];
      relevant_worked_indices?: number[];
    } | null;
  } | null;
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
  is_intake?: boolean;
  intake_state?: Record<string, unknown>;
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
  type: "view_plan" | "open_plan_task" | "confirm_plan_intent" | "open_link" | "trigger_plan_generation";
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
  sequence_order: number;
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
  resource_engagement?: Record<string, { opened_at?: string; completed_at?: string }>;
  resource_metadata?: Record<
    string,
    {
      url?: string;
      title?: string;
      content_type?: string;
      excerpt?: string | null;
      verified?: boolean;
      status?: string;
    }
  >;
  current_tools_versions: Record<string, unknown>;
  kpis?: Array<{ metric?: string; target?: string }>;
  verification?: {
    method?: string;
    criteria?: string;
    detailed_instructions?: string;
    problem_statement?: string;
    acceptance_criteria?: string[];
    example_inputs_outputs?: string;
    submission_note?: string;
    ai_generated?: boolean;
    problem_set?: Array<Record<string, unknown>>;
    hidden_test_intent?: string[];
    hidden_test_cases?: Array<Record<string, unknown>>;
    integrity_notice?: string;
  };
  execution_descriptor?: ExecutionDescriptor | Record<string, unknown> | null;
  assessment_config?: {
    id: string;
    verification_type: "auto_quiz" | "code_execution" | "github_repo" | "file_upload" | "text_analysis" | "manual_rubric";
    config: Record<string, unknown>;
    rubric: Record<string, unknown>;
    xp_reward: number;
    badge_reward_id?: string;
  };
  check_in_question?: string;
  check_in_response?: string;
  quiz_payload?: {
    questions?: Array<{
      id: string;
      question: string;
      options: string[];
      answer_index?: number;
      rationale?: string;
    }>;
  };
  flashcard_payload?: {
    cards?: Array<{
      id: string;
      front: string;
      back: string;
      hint?: string | null;
    }>;
  };
  quiz_response?: {
    answers?: Record<string, number>;
    score?: number;
    completed_at?: string;
  };
  milestone_feedback?: {
    milestone_id?: string;
    effort?: number | null;
    understanding?: number | null;
    confidence?: number | null;
    reflection?: string | null;
  };
  lesson_blocks?: LessonBlock[];
  subject_category?: "stem" | "business" | "humanities" | "health" | "cs" | "general" | null;
  lesson_generated_at?: string | null;
  playground_conversation_id?: string | null;
  feynman_conversation_id?: string | null;
  surface_rationale?: string | null;
  adaptive_difficulty: boolean;
  is_skippable: boolean;
  is_locked: boolean;
  locked_by_task_title?: string | null;
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

export interface PortfolioArtifact {
  id: UUID;
  user: UUID;
  title: string;
  description?: string;
  artifact_type: "link" | "file" | "text" | "repo" | "case_study" | "project" | "demo";
  source_task?: UUID | null;
  proof_submission?: UUID | null;
  url?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  status: "draft" | "needs_review" | "verified";
  verification_status?: "pending" | "verified" | "human_verified" | "rejected" | "needs_revision";
  verification_score?: number;
  verification_feedback?: {
    verdict_summary?: string;
    criteria_results?: Array<{
      criterion: string;
      met: boolean;
      score: number;
      evidence: string;
    }>;
    strengths?: string[];
    suggestions?: string[];
    method?: "llm" | "heuristic";
  };
  featured?: boolean;
  tags?: string[];
  visibility?: "private" | "mentors" | "employers" | "public";
  reflection?: string;
  reflection_prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSkillTranscript {
  competency: string;
  best_level: "exposure" | "application" | "mastery";
  evidence_count: number;
  avg_quality: number;
}

export interface PortfolioProfile extends UserSummary {
  headline?: string;
  bio?: string;
  github_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  twitter_url?: string;
  is_public?: boolean;
  slug?: string;
  show_competency_chart?: boolean;
  show_growth_timeline?: boolean;
  show_learning_stats?: boolean;
  view_count?: number;
  verified_artifacts?: number;
}

export interface PublicPortfolioProfile {
  id: UUID;
  slug?: string;
  headline?: string;
  bio?: string;
  theme?: string;
  show_competency_chart?: boolean;
  show_growth_timeline?: boolean;
  show_learning_stats?: boolean;
  view_count?: number;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  twitter_url?: string;
  resume_url?: string;
  is_public?: boolean;
  allow_downloads?: boolean;
  created_at?: string;
  updated_at?: string;
  user_username?: string;
  user_full_name?: string;
  user_avatar_url?: string;
  user_type?: "student" | "parent" | "educator" | "admin";
  user_created_at?: string;
  verified_artifacts?: number;
  featured_artifacts_count?: number;
  total_artifacts?: number;
}

export interface PublicPortfolioResponse {
  profile: PublicPortfolioProfile;
  featured_artifacts: PortfolioArtifact[];
  certifications?: Array<{
    id: string;
    title: string;
    category?: string;
    badge_type?: "verified" | "excellence" | "completion";
    total_hours?: number;
    completed_at?: string;
    issued_date?: string;
  }>;
  competency_chart?: { competencies?: Array<Record<string, unknown>> };
  growth_timeline?: Array<Record<string, unknown>>;
  endorsements?: Array<Record<string, unknown>>;
  stats: {
    total_verified_artifacts: number;
    featured_count: number;
    profile_views: number;
  };
  velo_verified_projects?: Array<{
    project_title: string;
    verification_score: number | null;
    verified_at: string | null;
    submitted_repos: Array<{ url: string; label: string }>;
  }>;
  resume_data?: {
    summary?: string;
    experience?: Array<{
      company?: string;
      role?: string;
      timeframe?: string;
      highlights?: string[];
      technologies?: string[];
    }>;
    projects?: Array<{
      title?: string;
      description?: string;
      technologies?: string[];
      repo_url?: string;
      demo_url?: string;
    }>;
    skills?: string[];
    education?: Array<{
      degree?: string;
      institution?: string;
      year?: string | number;
    }>;
  };
}

export interface SpacedRepetitionCard {
  id: UUID;
  front: string;
  back: string;
  hint?: string | null;
  next_review_date: string;
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  source_task_id?: UUID | null;
}

export interface RoadmapLevel {
  id: UUID;
  level_index: number;
  title: string;
  description?: string;
  objectives: string[];
  duration_weeks: number;
  status: "locked" | "available" | "in_progress" | "completed";
  learning_plan_id?: UUID | null;
  badge_slug?: string;
  exam_required: boolean;
  proof_required: boolean;
  completed_at?: string | null;
  position_x: number;
  position_y: number;
  stage_id: UUID | null;
  criteria?: Record<string, unknown>;
}

export interface RoadmapStage {
  id: UUID;
  title: string;
  description?: string;
  order: number;
  theme_color: string;
  icon: string;
  is_locked: boolean;
  levels: RoadmapLevel[];
}

export interface Roadmap {
  id: UUID;
  target_role?: string;
  created_at: string;
  updated_at: string;
  stages: RoadmapStage[];
}

export interface RoadmapResponse {
  roadmap: Roadmap | null;
}

export interface MentorEngagementNudge {
  type: "prereq" | "stuck" | "stretch" | "momentum" | "steady";
  title: string;
  message: string;
  action_label?: string;
  metadata?: Record<string, unknown>;
}

export interface GamificationBadge {
  id: number;
  name: string;
  slug: string;
  description?: string;
  category: "starter" | "momentum" | "milestone" | "craft";
  icon?: string;
  color?: string;
  points_value?: number;
}

export interface GamificationUserBadge {
  id: number;
  badge: GamificationBadge;
  awarded_at: string;
  context?: Record<string, unknown>;
}

export interface GamificationBadgeAward {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  description?: string;
  awarded_at: string;
}

export interface GamificationPointsProfile {
  total_points: number;
  level: number;
  level_progress: number;
  xp_for_next_level: number;
  level_progress_percentage: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_freezes_available: number;
  streak_freeze_expires_at: string | null;
  updated_at: string;
}

export interface GamificationSummary {
  profile: GamificationPointsProfile;
  recent_badges: Array<GamificationUserBadge | GamificationBadgeAward>;
  recent_activity?: GamificationActivity[];
  badge_count?: number;
}

export interface GamificationActivity {
  id?: number;
  points: number;
  reason: string;
  created_at: string;
}

export interface GamificationLeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  weekly_xp: number;
  level: number;
  current_streak: number;
}

export interface GamificationLeaderboard {
  leaderboard: GamificationLeaderboardEntry[];
  period: string;
  updated_at: string;
}

export interface GamificationEvent {
  event_type: "points_earned" | "level_up" | "badge_earned" | "streak_milestone";
  points?: number;
  reason?: string;
  total_points?: number;
  level?: number;
  level_progress?: number;
  xp_for_next_level?: number;
  current_streak?: number;
  old_level?: number;
  new_level?: number;
  badge_id?: number;
  badge_name?: string;
  badge_slug?: string;
  badge_icon?: string;
  badge_color?: string;
  badge_description?: string;
  points_value?: number;
  timestamp: string;
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
  is_exam_mode?: boolean;
  exam_date?: string | null;
  exam_topic?: string | null;
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
  specialized_mentor_status?: {
    status: string;
    mode?: string | null;
    error?: string | null;
    has_persona: boolean;
    mentor_name?: string | null;
    archetype?: string | null;
    allow_regenerate?: boolean;
    mentor_origin?: string | null;
    mentor_origin_detail?: string | null;
    is_dev_environment?: boolean;
  } | null;
  specialized_conversation_id?: string | null;
  conversation_id?: string | null;
  primary_domain_name?: string | null;
  user_schedule_snapshot?: Record<string, unknown> | null;
  user_preferences_snapshot?: Record<string, unknown> | null;
  available_resources_snapshot?: string[];
  source_analysis?: Record<string, unknown> | null;
  target_competencies_data?: unknown;
  daily_tasks_summary?: {
    total: number;
    completed: number;
    completion_rate: number;
  };
  progress_summary?: {
    current_streak: number;
    best_streak: number;
    total_completed_tasks: number;
    time_invested_minutes: number;
  };
  roadmap_details?: {
    roadmap_id: string;
    stage_title?: string | null;
    level_index: number;
    level_title: string;
    status: string;
  } | null;
  user_schedule?: unknown;
  pre_assessed?: boolean;
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

export interface BrainMapSnapshot {
  plan_id: string;
  focus_concepts: Array<{
    name: string;
    type?: string;
    domain?: string;
  }>;
  mastery_map: Record<
    string,
    {
      level?: string;
      confidence?: number;
      updated_at?: string;
    }
  >;
  missing_prerequisites: Record<string, string[]>;
}

export interface LearnerModelSnapshot {
  learner_profile: {
    generated_at?: string;
    core: {
      preferences?: Record<string, unknown> | null;
      schedule?: Record<string, unknown> | null;
      active_plan?: Record<string, unknown> | null;
      competencies?: Array<Record<string, unknown>> | null;
      wellness?: Record<string, unknown> | null;
      goals?: Array<Record<string, unknown>> | null;
    };
    analysis_sections?: Record<string, unknown>;
    progress_sections?: Record<string, unknown>;
    insight_digest?: Record<string, unknown>;
    runtime?: Record<string, unknown>;
    sections?: Record<string, unknown>;
  };
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
  unblocks?: string;
  status: "pending" | "resolved" | "skipped";
  timestamp: string;
}

// Dashboard Home types
export interface TodayTask {
  id: UUID;
  title: string;
  description: string;
  plan_id: UUID;
  plan_title: string;
  scheduled_date: string | null;
  time_tag: "Overdue" | "Today" | "Upcoming";
  is_overdue: boolean;
  is_today: boolean;
  estimated_duration: number | null;
}

export interface DashboardStreak {
  current: number;
  longest: number;
  at_risk: boolean;
}

export interface WeeklyStats {
  tasks_completed: number;
  xp_earned: number;
  goal_progress: number;
  days_to_milestone: number | null;
}

export interface LearningEfficacySnapshot {
  window_days: number;
  median_time_to_first_pass: number | null;
  stuck_session_rate: number;
  verified_submission_rate: number;
  nudge_recovery_rate: number;
  domain_family_breakdown?: Record<
    string,
    {
      sessions: number;
      verified_rate: number;
      median_time_to_verify_seconds: number | null;
      average_rubric_score: number | null;
    }
  >;
  outcome_gate?: {
    status: "pass" | "fail";
    runtime_envelope_coverage: number;
    false_verified_risk_rate: number;
    thresholds?: {
      runtime_envelope_coverage_min: number;
      false_verified_risk_rate_max: number;
    };
  };
  updated_at: string;
}

export interface ActivityItem {
  type: "task_completed" | "badge_earned" | "artifact_created";
  title: string;
  timestamp: string;
  icon: string;
  task_id?: UUID;
  badge_id?: number;
  artifact_id?: UUID;
}

export interface HomeDashboard {
  today_task: TodayTask | null;
  additional_tasks: TodayTask[];
  streak: DashboardStreak;
  weekly_stats: WeeklyStats;
  learning_efficacy: LearningEfficacySnapshot;
  recent_activity: ActivityItem[];
  generated_at: string;
}

export interface ExecutionDiagnostics {
  ran: boolean;
  passed: boolean;
  score?: number | null;
  summary?: string;
  failure_clusters: {
    syntax: number;
    runtime: number;
    assertion: number;
    timeout: number;
    wrong_output: number;
    unknown: number;
  };
  dominant_failure?: string | null;
  visible_passed: number;
  visible_total: number;
  hidden_passed: number;
  hidden_total: number;
  aggregate_error_families?: Record<string, number>;
}

export interface PlaygroundEventPayload {
  event_type:
    | "run_started"
    | "run_completed"
    | "runtime_error"
    | "compile_error"
    | "test_passed"
    | "test_failed"
    | "hint_requested"
    | "idle_detected"
    | "scenario_started"
    | "submission_drafted"
    | "submission_submitted"
    | "rubric_scored"
    | "nudge_sent";
  timestamp?: string;
  language?: string;
  run_id?: string;
  status?: string;
  error_type?: string;
  surface_type?: string;
  surface_event_type?: string;
  intervention_action?: string;
  evaluation_checkpoint?: string;
  evidence_checkpoint?: string;
  meta?: Record<string, unknown>;
}

export interface ExecutionDescriptor {
  surface_type:
    | "simulation_scenario"
    | "code_playground"
    | "diagram_workspace"
    | "canvas_workspace"
    | "flashcard_session"
    | "teachback_session";
  simulation_type_or_pack_ref?: string | null;
  pack_ref?: string | null;
  experience_type?: "scenario_response" | "turn_based_sim" | "workspace_first" | "rich_scene" | "hybrid" | string;
  evaluation_mode?: string;
  evidence_target?: string;
  adapter?: string;
  source?: string;
}

export interface CompletionContract {
  status: "complete" | "incomplete";
  verified: boolean;
  verification_status: "verified" | "failed" | "not_verifiable";
  completion_contract?: Record<string, unknown>;
}

export interface InterventionEnvelope {
  tier: "observe" | "nudge" | "guided_debug" | "explain_after_action";
  intervention_action: string;
  reason: string;
  surface_type: string;
  event_type?: string | null;
  cooldown_blocked?: boolean;
  cap_blocked?: boolean;
  max_interventions_per_surface?: number;
  observed_metrics?: Record<string, unknown>;
  should_dispatch?: boolean;
}

export interface UniversalSurfaceSession {
  surface_type: string;
  pack_ref?: string | null;
  runtime_state?: Record<string, unknown>;
  completion_state?: CompletionContract | Record<string, unknown>;
  intervention_state?: InterventionEnvelope | Record<string, unknown>;
  execution_descriptor?: ExecutionDescriptor | Record<string, unknown>;
}

export interface SurfaceRuntimeState {
  phase: "initializing" | "ready" | "interacting" | "evaluating" | "intervening" | "evidence" | "completed" | "error";
  readiness: "not_ready" | "ready" | "degraded";
  recoverable_error?: {
    code?: string;
    message: string;
    retryable?: boolean;
  } | null;
  metadata?: Record<string, unknown>;
}

export interface CanvasSceneData {
  version?: string;
  elements?: Array<Record<string, unknown>>;
  app_state?: Record<string, unknown>;
  files?: Record<string, unknown>;
  updated_at?: string;
}

export interface CanvasAnnotation {
  id: string;
  title?: string;
  body?: string;
  status?: "open" | "resolved" | "dismissed";
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CanvasSuggestion {
  id: string;
  title: string;
  body: string;
  status?: "draft" | "accepted" | "rejected" | "converted_to_task";
  source?: "llm" | "deterministic" | "cache";
  priority?: "low" | "normal" | "high" | string;
  intent?: string;
  selection_hash?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CanvasPresence {
  mentor_online?: boolean;
  learner_active_at?: string;
  mentor_active_at?: string;
  session_id?: string;
  [key: string]: unknown;
}

export interface CanvasSnapshot {
  id?: string;
  created_at?: string;
  image_url?: string;
  [key: string]: unknown;
}

export interface DomainScenarioPayload {
  id: UUID;
  task: UUID;
  user: UUID;
  scenario_type: string;
  simulation_type?: string;
  surface_type?: string | null;
  pack_ref?: string | null;
  experience_type?: string | null;
  domain_family: "business" | "marketing" | "design" | "finance" | "tech" | "other";
  scenario_payload: Record<string, unknown>;
  learner_submission: Record<string, unknown>;
  rubric_scores: {
    aggregate?: number;
    criterion_scores?: Record<string, number>;
  };
  rubric_breakdown: DomainRubricBreakdown;
  verification_status: "verified" | "failed" | "not_verifiable";
  evaluator_rationale: {
    summary?: string;
    strengths?: string[];
    gaps?: string[];
    next_actions?: string[];
    verification_confidence?: number;
  };
  execution_descriptor?: ExecutionDescriptor | Record<string, unknown>;
  runtime_state?: Record<string, unknown>;
  completion_state?: CompletionContract | Record<string, unknown>;
  intervention_state?: InterventionEnvelope | Record<string, unknown>;
  pack_version?: string | null;
  scoring_components?: ScoringComponents;
  verification_confidence?: number | null;
  world_state?: Record<string, number>;
  state_variables?: Record<string, { label?: string; higher_is_better?: boolean; unit?: string }>;
  available_actions?: Array<Record<string, unknown>>;
  observation_feed?: Array<Record<string, unknown>>;
  session_state?: Record<string, unknown>;
  checkpoint_state?: Record<string, unknown>;
  phase_state?: Record<string, unknown>;
  mentor_state?: Record<string, unknown>;
  scoring_state?: Record<string, unknown>;
  session_timeline?: Array<Record<string, unknown>>;
  unlocked_evidence?: string[];
  evidence_board?: Array<Record<string, unknown>>;
  stakeholder_state?: Array<Record<string, unknown>>;
  pressure_events?: Array<Record<string, unknown>>;
  portfolio_evidence_draft: Record<string, unknown>;
  metadata: Record<string, unknown>;
  started_at: string;
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type DomainRubricBreakdown = Record<
  string,
  {
    label: string;
    score: number;
    rationale: string;
  }
>;

export interface SimulationResultEnvelope {
  scenario: DomainScenarioPayload;
  surface_type?: string;
  pack_ref?: string | null;
  simulation_type?: string;
  experience_type?: string | null;
  pack_version?: string | null;
  scoring_components?: ScoringComponents;
  verification_confidence?: number | null;
  runtime_state?: Record<string, unknown>;
  world_state?: Record<string, number>;
  state_variables?: Record<string, { label?: string; higher_is_better?: boolean; unit?: string }>;
  available_actions?: Array<Record<string, unknown>>;
  observation_feed?: Array<Record<string, unknown>>;
  session_state?: Record<string, unknown>;
  checkpoint_state?: Record<string, unknown>;
  phase_state?: Record<string, unknown>;
  mentor_state?: Record<string, unknown>;
  scoring_state?: Record<string, unknown>;
  round_index?: number;
  round_context?: Record<string, unknown>;
  round_outcome?: Record<string, unknown>;
  session_timeline?: Array<Record<string, unknown>>;
  unlocked_evidence?: string[];
  evidence_board?: Array<Record<string, unknown>>;
  stakeholder_state?: Array<Record<string, unknown>>;
  pressure_events?: Array<Record<string, unknown>>;
  completion_state?: CompletionContract | Record<string, unknown>;
  intervention_state?: InterventionEnvelope | Record<string, unknown>;
  execution_descriptor?: ExecutionDescriptor | Record<string, unknown>;
  execution_diagnostics: {
    scenario_type: string;
    surface_type?: string;
    domain_family: string;
    rubric_breakdown: DomainRubricBreakdown;
    verification_status: "verified" | "failed" | "not_verifiable";
    evaluator_rationale?: Record<string, unknown>;
  };
  efficacy_metrics: {
    attempt_count: number;
    time_to_verify_seconds: number | null;
    error_pattern_count: number;
    nudge_count: number;
    self_check_pass_rate: number;
  };
}

export interface ScoringComponents {
  deterministic_weight: number;
  llm_weight: number;
  deterministic_aggregate: number;
  llm_aggregate: number;
  final_aggregate: number;
  llm_available: boolean;
}

export interface SimulationDefinitionRef {
  simulation_type: string;
  surface_type?: string;
  experience_type?: string;
  domain_family: string;
  sdl_version: string;
  pack_version: string;
  criterion_count: number;
  pack_source?: "static" | "generated";
  generated_db_id?: number | null;
  variation_seed?: string | null;
  execution_mode?: string;
  input_contract?: Record<string, unknown>;
  submission_contract?: Record<string, unknown>;
  rubric?: Record<string, unknown>;
  scoring_policy?: Record<string, unknown>;
  nudge_triggers?: Record<string, unknown>;
  evidence_mapping?: Record<string, unknown>;
  fallback_policy?: Record<string, unknown>;
  scenario_template?: Record<string, unknown>;
}

export type AuditStatus =
  | "verified_truth"
  | "narrative_validated"
  | "unverified_claim";

export type AuditType = "repo" | "narrative";
export type VeloOnboardingTrack = "resume_track" | "builder_track" | "domain_track";
export type VeloAuditMode = "full_forensic" | "starter_diagnostic" | "domain_narrative";
export type VeloRoadmapEligibility = "not_ready" | "starter_ready" | "full_ready";
export type VeloVerificationTier = "starter" | "full";

export interface ExperienceAudit {
  id: UUID;
  status: AuditStatus;
  audit_type: AuditType;
  flagship_artifact?: UUID | null;
  project_title?: string;
  resume_payload?: Record<string, unknown>;
  resume_source?: string;
  hm_score?: number | null;
  code_signature_score?: number | null;
  interrogation_depth?: number | null;
  evidence_validity?: number | null;
  mentor_context_status?: "pending" | "confirmed";
  mentor_context_confirmed_at?: string | null;
  mentor_conversation?: UUID | null;
  mentor_context_payload?: Record<string, unknown>;
  direction_overview?: {
    focus_areas?: string[];
    risk_areas?: string[];
    mentor_questions?: string[];
    readiness_narrative?: string;
  };
  active_for_planning?: boolean;
  onboarding_track?: VeloOnboardingTrack;
  audit_mode?: VeloAuditMode;
  domain_family?: "tech" | "business" | "marketing" | "design" | "finance" | "other";
  roadmap_eligibility?: VeloRoadmapEligibility;
  verification_tier?: VeloVerificationTier;
  evidence_completeness_score?: number;
  created_at: string;
  updated_at: string;
  retention_expires_at?: string | null;
  slot_expires_at?: string | null;
  evidence?: AuditEvidence[];
}

export interface AuditEvidence {
  id: UUID;
  source_type: AuditType;
  repo_metadata: Record<string, unknown>;
  narrative_text?: string;
  narrative_diagram?: string | null;
  evidence_summary: Record<string, unknown>;
  created_at: string;
}

export type DimensionScore = { score: number; evidence: string };
export const INTERROGATION_DIMENSIONS = [
  "ownership",
  "technical_depth",
  "debugging_ability",
  "communication",
  "honesty",
  "consistency",
] as const;
export type InterrogationDimension = (typeof INTERROGATION_DIMENSIONS)[number];
export type DimensionScores = Partial<Record<InterrogationDimension, DimensionScore>>;

export interface AuditReport {
  audit_id: UUID;
  status: AuditStatus;
  audit_type: AuditType;
  project_title: string;
  scores: {
    hm_score?: number | null;
    code_signature?: number | null;
    interrogation_depth?: number | null;
    evidence_validity?: number | null;
  };
  evidence_summary?: Record<string, unknown>;
  resume_summary?: Record<string, unknown>;
  mentor_handoff_required?: boolean;
  mentor_context_status?: "pending" | "confirmed";
  mentor_context_confirmed_at?: string | null;
  chat_handoff_url?: string | null;
  direction_overview?: {
    focus_areas?: string[];
    risk_areas?: string[];
    mentor_questions?: string[];
    readiness_narrative?: string;
  };
  onboarding_track?: VeloOnboardingTrack;
  audit_mode?: VeloAuditMode;
  domain_family?: "tech" | "business" | "marketing" | "design" | "finance" | "other";
  roadmap_eligibility?: VeloRoadmapEligibility;
  verification_tier?: VeloVerificationTier;
  evidence_completeness_score?: number;
  generated_at: string;
  public?: boolean;
  verification?: {
    status: "unverified" | "evidence_submitted" | "interrogating" | "verified" | "failed" | "suspicious";
    score: number | null;
    scoring_status?: "pending" | "scoring" | "scored" | "scoring_failed";
    dimension_scores?: DimensionScores | null;
    verdict_summary: string;
    project_title: string;
    questions_answered: number;
    expertise_estimate: string;
    github_check_status: "pending" | "passed" | "failed" | "skipped";
    repos: Array<{ url: string; label: string; language?: string }>;
    files_analyzed: number;
    verified_at: string | null;
  };
}

export interface VeloOnboardingSession {
  id: UUID;
  current_step:
    | "discovery"
    | "evidence_intake"
    | "audit_readiness"
    | "audit_session"
    | "insight_brief"
    | "mentor_personalization"
    | "roadmap_launch"
    | "mentor_and_roadmap";
  chosen_track: VeloOnboardingTrack;
  completion_flags: Record<string, boolean>;
  latest_audit?: UUID | null;
  latest_conversation?: UUID | null;
  active_conversation_id?: UUID | null;
  metadata?: Record<string, unknown>;
  step_state?: Record<string, Record<string, unknown>>;
  last_error?: Record<string, unknown>;
  analysis_job_status?: {
    job_id: UUID;
    status: "queued" | "running" | "completed" | "failed";
    started_at?: string | null;
    completed_at?: string | null;
    error?: string | null;
  } | null;
  updated_at: string;
  created_at: string;
}

export interface ResumeAnalysisJob {
  job_id: UUID;
  status: "queued" | "running" | "completed" | "failed";
  error?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  mirror_snapshot_id?: UUID | null;
}

export interface MirrorSnapshot {
  id: UUID;
  analysis_job_id?: UUID | null;
  source_resume_payload: Record<string, unknown>;
  normalized_profile: Record<string, unknown>;
  skill_gaps: string[];
  strengths: string[];
  confidence: Record<string, number>;
  missing_prompts: string[];
  role_readiness_narrative: string;
  created_at: string;
  updated_at: string;
}

export interface VeloMentorReviewResponse {
  audit_id: UUID;
  conversation_id: UUID;
  mentor_context_status: "pending" | "confirmed";
  roadmap_unlocked: boolean;
  intake_state: {
    slots?: Record<string, unknown>;
    missing_or_uncertain?: string[];
    readiness?: number;
  };
  context_enrichment?: Record<string, unknown>;
  latest_messages?: Array<{
    id: UUID;
    sender_type: "user" | "ai" | "system";
    content: string;
    created_at: string;
  }>;
}

export interface AuditQueueSlot {
  week_start: string;
  max_slots: number;
  used_slots: number;
  remaining: number;
}

export interface AuditInstitutionOverview {
  total_students: number;
  verified_profile_rate: number;
  career_ready_count: number;
  starter_ready_count: number;
  full_verified_count: number;
  mentor_context_completion_rate: number;
  readiness_distribution: Record<string, number>;
  track_mix: Record<string, number>;
  readiness_by_domain_family: Record<string, number>;
  top_skill_gaps: Array<{ gap: string; count: number }>;
  top_skill_gaps_by_domain?: Record<string, Array<{ gap: string; count: number }>>;
  avg_readiness_score: number;
}

export interface AuditInstitutionStudentRow {
  student_id: UUID;
  name: string;
  email: string;
  readiness_score: number;
  readiness_label: string;
  verified_evidence_ratio: number;
  top_skill_gaps: string[];
  top_strengths: string[];
  flags: string[];
  audit_id: UUID;
  onboarding_track?: VeloOnboardingTrack;
  audit_mode?: VeloAuditMode;
  roadmap_eligibility?: VeloRoadmapEligibility;
  verification_tier?: VeloVerificationTier;
  domain_family?: string;
  gap_coverage_progress?: number;
  generated_at: string;
}

export interface AuditInstitutionStudentDetail {
  student_id: UUID;
  name: string;
  email: string;
  latest: {
    readiness_score: number;
    readiness_label: string;
    verified_evidence_ratio: number;
    top_skill_gaps: string[];
    top_strengths: string[];
    flags: string[];
    audit_id: UUID;
    onboarding_track?: VeloOnboardingTrack;
    audit_mode?: VeloAuditMode;
    roadmap_eligibility?: VeloRoadmapEligibility;
    verification_tier?: VeloVerificationTier;
    domain_family?: string;
  };
  trend: Array<{
    generated_at: string;
    readiness_score: number;
    readiness_label: string;
  }>;
  latest_audit_summary: {
    audit_id: UUID;
    status: AuditStatus;
    mentor_context_status: "pending" | "confirmed";
    hm_score?: number | null;
  };
  gap_coverage?: {
    plan_id?: UUID | null;
    total_gaps: number;
    covered_gaps: number;
    progress: number;
  };
}

// ── PBL Types ──────────────────────────────────────────────────────────────

export type ProjectPhase =
  | "scoping" | "planning" | "building" | "documenting"
  | "submitting" | "verifying" | "case_study" | "completed";

export type GateStatus = "pending" | "passed" | "needs_revision" | "mentor_pending";

export type ProjectDomainType =
  | "software" | "data" | "design" | "business"
  | "marketing" | "finance" | "research" | "other";

export interface ProjectSuggestion {
  title: string;
  description: string;
  why_good_fit: string;
  concepts_covered: string[];
  estimated_effort: string;
  deliverable: string;
  domain_type: ProjectDomainType;
  difficulty: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  expected_output: string;
  evidence_format?: string;
  due_date?: string;
  status?: "pending" | "submitted" | "approved";
}

export interface MilestoneSubmission {
  milestone_id: string;
  content: string;
  submitted_at: string;
  status: "submitted" | "approved" | "needs_revision";
  feedback?: string;
}

export interface SubmissionArtifact {
  type: "github_repo" | "document" | "design_file" | "presentation" | "notebook" | "demo_url" | "other";
  url: string;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface ProjectPhaseShape {
  task_id: string;
  phase_id: string;
  label: string;
  deliverable_type: "document" | "schema" | "code" | "presentation" | "general";
  gate_status: GateStatus;
  submission: Record<string, string> | null;
  feedback: string | null;
  order: number;
  form_fields: string[];
}

export interface LearningProjectShape {
  id: string;
  task_id: string | null;
  milestone_id?: string | null;
  phases?: ProjectPhaseShape[];
  current_phase_task_id?: string;
  active_phase_task_id?: string;
  title: string;
  description: string;
  domain_type: ProjectDomainType;
  difficulty: string;
  current_phase: ProjectPhase;
  phase_history: Array<{ phase: ProjectPhase; entered_at: string; completed_at: string | null; gate_method: "auto" | "mentor" | null }>;
  origin: "system_suggested" | "learner_proposed" | "mentor_assigned";
  suggestion_context: {
    options_shown?: ProjectSuggestion[];
    chosen_index?: number | null;
    custom_proposal?: { title: string; description: string } | null;
    concept_coverage_pct?: number;
  };
  requires_mentor_review: boolean;
  similarity_checked: boolean;
  similar_projects: Array<{ project_id: string; title: string; similarity_score: number; user_display_name: string }>;
  uniqueness_score: number | null;
  scope_document: Record<string, unknown>;
  scope_gate_status: GateStatus;
  scope_gate_feedback: Record<string, unknown>;
  milestones: ProjectMilestone[];
  plan_gate_status: GateStatus;
  milestone_submissions: MilestoneSubmission[];
  build_gate_status: GateStatus;
  methodology_doc: string;
  methodology_gate_status: GateStatus;
  methodology_gate_feedback: Record<string, unknown>;
  submission_artifacts: SubmissionArtifact[];
  submission_gate_status: GateStatus;
  verification_verdict: "pending" | "verified" | "suspicious" | "failed";
  case_study: Record<string, unknown>;
  case_study_gate_status: GateStatus;
  created_at: string;
  updated_at: string;
}

export interface MentorReviewShape {
  id: string;
  project: string;
  project_title: string;
  learner_phase: ProjectPhase;
  phase: ProjectPhase;
  ai_summary: string;
  ai_strengths: string[];
  ai_weaknesses: string[];
  ai_questions: string[];
  ai_red_flags: string[];
  similarity_alert: { triggered: boolean; matches: unknown[] };
  decision: "pending" | "approved" | "needs_revision";
  feedback: string;
  reviewed_at: string | null;
  created_at: string;
}
