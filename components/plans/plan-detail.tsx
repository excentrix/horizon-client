"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import type { DailyTask, LearningPlan } from "@/types";
import { planningApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import { format, isAfter, isSameDay, parseISO, startOfDay } from "date-fns";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface PlanDetailProps {
  plan: LearningPlan;
  tasks?: DailyTask[];
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
  tasks = [],
  onStart,
  onPause,
  onResume,
  onComplete,
  onActivateMentor,
  actionStatus,
}: PlanDetailProps) {
  const mentorId =
    plan.specialized_mentor?.id ?? plan.specialized_mentor_data?.id;
  const mentorName =
    plan.specialized_mentor?.name ??
    plan.specialized_mentor_data?.name ??
    "Specialist Mentor";
  const mentorAvailable = Boolean(mentorId);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const description = plan.description?.trim() ?? "";
  const preferences = plan.user_preferences_snapshot as
    | Record<string, unknown>
    | undefined;
  const scheduleSnapshot = plan.user_schedule_snapshot as
    | Record<string, unknown>
    | undefined;
  const motivationPatterns = Array.isArray(preferences?.motivation_patterns)
    ? (preferences?.motivation_patterns as string[])
    : [];
  const learningApproach = preferences?.learning_approach as string | undefined;
  const primaryStyle =
    (preferences?.primary_style as string | undefined) ??
    (preferences?.primary_learning_style as string | undefined);
  const maxDailyHours = scheduleSnapshot?.max_daily_hours as number | undefined;
  const shortDescription = useMemo(() => {
    if (!description) {
      return "";
    }
    if (description.length <= 220) {
      return description;
    }
    return `${description.slice(0, 220).trim()}...`;
  }, [description]);
  const sortedTasks = useMemo(() => [...tasks].sort(
    (a, b) =>
      new Date(a.scheduled_date).getTime() -
      new Date(b.scheduled_date).getTime(),
  ), [tasks]);
  const today = startOfDay(new Date());
  const todayTasks = sortedTasks.filter((task) =>
    isSameDay(parseISO(task.scheduled_date), today),
  );
  const upcomingTasks = sortedTasks.filter((task) =>
    isAfter(parseISO(task.scheduled_date), today),
  );
  const nextTask =
    todayTasks.find((task) => task.status !== "completed") ??
    upcomingTasks.find((task) => task.status !== "completed") ??
    sortedTasks[0];
  const playgroundHref = `/plans/${plan.id}/playground${
    nextTask?.id ? `?task=${nextTask.id}` : ""
  }`;
  const [resourceRefreshing, setResourceRefreshing] = useState(false);

  const handleRecheckResources = async () => {
    setResourceRefreshing(true);
    try {
      const response = await planningApi.recheckPlanResources(plan.id);
      telemetry.toastInfo(response.message ?? "Resource verification queued");
    } catch (error) {
      telemetry.toastError(
        "Unable to recheck resources",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setResourceRefreshing(false);
    }
  };
  const displayWeeks = (() => {
    const tasks = plan.daily_tasks ?? [];
    if (!tasks.length) {
      return plan.estimated_duration_weeks;
    }
    const timestamps = tasks
      .map((task) => new Date(task.scheduled_date).getTime())
      .filter((time) => Number.isFinite(time));
    if (!timestamps.length) {
      return plan.estimated_duration_weeks;
    }
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    const days = Math.max(
      1,
      Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1,
    );
    const derivedWeeks = Math.max(1, Math.ceil(days / 7));
    if (Math.abs(derivedWeeks - plan.estimated_duration_weeks) >= 2) {
      return derivedWeeks;
    }
    return plan.estimated_duration_weeks;
  })();
  const milestones = useMemo(() => plan.milestones ?? [], [plan.milestones]);
  const visibleMilestones = showAllMilestones
    ? milestones
    : milestones.slice(0, 3);
  const milestoneProgress = useMemo(() => {
    if (!milestones.length) {
      return [];
    }
    return milestones.map((milestone, index) => {
      const milestoneTasks = tasks.filter(
        (task) =>
          task.milestone_id && task.milestone_id === milestone.milestone_id,
      );
      const total = milestoneTasks.length;
      const completed = milestoneTasks.filter(
        (task) => task.status === "completed",
      ).length;
      return {
        ...milestone,
        index,
        total,
        completed,
        isComplete: total > 0 && completed === total,
      };
    });
  }, [milestones, tasks]);
  const milestoneTrackWeeks = useMemo(() => {
    if (!milestones.length) {
      return displayWeeks || 1;
    }
    const maxWeek = Math.max(
      1,
      ...milestones.map((milestone) => Math.max(1, milestone.week || 1)),
    );
    return Math.max(maxWeek, 1);
  }, [milestones, displayWeeks]);
  const milestoneCount = milestoneProgress.length;
  const lastCompletedMilestone = useMemo(() => {
    return milestoneProgress
      .filter((milestone) => milestone.isComplete)
      .sort((a, b) => a.week - b.week)
      .at(-1);
  }, [milestoneProgress]);

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
            <Button
              variant="secondary"
              onClick={onPause}
              disabled={actionStatus.pausing}
            >
              {actionStatus.pausing ? "Pausing…" : "Pause"}
            </Button>
            <Button
              variant="outline"
              onClick={onComplete}
              disabled={actionStatus.completing}
            >
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

  const normalizeResource = (resource: unknown) => {
    if (typeof resource === "string") {
      return { label: resource, href: resource.startsWith("http") ? resource : undefined };
    }
    if (resource && typeof resource === "object") {
      const record = resource as Record<string, unknown>;
      const label =
        (record.title as string | undefined) ||
        (record.name as string | undefined) ||
        (record.label as string | undefined) ||
        "Resource";
      const href =
        (record.url as string | undefined) ||
        (record.link as string | undefined) ||
        (record.href as string | undefined);
      return { label, href };
    }
    return { label: "Resource", href: undefined };
  };

  const renderTaskResources = (task?: DailyTask) => {
    if (!task) return null;
    const resources = (task.online_resources ?? []).map(normalizeResource);
    if (!resources.length) {
      return null;
    }
    return (
      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
        {resources.slice(0, 3).map((resource, idx) =>
          resource.href ? (
            <a
              key={`focus-resource-${idx}`}
              href={resource.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border bg-background px-2 py-1 font-medium text-primary"
            >
              {resource.label}
            </a>
          ) : (
            <span
              key={`focus-resource-${idx}`}
              className="rounded-full border bg-background px-2 py-1 text-muted-foreground"
            >
              {resource.label}
            </span>
          )
        )}
      </div>
    );
  };

  return (
    <Card className="h-auto min-h-0 rounded-[28px] border border-white/80 bg-white/85 shadow-[var(--shadow-2)] backdrop-blur">
      <CardHeader className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-2">
            <CardTitle className="text-xl">{plan.title}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {plan.plan_type} · {displayWeeks} weeks ·{" "}
              {plan.total_estimated_hours} hrs · {plan.difficulty_level}
            </CardDescription>
            {description ? (
              <div className="text-sm text-muted-foreground">
                <p>{showFullDescription ? description : shortDescription}</p>
                {description.length > shortDescription.length ? (
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-primary"
                    onClick={() => setShowFullDescription((prev) => !prev)}
                  >
                    {showFullDescription ? "Show less" : "Read overview"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col justify-between rounded-2xl border border-white/70 bg-white/70 p-4 shadow-[var(--shadow-1)] aspect-square">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mentor support
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {mentorAvailable
                  ? `${mentorName} is ready to guide you.`
                  : "Your specialist mentor will appear once the plan is ready."}
              </p>
            </div>
            {mentorAvailable ? (
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={() => mentorId && onActivateMentor(mentorId)}
                disabled={actionStatus.switchingMentor}
              >
                {actionStatus.switchingMentor
                  ? "Activating…"
                  : "Activate mentor"}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "rounded-full px-3 py-1 font-medium",
                "bg-primary/10 text-primary",
              )}
            >
              {(plan.status ?? "draft").replace(/_/g, " ")}
            </span>
            <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-muted-foreground font-medium">
              {plan.progress_percentage}% complete
            </span>
            {plan.primary_domain_name ? (
              <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-muted-foreground font-medium">
                {plan.primary_domain_name}
              </span>
            ) : null}
          </div>
          <div className="relative mt-1 rounded-2xl border border-white/70 bg-white/70 px-4 py-4 shadow-[var(--shadow-1)]">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="uppercase tracking-[0.2em]">Progress</span>
              <span className="font-medium text-foreground">
                {plan.progress_percentage}%
              </span>
            </div>
            <div className="relative mt-4">
              <div className="h-1.5 w-full rounded-full bg-muted/50" />
              <div
                className="absolute left-0 top-0 h-1.5 rounded-full bg-primary"
                style={{ width: `${Math.min(100, plan.progress_percentage)}%` }}
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-between">
                {(milestoneProgress.length
                  ? milestoneProgress
                  : Array.from({ length: Math.max(3, displayWeeks ? Math.min(6, displayWeeks) : 4) }).map(
                      (_, index) => ({
                        id: `step-${index}`,
                        index,
                        title: `Step ${index + 1}`,
                        isComplete:
                          plan.progress_percentage >=
                          (index / Math.max(1, (milestoneProgress.length || 4) - 1)) *
                            100,
                      }),
                    )
                ).map((milestone, index, arr) => {
                  const stepPct =
                    arr.length > 1 ? (index / (arr.length - 1)) * 100 : 0;
                  const completed =
                    "isComplete" in milestone
                      ? milestone.isComplete
                      : plan.progress_percentage >= stepPct;
                  return (
                    <div
                      key={milestone.id ?? `step-${index}`}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold shadow-sm transition",
                        completed
                          ? "border-primary bg-primary text-white"
                          : "border-muted-foreground/30 bg-white text-muted-foreground",
                      )}
                      style={{ transform: "translateY(-50%)" }}
                    >
                      {index + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {lastCompletedMilestone ? (
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                ✨
              </span>
              <span className="font-medium">
                Milestone reached: {lastCompletedMilestone.title}
              </span>
              <span className="animate-bounce">🎉</span>
            </div>
          ) : null}
        </div>
        {(learningApproach || primaryStyle || maxDailyHours || motivationPatterns.length) ? (
          <div className="rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-[11px] text-muted-foreground shadow-[var(--shadow-1)]">
            <p className="font-semibold uppercase tracking-wide text-[10px] text-muted-foreground">
              Why this plan fits you
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {learningApproach ? (
                <span className="rounded-full border border-white/70 bg-white/70 px-2 py-1">
                  Approach: {learningApproach}
                </span>
              ) : null}
              {primaryStyle ? (
                <span className="rounded-full border border-white/70 bg-white/70 px-2 py-1">
                  Style: {primaryStyle}
                </span>
              ) : null}
              {maxDailyHours ? (
                <span className="rounded-full border border-white/70 bg-white/70 px-2 py-1">
                  Pace: {maxDailyHours}h/day
                </span>
              ) : null}
              {motivationPatterns.slice(0, 2).map((pattern) => (
                <span
                  key={pattern}
                  className="rounded-full border border-white/70 bg-white/70 px-2 py-1"
                >
                  Motivation: {pattern}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {renderControls()}
          <Button
            variant="outline"
            onClick={handleRecheckResources}
            disabled={resourceRefreshing}
          >
            {resourceRefreshing ? "Refreshing resources…" : "Recheck resources"}
          </Button>
          <Button asChild variant="outline">
            <Link href={playgroundHref}>Enter playground</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-[var(--shadow-1)]">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Focus today
          </h3>
          <div className="mt-3 space-y-2">
            {todayTasks.length ? (
              todayTasks.slice(0, 2).map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 text-sm font-medium">
                    <span>{task.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {task.estimated_duration_minutes} min
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {task.description}
                  </p>
                  {renderTaskResources(task)}
                </div>
              ))
            ) : nextTask ? (
              <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 shadow-sm">
                <div className="flex items-center justify-between gap-2 text-sm font-medium">
                  <span>{nextTask.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(nextTask.scheduled_date), "EEE, MMM d")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {nextTask.description}
                </p>
                {renderTaskResources(nextTask)}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tasks will appear here once scheduled.
              </p>
            )}
          </div>
        </div>

        {milestones.length ? (
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-[var(--shadow-1)]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Milestones
              </h3>
              {milestones.length > 3 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-primary"
                  onClick={() => setShowAllMilestones((prev) => !prev)}
                >
                  {showAllMilestones ? "Show fewer" : "Show all"}
                </button>
              ) : null}
            </div>
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-3">
              {visibleMilestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 text-sm font-medium">
                    <span>{milestone.title}</span>
                    <span className="text-xs text-muted-foreground">
                      Week {milestone.week}
                    </span>
                  </div>
                  {milestone.description ? (
                    <p className="text-xs text-muted-foreground">
                      {milestone.description}
                    </p>
                  ) : null}
                  {milestone.objectives?.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                      {milestone.objectives.slice(0, 3).map((objective) => (
                        <li key={objective}>{objective}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <Separator />

        <div className="grid gap-2 text-xs text-muted-foreground">
          <p>
            <strong>Schedule snapshot:</strong>{" "}
            {plan.user_schedule_snapshot ? "Captured" : "Not captured"}
          </p>
          <p>
            <strong>Resources saved:</strong>{" "}
            {plan.available_resources_snapshot?.length ?? 0}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
