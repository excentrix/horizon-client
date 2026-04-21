"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { chatApi, planningApi, playgroundApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import type {
  ChatMessage,
  DailyTask,
  DomainScenarioPayload,
  PlaygroundEventPayload,
  SimulationDefinitionRef,
  SimulationResultEnvelope,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EventResponse = {
  event_id: string;
  event_type: string;
  aggregate: Record<string, unknown>;
  nudge?: {
    trigger: string;
    message: string;
    conversation_id: string;
    message_id: string;
  } | null;
};

type SuiteStatus = "pending" | "running" | "passed" | "failed" | "skipped";
type SuiteSeverity = "critical" | "high" | "medium" | "low";
type FailureCode =
  | "none"
  | "network_error"
  | "auth_error"
  | "server_error"
  | "schema_mismatch"
  | "missing_task_context"
  | "nudge_not_triggered"
  | "execution_error_signal_missing"
  | "artifact_not_created"
  | "unknown_failure";

type SuiteResult = {
  id: string;
  scenarioId?: string;
  surface: string;
  label: string;
  severity: SuiteSeverity;
  status: SuiteStatus;
  details?: string;
  durationMs?: number;
  failureCode?: FailureCode;
  userMessage?: string;
  likelyCause?: string;
  recommendedAction?: string;
  report?: Record<string, unknown>;
};

type ScenarioCatalogItem = {
  id: string;
  surface: string;
  title: string;
  severity: SuiteSeverity;
  purpose: string;
  expectedBehavior: string;
  expectedFailureModes: string[];
  requiresTaskContext: boolean;
};

const STANDARD_SCENARIOS: Record<string, Record<string, unknown>> = {
  business_kpi: {
    brief: "Quarterly retention dipped by 6% after pricing changes.",
    context: "B2B SaaS, flat acquisition, onboarding complaints rising.",
    constraints: ["No headcount increase", "Budget cap $20k"],
  },
  marketing_campaign: {
    brief: "Launch campaign for a new AI productivity add-on.",
    context: "Audience: PMs + engineering managers, 6-week cycle.",
    constraints: ["Budget $15k", "Channels limited to content + paid search"],
  },
  process_redesign: {
    brief: "Order fulfillment workflow misses SLAs during month-end spikes.",
    context: "Operations team faces heavy handoff delays and high rework volume.",
    constraints: ["No additional headcount", "Pilot must start within 2 weeks"],
  },
  funnel_experiment: {
    brief: "Activation rate dropped after onboarding changes.",
    context: "B2B product with self-serve signup and sales-assisted conversion.",
    constraints: ["3 experiments max this cycle", "Budget cap $20k/month"],
  },
  code_challenge: {
    brief: "Implement a robust sum function for integer arrays.",
    context: "Hidden tests include empty array and negative numbers.",
  },
};

const STANDARD_SUBMISSIONS: Record<string, string> = {
  business_kpi: JSON.stringify(
    {
      diagnosis:
        "Primary issue is onboarding dropoff after pricing confusion and slower time-to-value.",
      actions: [
        "Prioritize onboarding clarification and first-value instrumentation",
        "Run churn cohort analysis by plan + activation threshold",
      ],
      tradeoffs: "Defers broad acquisition spend while retention baseline stabilizes.",
    },
    null,
    2
  ),
  marketing_campaign: JSON.stringify(
    {
      strategy:
        "Content-led demand capture with targeted paid search for high-intent terms.",
      experiments: [
        "Landing page A/B for value prop clarity",
        "Channel split test by ICP segment",
      ],
      measurement: "CAC, MQL->SQL conversion, and week-3 activation as primary KPIs.",
    },
    null,
    2
  ),
  process_redesign: JSON.stringify(
    {
      diagnosis:
        "Primary bottleneck is cross-team handoff latency and repeated manual approval loops.",
      redesign:
        "Introduce a single intake owner, automate validation checks, and standardize stage handoff criteria.",
      rollout:
        "Run a phased pilot by segment, monitor throughput and SLA breach rate weekly, and rollback on guardrail trigger.",
    },
    null,
    2
  ),
  funnel_experiment: JSON.stringify(
    {
      diagnosis:
        "Largest drop-off is signup-to-activation due to unclear onboarding steps and weak lifecycle prompts.",
      experiments: [
        "Activation checklist variant with role-based paths",
        "Lifecycle email sequence test with behavior triggers",
      ],
      measurement:
        "Track stage conversion uplift, activation-to-paid lag, and predefined ship/kill decision thresholds.",
    },
    null,
    2
  ),
  code_challenge:
    "def solve(nums):\n    if not nums:\n        return 0\n    return sum(nums)\n",
};

const SCENARIO_CATALOG: ScenarioCatalogItem[] = [
  {
    id: "sim-pack-business_kpi",
    surface: "simulator",
    title: "Business KPI diagnosis rubric loop",
    severity: "high",
    purpose: "Validate scenario->submission->rubric pipeline for business simulator.",
    expectedBehavior: "Returns pack_version, verification_status, and confidence with scoring breakdown.",
    expectedFailureModes: ["schema_mismatch", "server_error"],
    requiresTaskContext: false,
  },
  {
    id: "sim-pack-marketing_campaign",
    surface: "simulator",
    title: "Marketing campaign strategy rubric loop",
    severity: "high",
    purpose: "Validate marketing simulation evaluation and metadata contract.",
    expectedBehavior: "Returns evaluator rationale and additive scoring fields.",
    expectedFailureModes: ["schema_mismatch", "server_error"],
    requiresTaskContext: false,
  },
  {
    id: "sim-pack-process_redesign",
    surface: "simulator",
    title: "Business process redesign rubric loop",
    severity: "high",
    purpose: "Validate bottleneck diagnosis and rollout-safety scoring path.",
    expectedBehavior: "Returns criterion-level process redesign rubric + evaluator rationale.",
    expectedFailureModes: ["schema_mismatch", "server_error"],
    requiresTaskContext: false,
  },
  {
    id: "sim-pack-funnel_experiment",
    surface: "simulator",
    title: "Marketing funnel experiment rubric loop",
    severity: "high",
    purpose: "Validate growth experiment design scoring and measurement-rigor evaluation.",
    expectedBehavior: "Returns additive verification metadata with rubric/pack fields.",
    expectedFailureModes: ["schema_mismatch", "server_error"],
    requiresTaskContext: false,
  },
  {
    id: "sim-pack-code_challenge",
    surface: "simulator",
    title: "Code challenge SDL simulation loop",
    severity: "critical",
    purpose: "Validate code-challenge pack path through runtime and scoring.",
    expectedBehavior: "Execution-scored simulator result with verification contract populated.",
    expectedFailureModes: ["schema_mismatch", "execution_error_signal_missing", "server_error"],
    requiresTaskContext: false,
  },
  {
    id: "code-success",
    surface: "code_runner",
    title: "Code execution success path",
    severity: "critical",
    purpose: "Validate Judge0 success output propagation.",
    expectedBehavior: "stdout contains expected marker.",
    expectedFailureModes: ["network_error", "server_error"],
    requiresTaskContext: false,
  },
  {
    id: "code-failure",
    surface: "code_runner",
    title: "Code execution failure signal path",
    severity: "critical",
    purpose: "Ensure compile/runtime errors surface in response payload.",
    expectedBehavior: "compile_output/stderr/message includes error signal.",
    expectedFailureModes: ["execution_error_signal_missing", "server_error"],
    requiresTaskContext: false,
  },
  {
    id: "flashcards",
    surface: "flashcards",
    title: "Flashcard generation contract",
    severity: "medium",
    purpose: "Validate generated cards are populated with front/back.",
    expectedBehavior: ">=2 valid cards with front and back strings.",
    expectedFailureModes: ["missing_task_context", "schema_mismatch"],
    requiresTaskContext: true,
  },
  {
    id: "micro-practice",
    surface: "micro_practice",
    title: "Micro-practice quiz contract",
    severity: "medium",
    purpose: "Validate generated questions and answer index integrity.",
    expectedBehavior: ">=2 questions with options + correct_index.",
    expectedFailureModes: ["missing_task_context", "schema_mismatch"],
    requiresTaskContext: true,
  },
  {
    id: "teach-back",
    surface: "teach_me_back",
    title: "Teach-me-back message flow",
    severity: "high",
    purpose: "Validate mentor chat channel accepts feynman_check intent payload.",
    expectedBehavior: "Message ID returned for teach-back action.",
    expectedFailureModes: ["missing_task_context", "auth_error", "server_error"],
    requiresTaskContext: true,
  },
  {
    id: "mentor-nudge",
    surface: "mentor_intervention",
    title: "Mentor nudge trigger loop",
    severity: "high",
    purpose: "Validate repeated error telemetry can trigger mentor intervention.",
    expectedBehavior: "nudge payload appears or explicit cooldown skip reason is shown.",
    expectedFailureModes: ["missing_task_context", "nudge_not_triggered"],
    requiresTaskContext: true,
  },
  {
    id: "canvas-local",
    surface: "canvas",
    title: "Canvas persistence contract",
    severity: "low",
    purpose: "Validate local save/restore behavior.",
    expectedBehavior: "Stored content is retrievable and stable.",
    expectedFailureModes: ["schema_mismatch"],
    requiresTaskContext: false,
  },
  {
    id: "canvas-proof",
    surface: "canvas",
    title: "Canvas proof artifact path",
    severity: "medium",
    purpose: "Validate proof submission creates artifact.",
    expectedBehavior: "artifact_id returned in proof response.",
    expectedFailureModes: ["missing_task_context", "artifact_not_created", "server_error"],
    requiresTaskContext: true,
  },
  {
    id: "diagram-proof",
    surface: "diagram",
    title: "Diagram proof upload artifact path",
    severity: "medium",
    purpose: "Validate file proof upload path and artifact creation.",
    expectedBehavior: "artifact_id returned after file upload proof submit.",
    expectedFailureModes: ["missing_task_context", "artifact_not_created", "server_error"],
    requiresTaskContext: true,
  },
];

const DEFAULT_SCENARIO_PAYLOAD = JSON.stringify(
  {
    brief: "Use this scenario to validate rubric scoring and mentor interventions.",
    constraints: ["Treat this as a smoke test."],
  },
  null,
  2
);

const DEFAULT_SUBMISSION = JSON.stringify(
  {
    response: "This is a simulation lab submission for end-to-end validation.",
    assumptions: ["Smoke-test run"],
  },
  null,
  2
);

function safeParse(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function toEventPayload(
  event_type: PlaygroundEventPayload["event_type"],
  extras?: Partial<PlaygroundEventPayload>
): PlaygroundEventPayload {
  return {
    event_type,
    timestamp: new Date().toISOString(),
    ...extras,
  };
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as
      | { error?: string; detail?: string; message?: string }
      | undefined;
    return (
      apiError?.error ||
      apiError?.detail ||
      apiError?.message ||
      `Request failed (${error.response?.status ?? "network"})`
    );
  }
  if (error instanceof Error && error.message) return error.message;
  return "Request failed";
}

function deriveFailureCode(
  status: SuiteStatus,
  details: string | undefined,
  report: Record<string, unknown> | undefined
): FailureCode {
  if (status === "passed" || status === "running" || status === "pending") return "none";
  const text = `${details || ""} ${JSON.stringify(report || {})}`.toLowerCase();
  if (text.includes("401") || text.includes("403") || text.includes("unauthorized") || text.includes("forbidden")) return "auth_error";
  if (text.includes("500") || text.includes("internal server error")) return "server_error";
  if (text.includes("network") || text.includes("fetch") || text.includes("timeout")) return "network_error";
  if (text.includes("missing_task_id") || text.includes("no_task_selected") || text.includes("needs a real task context")) return "missing_task_context";
  if (text.includes("missing pack_version") || text.includes("schema") || text.includes("contract")) return "schema_mismatch";
  if (text.includes("nudge")) return "nudge_not_triggered";
  if (text.includes("error details returned for invalid code")) return "execution_error_signal_missing";
  if (text.includes("artifact_id")) return "artifact_not_created";
  return "unknown_failure";
}

function buildUserExplanation(
  code: FailureCode,
  status: SuiteStatus,
  details?: string
): Pick<SuiteResult, "userMessage" | "likelyCause" | "recommendedAction"> {
  if (status === "passed") {
    return {
      userMessage: "Scenario passed and returned expected signals.",
      likelyCause: "No failure detected in this path.",
      recommendedAction: "Keep this scenario in release gates as a regression check.",
    };
  }
  if (status === "skipped") {
    return {
      userMessage: "Scenario was skipped by design for this run mode.",
      likelyCause: "This test needs task-bound context or is in cooldown.",
      recommendedAction: "Switch to selected-task mode or re-run later.",
    };
  }
  switch (code) {
    case "auth_error":
      return {
        userMessage: "The request was rejected due to permissions.",
        likelyCause: "Session token or role context does not satisfy endpoint requirements.",
        recommendedAction: "Re-authenticate and verify this user has required access.",
      };
    case "server_error":
      return {
        userMessage: "Backend failed while handling this scenario.",
        likelyCause: "Unhandled exception or missing migration/config in service path.",
        recommendedAction: "Inspect backend logs for this scenario ID and fix root exception.",
      };
    case "network_error":
      return {
        userMessage: "The test could not reach the service reliably.",
        likelyCause: "Connectivity issue, blocked request, or transient timeout.",
        recommendedAction: "Retry once, then verify API availability and network policy.",
      };
    case "schema_mismatch":
      return {
        userMessage: "Response shape did not match expected contract.",
        likelyCause: "Breaking change or missing additive fields.",
        recommendedAction: "Compare expected-vs-actual payload and restore contract compatibility.",
      };
    case "missing_task_context":
      return {
        userMessage: "This scenario requires a real task context.",
        likelyCause: "Running in synthetic mode for a task-bound surface.",
        recommendedAction: "Switch suite mode to selected-task or pick a valid task first.",
      };
    case "nudge_not_triggered":
      return {
        userMessage: "Mentor nudge did not trigger for this loop.",
        likelyCause: "Cooldown window or trigger thresholds not met.",
        recommendedAction: "Check recent nudge events and adjust trigger telemetry if needed.",
      };
    case "execution_error_signal_missing":
      return {
        userMessage: "Invalid code did not surface a clear error signal.",
        likelyCause: "Runner response mapping lost compile/runtime fields.",
        recommendedAction: "Audit execute endpoint normalization for stderr/compile_output/message.",
      };
    case "artifact_not_created":
      return {
        userMessage: "Proof submission completed but artifact was not created.",
        likelyCause: "Artifact creation path failed validation or queue side-effect.",
        recommendedAction: "Trace submit-proof response and artifact creation logs for this request.",
      };
    default:
      return {
        userMessage: "Scenario failed for an unspecified reason.",
        likelyCause: details || "Unknown failure.",
        recommendedAction: "Open technical details below and inspect request/response payloads.",
      };
  }
}

export default function SimulationLabPage() {
  const [packs, setPacks] = useState<SimulationDefinitionRef[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedSimulationType, setSelectedSimulationType] = useState("");
  const [scenarioPayload, setScenarioPayload] = useState(DEFAULT_SCENARIO_PAYLOAD);
  const [submissionPayload, setSubmissionPayload] = useState(DEFAULT_SUBMISSION);

  const [activeScenario, setActiveScenario] = useState<DomainScenarioPayload | null>(null);
  const [resultEnvelope, setResultEnvelope] = useState<SimulationResultEnvelope | null>(null);
  const [latestEvent, setLatestEvent] = useState<EventResponse | null>(null);
  const [suiteResults, setSuiteResults] = useState<SuiteResult[]>([]);
  const [suiteRunning, setSuiteRunning] = useState(false);
  const [includeArtifactFlowTests, setIncludeArtifactFlowTests] = useState(false);
  const [suiteMode, setSuiteMode] = useState<"synthetic" | "selected_task">("synthetic");
  const [surfaceFilter, setSurfaceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showOnlyFailures, setShowOnlyFailures] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const suiteSummary = useMemo(() => {
    const total = suiteResults.length;
    const passed = suiteResults.filter((r) => r.status === "passed").length;
    const failed = suiteResults.filter((r) => r.status === "failed").length;
    const skipped = suiteResults.filter((r) => r.status === "skipped").length;
    const criticalFailed = suiteResults.filter((r) => r.status === "failed" && r.severity === "critical").length;
    return { total, passed, failed, skipped, criticalFailed };
  }, [suiteResults]);

  const filteredSuiteResults = useMemo(() => {
    return suiteResults.filter((result) => {
      if (surfaceFilter !== "all" && result.surface !== surfaceFilter) return false;
      if (statusFilter !== "all" && result.status !== statusFilter) return false;
      if (severityFilter !== "all" && result.severity !== severityFilter) return false;
      if (showOnlyFailures && result.status !== "failed") return false;
      return true;
    });
  }, [suiteResults, surfaceFilter, statusFilter, severityFilter, showOnlyFailures]);

  const releaseGate = useMemo(() => {
    const critical = suiteResults.filter((r) => r.severity === "critical");
    if (suiteRunning) {
      return { status: "running" as const, label: "RUNNING", note: "Critical checks are still in progress." };
    }
    if (critical.length === 0) {
      return { status: "not_run" as const, label: "NOT RUN", note: "No critical scenarios executed yet." };
    }
    const blocking = critical.filter((r) => r.status !== "passed");
    if (blocking.length === 0) {
      return { status: "pass" as const, label: "PASS", note: "All critical scenarios passed." };
    }
    return {
      status: "fail" as const,
      label: "FAIL",
      note: `${blocking.length} critical scenario(s) not passing.`,
    };
  }, [suiteResults, suiteRunning]);

  const downloadTextFile = (filename: string, content: string, mime = "text/plain;charset=utf-8") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const exportSuiteJson = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      suite_mode: suiteMode,
      release_gate: releaseGate,
      summary: suiteSummary,
      filters: {
        surface: surfaceFilter,
        status: statusFilter,
        severity: severityFilter,
        failures_only: showOnlyFailures,
      },
      results: suiteResults,
    };
    downloadTextFile(
      `simulation-suite-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8"
    );
    telemetry.toastSuccess("Exported JSON report");
  };

  const exportSuiteCsv = () => {
    const rows = suiteResults.map((r) => ({
      id: r.id,
      scenario_id: r.scenarioId || "",
      surface: r.surface,
      severity: r.severity,
      status: r.status,
      failure_code: r.failureCode || "",
      details: r.details || "",
      user_message: r.userMessage || "",
      likely_cause: r.likelyCause || "",
      recommended_action: r.recommendedAction || "",
      duration_ms: r.durationMs ?? "",
    }));
    const headers = Object.keys(rows[0] || {
      id: "",
      scenario_id: "",
      surface: "",
      severity: "",
      status: "",
      failure_code: "",
      details: "",
      user_message: "",
      likely_cause: "",
      recommended_action: "",
      duration_ms: "",
    });
    const escapeCell = (value: unknown) => {
      const text = String(value ?? "");
      if (text.includes(",") || text.includes('"') || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => escapeCell(row[h as keyof typeof row])).join(",")),
    ].join("\n");
    downloadTextFile(`simulation-suite-${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
    telemetry.toastSuccess("Exported CSV report");
  };

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      setLoading(true);
      try {
        const [defs, today, week] = await Promise.all([
          planningApi.getSimulationDefinitions(),
          planningApi.getTodaysTasks(),
          planningApi.getCalendarTasks({ view: "week" }),
        ]);

        if (!mounted) return;
        setPacks(defs.packs ?? []);

        const deduped = new Map<string, DailyTask>();
        for (const task of [...(today.tasks ?? []), ...(week.tasks ?? [])]) {
          deduped.set(task.id, task);
        }
        const merged = Array.from(deduped.values());
        setTasks(merged);

        if (merged[0]) setSelectedTaskId(merged[0].id);
        if (defs.packs?.[0]) setSelectedSimulationType(defs.packs[0].simulation_type);
      } catch (error) {
        telemetry.toastError("Failed to load simulation lab data");
        telemetry.error("simulation_lab.bootstrap_failed", { error });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSimulationType) return;
    const payload = STANDARD_SCENARIOS[selectedSimulationType];
    const submission = STANDARD_SUBMISSIONS[selectedSimulationType];
    if (payload) {
      setScenarioPayload(JSON.stringify(payload, null, 2));
    }
    if (submission) {
      setSubmissionPayload(submission);
    }
  }, [selectedSimulationType]);

  const runAction = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      const message = getErrorMessage(error);
      telemetry.toastError(message);
      telemetry.error("simulation_lab.action_failed", { error: message });
    } finally {
      setBusy(false);
    }
  };

  const runStandardSuite = async () => {
    if (suiteMode === "selected_task" && !selectedTaskId) {
      telemetry.toastError("Pick a task first");
      return;
    }

    const taskId = selectedTaskId;
    const testCases: Array<{
      id: string;
      scenarioId: string;
      surface: string;
      label: string;
      severity: SuiteSeverity;
      run: () => Promise<{
        status: Exclude<SuiteStatus, "pending" | "running">;
        details?: string;
        report?: Record<string, unknown>;
      }>;
    }> = [];

    for (const pack of packs) {
      testCases.push({
        id: `sim-pack-${pack.simulation_type}`,
        scenarioId: `sim-pack-${pack.simulation_type}`,
        surface: "simulator",
        label:
          suiteMode === "synthetic"
            ? `SDL synthetic usecase: ${pack.simulation_type}`
            : `SDL pack roundtrip: ${pack.simulation_type}`,
        severity: pack.simulation_type === "code_challenge" ? "critical" : "high",
        run: async () => {
          const scenarioCase = STANDARD_SCENARIOS[pack.simulation_type] ?? { smoke: true };
          const rawSubmission =
            STANDARD_SUBMISSIONS[pack.simulation_type] ??
            JSON.stringify({ response: "Simulation lab generic submission." });
          const learnerSubmission = safeParse(rawSubmission) as Record<string, unknown> | string | string[];

          if (suiteMode === "synthetic") {
            const run = await planningApi.runSimulationLabUseCase({
              simulation_type: pack.simulation_type,
              scenario_payload: scenarioCase,
              learner_submission: learnerSubmission,
              persist_records: false,
            });
            const reportObj = (run.report || {}) as {
              assertions?: Array<{ passed?: boolean }>;
            };
            const assertions = reportObj.assertions || [];
            const failedAssertions = assertions.filter((item) => !item.passed).length;
            return {
              status: run.qualified && failedAssertions === 0 ? "passed" : "failed",
              details:
                failedAssertions === 0
                  ? `status=${run.scenario?.verification_status ?? "n/a"}, confidence=${run.verification_confidence ?? "n/a"}`
                  : `${failedAssertions} assertion(s) failed`,
              report: {
                mode: "synthetic",
                task_id: run.task_id,
                scenario_id: run.scenario_id,
                payload: run.report,
                pack_version: run.pack_version,
              },
            };
          }

          if (!taskId) {
            return {
              status: "failed",
              details: "No selected task provided for task-bound run.",
              report: { reason: "missing_task_id" },
            };
          }

          const started = await planningApi.startSimulationScenario(taskId, {
            scenario_type: pack.simulation_type,
            scenario_payload: scenarioCase,
          });
          const submitted = await planningApi.submitSimulationScenario(taskId, started.scenario.id, {
            learner_submission: learnerSubmission,
          });
          const result = await planningApi.getSimulationScenarioResult(taskId, started.scenario.id);
          const packVersion = result.pack_version || submitted.pack_version;
          if (!packVersion) {
            return {
              status: "failed",
              details: "Missing pack_version in result envelope.",
              report: { started, submitted, result },
            };
          }
          return {
            status: "passed",
            details: `status=${result.scenario.verification_status}, confidence=${result.verification_confidence ?? "n/a"}`,
            report: {
              mode: "task_bound",
              task_id: taskId,
              scenario_id: started.scenario.id,
              result: {
                pack_version: result.pack_version,
                verification_confidence: result.verification_confidence,
                efficacy_metrics: result.efficacy_metrics,
              },
            },
          };
        },
      });
    }

    testCases.push({
      id: "code-success",
      scenarioId: "code-success",
      surface: "code_runner",
      label: "Code execution success path",
      severity: "critical",
      run: async () => {
        const requestPayload = {
          language: "python",
          source_code: "print('horizon-lab-ok')",
        } as const;
        const result = await playgroundApi.executeCode(requestPayload);
        if ((result.stdout || "").includes("horizon-lab-ok")) {
          return { status: "passed", details: "stdout includes horizon-lab-ok", report: { requestPayload, result } };
        }
        return {
          status: "failed",
          details: result.message || "Unexpected stdout for success case.",
          report: { requestPayload, result },
        };
      },
    });

    testCases.push({
      id: "code-failure",
      scenarioId: "code-failure",
      surface: "code_runner",
      label: "Code execution error path",
      severity: "critical",
      run: async () => {
        const requestPayload = {
          language: "python",
          source_code: "def broken(:\n  pass",
        } as const;
        const result = await playgroundApi.executeCode(requestPayload);
        const errorText = `${result.stderr || ""} ${result.compile_output || ""} ${result.message || ""}`.trim();
        if (errorText.length > 0) {
          return { status: "passed", details: "error signal returned from Judge0", report: { requestPayload, result } };
        }
        return {
          status: "failed",
          details: "No error details returned for invalid code.",
          report: { requestPayload, result },
        };
      },
    });

    testCases.push({
      id: "flashcards",
      scenarioId: "flashcards",
      surface: "flashcards",
      label: "Flashcard generation contract",
      severity: "medium",
      run: async () => {
        if (!taskId) {
          return { status: "skipped", details: "Needs a real task context.", report: { reason: "no_task_selected" } };
        }
        const payload = await planningApi.generateFlashcards(taskId, { force: true, count: 4 });
        const cards = payload.cards ?? [];
        const valid = cards.length >= 2 && cards.every((card) => card.front.trim() && card.back.trim());
        return valid
          ? { status: "passed", details: `${cards.length} cards generated`, report: payload as unknown as Record<string, unknown> }
          : { status: "failed", details: "Flashcard payload missing front/back entries.", report: payload as unknown as Record<string, unknown> };
      },
    });

    testCases.push({
      id: "micro-practice",
      scenarioId: "micro-practice",
      surface: "micro_practice",
      label: "Micro-practice question contract",
      severity: "medium",
      run: async () => {
        if (!taskId) {
          return { status: "skipped", details: "Needs a real task context.", report: { reason: "no_task_selected" } };
        }
        const payload = await planningApi.generateMicroPractice(taskId, { force: true, count: 3 });
        const questions = payload.questions ?? [];
        const valid = questions.length >= 2 && questions.every((q) => q.options.length >= 2 && Number.isInteger(q.correct_index));
        return valid
          ? { status: "passed", details: `${questions.length} questions generated`, report: payload as unknown as Record<string, unknown> }
          : { status: "failed", details: "Invalid quiz contract (options/correct_index).", report: payload as unknown as Record<string, unknown> };
      },
    });

    testCases.push({
      id: "teach-back",
      scenarioId: "teach-back",
      surface: "teach_me_back",
      label: "Teach-me-back message pipeline",
      severity: "high",
      run: async () => {
        if (!taskId) {
          return { status: "skipped", details: "Needs a real task context.", report: { reason: "no_task_selected" } };
        }
        const convo = await planningApi.getOrCreatePlaygroundConversation(taskId);
        const msg: ChatMessage = await chatApi.sendMessage(convo.conversation_id, {
          content: "Teach-back test: explain event loops in plain language.",
          context: "Simulation Lab teach-back contract smoke test.",
          metadata: {
            action_type: "feynman_check",
            skip_intelligence: true,
            source: "simulation-lab",
          },
        });
        if (!msg?.id) {
          return { status: "failed", details: "No message id returned from chat send.", report: { conversation_id: convo.conversation_id, msg } };
        }
        return {
          status: "passed",
          details: `conversation=${convo.conversation_id}`,
          report: { conversation_id: convo.conversation_id, message_id: msg.id, metadata: msg.metadata },
        };
      },
    });

    testCases.push({
      id: "mentor-nudge",
      scenarioId: "mentor-nudge",
      surface: "mentor_intervention",
      label: "Proactive nudge trigger loop",
      severity: "high",
      run: async () => {
        if (!taskId) {
          return { status: "skipped", details: "Needs a real task context.", report: { reason: "no_task_selected" } };
        }
        const runId = `suite-${Date.now()}`;
        let last: EventResponse | null = null;
        for (let idx = 0; idx < 3; idx += 1) {
          await planningApi.emitPlaygroundEvent(
            taskId,
            toEventPayload("compile_error", {
              run_id: `${runId}-${idx}`,
              error_type: "syntax",
              status: "compilation error",
            })
          );
          last = (await planningApi.emitPlaygroundEvent(
            taskId,
            toEventPayload("test_failed", {
              run_id: `${runId}-${idx}`,
              error_type: "syntax",
              status: "failed",
              meta: { scope: "hidden", source: "simulation-lab-suite" },
            })
          )) as EventResponse;
        }
        setLatestEvent(last);
        if (last?.nudge?.message) {
          return { status: "passed", details: `nudge=${last.nudge.trigger}`, report: { runId, last } };
        }
        return {
          status: "skipped",
          details: "No nudge in this run (likely cooldown or recent nudge).",
          report: { runId, last },
        };
      },
    });

    testCases.push({
      id: "canvas-local",
      scenarioId: "canvas-local",
      surface: "canvas",
      label: "Canvas local persistence contract",
      severity: "low",
      run: async () => {
        const key = `canvas:simulation-lab:${taskId || "synthetic"}`;
        const html = `<p>Simulation lab canvas test ${Date.now()}</p>`;
        localStorage.setItem(key, html);
        const restored = localStorage.getItem(key);
        localStorage.removeItem(key);
        if (restored === html) {
          return { status: "passed", details: "localStorage save/restore works", report: { key, expected: html, restored } };
        }
        return { status: "failed", details: "Canvas persistence mismatch.", report: { key, expected: html, restored } };
      },
    });

    if (includeArtifactFlowTests) {
      testCases.push({
        id: "canvas-proof",
        scenarioId: "canvas-proof",
        surface: "canvas",
        label: "Canvas proof submission pipeline",
        severity: "medium",
        run: async () => {
          if (!taskId) {
            return { status: "skipped", details: "Needs a real task context.", report: { reason: "no_task_selected" } };
          }
          const proof = await planningApi.submitTaskProof(taskId, {
            submission_type: "text",
            content: `Simulation lab canvas proof ${new Date().toISOString()}`,
            metadata: { source: "simulation-lab", surface: "canvas" },
          });
          return proof.artifact_id
            ? { status: "passed", details: `artifact=${proof.artifact_id}`, report: proof as unknown as Record<string, unknown> }
            : { status: "failed", details: "No artifact_id returned for canvas proof.", report: proof as unknown as Record<string, unknown> };
        },
      });

      testCases.push({
        id: "diagram-proof",
        scenarioId: "diagram-proof",
        surface: "diagram",
        label: "Diagram proof upload pipeline",
        severity: "medium",
        run: async () => {
          if (!taskId) {
            return { status: "skipped", details: "Needs a real task context.", report: { reason: "no_task_selected" } };
          }
          const blob = new Blob(["simulation-lab-diagram"], { type: "image/png" });
          const file = new File([blob], `diagram-lab-${Date.now()}.png`, { type: "image/png" });
          const formData = new FormData();
          formData.append("submission_type", "file");
          formData.append("content", "Simulation lab diagram upload proof");
          formData.append("file", file);
          const proof = await planningApi.submitTaskProof(taskId, formData);
          return proof.artifact_id
            ? { status: "passed", details: `artifact=${proof.artifact_id}`, report: proof as unknown as Record<string, unknown> }
            : { status: "failed", details: "No artifact_id returned for diagram proof upload.", report: proof as unknown as Record<string, unknown> };
        },
      });
    }

    setSuiteRunning(true);
    setSuiteResults(
      testCases.map((testCase) => ({
        id: testCase.id,
        scenarioId: testCase.scenarioId,
        surface: testCase.surface,
        label: testCase.label,
        severity: testCase.severity,
        status: "pending",
      }))
    );

    for (const testCase of testCases) {
      const startedAt = Date.now();
      setSuiteResults((prev) =>
        prev.map((row) =>
          row.id === testCase.id
            ? {
                ...row,
                status: "running",
                details: undefined,
                report: undefined,
                failureCode: "none",
                userMessage: undefined,
                likelyCause: undefined,
                recommendedAction: undefined,
              }
            : row
        )
      );
      try {
        const result = await testCase.run();
        const durationMs = Date.now() - startedAt;
        const failureCode = deriveFailureCode(result.status, result.details, result.report);
        const explanation = buildUserExplanation(failureCode, result.status, result.details);
        setSuiteResults((prev) =>
          prev.map((row) =>
            row.id === testCase.id
              ? {
                  ...row,
                  status: result.status,
                  details: result.details,
                  durationMs,
                  failureCode,
                  userMessage: explanation.userMessage,
                  likelyCause: explanation.likelyCause,
                  recommendedAction: explanation.recommendedAction,
                  report: result.report,
                }
              : row
          )
        );
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        const report = axios.isAxiosError(error)
          ? {
              status: error.response?.status,
              response: error.response?.data,
            }
          : { error: String(error) };
        const details = getErrorMessage(error);
        const failureCode = deriveFailureCode("failed", details, report);
        const explanation = buildUserExplanation(failureCode, "failed", details);
        setSuiteResults((prev) =>
          prev.map((row) =>
            row.id === testCase.id
              ? {
                  ...row,
                  status: "failed",
                  details,
                  durationMs,
                  failureCode,
                  userMessage: explanation.userMessage,
                  likelyCause: explanation.likelyCause,
                  recommendedAction: explanation.recommendedAction,
                  report,
                }
              : row
          )
        );
      }
    }

    setSuiteRunning(false);
    telemetry.toastSuccess("Standard suite run complete");
  };

  const handleStartScenario = async () => {
    if (!selectedTaskId) {
      telemetry.toastError("Pick a task first");
      return;
    }
    await runAction(async () => {
      const scenario = await planningApi.startSimulationScenario(selectedTaskId, {
        scenario_type: selectedSimulationType || undefined,
        scenario_payload:
          (safeParse(scenarioPayload) as Record<string, unknown>) || {},
      });
      setActiveScenario(scenario.scenario);
      setResultEnvelope(null);
      telemetry.toastSuccess(`Scenario started: ${scenario.scenario.simulation_type || scenario.scenario.scenario_type}`);
    });
  };

  const handleSubmitScenario = async () => {
    if (!selectedTaskId || !activeScenario?.id) {
      telemetry.toastError("Start a scenario first");
      return;
    }
    await runAction(async () => {
      const result = await planningApi.submitSimulationScenario(
        selectedTaskId,
        activeScenario.id,
        { learner_submission: safeParse(submissionPayload) as Record<string, unknown> | string | string[] }
      );
      setResultEnvelope(result);
      setActiveScenario(result.scenario);
      telemetry.toastSuccess(`Submission processed: ${result.scenario.verification_status}`);
    });
  };

  const handleFetchResult = async () => {
    if (!selectedTaskId || !activeScenario?.id) {
      telemetry.toastError("Start a scenario first");
      return;
    }
    await runAction(async () => {
      const result = await planningApi.getSimulationScenarioResult(selectedTaskId, activeScenario.id);
      setResultEnvelope(result);
      telemetry.toastSuccess("Latest simulation result loaded");
    });
  };

  const emitEvent = async (payload: PlaygroundEventPayload) => {
    if (!selectedTaskId) {
      telemetry.toastError("Pick a task first");
      return;
    }
    await runAction(async () => {
      const response = await planningApi.emitPlaygroundEvent(selectedTaskId, payload);
      setLatestEvent(response as EventResponse);
      if (response.nudge?.message) {
        telemetry.toastSuccess("Mentor nudge triggered");
      } else {
        telemetry.toastInfo(`Event emitted: ${payload.event_type}`);
      }
    });
  };

  const emitFailureLoop = async () => {
    if (!selectedTaskId) {
      telemetry.toastError("Pick a task first");
      return;
    }
    await runAction(async () => {
      const runId = `lab-${Date.now()}`;
      let last: EventResponse | null = null;
      for (let idx = 0; idx < 3; idx += 1) {
        await planningApi.emitPlaygroundEvent(
          selectedTaskId,
          toEventPayload("compile_error", {
            run_id: `${runId}-${idx}`,
            error_type: "syntax",
            status: "compilation error",
          })
        );
        last = (await planningApi.emitPlaygroundEvent(
          selectedTaskId,
          toEventPayload("test_failed", {
            run_id: `${runId}-${idx}`,
            error_type: "syntax",
            status: "failed",
            meta: { scope: "hidden", source: "simulation-lab" },
          })
        )) as EventResponse;
      }
      setLatestEvent(last);
      if (last?.nudge?.message) {
        telemetry.toastSuccess("Repeated failure trigger generated a mentor nudge");
      } else {
        telemetry.toastInfo("Failure loop sent. If no nudge appeared, check task cooldown window.");
      }
    });
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl p-6">
        <p className="text-sm text-muted-foreground">Loading simulation lab…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Simulation Lab</h1>
          <p className="text-sm text-muted-foreground">
            UI test harness for SDL simulators, runtime scoring, and proactive mentor interventions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedTask ? (
            <Link
              href={`/plans/${selectedTask.learning_plan}/playground?task=${selectedTask.id}`}
              className="text-sm underline underline-offset-4"
            >
              Open selected task in Playground
            </Link>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>0. One-Click Standard Suite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Runs curated tests for every sandbox/simulator surface: SDL simulators, code runner, flashcards,
            teach-me-back, mentor trigger path, and canvas persistence. Optional artifact flow checks validate
            canvas/diagram proof submission end-to-end.
          </p>
          {suiteResults.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-5">
              <div className="rounded-md border bg-background p-2 text-xs">
                <p className="text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{suiteSummary.total}</p>
              </div>
              <div className="rounded-md border bg-emerald-50 p-2 text-xs">
                <p className="text-emerald-700">Passed</p>
                <p className="text-lg font-semibold text-emerald-800">{suiteSummary.passed}</p>
              </div>
              <div className="rounded-md border bg-rose-50 p-2 text-xs">
                <p className="text-rose-700">Failed</p>
                <p className="text-lg font-semibold text-rose-800">{suiteSummary.failed}</p>
              </div>
              <div className="rounded-md border bg-amber-50 p-2 text-xs">
                <p className="text-amber-700">Critical Failed</p>
                <p className="text-lg font-semibold text-amber-800">{suiteSummary.criticalFailed}</p>
              </div>
              <div className="rounded-md border bg-slate-50 p-2 text-xs">
                <p className="text-slate-700">Skipped</p>
                <p className="text-lg font-semibold text-slate-800">{suiteSummary.skipped}</p>
              </div>
            </div>
          ) : null}
          <div
            className={`rounded-md border p-2 text-xs ${
              releaseGate.status === "pass"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : releaseGate.status === "fail"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : releaseGate.status === "running"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <p className="font-semibold">Release Gate (Critical Scenarios): {releaseGate.label}</p>
            <p>{releaseGate.note}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runStandardSuite} disabled={suiteRunning || (suiteMode === "selected_task" && !selectedTaskId)}>
              {suiteRunning ? "Running Suite…" : "Run Standard Suite"}
            </Button>
            <label className="inline-flex items-center gap-2 text-sm">
              Mode
              <select
                className="rounded-md border bg-background px-2 py-1 text-xs"
                value={suiteMode}
                onChange={(event) => setSuiteMode(event.target.value as "synthetic" | "selected_task")}
              >
                <option value="synthetic">Synthetic use cases</option>
                <option value="selected_task">Selected task only</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeArtifactFlowTests}
                onChange={(event) => setIncludeArtifactFlowTests(event.target.checked)}
              />
              Include artifact flow tests (creates proof artifacts)
            </label>
            <Button variant="outline" onClick={() => setSuiteResults([])} disabled={suiteRunning || suiteResults.length === 0}>
              Clear Results
            </Button>
            <Button variant="outline" onClick={exportSuiteJson} disabled={suiteResults.length === 0}>
              Export JSON
            </Button>
            <Button variant="outline" onClick={exportSuiteCsv} disabled={suiteResults.length === 0}>
              Export CSV
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-2">
            <label className="inline-flex items-center gap-2 text-xs">
              Surface
              <select
                className="rounded-md border bg-background px-2 py-1"
                value={surfaceFilter}
                onChange={(event) => setSurfaceFilter(event.target.value)}
              >
                <option value="all">All</option>
                {[...new Set(suiteResults.map((r) => r.surface))].map((surface) => (
                  <option key={surface} value={surface}>{surface}</option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-2 text-xs">
              Status
              <select
                className="rounded-md border bg-background px-2 py-1"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value="passed">passed</option>
                <option value="failed">failed</option>
                <option value="skipped">skipped</option>
                <option value="running">running</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-2 text-xs">
              Severity
              <select
                className="rounded-md border bg-background px-2 py-1"
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value="critical">critical</option>
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showOnlyFailures}
                onChange={(event) => setShowOnlyFailures(event.target.checked)}
              />
              Failures only
            </label>
          </div>

          {suiteResults.length > 0 ? (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-3 py-2">Surface</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Test</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Details</th>
                    <th className="px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuiteResults.map((result) => (
                    <tr key={result.id}>
                      <td colSpan={6} className="p-0">
                        <table className="w-full">
                          <tbody>
                            <tr className="border-t">
                              <td className="px-3 py-2 font-medium">{result.surface}</td>
                              <td className="px-3 py-2">{result.severity}</td>
                              <td className="px-3 py-2">{result.label}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={
                                    result.status === "passed"
                                      ? "text-emerald-700"
                                      : result.status === "failed"
                                        ? "text-rose-700"
                                        : result.status === "running"
                                          ? "text-amber-700"
                                          : result.status === "skipped"
                                            ? "text-slate-600"
                                            : "text-slate-500"
                                  }
                                >
                                  {result.status}
                                </span>
                              </td>
                              <td className="px-3 py-2">{result.details || "—"}</td>
                              <td className="px-3 py-2">{result.durationMs ? `${result.durationMs}ms` : "—"}</td>
                            </tr>
                            <tr className="border-t bg-muted/10">
                              <td className="px-3 py-2 text-[11px]" colSpan={6}>
                                <p><span className="font-semibold">What happened:</span> {result.userMessage || "No explanation yet."}</p>
                                <p><span className="font-semibold">Likely cause:</span> {result.likelyCause || "Not available."}</p>
                                <p><span className="font-semibold">Recommended action:</span> {result.recommendedAction || "Not available."}</p>
                                <p><span className="font-semibold">Failure code:</span> {result.failureCode || "none"}</p>
                              </td>
                            </tr>
                            {result.report ? (
                              <tr className="border-t bg-muted/30">
                                <td className="px-3 py-2 text-[11px] text-muted-foreground" colSpan={6}>
                                  <pre className="max-h-56 overflow-auto rounded-md border bg-background p-2 text-[11px]">
                                    {JSON.stringify(result.report, null, 2)}
                                  </pre>
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Curated baseline scenarios for release confidence. Includes happy-path, edge-case, and failure-signal checks per surface.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {SCENARIO_CATALOG.map((item) => (
              <div key={item.id} className="rounded-md border bg-background p-3 text-xs">
                <p className="font-semibold">{item.title}</p>
                <p className="text-muted-foreground">
                  {item.surface} · severity: {item.severity} · {item.requiresTaskContext ? "task-bound" : "synthetic-capable"}
                </p>
                <p className="mt-1"><span className="font-medium">Purpose:</span> {item.purpose}</p>
                <p className="mt-1"><span className="font-medium">Expected:</span> {item.expectedBehavior}</p>
                <p className="mt-1"><span className="font-medium">Failure modes:</span> {item.expectedFailureModes.join(", ")}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1. Context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>Task</span>
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={selectedTaskId}
              onChange={(event) => setSelectedTaskId(event.target.value)}
            >
              {tasks.length === 0 ? <option value="">No tasks found</option> : null}
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title} ({task.task_type}) - {task.scheduled_date}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Simulator Pack</span>
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={selectedSimulationType}
              onChange={(event) => setSelectedSimulationType(event.target.value)}
            >
              {packs.map((pack) => (
                <option key={pack.simulation_type} value={pack.simulation_type}>
                  {pack.simulation_type} · {pack.domain_family} · v{pack.pack_version}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Scenario Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Scenario Payload (JSON)</span>
            <textarea
              className="min-h-28 rounded-md border bg-background p-3 font-mono text-xs"
              value={scenarioPayload}
              onChange={(event) => setScenarioPayload(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleStartScenario} disabled={busy || !selectedTaskId}>
              Start Scenario
            </Button>
            <Button variant="outline" onClick={handleFetchResult} disabled={busy || !activeScenario?.id}>
              Fetch Result
            </Button>
          </div>
          {activeScenario ? (
            <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs">
              {JSON.stringify(
                {
                  id: activeScenario.id,
                  simulation_type: activeScenario.simulation_type || activeScenario.scenario_type,
                  verification_status: activeScenario.verification_status,
                  pack_version: activeScenario.pack_version,
                },
                null,
                2
              )}
            </pre>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Submit + Evaluate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Learner Submission (JSON or text)</span>
            <textarea
              className="min-h-28 rounded-md border bg-background p-3 font-mono text-xs"
              value={submissionPayload}
              onChange={(event) => setSubmissionPayload(event.target.value)}
            />
          </label>
          <Button onClick={handleSubmitScenario} disabled={busy || !activeScenario?.id}>
            Submit Scenario
          </Button>
          {resultEnvelope ? (
            <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs">
              {JSON.stringify(
                {
                  simulation_type: resultEnvelope.simulation_type,
                  pack_version: resultEnvelope.pack_version,
                  verification_status: resultEnvelope.scenario.verification_status,
                  verification_confidence: resultEnvelope.verification_confidence,
                  scoring_components: resultEnvelope.scoring_components,
                  efficacy_metrics: resultEnvelope.efficacy_metrics,
                },
                null,
                2
              )}
            </pre>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Mentor Trigger Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                emitEvent(
                  toEventPayload("idle_detected", {
                    status: "idle",
                    meta: { source: "simulation-lab" },
                  })
                )
              }
              disabled={busy || !selectedTaskId}
            >
              Emit Idle Event
            </Button>
            <Button variant="outline" onClick={emitFailureLoop} disabled={busy || !selectedTaskId}>
              Emit 3x Failure Loop
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                emitEvent(
                  toEventPayload("hint_requested", {
                    meta: { source: "simulation-lab" },
                  })
                )
              }
              disabled={busy || !selectedTaskId}
            >
              Emit Hint Requested
            </Button>
          </div>
          {latestEvent ? (
            <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs">
              {JSON.stringify(latestEvent, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              Emit events to inspect aggregate updates and nudge payloads.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
