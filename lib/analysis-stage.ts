type StageSeverity = "info" | "success" | "warning" | "error";

export interface StageEventPayload extends Record<string, unknown> {
  event?: string;
  stage?: string;
  timestamp?: string;
  conversation_id?: string;
  session_id?: string;
  error?: string;
}

export interface StageStreamEvent extends StageEventPayload {
  __seq: number;
}

const STAGE_EVENT_TYPES = new Set([
  "analysis_stage",
  "progress_stage",
  "analysis_complete",
  "analysis_completed",
  "analysis_error",
]);

const STAGE_LABELS: Record<string, string> = {
  analysis_started: "Brain warming up",
  core_analysis_started: "Running core analysis",
  core_analysis_completed: "Core analysis finished",
  wellness_analysis_started: "Scanning wellness signals",
  wellness_analysis_completed: "Wellness scan complete",
  crisis_analysis_started: "Checking crisis indicators",
  crisis_analysis_completed: "Crisis scan complete",
  support_analysis_started: "Building support model",
  support_analysis_completed: "Support model ready",
  saving_analysis: "Saving analysis",
  analysis_saved: "Analysis persisted",
  analysis_successful: "Analysis complete",
  analysis_failed: "Analysis failed",
  analysis_complete: "Analysis complete",
  analysis_completed: "Analysis finalized",
  extract_start: "Extracting multi-domain progress",
  domain_extracted: "Domain progress captured",
  extract_complete: "Progress extraction finished",
  tracking_start: "Tracking progress",
  domain_tracked: "Domain tracking complete",
  tracking_complete: "Progress tracking complete",
};

const STAGE_SEVERITY_BY_EVENT: Partial<Record<string, StageSeverity>> = {
  analysis_complete: "success",
  analysis_completed: "success",
  analysis_error: "error",
};

const STAGE_SEVERITY_BY_STAGE: Partial<Record<string, StageSeverity>> = {
  analysis_saved: "success",
  analysis_successful: "success",
  analysis_failed: "error",
  analysis_complete: "success",
  analysis_completed: "success",
};

const formatList = (items: string[]) =>
  items.length ? ` (${items.join(", ")})` : "";

const STAGE_SUMMARY_BUILDERS: Partial<
  Record<string, (payload: StageEventPayload) => string>
> = {
  analysis_started: () => "Brain started analyzing the conversation",
  core_analysis_started: () => "Running domain, career, and competency models",
  core_analysis_completed: () => "Core intelligence mapping finished",
  wellness_analysis_started: () => "Assessing wellness indicators",
  wellness_analysis_completed: () => "Wellness scan complete",
  crisis_analysis_started: () => "Evaluating crisis indicators",
  crisis_analysis_completed: () => "Crisis evaluation complete",
  support_analysis_started: () => "Generating support recommendations",
  support_analysis_completed: () => "Support recommendations ready",
  saving_analysis: () => "Persisting the analysis snapshot",
  analysis_saved: () => "Intelligence snapshot saved",
  analysis_successful: () => "Brain insights ready",
  analysis_failed: (payload) =>
    payload?.error
      ? `Analysis failed: ${String(payload.error)}`
      : "Analysis failed",
  extract_start: () => "Extracting academic, career, and wellness signals",
  domain_extracted: (payload) =>
    `Updated ${String(payload?.domain ?? "domain")} progress`,
  extract_complete: (payload) => {
    const summary = payload?.summary as
      | { domains_processed?: unknown; insights_generated?: unknown }
      | undefined;
    const domains = Array.isArray(summary?.domains_processed)
      ? summary?.domains_processed.length
      : undefined;
    const insights =
      typeof summary?.insights_generated === "number"
        ? summary?.insights_generated
        : undefined;
    const fragments: string[] = [];
    if (domains) fragments.push(`${domains} domains`);
    if (typeof insights === "number") fragments.push(`${insights} insights`);
    return `Progress extraction complete${formatList(fragments)}`;
  },
  tracking_start: () => "Tracking insights and interventions",
  domain_tracked: (payload) =>
    `Tracked ${String(payload?.domain ?? "domain")} trajectory`,
  tracking_complete: (payload) => {
    const results = payload?.results as
      | { domains?: unknown; insights_count?: unknown }
      | undefined;
    const domains = Array.isArray(results?.domains)
      ? results?.domains.length
      : undefined;
    const insights =
      typeof results?.insights_count === "number"
        ? results?.insights_count
        : undefined;
    const fragments: string[] = [];
    if (domains) fragments.push(`${domains} domains`);
    if (typeof insights === "number") fragments.push(`${insights} insights`);
    return `Tracking complete${formatList(fragments)}`;
  },
};

export interface StageDescriptor {
  label: string;
  message: string;
  severity: StageSeverity;
  eventType?: string;
  stage?: string;
}

export const isStageEventType = (eventType?: string | null) =>
  eventType ? STAGE_EVENT_TYPES.has(eventType) : false;

export const formatStageLabel = (stage?: string) => {
  if (!stage) {
    return "Analysis update";
  }
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, " ");
};

export const describeStageEvent = (
  payload?: StageEventPayload | null,
): StageDescriptor | null => {
  if (!payload) {
    return null;
  }

  const eventType =
    typeof payload.event === "string" ? payload.event : undefined;
  const providedStage =
    typeof payload.stage === "string" ? payload.stage : undefined;
  const stage =
    providedStage ?? (isStageEventType(eventType) ? eventType : undefined);

  if (!eventType && !stage) {
    return null;
  }

  const label = formatStageLabel(stage);
  const defaultBuilder = stage ? STAGE_SUMMARY_BUILDERS[stage] : undefined;
  const fallbackMessage = defaultBuilder
    ? defaultBuilder(payload)
    : label;
  const message =
    typeof payload.message === "string" && payload.message.length > 0
      ? payload.message
      : fallbackMessage;

  const severity =
    STAGE_SEVERITY_BY_EVENT[eventType ?? ""] ??
    STAGE_SEVERITY_BY_STAGE[stage ?? ""] ??
    "info";

  return {
    label,
    message,
    severity,
    eventType,
    stage,
  };
};

export { STAGE_EVENT_TYPES };
