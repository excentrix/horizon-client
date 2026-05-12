"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { planningApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import type { DomainScenarioPayload, ExecutionDescriptor, SimulationResultEnvelope } from "@/types";

interface SimulationScenarioSurfaceProps {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  executionDescriptor?: ExecutionDescriptor | null;
  verificationCriteria?: string;
  onSubmissionProcessed?: (result: SimulationResultEnvelope) => void;
}

type SessionState = "idle" | "starting" | "ready" | "submitting" | "error";
type RoundEntry = {
  round_index: number;
  submitted_at: string;
  learner_response: string;
  checkpoint: string;
  weakest_criterion?: string;
  intervention?: string;
  status?: string;
};

type PackPresentation = {
  scaffold: string[];
  evidenceCards: string[];
  constraints: string[];
};

const PACK_PRESENTATIONS: Record<string, PackPresentation> = {
  rag_retrieval_debug: {
    scaffold: ["Observed failure", "Likely retrieval root cause", "Verification query and expected signal", "Patch proposal"],
    evidenceCards: ["retrieval trace summary", "chunk selection rationale", "before/after quality check"],
    constraints: ["No hidden assumptions", "Use measurable checks", "Document fallback path"],
  },
  llm_eval_design: {
    scaffold: ["Evaluation objective", "Metrics and rubric", "Failure slices", "Iteration protocol"],
    evidenceCards: ["eval rubric snapshot", "sample prompts", "decision log"],
    constraints: ["Avoid single-metric claims", "Include blind spots", "Define pass threshold"],
  },
  guardrail_policy_test: {
    scaffold: ["Policy objective", "Red-team scenario", "Observed failure mode", "Mitigation plan"],
    evidenceCards: ["policy cases tested", "violations found", "policy patch"],
    constraints: ["Include edge cases", "State false-positive risk", "Keep user safety priority"],
  },
  agent_failure_replay: {
    scaffold: ["Failure timeline", "Root cause", "Recovery action", "Prevention check"],
    evidenceCards: ["replay checkpoints", "tool call anomalies", "fix verification"],
    constraints: ["Show causality", "Avoid vague diagnosis", "Add watchdog signal"],
  },
  ai_product_experiment: {
    scaffold: ["Hypothesis", "Experiment design", "Decision metric", "Rollout recommendation"],
    evidenceCards: ["experiment card", "result interpretation", "next sprint action"],
    constraints: ["Define baseline", "Include user impact", "State confidence band"],
  },
  decision_memo_defense: {
    scaffold: ["Decision", "Tradeoffs", "Risk register", "Execution plan"],
    evidenceCards: ["decision memo excerpt", "alternatives considered", "success metric"],
    constraints: ["Address counterarguments", "Include constraints", "Time-bound decision"],
  },
  ai_ops_rollout_incident: {
    scaffold: ["Incident summary", "Containment action", "Root-cause hypothesis", "Runbook update"],
    evidenceCards: ["incident timeline", "blast radius estimate", "postmortem actions"],
    constraints: ["Prioritize containment", "Be explicit about unknowns", "Close loop with runbook"],
  },
  business_kpi: {
    scaffold: ["Primary KPI diagnosis", "Metric drivers", "Action recommendation", "Validation plan"],
    evidenceCards: ["KPI trend snapshot", "driver assumptions", "decision threshold"],
    constraints: ["Separate leading vs lagging metrics", "Quantify impact", "State confidence"],
  },
  customer_renewal_risk: {
    scaffold: ["Account risk signal", "Likely churn causes", "Save playbook", "Follow-up checkpoints"],
    evidenceCards: ["risk score rationale", "retention intervention", "success criteria"],
    constraints: ["Prioritize highest risk first", "Avoid generic outreach", "Use measurable milestones"],
  },
  design_critique: {
    scaffold: ["Design intent", "Strengths", "Critical issues", "Revision plan"],
    evidenceCards: ["heuristic checklist", "before/after critique notes", "tradeoff rationale"],
    constraints: ["Ground critique in user impact", "Avoid taste-only feedback", "Rank by severity"],
  },
  education_intervention_case: {
    scaffold: ["Learner profile", "Intervention hypothesis", "Implementation steps", "Progress checks"],
    evidenceCards: ["support strategy", "differentiation notes", "outcome indicators"],
    constraints: ["Preserve learner dignity", "Include adaptation branch", "Define review cadence"],
  },
  exec_prioritization_tradeoff: {
    scaffold: ["Decision frame", "Options compared", "Tradeoff rationale", "Commitment plan"],
    evidenceCards: ["priority matrix", "risk callouts", "follow-up trigger"],
    constraints: ["Make one clear recommendation", "Include opportunity cost", "Tie to strategic goals"],
  },
  finance_forecast: {
    scaffold: ["Forecast assumptions", "Model outputs", "Risk envelope", "Decision implications"],
    evidenceCards: ["forecast table", "sensitivity case", "confidence interval"],
    constraints: ["State assumptions explicitly", "Include downside case", "Avoid false precision"],
  },
  funnel_experiment: {
    scaffold: ["Funnel stage diagnosis", "Experiment hypothesis", "Test design", "Ship/no-ship rule"],
    evidenceCards: ["baseline conversion", "experiment plan", "result interpretation"],
    constraints: ["Single primary metric", "Control for confounders", "Pre-commit decision rule"],
  },
  marketing_campaign: {
    scaffold: ["Audience and goal", "Creative and channel strategy", "Budget logic", "Measurement plan"],
    evidenceCards: ["message matrix", "channel split", "KPI targets"],
    constraints: ["Match message to segment", "Tie spend to objective", "Include optimization loop"],
  },
  process_redesign: {
    scaffold: ["Current bottleneck", "Redesign proposal", "Operational risk", "Rollout checkpoints"],
    evidenceCards: ["process map delta", "handoff improvements", "success indicators"],
    constraints: ["Minimize disruption", "Include failure mode", "Define ownership"],
  },
  sales_discovery_call: {
    scaffold: ["Discovery objective", "Question sequence", "Need qualification", "Next-step close"],
    evidenceCards: ["pain summary", "qualification grid", "next meeting commitment"],
    constraints: ["Ask before pitching", "Capture buying signals", "End with explicit next step"],
  },
};

function normalizePackKey(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  const lower = value.toLowerCase();
  const slash = lower.split("/").pop() ?? lower;
  const colon = slash.split(":").pop() ?? slash;
  return colon.replace(/\.json$/, "");
}

function normalizeSections(criteria?: string): string[] {
  if (!criteria) return [];
  return criteria
    .split(/\.\s+|\n/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 5);
}

function summarizeContext(payload: Record<string, unknown>): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  Object.entries(payload).forEach(([key, value]) => {
    if (["brief", "context", "simulation_type", "expected_output"].includes(key)) return;
    if (value == null) return;

    if (Array.isArray(value)) {
      if (!value.length) return;
      rows.push({ label: key.replace(/_/g, " "), value: value.map((item) => String(item)).join(" · ") });
      return;
    }

    if (typeof value === "object") {
      const parts = Object.entries(value as Record<string, unknown>).map(
        ([subKey, subValue]) => `${subKey.replace(/_/g, " ")}: ${typeof subValue === "object" ? JSON.stringify(subValue) : String(subValue)}`,
      );
      rows.push({ label: key.replace(/_/g, " "), value: parts.join(" • ") });
      return;
    }

    rows.push({ label: key.replace(/_/g, " "), value: String(value) });
  });
  return rows;
}

function RuntimeSummary({ envelope }: { envelope: SimulationResultEnvelope }) {
  const scenario = envelope.scenario;
  const status = scenario.verification_status ?? "not_verifiable";
  const confidence = typeof envelope.verification_confidence === "number" ? Math.round(envelope.verification_confidence * 100) : null;
  const breakdown = scenario.rubric_breakdown ?? {};
  const rationale = scenario.evaluator_rationale ?? {};

  const statusTone =
    status === "verified"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "failed"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border px-4 py-3 ${statusTone}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Simulation result</p>
            <p className="mt-1 text-base font-semibold">
              {status === "verified" ? "Verified" : status === "failed" ? "Needs revision" : "Needs more evidence"}
            </p>
          </div>
          {confidence !== null ? (
            <div className="text-right">
              <p className="text-2xl font-bold">{confidence}%</p>
              <p className="text-[11px] opacity-70">confidence</p>
            </div>
          ) : null}
        </div>
      </div>

      {Object.keys(breakdown).length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Rubric breakdown</p>
          <div className="space-y-3">
            {Object.entries(breakdown).map(([key, criterion]) => {
              const score = Math.round(((criterion?.score as number) || 0) * 100);
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-800">{(criterion?.label as string) || key.replace(/_/g, " ")}</span>
                    <span className="text-xs font-semibold text-slate-500">{score}%</span>
                  </div>
                  <Progress value={score} className="h-1.5" />
                  {criterion?.rationale ? <p className="text-xs text-slate-500">{String(criterion.rationale)}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {Array.isArray(rationale.gaps) && rationale.gaps.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">What to improve</p>
          <ul className="space-y-1.5 text-sm text-amber-900">
            {(rationale.gaps as string[]).map((gap, idx) => (
              <li key={`${gap}-${idx}`} className="flex gap-2"><span className="mt-1 text-amber-500">•</span><span>{gap}</span></li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function SimulationScenarioSurface({
  taskId,
  taskTitle,
  taskDescription,
  executionDescriptor,
  verificationCriteria,
  onSubmissionProcessed,
}: SimulationScenarioSurfaceProps) {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [scenario, setScenario] = useState<DomainScenarioPayload | null>(null);
  const [resultEnvelope, setResultEnvelope] = useState<SimulationResultEnvelope | null>(null);
  const [submission, setSubmission] = useState("");
  const [rounds, setRounds] = useState<RoundEntry[]>([]);
  const [roundIndex, setRoundIndex] = useState(1);
  const [startError, setStartError] = useState<string | null>(null);
  const [startAttempt, setStartAttempt] = useState(0);

  useEffect(() => {
    setSessionState("idle");
    setScenario(null);
    setResultEnvelope(null);
    setSubmission("");
    setRounds([]);
    setRoundIndex(1);
    setStartError(null);
    setStartAttempt(0);
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;
    if ((executionDescriptor?.surface_type || "simulation_scenario") !== "simulation_scenario") return;
    if (scenario) return;

    let cancelled = false;
    setSessionState("starting");
    setStartError(null);

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setSessionState("error");
      setStartError("Simulation startup timed out. You can retry or continue with fallback mode.");
    }, 12000);

    planningApi
      .startSimulationScenario(taskId, {
        scenario_type:
          executionDescriptor?.pack_ref ||
          executionDescriptor?.simulation_type_or_pack_ref ||
          undefined,
        surface_type: "simulation_scenario",
      })
      .then((response) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setScenario(response.scenario);
        setSessionState("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setSessionState("error");
        setStartError(error instanceof Error ? error.message : "Could not start simulation scenario.");
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [taskId, executionDescriptor, scenario, startAttempt]);

  const scenarioPayload = useMemo(
    () => (scenario?.scenario_payload ?? {}) as Record<string, unknown>,
    [scenario?.scenario_payload],
  );
  const contextRows = useMemo(() => summarizeContext(scenarioPayload), [scenarioPayload]);
  const criteriaRows = useMemo(() => normalizeSections(verificationCriteria), [verificationCriteria]);

  const handleSubmit = async () => {
    if (!scenario?.id || !submission.trim()) return;
    setSessionState("submitting");
    try {
      const result = await planningApi.submitSimulationScenario(taskId, scenario.id, {
        learner_submission: {
          response: submission.trim(),
          round_index: roundIndex,
          prior_rounds: rounds.map((round) => ({
            round_index: round.round_index,
            checkpoint: round.checkpoint,
            weakest_criterion: round.weakest_criterion,
          })),
        },
      });
      const rationale = (result.scenario.evaluator_rationale ?? {}) as Record<string, unknown>;
      const checkpoint = String(rationale.summary || result.scenario.verification_status || "round evaluated");
      const weakestCriterion = typeof rationale.weakest_criterion === "string" ? rationale.weakest_criterion : undefined;
      const intervention = typeof rationale.copilot_guidance === "string" ? rationale.copilot_guidance : undefined;

      setScenario(result.scenario);
      setResultEnvelope(result);
      setRounds((prev) => [
        ...prev,
        {
          round_index: roundIndex,
          submitted_at: new Date().toISOString(),
          learner_response: submission.trim(),
          checkpoint,
          weakest_criterion: weakestCriterion,
          intervention,
          status: result.scenario.verification_status,
        },
      ]);
      setRoundIndex((prev) => prev + 1);
      onSubmissionProcessed?.(result);
      setSessionState("ready");
      setSubmission("");
      telemetry.toastSuccess(result.scenario.verification_status === "verified" ? "Simulation verified." : "Round scored. Refine and continue.");
    } catch (error) {
      setSessionState("ready");
      telemetry.toastError(error instanceof Error ? error.message : "Could not submit simulation response.");
    }
  };

  const scaffold = criteriaRows.length
    ? criteriaRows.map((item, idx) => `${idx + 1}. ${item}`).join("\n")
    : "1. Diagnosis / thesis\n2. Evidence and reasoning\n3. Fixes or next actions";

  const packRefRaw = String(executionDescriptor?.pack_ref || executionDescriptor?.simulation_type_or_pack_ref || scenario?.simulation_type || "");
  const packRef = normalizePackKey(packRefRaw);
  const packPresentation = PACK_PRESENTATIONS[packRef] || {
    scaffold: ["Diagnosis", "Evidence", "Action"],
    evidenceCards: ["what you observed", "what changed", "what you verified"],
    constraints: ["Keep it concrete", "Link to rubric", "State next action"],
  };
  const maxRounds = Number(((executionDescriptor as Record<string, unknown> | undefined)?.runtime_state as Record<string, unknown> | undefined)?.max_rounds || 3);
  const latestRound = rounds[rounds.length - 1];
  const reachedStop = rounds.length >= maxRounds || resultEnvelope?.scenario.verification_status === "verified";

  if (sessionState === "starting") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <div className="flex max-w-md flex-col items-center gap-3 px-6 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Preparing your scenario sandbox</p>
            <p className="mt-1 text-sm text-slate-500">Horizon is loading the simulation brief, context, and scoring contract for this task.</p>
          </div>
        </div>
      </div>
    );
  }

  if ((sessionState === "error" || !scenario) && !scenario) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <AlertTriangle className="h-6 w-6 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Simulation startup needs attention</p>
          <p className="mt-1 text-xs text-amber-800">
            {startError || "We couldn't load the simulation session right now."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
            onClick={() => {
              setScenario(null);
              setStartError(null);
              setSessionState("idle");
              setStartAttempt((n) => n + 1);
            }}
          >
            Retry start
          </Button>
          <Button
            className="bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => {
              setScenario({
                id: "fallback",
                task: taskId,
                user: "fallback-user",
                scenario_type: "fallback_simulation",
                simulation_type: "fallback_simulation",
                domain_family: "other",
                scenario_payload: {
                  brief: taskTitle,
                  context: taskDescription || "Use this task context to draft your simulation response.",
                },
                learner_submission: {},
                rubric_scores: {},
                rubric_breakdown: {},
                verification_status: "not_verifiable",
                evaluator_rationale: {},
                portfolio_evidence_draft: {},
                metadata: {},
                started_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as unknown as DomainScenarioPayload);
              setSessionState("ready");
            }}
          >
            Continue in fallback mode
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">Simulation scenario</Badge>
            {scenario.simulation_type ? <Badge variant="outline" className="text-slate-600">{scenario.simulation_type.replace(/_/g, " ")}</Badge> : null}
          </div>

          <div className="mt-4 space-y-4">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mission brief</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{String(scenarioPayload.brief || taskTitle)}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{String(scenarioPayload.context || taskDescription)}</p>
            </section>

            <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Pack scaffold</p>
              <ul className="mt-2 space-y-1 text-sm text-indigo-900">
                {packPresentation.scaffold.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </section>

            {contextRows.length > 0 ? (
              <section className="grid gap-3 md:grid-cols-2">
                {contextRows.map((row) => (
                  <div key={row.label} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{row.value}</p>
                  </div>
                ))}
              </section>
            ) : null}

            {criteriaRows.length > 0 ? (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-amber-700" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">What your answer must cover</p>
                </div>
                <ul className="mt-3 space-y-2">
                  {criteriaRows.map((row, idx) => (
                    <li key={`${row}-${idx}`} className="flex gap-3 text-sm text-amber-950"><span className="mt-0.5 font-semibold text-amber-600">{idx + 1}.</span><span>{row}</span></li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Round timeline</p>
              {rounds.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Round 1 ready. Submit your first attempt to begin progression.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {rounds.map((round) => (
                    <div key={`${round.round_index}-${round.submitted_at}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-700">Round {round.round_index} · {round.status?.replace(/_/g, " ")}</p>
                      <p className="mt-1 text-xs text-slate-600">{round.checkpoint}</p>
                      {round.weakest_criterion ? <p className="mt-1 text-xs text-amber-700">Weakest criterion: {round.weakest_criterion.replace(/_/g, " ")}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Round {roundIndex} response</p>
                <p className="mt-1 text-sm text-slate-600">Respond inside this sandbox. The mentor guidance below is criterion-linked.</p>
              </div>
              <Badge variant="outline" className="text-slate-600">{Math.min(rounds.length + 1, maxRounds)}/{maxRounds}</Badge>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested structure</p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-600">{scaffold}</pre>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Evidence cards</p>
                <ul className="mt-1 space-y-1 text-xs text-emerald-900">{packPresentation.evidenceCards.map((card) => <li key={card}>• {card}</li>)}</ul>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Round constraints</p>
                <ul className="mt-1 space-y-1 text-xs text-amber-900">{packPresentation.constraints.map((rule) => <li key={rule}>• {rule}</li>)}</ul>
              </div>
            </div>

            {latestRound?.intervention ? (
              <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Mentor intervention · why now</p>
                <p className="mt-1 text-sm text-violet-900">{latestRound.intervention}</p>
                {latestRound.weakest_criterion ? <p className="mt-1 text-xs text-violet-700">Criterion weakness: {latestRound.weakest_criterion.replace(/_/g, " ")}</p> : null}
              </div>
            ) : null}

            <Textarea
              value={submission}
              onChange={(event) => setSubmission(event.target.value)}
              placeholder="Write your simulation response here. Use headings, bullets, or structured prose."
              className="mt-4 min-h-[220px] resize-none border-slate-200 bg-white text-sm leading-6"
              disabled={reachedStop}
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleSubmit}
                disabled={sessionState === "submitting" || submission.trim().length < 40 || reachedStop}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {sessionState === "submitting" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scoring response
                  </>
                ) : resultEnvelope ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" /> Submit next round
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Submit for rubric scoring
                  </>
                )}
              </Button>
              {submission.trim().length > 0 && submission.trim().length < 40 ? <p className="text-xs text-slate-500">Add a more substantive response before submitting.</p> : null}
              {reachedStop ? <p className="text-xs text-emerald-700">Round threshold reached. Continue to Submit Proof.</p> : null}
            </div>

            {resultEnvelope ? (
              <div className="mt-5"><RuntimeSummary envelope={resultEnvelope} /></div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-slate-400" />
                  <p>Your answer is scored per round against rubric checkpoints with criterion-level guidance for next round refinement.</p>
                </div>
              </div>
            )}
          </div>

          {resultEnvelope?.scenario.verification_status === "verified" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Simulation verified</div>
              <p className="mt-1 text-emerald-800">This sandbox response passed the simulation rubric. Continue to final proof if needed.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
