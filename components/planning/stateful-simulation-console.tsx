"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { SimulationResultEnvelope } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(s: string) {
  return s.replace(/_/g, " ");
}
function pct(v: unknown) {
  return Math.round(Math.max(0, Math.min(1, Number(v) || 0)) * 100);
}
function metricPct(v: unknown) {
  return Math.round(Math.max(0, Math.min(100, Number(v) || 0)));
}
function initials(label: string) {
  return label
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Classify a metric's health: are we in danger, warning, or safe?
function metricHealth(
  value: number,
  higherIsBetter: boolean
): "safe" | "warn" | "danger" {
  if (higherIsBetter) {
    if (value >= 55) return "safe";
    if (value >= 35) return "warn";
    return "danger";
  } else {
    if (value <= 45) return "safe";
    if (value <= 65) return "warn";
    return "danger";
  }
}

const HEALTH_RING: Record<string, string> = {
  safe: "ring-emerald-400",
  warn: "ring-amber-400",
  danger: "ring-rose-500",
};
const HEALTH_TEXT: Record<string, string> = {
  safe: "text-emerald-700",
  warn: "text-amber-700",
  danger: "text-rose-700",
};
const HEALTH_BG: Record<string, string> = {
  safe: "bg-emerald-50",
  warn: "bg-amber-50",
  danger: "bg-rose-50",
};
const HEALTH_BAR: Record<string, string> = {
  safe: "[&>div]:bg-emerald-500",
  warn: "[&>div]:bg-amber-500",
  danger: "[&>div]:bg-rose-500",
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-rose-300 bg-rose-50 text-rose-900",
  high: "border-orange-200 bg-orange-50 text-orange-900",
  medium: "border-amber-200 bg-amber-50 text-amber-900",
  low: "border-slate-200 bg-slate-50 text-slate-700",
};

const KIND_STYLES: Record<string, string> = {
  analysis: "bg-sky-100 text-sky-800",
  intervention: "bg-violet-100 text-violet-800",
  communication: "bg-teal-100 text-teal-800",
  escalation: "bg-orange-100 text-orange-800",
  decision: "bg-slate-100 text-slate-700",
  risk: "bg-rose-100 text-rose-800",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode; }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
      {children}
    </p>
  );
}

function MetricGauge({
  label,
  value,
  higherIsBetter,
  delta,
}: {
  label: string;
  value: number;
  higherIsBetter: boolean;
  delta?: number;
}) {
  const pctVal = metricPct(value);
  const health = metricHealth(pctVal, higherIsBetter);
  const ringClass = HEALTH_RING[health];
  const textClass = HEALTH_TEXT[health];
  const bgClass = HEALTH_BG[health];
  const barClass = HEALTH_BAR[health];
  const hasDelta = delta !== undefined && delta !== 0;

  return (
    <div className={`rounded-xl border border-slate-200 p-4 ${bgClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-500">{fmt(label)}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums ${textClass}`}>
              {pctVal}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
            {hasDelta && (
              <span
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  delta! > 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {delta! > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(delta!)}
              </span>
            )}
          </div>
        </div>
        <div
          className={`h-8 w-8 shrink-0 rounded-full ring-2 ${ringClass} flex items-center justify-center`}
        >
          <div
            className={`h-3 w-3 rounded-full ${
              health === "safe"
                ? "bg-emerald-500"
                : health === "warn"
                ? "bg-amber-500"
                : "bg-rose-500 animate-pulse"
            }`}
          />
        </div>
      </div>
      <Progress
        value={pctVal}
        className={`mt-3 h-1 bg-slate-200 ${barClass}`}
      />
    </div>
  );
}

function StakeholderPip({
  label,
  role,
  priority,
  status,
  summary,
  watchMetric,
  metricValue,
}: {
  label: string;
  role: string;
  priority: string;
  status: string;
  summary: string;
  watchMetric: string;
  metricValue?: number;
}) {
  const sentiment =
    status === "satisfied" || status === "confident"
      ? "emerald"
      : status === "alarmed" || status === "concerned"
      ? "rose"
      : "amber";
  const ringColor = {
    emerald: "ring-emerald-400",
    rose: "ring-rose-400",
    amber: "ring-amber-300",
  }[sentiment];
  const dotColor = {
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    amber: "bg-amber-400",
  }[sentiment];

  return (
    <div className="flex items-start gap-3">
      <div className={`relative shrink-0 rounded-full ring-2 ${ringColor} h-9 w-9 flex items-center justify-center bg-slate-100`}>
        <span className="text-xs font-bold text-slate-600">{initials(label)}</span>
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${dotColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">{label}</p>
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize bg-slate-100 text-slate-600">
            {priority}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 capitalize">{fmt(role)}</p>
        <p className="mt-1.5 text-xs leading-5 text-slate-600">{summary}</p>
        {watchMetric && (
          <p className="mt-1 text-[10px] text-slate-400">
            watching: <span className="font-medium text-slate-500">{fmt(watchMetric)}</span>
            {metricValue !== undefined ? ` (${metricValue})` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function EvidenceArtifact({
  item,
  onClick,
}: {
  item: Record<string, unknown>;
  onClick: (item: Record<string, unknown>) => void;
}) {
  const unlocked = item.status === "unlocked";
  const kind = String(item.kind || "document");
  const kindStyle = KIND_STYLES[kind] ?? "bg-slate-100 text-slate-600";

  if (!unlocked) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
        <Lock className="h-4 w-4 shrink-0 text-slate-300" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-400">
            {String(item.label || item.id || "Artifact")}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{String(item.summary || "Take an action to unlock this artifact.")}</p>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className="group flex w-full items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-100"
    >
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-violet-900">
            {String(item.label || item.id)}
          </p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${kindStyle}`}>
            {kind}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-violet-700">{String(item.summary || "")}</p>
        {item.artifact_excerpt ? (
          <p className="mt-2 line-clamp-2 rounded-lg border border-violet-200 bg-white px-3 py-2 font-mono text-[11px] text-slate-600">
            {String(item.artifact_excerpt)}
          </p>
        ) : null}
        <p className="mt-2 text-[10px] font-medium text-violet-500 group-hover:text-violet-700">
          Click to open full artifact →
        </p>
      </div>
    </button>
  );
}

function ActionCard({
  action,
  disabled,
  requiresReflection,
  busy,
  onApply,
}: {
  action: Record<string, unknown>;
  disabled: boolean;
  requiresReflection: boolean;
  busy: boolean;
  onApply: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const kind = String(action.kind || "decision");
  const kindStyle = KIND_STYLES[kind] ?? KIND_STYLES.decision;
  const tags = Array.isArray(action.tags) ? (action.tags as string[]) : [];
  const hasMeta = Boolean(action.mentor_explanation || action.risk_note);
  const isDisabled = disabled || requiresReflection || busy;

  return (
    <div
      className={`overflow-hidden rounded-xl border transition ${
        isDisabled
          ? "border-slate-200 bg-slate-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <button
        type="button"
        onClick={() => !isDisabled && onApply(String(action.id))}
        disabled={isDisabled}
        className="w-full px-4 py-3.5 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p
                className={`text-sm font-semibold ${
                  isDisabled ? "text-slate-400" : "text-slate-900"
                }`}
              >
                {String(action.label)}
              </p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${kindStyle}`}>
                {kind}
              </span>
            </div>
            <p
              className={`mt-1.5 text-sm leading-5 ${
                isDisabled ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {String(action.description || "")}
            </p>
          </div>
          {!isDisabled && (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
          )}
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500"
              >
                {fmt(tag)}
              </span>
            ))}
          </div>
        )}
        {action.why_now ? (
          <p className="mt-2 text-xs font-medium text-sky-700">
            {String(action.why_now)}
          </p>
        ) : null}
        {action.disabled_reason ? (
          <p className="mt-2 text-xs text-slate-400">{String(action.disabled_reason)}</p>
        ) : null}
      </button>

      {hasMeta && !isDisabled && (
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
          >
            <ChevronDown
              className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            Context
          </button>
          {expanded && (
            <div className="space-y-2 px-4 pb-3">
              {action.mentor_explanation ? (
                <p className="text-sm leading-5 text-slate-600">
                  {String(action.mentor_explanation)}
                </p>
              ) : null}
              {action.risk_note ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                  ⚠ {String(action.risk_note)}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EvidenceModal({
  item,
  onClose,
}: {
  item: Record<string, unknown> | null;
  onClose: () => void;
}) {
  if (!item) return null;
  const kind = String(item.kind || "document");
  const kindStyle = KIND_STYLES[kind] ?? "bg-slate-100 text-slate-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-500" />
              <h2 className="text-base font-bold text-slate-900">
                {String(item.label || item.id || "Evidence artifact")}
              </h2>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${kindStyle}`}>
                {kind}
              </span>
              {item.owner ? (
                <span className="text-xs text-slate-400">by {String(item.owner)}</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {item.summary ? (
            <p className="text-sm leading-6 text-slate-700">{String(item.summary)}</p>
          ) : null}
          {item.artifact_excerpt ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-violet-500">
                Key finding
              </p>
              <p className="font-mono text-sm leading-6 text-slate-800">
                {String(item.artifact_excerpt)}
              </p>
            </div>
          ) : null}
          {item.details ? (
            <p className="text-sm leading-6 text-slate-600">{String(item.details)}</p>
          ) : null}
          {item.why_it_matters ? (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-sky-500">
                Why this matters
              </p>
              <p className="text-sm leading-5 text-sky-900">{String(item.why_it_matters)}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface StatefulSimulationConsoleProps {
  envelope: SimulationResultEnvelope;
  busy?: boolean;
  finalizeBusy?: boolean;
  reflectionValue: string;
  onReflectionChange: (value: string) => void;
  onApplyAction: (actionId: string) => void;
  onFinalize: () => void;
  emptyStateLabel?: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export function StatefulSimulationConsole({
  envelope,
  busy = false,
  finalizeBusy = false,
  reflectionValue,
  onReflectionChange,
  onApplyAction,
  onFinalize,
  emptyStateLabel = "No actions taken yet.",
}: StatefulSimulationConsoleProps) {
  const [selectedEvidence, setSelectedEvidence] = useState<Record<
    string,
    unknown
  > | null>(null);

  // ── Data extraction ──────────────────────────────────────────────────────
  const worldState = (
    envelope.world_state ?? envelope.scenario.world_state ?? {}
  ) as Record<string, number>;
  const stateVariables = (
    envelope.state_variables ?? envelope.scenario.state_variables ?? {}
  ) as Record<string, { label?: string; higher_is_better?: boolean }>;
  const availableActions = (
    envelope.available_actions ?? envelope.scenario.available_actions ?? []
  ) as Array<Record<string, unknown>>;
  const observationFeed = (
    envelope.observation_feed ?? envelope.scenario.observation_feed ?? []
  ) as Array<Record<string, unknown>>;
  const sessionState = (
    envelope.session_state ?? envelope.scenario.session_state ?? {}
  ) as Record<string, unknown>;
  const checkpointState = (
    envelope.checkpoint_state ?? envelope.scenario.checkpoint_state ?? {}
  ) as Record<string, unknown>;
  const scoringState = (
    envelope.scoring_state ?? envelope.scenario.scoring_state ?? {}
  ) as Record<string, unknown>;
  const interventionState = (
    envelope.intervention_state ?? envelope.scenario.intervention_state ?? {}
  ) as Record<string, unknown>;
  const actionTimeline = (
    envelope.session_timeline ?? envelope.scenario.session_timeline ?? []
  ) as Array<Record<string, unknown>>;
  const evidenceBoard = (
    envelope.evidence_board ??
    envelope.scenario.evidence_board ??
    ((envelope.scenario.metadata?.evidence_board as
      | Array<Record<string, unknown>>
      | undefined) ?? [])
  ) as Array<Record<string, unknown>>;
  const stakeholderState = (
    envelope.stakeholder_state ??
    envelope.scenario.stakeholder_state ??
    ((envelope.scenario.metadata?.stakeholder_state as
      | Array<Record<string, unknown>>
      | undefined) ?? [])
  ) as Array<Record<string, unknown>>;
  const pressureEvents = (
    envelope.pressure_events ??
    envelope.scenario.pressure_events ??
    ((envelope.scenario.metadata?.pressure_events as
      | Array<Record<string, unknown>>
      | undefined) ?? [])
  ) as Array<Record<string, unknown>>;
  const mentorState = (
    envelope.mentor_state ??
    envelope.scenario.mentor_state ??
    ((envelope.scenario.metadata?.mentor_state as
      | Record<string, unknown>
      | undefined) ?? {})
  ) as Record<string, unknown>;
  const phaseState = (
    envelope.phase_state ??
    envelope.scenario.phase_state ??
    ((envelope.scenario.metadata?.phase_state as
      | Record<string, unknown>
      | undefined) ?? {})
  ) as Record<string, unknown>;

  const checkpointItems = (
    (checkpointState.items as Array<Record<string, unknown>> | undefined) || []
  );
  const phaseItems = (
    (phaseState.items as Array<Record<string, unknown>> | undefined) || []
  );
  const trajectory = (scoringState.trajectory || {}) as Record<string, unknown>;
  const requiresReflection =
    String(sessionState.status || "") === "awaiting_reflection";
  const isCompleted = String(sessionState.status || "") === "completed";
  const turnIndex = Number(sessionState.turn_index || 0);
  const maxTurns = Number(sessionState.max_turns || 4);
  const turnsLeft = Math.max(0, maxTurns - turnIndex);

  const scenarioPayload = (
    envelope.scenario.scenario_payload || {}
  ) as Record<string, unknown>;
  const brief = String(
    envelope.scenario.scenario_payload?.brief ||
      envelope.scenario.scenario_type ||
      "Simulation"
  );
  const context = String(
    envelope.scenario.scenario_payload?.context || ""
  );
  const kpiSnapshot = (
    scenarioPayload.kpi_snapshot || null
  ) as Record<string, unknown> | null;
  const incidentContext = (
    scenarioPayload.incident_context || null
  ) as Record<string, unknown> | null;
  const mentorWatchouts = (
    (mentorState.watchouts as string[] | undefined) || []
  );
  const mentorSuggestions = (
    (mentorState.suggested_actions as string[] | undefined) || []
  );
  const checkpointCompletion = pct(checkpointState.completion_rate);
  const verificationStatus = envelope.scenario.verification_status;

  // Derive reflection prompts from pack if available
  const packReflectionPrompts = (
    (envelope.scenario.scenario_payload?.reflection_prompts as
      | string[]
      | undefined) || []
  );
  const latestAction = actionTimeline[actionTimeline.length - 1];
  const fallbackPrompts = [
    latestAction?.label
      ? `Why did you choose "${String(latestAction.label)}" when you did?`
      : "Which decision defined the trajectory of this run?",
    "Which tradeoff was hardest — and what data would have made it easier?",
    "How would you verify that the recovery holds outside this simulation?",
  ];
  const reflectionPrompts =
    packReflectionPrompts.length >= 3
      ? packReflectionPrompts
      : fallbackPrompts;

  // Active pressure events (fired, not just injected)
  const activePressure = pressureEvents.filter(
    (e) => e.turn_index !== undefined
  );

  // ── Layout ───────────────────────────────────────────────────────────────
  return (
    <>
      <EvidenceModal
        item={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-0">
        {/* ── Header bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900">
              <Zap className="h-3.5 w-3.5 text-white" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">
                {brief}
              </p>
              {envelope.simulation_type && (
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {fmt(envelope.simulation_type)} · turn-based simulation
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Phase pills */}
            {phaseItems.map((ph) => {
              const status = String(ph.status || "upcoming");
              return (
                <span
                  key={String(ph.id)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                    status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : status === "completed"
                      ? "bg-slate-200 text-slate-500 line-through"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {String(ph.label)}
                </span>
              );
            })}

            {/* Turn counter */}
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                turnsLeft <= 1
                  ? "bg-rose-100 text-rose-700"
                  : turnsLeft <= 2
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Clock className="h-3 w-3" />
              {turnsLeft} {turnsLeft === 1 ? "turn" : "turns"} left
            </span>

            {/* Status chip */}
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                isCompleted
                  ? "bg-emerald-100 text-emerald-800"
                  : requiresReflection
                  ? "bg-violet-100 text-violet-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isCompleted
                ? "Complete"
                : requiresReflection
                ? "Defend"
                : String(sessionState.status || "active")}
            </span>
          </div>
        </div>

        {/* ── Intervention banner ─────────────────────────────────────────── */}
        {interventionState?.reason ? (
          <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                Mentor intervention
              </p>
              <p className="mt-0.5 text-sm text-amber-900">
                {String(interventionState.reason)}
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Main body ────────────────────────────────────────────────────── */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[3fr_2fr]">

          {/* ── Left: narrative + evidence ─────────────────────────────────── */}
          <div className="flex flex-col gap-0 divide-y divide-slate-100 overflow-y-auto border-r border-slate-200 bg-white">

            {/* Situation brief */}
            <div className="px-5 py-5">
              <SectionLabel>Situation</SectionLabel>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">
                {brief}
              </p>
              {context ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">{context}</p>
              ) : null}

              {/* KPI / incident snapshot */}
              {(kpiSnapshot || incidentContext) && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(kpiSnapshot ?? incidentContext ?? {}).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {fmt(key)}
                        </p>
                        <p className="mt-0.5 text-base font-bold text-slate-800">
                          {String(value)}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}

              {scenarioPayload.business_context ? (
                <p className="mt-3 text-xs text-slate-400">
                  {String(scenarioPayload.business_context)}
                </p>
              ) : null}
            </div>

            {/* Active pressure events */}
            {activePressure.length > 0 && (
              <div className="px-5 py-4">
                <SectionLabel>Pressure events</SectionLabel>
                <div className="mt-3 space-y-2.5">
                  {activePressure.map((event) => {
                    const sev = String(event.severity || "medium");
                    const style = SEVERITY_STYLES[sev] ?? SEVERITY_STYLES.medium;
                    return (
                      <div
                        key={String(event.id)}
                        className={`rounded-xl border px-4 py-3 ${style}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold leading-5">
                            {String(event.title || event.id)}
                          </p>
                          <span className="shrink-0 rounded-full border border-current px-2 py-0.5 text-[10px] font-semibold uppercase opacity-70">
                            {sev}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-5">
                          {String(event.summary || "")}
                        </p>
                        {event.turn_index !== undefined && (
                          <p className="mt-1 text-[10px] font-medium opacity-60">
                            Fired on turn {String(event.turn_index)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Observation log */}
            <div className="px-5 py-4">
              <SectionLabel>Observation log</SectionLabel>
              {observationFeed.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {observationFeed.map((entry, idx) => (
                    <div
                      key={`obs-${entry.action_id || entry.turn_index || idx}`}
                      className="relative pl-5"
                    >
                      {/* Timeline spine */}
                      {idx < observationFeed.length - 1 && (
                        <span className="absolute left-1.5 top-4 bottom-0 w-px bg-slate-200" />
                      )}
                      <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-300 ring-1 ring-slate-200" />
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {entry.turn_index
                          ? `Turn ${entry.turn_index}`
                          : "Briefing"}
                      </p>
                      <p className="mt-0.5 text-sm leading-6 text-slate-700">
                        {String(entry.text || "")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">{emptyStateLabel}</p>
              )}
            </div>

            {/* Evidence board */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <SectionLabel>Evidence board</SectionLabel>
                <span className="text-[10px] font-semibold text-slate-400">
                  {evidenceBoard.filter((e) => e.status === "unlocked").length}/
                  {evidenceBoard.length} unlocked
                </span>
              </div>
              <div className="mt-3 space-y-2.5">
                {evidenceBoard.length > 0 ? (
                  evidenceBoard.map((item) => (
                    <EvidenceArtifact
                      key={String(item.id)}
                      item={item}
                      onClick={setSelectedEvidence}
                    />
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    Evidence artifacts will unlock as you take actions.
                  </p>
                )}
              </div>
            </div>

            {/* Stakeholders (mobile — shown below evidence on small screens, hidden on xl) */}
            {stakeholderState.length > 0 && (
              <div className="px-5 py-4 xl:hidden">
                <SectionLabel>Stakeholders</SectionLabel>
                <div className="mt-3 divide-y divide-slate-100">
                  {stakeholderState.map((s, idx) => (
                    <div key={String(s.id)} className={idx > 0 ? "pt-4" : ""}>
                      <StakeholderPip
                        label={String(s.label)}
                        role={String(s.role || "stakeholder")}
                        priority={String(s.priority || "medium")}
                        status={String(s.status || "watching")}
                        summary={String(s.summary || "")}
                        watchMetric={String(s.watch_metric || "")}
                        metricValue={
                          s.watch_metric
                            ? worldState[String(s.watch_metric)]
                            : undefined
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: metrics + decisions ───────────────────────────────────── */}
          <div className="flex flex-col gap-0 divide-y divide-slate-100 overflow-y-auto bg-white">

            {/* Live metrics */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <SectionLabel>Live state</SectionLabel>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${checkpointCompletion}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {checkpointCompletion}%
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {Object.entries(worldState).map(([key, value]) => {
                  const svDef = stateVariables[key] ?? {};
                  const higherBetter = svDef.higher_is_better !== false;
                  const label = svDef.label || key;
                  // Try to compute delta from last action's state_changes
                  const lastEntry = actionTimeline[actionTimeline.length - 1];
                  const changes = Array.isArray(lastEntry?.state_changes)
                    ? (lastEntry.state_changes as Array<Record<string, unknown>>)
                    : [];
                  const change = changes.find((c) => String(c.metric) === key);
                  const delta = change ? Number(change.delta || 0) : undefined;
                  return (
                    <MetricGauge
                      key={key}
                      label={label}
                      value={value}
                      higherIsBetter={higherBetter}
                      delta={delta}
                    />
                  );
                })}
              </div>

              {/* Checkpoints */}
              {checkpointItems.length > 0 && (
                <div className="mt-4 space-y-2">
                  {checkpointItems.map((item) => {
                    const done = item.status === "completed";
                    return (
                      <div
                        key={String(item.id)}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                          done
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-slate-50 text-slate-600"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-slate-300" />
                        )}
                        <span className="text-xs font-medium">{String(item.label)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mentor */}
            {(mentorState.overview || mentorWatchouts.length > 0 || mentorSuggestions.length > 0) && (
              <div className="px-5 py-4">
                <SectionLabel>Mentor</SectionLabel>
                <div className="mt-3 space-y-2">
                  {mentorState.overview ? (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                      <p className="text-sm leading-6 text-sky-900">
                        {String(mentorState.overview)}
                      </p>
                      {mentorState.phase_guidance ? (
                        <p className="mt-1.5 text-xs leading-5 text-sky-700">
                          {String(mentorState.phase_guidance)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {mentorState.explanation_prompt ? (
                    <p className="text-sm text-slate-700">
                      {String(mentorState.explanation_prompt)}
                    </p>
                  ) : null}
                  {mentorWatchouts.length > 0 && (
                    <ul className="space-y-1">
                      {mentorWatchouts.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2 text-sm text-slate-600"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {mentorSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {mentorSuggestions.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700"
                        >
                          consider: {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Decision panel */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <SectionLabel>
                  {requiresReflection
                    ? "Defend your run"
                    : isCompleted
                    ? "Run complete"
                    : "Decision panel"}
                </SectionLabel>
                {!requiresReflection && !isCompleted && (
                  <span className="text-[10px] font-semibold text-slate-400">
                    {turnsLeft} {turnsLeft === 1 ? "turn" : "turns"} remaining
                  </span>
                )}
              </div>

              {requiresReflection || isCompleted ? (
                <p className="mt-1 text-xs text-slate-500">
                  {isCompleted
                    ? "The action phase is complete. Review your trajectory below."
                    : "Action phase complete — scroll down to write your defense."}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  Choose deliberately. Every action changes state, unlocks evidence, and shifts stakeholder sentiment.
                </p>
              )}

              <div className="mt-3 space-y-2.5">
                {availableActions.map((action) => (
                  <ActionCard
                    key={String(action.id)}
                    action={action}
                    disabled={
                      Boolean(action.disabled) || isCompleted || busy || finalizeBusy
                    }
                    requiresReflection={requiresReflection}
                    busy={busy}
                    onApply={onApplyAction}
                  />
                ))}
              </div>
            </div>

            {/* Stakeholders (xl — hidden on mobile, shown in left panel instead) */}
            {stakeholderState.length > 0 && (
              <div className="hidden px-5 py-4 xl:block">
                <SectionLabel>Stakeholders</SectionLabel>
                <div className="mt-3 divide-y divide-slate-100">
                  {stakeholderState.map((s, idx) => (
                    <div key={String(s.id)} className={idx > 0 ? "pt-4" : ""}>
                      <StakeholderPip
                        label={String(s.label)}
                        role={String(s.role || "stakeholder")}
                        priority={String(s.priority || "medium")}
                        status={String(s.status || "watching")}
                        summary={String(s.summary || "")}
                        watchMetric={String(s.watch_metric || "")}
                        metricValue={
                          s.watch_metric
                            ? worldState[String(s.watch_metric)]
                            : undefined
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action timeline */}
            <div className="px-5 py-4">
              <SectionLabel>Action history</SectionLabel>
              {actionTimeline.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {actionTimeline.map((entry) => (
                    <div
                      key={`${entry.turn_index}-${entry.action_id}`}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Turn {String(entry.turn_index)}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-800">
                            {String(entry.label || entry.action_id)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            String(entry.outcome_status) === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {String(entry.outcome_status || "—")}
                        </span>
                      </div>
                      {entry.observation ? (
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          {String(entry.observation)}
                        </p>
                      ) : null}
                      {Array.isArray(entry.state_changes) &&
                      (entry.state_changes as Array<Record<string, unknown>>)
                        .length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(
                            entry.state_changes as Array<
                              Record<string, unknown>
                            >
                          ).map((change, idx) => (
                            <span
                              key={`${entry.turn_index}-${String(change.metric)}-${idx}`}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                change.impact === "positive"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {String(change.label)}{" "}
                              {change.impact === "positive" ? "↑" : "↓"}{" "}
                              {Math.abs(Number(change.delta || 0))}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {Array.isArray(entry.unlocked_evidence) &&
                      (entry.unlocked_evidence as Array<Record<string, unknown>>)
                        .length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(
                            entry.unlocked_evidence as Array<
                              Record<string, unknown>
                            >
                          ).map((item, idx) => (
                            <span
                              key={`${entry.turn_index}-ev-${idx}`}
                              className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700"
                            >
                              + {String(item.label || item.id)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">{emptyStateLabel}</p>
              )}
            </div>

            {/* Trajectory */}
            {Object.keys(trajectory).length > 0 && (
              <div className="px-5 py-4">
                <SectionLabel>Trajectory score</SectionLabel>
                <div className="mt-3 space-y-3">
                  {Object.entries(trajectory).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-700">
                          {fmt(key)}
                        </span>
                        <span className="text-xs font-bold tabular-nums text-slate-600">
                          {pct(value)}%
                        </span>
                      </div>
                      <Progress
                        value={pct(value)}
                        className="mt-1.5 h-1 bg-slate-200 [&>div]:bg-slate-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Reflection section (full width, only when action phase done) ── */}
        {(requiresReflection || isCompleted) && (
          <div className="border-t border-slate-200 bg-white px-5 py-5">
            <div className="mx-auto max-w-3xl">
              <SectionLabel>
                {isCompleted ? "Your defense" : "Reflection & defense"}
              </SectionLabel>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {reflectionPrompts.slice(0, 3).map((prompt, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Prompt {i + 1}
                    </p>
                    <p className="mt-1.5 text-sm leading-5 text-slate-700">{prompt}</p>
                  </div>
                ))}
              </div>
              <Textarea
                value={reflectionValue}
                onChange={(e) => onReflectionChange(e.target.value)}
                placeholder="Address all three prompts. Articulate what you prioritized, what changed your diagnosis, how you managed tradeoffs, and how you'd verify the outcome is real."
                className="mt-4 min-h-[160px] resize-none border-slate-200 bg-white text-sm leading-6 focus:border-slate-400 focus:ring-0"
                disabled={isCompleted}
              />
              <div className="mt-4 flex items-center gap-3">
                <Button
                  onClick={onFinalize}
                  disabled={
                    !requiresReflection ||
                    reflectionValue.trim().length < 60 ||
                    finalizeBusy ||
                    busy ||
                    isCompleted
                  }
                  className="bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40"
                >
                  {finalizeBusy ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Evaluating…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" />
                      Submit defense
                    </span>
                  )}
                </Button>
                {reflectionValue.trim().length > 0 &&
                  reflectionValue.trim().length < 60 && (
                    <p className="text-xs text-slate-400">
                      {60 - reflectionValue.trim().length} more characters needed
                    </p>
                  )}
                {!requiresReflection && !isCompleted && (
                  <p className="text-xs text-slate-400">
                    Complete the action phase first.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Outcome banners ─────────────────────────────────────────────── */}
        {verificationStatus === "verified" && (
          <div className="flex items-start gap-3 border-t border-emerald-200 bg-emerald-50 px-5 py-4">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-900">
                Simulation verified
              </p>
              <p className="mt-0.5 text-sm text-emerald-800">
                The run satisfied all trajectory thresholds and your defense held up.
                This evidence is ready to add to your portfolio.
              </p>
            </div>
          </div>
        )}
        {verificationStatus === "failed" && (
          <div className="flex items-start gap-3 border-t border-rose-200 bg-rose-50 px-5 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-bold text-rose-900">
                Below verification threshold
              </p>
              <p className="mt-0.5 text-sm text-rose-800">
                Review the action timeline and trajectory scores to understand where the run degraded.
                You can replay this simulation with a fresh variant.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
