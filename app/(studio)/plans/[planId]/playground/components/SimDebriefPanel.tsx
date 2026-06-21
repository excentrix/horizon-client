"use client";

import { CheckCircle2, XCircle, Clock, ChevronRight, Trophy, Target, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SimulationResultEnvelope } from "@/types";

interface SimDebriefPanelProps {
  envelope: SimulationResultEnvelope;
  onContinue: () => void;
}

type QualityLabel = "strong_move" | "solid" | "risky" | "anti_pattern";

const QUALITY_STYLES: Record<QualityLabel, { bg: string; text: string; badge: string; dot: string }> = {
  strong_move: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  solid:       { bg: "bg-blue-50 border-blue-200",    text: "text-blue-700",    badge: "bg-blue-100 text-blue-700",    dot: "bg-blue-400"   },
  risky:       { bg: "bg-amber-50 border-amber-200",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-400"  },
  anti_pattern:{ bg: "bg-rose-50 border-rose-200",    text: "text-rose-700",   badge: "bg-rose-100 text-rose-700",    dot: "bg-rose-500"   },
};
const QUALITY_LABEL_TEXT: Record<QualityLabel, string> = {
  strong_move: "Strong move",
  solid: "Solid",
  risky: "Risky",
  anti_pattern: "Anti-pattern",
};

function pct(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export function SimDebriefPanel({ envelope, onContinue }: SimDebriefPanelProps) {
  const sessionState = (envelope.session_state ?? envelope.scenario.session_state ?? {}) as Record<string, unknown>;
  const outcomeStatus = String(sessionState.outcome_status ?? "timebox_complete");
  const checkpointState = (envelope.checkpoint_state ?? envelope.scenario.checkpoint_state ?? {}) as Record<string, unknown>;
  const scoringState = (envelope.scoring_state ?? envelope.scenario.scoring_state ?? {}) as Record<string, unknown>;
  const trajectory = (scoringState.trajectory ?? {}) as Record<string, unknown>;
  const timeline = (envelope.session_timeline ?? envelope.scenario.session_timeline ?? []) as Array<Record<string, unknown>>;
  const observationFeed = (envelope.observation_feed ?? envelope.scenario.observation_feed ?? []) as Array<Record<string, unknown>>;
  const checkpointItems = (checkpointState.items ?? []) as Array<Record<string, unknown>>;
  const rawUnlocked = envelope.unlocked_evidence ?? envelope.scenario.unlocked_evidence ?? [];
  const unlockedEvidence = (rawUnlocked as unknown) as Array<Record<string, unknown>>;

  // Index mentor_debrief entries by turn_index for fast lookup
  const debriefByTurn = new Map<number, Record<string, unknown>>();
  for (const entry of observationFeed) {
    if (entry.type === "mentor_debrief" && entry.turn_index != null) {
      debriefByTurn.set(Number(entry.turn_index), entry);
    }
  }

  const isSuccess = outcomeStatus === "success";
  const isFailure = outcomeStatus === "failure";

  const outcomeConfig = isSuccess
    ? { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Mission Complete", sub: "You navigated this scenario successfully." }
    : isFailure
    ? { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50 border-rose-200", label: "Mission Failed", sub: "Review the decision path to understand where it went wrong." }
    : { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Time Limit Reached", sub: "The scenario window closed. Here's how your decisions stacked up." };

  const OutcomeIcon = outcomeConfig.icon;

  const metrics = [
    { label: "Decision Quality", value: pct(trajectory.action_quality), icon: Zap, color: "text-violet-600", bar: "bg-violet-500" },
    { label: "Checkpoints Hit", value: pct(trajectory.checkpoint_completion), icon: Target, color: "text-emerald-600", bar: "bg-emerald-500" },
    { label: "Decision Order", value: pct(trajectory.decision_order), icon: TrendingUp, color: "text-blue-600", bar: "bg-blue-500" },
    { label: "State Stability", value: pct(trajectory.state_stability), icon: Trophy, color: "text-amber-600", bar: "bg-amber-500" },
  ];

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Outcome banner */}
      <div className={`rounded-xl border p-4 flex items-start gap-3 ${outcomeConfig.bg}`}>
        <OutcomeIcon className={`h-6 w-6 mt-0.5 shrink-0 ${outcomeConfig.color}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-base font-semibold ${outcomeConfig.color}`}>{outcomeConfig.label}</p>
          <p className="mt-0.5 text-sm text-slate-600">{outcomeConfig.sub}</p>
        </div>
      </div>

      {/* Trajectory metrics */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(({ label, value, icon: Icon, color, bar }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}<span className="text-sm font-normal text-slate-400">%</span></p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Decision history */}
      {timeline.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Decision Path</p>
          </div>
          <div className="divide-y divide-slate-100">
            {timeline.map((turn, idx) => {
              const ti = Number(turn.turn_index ?? idx + 1);
              const debrief = debriefByTurn.get(ti);
              const ql = String(debrief?.quality_label ?? "") as QualityLabel;
              const styles = QUALITY_STYLES[ql];
              const stateChanges = (turn.state_changes ?? []) as Array<Record<string, unknown>>;

              return (
                <div key={`turn-${ti}`} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                      {ti}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-800">{String(turn.label ?? "Action")}</p>
                        {styles && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${styles.badge}`}>
                            {QUALITY_LABEL_TEXT[ql]}
                          </span>
                        )}
                      </div>
                      {!!debrief?.commentary && (
                        <p className="mt-0.5 text-xs text-slate-500 leading-5">{String(debrief.commentary)}</p>
                      )}
                      {stateChanges.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {stateChanges.slice(0, 4).map((change, ci) => (
                            <span
                              key={ci}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                String(change.impact) === "positive"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {String(change.label ?? "metric")} {Number(change.delta) > 0 ? "+" : ""}{String(change.delta)}
                            </span>
                          ))}
                        </div>
                      )}
                      {!!debrief?.principle && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          <span className="font-medium">Principle:</span> {String(debrief.principle)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checkpoints */}
      {checkpointItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Checkpoints</p>
            <span className="text-xs text-slate-500">
              {Number(checkpointState.completed_count ?? 0)}/{Number(checkpointState.total ?? checkpointItems.length)} secured
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 gap-2">
            {checkpointItems.map((item, idx) => {
              const passed = String(item.status) === "completed";
              return (
                <div key={String(item.id ?? idx)} className="flex items-center gap-2.5">
                  <div className={`h-4 w-4 shrink-0 rounded-full flex items-center justify-center ${passed ? "bg-emerald-100" : "bg-slate-100"}`}>
                    {passed
                      ? <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      : <div className="h-2 w-2 rounded-full bg-slate-300" />
                    }
                  </div>
                  <p className={`text-xs ${passed ? "text-slate-700" : "text-slate-400"}`}>
                    {String(item.label ?? item.id ?? `Checkpoint ${idx + 1}`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Evidence unlocked */}
      {unlockedEvidence.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Evidence Surfaced</p>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {unlockedEvidence.map((item, idx) => (
              <span key={idx} className="text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded-full font-medium">
                {String(item.label ?? item.evidence_id ?? item)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center gap-3 pt-1">
        <Button onClick={onContinue} className="flex-1 gap-1.5">
          Continue
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
