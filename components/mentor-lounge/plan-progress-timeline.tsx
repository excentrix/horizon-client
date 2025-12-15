"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlanUpdateEvent } from "@/types";

interface PlanProgressTimelineProps {
  updates: PlanUpdateEvent[];
  onDismiss?: () => void;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> =
  {
    initializing: "outline",
    started: "secondary",
    processing: "secondary",
    warning: "outline",
    completed: "default",
    success: "default",
    error: "destructive",
  };

const statusLabel: Record<string, string> = {
  initializing: "Initializing",
  started: "Crew started",
  processing: "In progress",
  warning: "Warning",
  completed: "Finished",
  success: "Success",
  error: "Error",
};

const formatTime = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return timestamp;
  }
};

export function PlanProgressTimeline({
  updates,
  onDismiss,
}: PlanProgressTimelineProps) {
  const orderedUpdates = useMemo(
    () =>
      [...updates].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    [updates],
  );

  if (!orderedUpdates.length) {
    return null;
  }

  return (
    <Card className="border-amber-100 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          Plan builder status
        </CardTitle>
        {onDismiss ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <ol className="space-y-3">
          {orderedUpdates.map((update) => (
            <li key={update.id} className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">
                    {update.message}
                  </p>
                  <Badge
                    variant={statusVariant[update.status] ?? "secondary"}
                    className="text-[11px]"
                  >
                    {statusLabel[update.status] ?? update.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{formatTime(update.timestamp)}</span>
                  {update.agent ? <span>• {update.agent}</span> : null}
                  {update.tool ? <span>• {update.tool}</span> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-[11px]">
          Hang tight while we stitch together the plan. We&apos;ll surface the
          final roadmap as soon as it&apos;s saved.
        </p>
      </CardContent>
    </Card>
  );
}
