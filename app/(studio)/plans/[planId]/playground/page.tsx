"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePlan, usePlanMutations } from "@/hooks/use-plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { DailyTask } from "@/types";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const defaultSteps = [
  "Review the objective and materials.",
  "Work through the main resource or example.",
  "Try the exercise and reflect.",
];

export default function PlanPlaygroundPage() {
  const params = useParams<{ planId: string }>();
  const searchParams = useSearchParams();
  const planId = params.planId;
  const { data: plan } = usePlan(planId);
  const { updateTaskStatus } = usePlanMutations(planId);
  const [focusMode, setFocusMode] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [reflection, setReflection] = useState("");
  const [effort, setEffort] = useState<number | null>(null);
  const [understanding, setUnderstanding] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [stepStates, setStepStates] = useState<Record<string, boolean[]>>({});

  const tasks = plan?.daily_tasks ?? [];
  const selectedTaskId = searchParams.get("task");

  const activeTask = useMemo(() => {
    if (selectedTaskId) {
      const found = tasks.find((task) => task.id === selectedTaskId);
      if (found) return found;
    }
    return (
      tasks.find((task) => task.status !== "completed") ??
      tasks.sort(
        (a, b) =>
          new Date(a.scheduled_date).getTime() -
          new Date(b.scheduled_date).getTime()
      )[0]
    );
  }, [selectedTaskId, tasks]);

  const milestoneCelebration = useMemo(() => {
    if (!activeTask?.milestone_id) return null;
    const milestone = plan?.milestones?.find(
      (item) => item.milestone_id === activeTask.milestone_id
    );
    if (!milestone) return null;
    const milestoneTasks = tasks.filter(
      (task) => task.milestone_id === milestone.milestone_id
    );
    const completedCount = milestoneTasks.filter(
      (task) => task.status === "completed"
    ).length;
    if (milestoneTasks.length && completedCount === milestoneTasks.length) {
      return {
        title: milestone.title,
        week: milestone.week,
      };
    }
    return null;
  }, [activeTask?.milestone_id, plan?.milestones, tasks]);

  const activeSteps = useMemo(() => {
    if (!activeTask) return defaultSteps;
    const hints = activeTask.ai_generated_hints ?? [];
    if (hints.length >= 2) {
      return hints.slice(0, 3);
    }
    return defaultSteps;
  }, [activeTask]);

  const stepState = stepStates[activeTask?.id ?? ""] ?? activeSteps.map(() => false);

  const toggleStep = (index: number) => {
    if (!activeTask) return;
    setStepStates((prev) => {
      const existing = prev[activeTask.id] ?? activeSteps.map(() => false);
      const next = [...existing];
      next[index] = !next[index];
      return { ...prev, [activeTask.id]: next };
    });
  };

  const handleStartSession = () => {
    setSessionStarted(true);
    setSessionStartTime(Date.now());
    if (activeTask) {
      updateTaskStatus.mutate({
        taskId: activeTask.id,
        status: "in_progress",
      });
    }
  };

  const handleCompleteTask = () => {
    if (!activeTask) return;
    const durationMinutes =
      sessionStartTime && sessionStarted
        ? Math.max(1, Math.round((Date.now() - sessionStartTime) / 60000))
        : undefined;

    updateTaskStatus.mutate({
      taskId: activeTask.id,
      status: "completed",
      actual_duration_minutes: durationMinutes,
      difficulty_rating: effort ?? undefined,
      effectiveness_rating: understanding ?? undefined,
      completion_notes: notes,
      check_in_response: reflection,
    });
    setSessionStarted(false);
    setSessionStartTime(null);
  };

  const resources = (activeTask?.online_resources ?? []) as Array<
    string | Record<string, unknown>
  >;

  const markResource = (resourceKey: string, state: "opened" | "completed") => {
    if (!activeTask) return;
    const engagement = { ...(activeTask.resource_engagement ?? {}) };
    const existing = engagement[resourceKey] ?? {};
    engagement[resourceKey] = {
      ...existing,
      opened_at:
        state === "opened"
          ? existing.opened_at ?? new Date().toISOString()
          : existing.opened_at,
      completed_at:
        state === "completed" ? new Date().toISOString() : existing.completed_at,
    };
    updateTaskStatus.mutate({
      taskId: activeTask.id,
      resource_engagement: engagement,
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Learning Playground</h2>
          <p className="text-xs text-muted-foreground">
            Stay focused on the next step in your plan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/plans?plan=${planId}`}>Back to plan</Link>
          </Button>
          <Button variant={focusMode ? "default" : "outline"} onClick={() => setFocusMode((prev) => !prev)}>
            {focusMode ? "Exit Focus Mode" : "Focus Mode"}
          </Button>
        </div>
      </header>

      {!plan || !activeTask ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading your learning surface...
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            focusMode ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]"
          )}
        >
          {milestoneCelebration ? (
            <div className="col-span-full rounded-xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
              🎉 Milestone complete: {milestoneCelebration.title} (Week {milestoneCelebration.week})
            </div>
          ) : null}
          <main className="space-y-4">
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl">{activeTask.title}</CardTitle>
                <CardDescription>
                  {activeTask.description}
                </CardDescription>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{activeTask.task_type}</Badge>
                  <Badge variant="outline">
                    {activeTask.estimated_duration_minutes} min
                  </Badge>
                  <Badge variant="outline">
                    {format(parseISO(activeTask.scheduled_date), "EEE, MMM d")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Now Learning
                  </p>
                  <p className="mt-2 text-sm">
                    {activeTask.check_in_question ??
                      "What will success look like after this task?"}
                  </p>
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Micro-steps
                  </p>
                  <div className="mt-2 space-y-2 text-sm">
                    {activeSteps.map((step, idx) => (
                      <label key={`${activeTask.id}-step-${idx}`} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={stepState[idx] ?? false}
                          onChange={() => toggleStep(idx)}
                          className="mt-1"
                        />
                        <span>{step}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Try it
                    </p>
                    <Textarea
                      value={reflection}
                      onChange={(event) => setReflection(event.target.value)}
                      placeholder="Write your short answer or reflection..."
                      className="mt-2 min-h-[120px]"
                    />
                  </div>
                  <div className="rounded-lg border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Notes
                    </p>
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Capture your notes here..."
                      className="mt-2 min-h-[120px]"
                    />
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Session ritual
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={handleStartSession} disabled={sessionStarted}>
                      {sessionStarted ? "Session running" : "Start session"}
                    </Button>
                    <Button variant="outline" onClick={handleCompleteTask}>
                      Complete task
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
                    <RatingRow
                      label="Effort"
                      value={effort}
                      onChange={setEffort}
                    />
                    <RatingRow
                      label="Understanding"
                      value={understanding}
                      onChange={setUnderstanding}
                    />
                    <RatingRow
                      label="Confidence"
                      value={confidence}
                      onChange={setConfidence}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {!focusMode ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resource Dock</CardTitle>
                  <CardDescription>Open learning material without leaving the playground.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {resources.length ? (
                    resources.slice(0, 5).map((resource, index) => {
                      const label =
                        typeof resource === "string"
                          ? resource
                          : (resource.title as string) ||
                            (resource.name as string) ||
                            "Resource";
                      const href =
                        typeof resource === "string"
                          ? resource
                          : (resource.url as string) ||
                            (resource.link as string) ||
                            undefined;
                      const resourceKey = `resource-${index}`;
                      const engagement = activeTask.resource_engagement?.[resourceKey];
                      return (
                        <div
                          key={`resource-${index}`}
                          className="flex flex-col gap-2 rounded-lg border bg-background px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{label}</span>
                            {href ? (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                onClick={() => markResource(resourceKey, "opened")}
                              >
                                <a href={href} target="_blank" rel="noreferrer">
                                  Open
                                </a>
                              </Button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                Unavailable
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Button
                              size="sm"
                              variant={engagement?.completed_at ? "secondary" : "outline"}
                              onClick={() => markResource(resourceKey, "completed")}
                            >
                              {engagement?.completed_at ? "Viewed" : "Mark viewed"}
                            </Button>
                            {engagement?.opened_at ? (
                              <span>Opened</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Resources will appear here once added to the task.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </main>

          {!focusMode ? (
            <aside className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mentor tip</CardTitle>
                  <CardDescription>Guidance tied to your current task.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {activeTask.ai_generated_hints?.[0] ??
                    "If you feel stuck, ask your mentor to break the task down further."}
                  <Button className="mt-3 w-full" variant="outline" asChild>
                    <Link href={`/chat?plan=${planId}`}>Ask mentor</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Study Deck</CardTitle>
                  <CardDescription>Quick view of what’s next.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <div className="rounded-lg border bg-background px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide">Active task</p>
                    <p className="text-sm font-medium text-foreground">{activeTask.title}</p>
                  </div>
                  <div className="rounded-lg border bg-background px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide">Quick check</p>
                    <p>{activeTask.check_in_question ?? "Reflect on what you learned."}</p>
                  </div>
                  <div className="rounded-lg border bg-background px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide">Progress map</p>
                    <p>
                      {plan.milestones?.length
                        ? `${plan.milestones.length} milestones in this journey`
                        : "Milestones will appear here."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border bg-white px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide">{label}</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={`${label}-${score}`}
            type="button"
            onClick={() => onChange(score)}
            className={cn(
              "h-6 w-6 rounded-full border text-[10px]",
              value === score ? "border-primary bg-primary/10 text-primary" : "bg-white"
            )}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}
