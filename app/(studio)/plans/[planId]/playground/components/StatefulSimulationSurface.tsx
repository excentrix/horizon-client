"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { planningApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import { StatefulSimulationConsole } from "@/components/planning/stateful-simulation-console";
import { SimDebriefPanel } from "./SimDebriefPanel";
import type { ExecutionDescriptor, SimulationResultEnvelope } from "@/types";

interface StatefulSimulationSurfaceProps {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  executionDescriptor?: ExecutionDescriptor | null;
  onSubmissionProcessed?: (result: SimulationResultEnvelope) => void;
}

type UiStatus = "idle" | "starting" | "ready" | "acting" | "finalizing" | "error";

export function StatefulSimulationSurface({
  taskId,
  taskTitle,
  taskDescription,
  executionDescriptor,
  onSubmissionProcessed,
}: StatefulSimulationSurfaceProps) {
  const [status, setStatus] = useState<UiStatus>("idle");
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<SimulationResultEnvelope | null>(null);
  const [reflection, setReflection] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebrief, setShowDebrief] = useState(false);

  useEffect(() => {
    setStatus("idle");
    setScenarioId(null);
    setEnvelope(null);
    setReflection("");
    setErrorMessage(null);
    setShowDebrief(false);
  }, [taskId]);

  useEffect(() => {
    if (!taskId || scenarioId || status !== "idle") return;
    setStatus("starting");
    planningApi
      .startSimulationScenario(taskId, {
        scenario_type:
          executionDescriptor?.pack_ref ||
          executionDescriptor?.simulation_type_or_pack_ref ||
          undefined,
        surface_type: "simulation_scenario",
      })
      .then((response) => {
        setScenarioId(response.scenario.id);
        setEnvelope({
          scenario: response.scenario,
          surface_type: response.surface_type,
          pack_ref: response.pack_ref,
          simulation_type: response.simulation_type,
          experience_type: response.experience_type,
          pack_version: response.pack_version,
          runtime_state: response.runtime_state,
          completion_state: response.completion_state,
          intervention_state: response.intervention_state,
          execution_descriptor: response.execution_descriptor,
          world_state: response.world_state,
          available_actions: response.available_actions,
          observation_feed: response.observation_feed,
          session_state: response.session_state,
          checkpoint_state: response.checkpoint_state,
          phase_state: response.phase_state ?? {},
          mentor_state: response.mentor_state ?? {},
          scoring_state: response.scoring_state,
          session_timeline: response.session_timeline ?? [],
          unlocked_evidence: response.unlocked_evidence ?? [],
          evidence_board: response.evidence_board ?? [],
          stakeholder_state: response.stakeholder_state ?? [],
          pressure_events: response.pressure_events ?? [],
          execution_diagnostics: {
            scenario_type: response.scenario.scenario_type,
            surface_type: response.surface_type,
            domain_family: response.scenario.domain_family,
            rubric_breakdown: response.scenario.rubric_breakdown,
            verification_status: response.scenario.verification_status,
            evaluator_rationale: response.scenario.evaluator_rationale,
          },
          efficacy_metrics: {
            attempt_count: 0,
            time_to_verify_seconds: null,
            error_pattern_count: 0,
            nudge_count: 0,
            self_check_pass_rate: 0,
          },
        });
        setStatus("ready");
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Could not start stateful simulation.");
        setStatus("error");
      });
  }, [executionDescriptor?.pack_ref, executionDescriptor?.simulation_type_or_pack_ref, scenarioId, status, taskId]);

  const handleAction = async (actionId: string) => {
    if (!scenarioId) return;
    setStatus("acting");
    try {
      const result = await planningApi.interactSimulationScenario(taskId, scenarioId, {
        action_payload: { action_id: actionId },
      });
      setEnvelope(result);
      setStatus("ready");
    } catch (error) {
      setStatus("ready");
      telemetry.toastError(error instanceof Error ? error.message : "Could not apply simulation action.");
    }
  };

  const handleFinalize = async () => {
    if (!scenarioId) return;
    setStatus("finalizing");
    try {
      const result = await planningApi.submitSimulationScenario(taskId, scenarioId, {
        learner_submission: { reflection },
      });
      setEnvelope(result);
      onSubmissionProcessed?.(result);
      setStatus("ready");
      setShowDebrief(true);
      telemetry.toastSuccess(`Simulation ${result.scenario.verification_status.replace(/_/g, " ")}.`);
    } catch (error) {
      setStatus("ready");
      telemetry.toastError(error instanceof Error ? error.message : "Could not finalize simulation.");
    }
  };

  if (status === "starting") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <div className="flex max-w-md flex-col items-center gap-3 px-6 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Booting stateful simulator</p>
            <p className="mt-1 text-sm text-slate-500">Loading the mission, world state, actions, and checkpoint model.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error" || !envelope) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <AlertTriangle className="h-6 w-6 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Stateful simulation unavailable</p>
          <p className="mt-1 text-xs text-amber-800">{errorMessage || "The runtime could not start."}</p>
        </div>
      </div>
    );
  }

  if (showDebrief) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto pr-2 custom-scrollbar animate-in fill-mode-both fade-in slide-in-from-bottom-4 duration-500">
        <SimDebriefPanel
          envelope={envelope}
          onContinue={() => setShowDebrief(false)}
        />
      </div>
    );
  }

  return (
    <StatefulSimulationConsole
      envelope={envelope}
      busy={status === "acting"}
      finalizeBusy={status === "finalizing"}
      reflectionValue={reflection}
      onReflectionChange={setReflection}
      onApplyAction={handleAction}
      onFinalize={handleFinalize}
      emptyStateLabel="No actions taken yet. Start the run from the decision panel."
    />
  );
}
