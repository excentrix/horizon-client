import React, { useMemo } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { describeStageEvent, type StageStreamEvent } from "@/lib/analysis-stage";

interface AnalysisStage {
  label: string;
  message: string;
  timestamp: string;
  severity: "info" | "success" | "warning" | "error";
}

interface AnalysisSession {
  id: string;
  stages: AnalysisStage[];
  lastEvent?: string;
  lastUpdated?: string;
}

const severityColors: Record<AnalysisStage["severity"], string> = {
  info: "bg-primary/80",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-destructive",
};

export function AnalysisProgressPanel() {
  const { analysisEvents } = useNotifications();

  const sessionList = useMemo(() => {
    if (!analysisEvents.length) {
      return [];
    }

    const ordered = [...analysisEvents].sort(
      (a, b) => a.__seq - b.__seq,
    );

    const sessionMap = new Map<string, AnalysisSession>();

    ordered.forEach((event: StageStreamEvent) => {
      const sessionId =
        (event.session_id as string | undefined) ??
        (event.conversation_id as string | undefined) ??
        "global";

      const descriptor = describeStageEvent(event);
      const timestamp =
        typeof event.timestamp === "string"
          ? event.timestamp
          : new Date().toISOString();

      const stageEntry: AnalysisStage = {
        label: descriptor?.label ?? "Analysis update",
        message: descriptor?.message ?? descriptor?.label ?? "Brain update",
        timestamp,
        severity: descriptor?.severity ?? "info",
      };

      const existing = sessionMap.get(sessionId) ?? {
        id: sessionId,
        stages: [],
      };

      existing.stages = [...existing.stages, stageEntry];
      existing.lastEvent = descriptor?.label ?? event.event ?? "update";
      existing.lastUpdated = timestamp;
      sessionMap.set(sessionId, existing);
    });

    return Array.from(sessionMap.values()).sort((a, b) =>
      (b.lastUpdated ?? "").localeCompare(a.lastUpdated ?? ""),
    );
  }, [analysisEvents]);

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
              <div key={`${stage.label}-${index}`} className="mt-1 flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${severityColors[stage.severity]}`}
                />
                <div>
                  <div className="font-medium">{stage.label}</div>
                  <div className="text-muted-foreground">{stage.message}</div>
                  <div className="text-[10px] text-muted-foreground/70">
                    {new Date(stage.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
