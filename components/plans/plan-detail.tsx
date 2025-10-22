"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { LearningPlan } from "@/types";
import { cn } from "@/lib/utils";

interface PlanDetailProps {
  plan: LearningPlan;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
  onActivateMentor: (mentorId: string) => void;
  actionStatus: {
    starting: boolean;
    pausing: boolean;
    resuming: boolean;
    completing: boolean;
    switchingMentor: boolean;
  };
}

export function PlanDetail({
  plan,
  onStart,
  onPause,
  onResume,
  onComplete,
  onActivateMentor,
  actionStatus,
}: PlanDetailProps) {
  const mentorId = plan.specialized_mentor?.id ?? plan.specialized_mentor_data?.id;
  const mentorName =
    plan.specialized_mentor?.name ?? plan.specialized_mentor_data?.name ?? "Specialist Mentor";
  const mentorAvailable = Boolean(mentorId);

  const renderControls = () => {
    switch (plan.status) {
      case "draft":
        return (
          <Button onClick={onStart} disabled={actionStatus.starting}>
            {actionStatus.starting ? "Starting…" : "Start plan"}
          </Button>
        );
      case "active":
        return (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onPause} disabled={actionStatus.pausing}>
              {actionStatus.pausing ? "Pausing…" : "Pause"}
            </Button>
            <Button variant="outline" onClick={onComplete} disabled={actionStatus.completing}>
              {actionStatus.completing ? "Completing…" : "Mark complete"}
            </Button>
          </div>
        );
      case "paused":
        return (
          <Button onClick={onResume} disabled={actionStatus.resuming}>
            {actionStatus.resuming ? "Resuming…" : "Resume plan"}
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="space-y-3">
        <CardTitle>{plan.title}</CardTitle>
        <CardDescription className="space-y-1 text-xs text-muted-foreground">
          <p>{plan.description}</p>
          <p>
            {plan.plan_type} · {plan.estimated_duration_weeks} weeks · {plan.total_estimated_hours} hrs total ·
            Difficulty: {plan.difficulty_level}
          </p>
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={cn("rounded-full px-3 py-1", "bg-primary/10 text-primary font-medium")}>Status: {plan.status}</span>
          <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground font-medium">
            Progress: {plan.progress_percentage}%
          </span>
          {plan.primary_domain_name ? (
            <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground font-medium">
              Domain: {plan.primary_domain_name}
            </span>
          ) : null}
        </div>
        {renderControls()}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="mb-2 text-sm font-semibold">Mentor</h3>
          <p className="text-muted-foreground">
            {mentorAvailable
              ? `${mentorName} is ready to guide you through this plan.`
              : "Specialist mentor will appear once the plan is ready."}
          </p>
          {mentorAvailable ? (
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => mentorId && onActivateMentor(mentorId)}
              disabled={actionStatus.switchingMentor}
            >
              {actionStatus.switchingMentor ? "Activating…" : `Activate ${mentorName}`}
            </Button>
          ) : null}
        </div>

        <Separator />

        <div className="grid gap-2 text-xs text-muted-foreground">
          <p>
            <strong>User schedule snapshot:</strong> {plan.user_schedule_snapshot ? "Captured" : "Not captured"}
          </p>
          <p>
            <strong>Resources:</strong> {plan.available_resources_snapshot?.length ?? 0} items captured
          </p>
          <p>
            <strong>AI confidence:</strong> {Math.round(plan.ai_confidence_score * 100)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
