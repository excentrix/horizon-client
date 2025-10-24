import React, { useEffect, useMemo, useState } from "react";
import { useNotificationsSocket } from "@/hooks/use-notifications";

export function AnalysisProgressPanel() {
  const { notifications } = useNotificationsSocket();
  const [sessions, setSessions] = useState<Record<string, any>>({});

  useEffect(() => {
    // listen for notifications array changes
    if (!notifications || notifications.length === 0) return;

    const latest = notifications[0];
    const data = (latest as any).data ?? latest;
    if (!data || !data.event) return;

    const sessionId = data.session_id ?? data.conversation_id ?? "global";

    setSessions((prev) => {
      const copy = { ...prev };
      const s = copy[sessionId] || { id: sessionId, stages: [] };

      s.lastEvent = data.event;
      s.lastPayload = data;

      // append stage events
      if (data.event === "analysis_stage" || data.event === "progress_stage") {
        s.stages = [
          ...(s.stages || []),
          { stage: data.stage || data.event, payload: data },
        ];
      }

      copy[sessionId] = s;
      return copy;
    });
  }, [notifications]);

  const sessionList = useMemo(() => Object.values(sessions), [sessions]);

  if (sessionList.length === 0) return null;

  return (
    <div className="fixed right-6 bottom-6 z-50 w-96 space-y-2">
      {sessionList.map((s: any) => (
        <div key={s.id} className="rounded-lg border bg-background p-3 shadow">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Session {s.id}</div>
            <div className="text-xs text-muted-foreground">{s.lastEvent}</div>
          </div>
          <div className="mt-2 text-xs">
            {s.stages.slice(-6).map((st: any, i: number) => (
              <div key={i} className="mt-1 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div>
                  <div className="font-medium">{st.stage}</div>
                  <div className="text-muted-foreground">
                    {st.payload.domain ||
                      st.payload.summary?.domains_processed ||
                      st.payload.summary?.insights_generated ||
                      ""}
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
