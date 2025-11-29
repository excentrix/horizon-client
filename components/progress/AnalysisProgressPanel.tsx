import React, { useEffect, useMemo, useState } from "react";
import { useNotifications } from "@/context/NotificationContext";

type AnalysisEventPayload = Record<string, unknown> & {
  event?: string;
  stage?: string;
  session_id?: string;
  conversation_id?: string;
  domain?: string;
  summary?: {
    domains_processed?: string;
    insights_generated?: string | number;
  };
};

interface AnalysisStage {
  stage: string;
  payload: AnalysisEventPayload;
}

interface AnalysisSession {
  id: string;
  stages: AnalysisStage[];
  lastEvent?: string;
  lastPayload?: AnalysisEventPayload;
}

const isAnalysisPayload = (value: unknown): value is AnalysisEventPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "event" in value || "stage" in value || "session_id" in value;
};

export function AnalysisProgressPanel() {
  const { notifications } = useNotifications();
  const [sessions, setSessions] = useState<Record<string, AnalysisSession>>({});

  useEffect(() => {
    if (!notifications || notifications.length === 0) {
      return;
    }

    const latest = notifications[0] as Record<string, unknown>;
    const candidate = (latest?.data as unknown) ?? latest;

    if (!isAnalysisPayload(candidate) || !candidate.event) {
      return;
    }

    const sessionId =
      (candidate.session_id as string | undefined) ??
      (candidate.conversation_id as string | undefined) ??
      "global";

    setSessions((previous) => {
      const next: Record<string, AnalysisSession> = { ...previous };
      const existing = next[sessionId] ?? { id: sessionId, stages: [] };

      const stageLabel = candidate.stage ?? candidate.event ?? "Stage";

      const updatedStages =
        candidate.event === "analysis_stage" ||
        candidate.event === "progress_stage"
          ? [...existing.stages, { stage: stageLabel, payload: candidate }]
          : existing.stages;

      next[sessionId] = {
        ...existing,
        stages: updatedStages,
        lastEvent: candidate.event,
        lastPayload: candidate,
      };

      return next;
    });
  }, [notifications]);

  const sessionList = useMemo(
    () => Object.values(sessions),
    [sessions],
  );

  if (!sessionList.length) {
    return null;
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 w-96 space-y-2">
      {sessionList.map((session) => (
        <div key={session.id} className="rounded-lg border bg-background p-3 shadow">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Session {session.id}</div>
            <div className="text-xs text-muted-foreground">{session.lastEvent}</div>
          </div>
          <div className="mt-2 text-xs">
            {session.stages.slice(-6).map((stage, index) => (
              <div key={`${stage.stage}-${index}`} className="mt-1 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div>
                  <div className="font-medium">{stage.stage}</div>
                  <div className="text-muted-foreground">
                    {String(
                      stage.payload.domain ??
                        stage.payload.summary?.domains_processed ??
                        stage.payload.summary?.insights_generated ??
                        "",
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
