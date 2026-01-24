"use client";

import { useMemo, useState } from "react";
import {
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  addDays,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DailyTask } from "@/types";

interface TaskListProps {
  tasks: DailyTask[];
  onUpdateTask: (taskId: string, payload: Partial<DailyTask>) => void;
  isUpdating: boolean;
}

const statusLabels: Record<DailyTask["status"], string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  skipped: "Skipped",
  rescheduled: "Rescheduled",
  overdue: "Overdue",
};

export function TaskList({ tasks, onUpdateTask, isUpdating }: TaskListProps) {
  const [completionTaskId, setCompletionTaskId] = useState<string | null>(null);
  const [completionData, setCompletionData] = useState<Record<string, string>>({});
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

  const grouped = useMemo(() => {
    const today = startOfDay(new Date());
    const weekAhead = addDays(today, 7);
    const overdue: DailyTask[] = [];
    const todayTasks: DailyTask[] = [];
    const upcoming: DailyTask[] = [];
    const later: DailyTask[] = [];

    tasks.forEach((task) => {
      const date = parseISO(task.scheduled_date);
      if (isSameDay(date, today)) {
        todayTasks.push(task);
      } else if (isBefore(date, today)) {
        overdue.push(task);
      } else if (isAfter(date, weekAhead)) {
        later.push(task);
      } else {
        upcoming.push(task);
      }
    });

    return {
      today: [...overdue, ...todayTasks],
      overdueIds: new Set(overdue.map((task) => task.id)),
      upcoming,
      later,
    };
  }, [tasks]);

  if (!tasks.length) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Once your mentor generates tasks they will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {([
        { key: "today", label: "Today", items: grouped.today },
        { key: "upcoming", label: "Upcoming (next 7 days)", items: grouped.upcoming },
        { key: "later", label: "Later", items: grouped.later },
      ] as const).map((section) => {
        if (!section.items.length) {
          return null;
        }
        return (
          <div key={section.key} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {section.label}
              </h3>
              <span className="text-xs text-muted-foreground">
                {section.items.length} tasks
              </span>
            </div>
            <div className="grid gap-3">
              {section.items.map((task) => {
                const isCompleted = task.status === "completed";
                const isOverdue = grouped.overdueIds.has(task.id);
                const resources = (task.online_resources ?? []).map(normalizeResource);
                const hints = task.ai_generated_hints ?? [];
                const prerequisites = task.prerequisites ?? [];
                const envRequirements = task.environment_requirements ?? {};
                const tools = task.current_tools_versions ?? {};
                const hasExtras =
                  resources.length ||
                  hints.length ||
                  prerequisites.length ||
                  Object.keys(envRequirements).length ||
                  Object.keys(tools).length ||
                  (task.resources_needed?.length ?? 0) > 0 ||
                  (task.kpis?.length ?? 0) > 0 ||
                  Boolean(task.verification?.criteria || task.verification?.method);
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border bg-muted/20 p-4 text-sm shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{task.title}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(task.scheduled_date), "EEE, MMM d")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{task.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {isOverdue ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : null}
                          <Badge variant="secondary">{statusLabels[task.status]}</Badge>
                          <Badge variant="outline">{task.task_type}</Badge>
                          <span>{task.estimated_duration_minutes} min</span>
                          <span>Difficulty: {task.difficulty_level}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isCompleted ? "secondary" : "default"}
                        onClick={() => {
                          if (isCompleted) {
                            onUpdateTask(task.id, { status: "scheduled" });
                          } else {
                            setCompletionTaskId((prev) =>
                              prev === task.id ? null : task.id
                            );
                          }
                        }}
                        disabled={isUpdating}
                      >
                        {isUpdating
                          ? "Updating…"
                          : isCompleted
                          ? "Mark incomplete"
                          : completionTaskId === task.id
                          ? "Close"
                          : "Mark complete"}
                      </Button>
                    </div>
                    {completionTaskId === task.id && !isCompleted ? (
                      <div className="mt-3 rounded-lg border bg-background px-3 py-3">
                        <div className="grid gap-3 text-xs text-muted-foreground">
                          <div className="grid gap-2 sm:grid-cols-3">
                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-wide">
                                Duration (min)
                              </label>
                              <Input
                                value={completionData[`${task.id}-duration`] ?? ""}
                                onChange={(event) =>
                                  setCompletionData((prev) => ({
                                    ...prev,
                                    [`${task.id}-duration`]: event.target.value,
                                  }))
                                }
                                placeholder="45"
                                className="mt-1 h-8 text-xs"
                                inputMode="numeric"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-wide">
                                Difficulty (1-5)
                              </label>
                              <Input
                                value={completionData[`${task.id}-difficulty`] ?? ""}
                                onChange={(event) =>
                                  setCompletionData((prev) => ({
                                    ...prev,
                                    [`${task.id}-difficulty`]: event.target.value,
                                  }))
                                }
                                placeholder="3"
                                className="mt-1 h-8 text-xs"
                                inputMode="numeric"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-wide">
                                Effectiveness (1-5)
                              </label>
                              <Input
                                value={completionData[`${task.id}-effectiveness`] ?? ""}
                                onChange={(event) =>
                                  setCompletionData((prev) => ({
                                    ...prev,
                                    [`${task.id}-effectiveness`]: event.target.value,
                                  }))
                                }
                                placeholder="4"
                                className="mt-1 h-8 text-xs"
                                inputMode="numeric"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wide">
                              Notes
                            </label>
                            <Textarea
                              value={completionData[`${task.id}-notes`] ?? ""}
                              onChange={(event) =>
                                setCompletionData((prev) => ({
                                  ...prev,
                                  [`${task.id}-notes`]: event.target.value,
                                }))
                              }
                              placeholder="What helped? What felt tricky?"
                              className="mt-1 min-h-[72px] text-xs"
                            />
                          </div>
                          {task.check_in_question ? (
                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-wide">
                                Quick check
                              </label>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {task.check_in_question}
                              </p>
                              <Textarea
                                value={completionData[`${task.id}-checkin`] ?? ""}
                                onChange={(event) =>
                                  setCompletionData((prev) => ({
                                    ...prev,
                                    [`${task.id}-checkin`]: event.target.value,
                                  }))
                                }
                                placeholder="Your short reflection..."
                                className="mt-2 min-h-[72px] text-xs"
                              />
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                const duration = Number(
                                  completionData[`${task.id}-duration`]
                                );
                                const difficulty = Number(
                                  completionData[`${task.id}-difficulty`]
                                );
                                const effectiveness = Number(
                                  completionData[`${task.id}-effectiveness`]
                                );
                                onUpdateTask(task.id, {
                                  status: "completed",
                                  actual_duration_minutes: Number.isFinite(duration)
                                    ? duration
                                    : undefined,
                                  difficulty_rating: Number.isFinite(difficulty)
                                    ? difficulty
                                    : undefined,
                                  effectiveness_rating: Number.isFinite(effectiveness)
                                    ? effectiveness
                                    : undefined,
                                  completion_notes:
                                    completionData[`${task.id}-notes`] ?? "",
                                  check_in_response:
                                    completionData[`${task.id}-checkin`] ?? "",
                                });
                                setCompletionTaskId(null);
                              }}
                              disabled={isUpdating}
                            >
                              Save completion
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCompletionTaskId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {hasExtras ? (
                      <details className="mt-3 rounded-lg border bg-background/60 px-3 py-2 text-xs">
                        <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
                          Learning aids
                        </summary>
                        <div className="mt-2 grid gap-2">
                          {resources.length ? (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                Resources
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {resources.slice(0, 4).map((resource, idx) =>
                                  resource.href ? (
                                    <a
                                      key={`${task.id}-resource-${idx}`}
                                      href={resource.href}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-full border bg-background px-2 py-1 text-[11px] font-medium text-primary"
                                    >
                                      {resource.label}
                                    </a>
                                  ) : (
                                    <span
                                      key={`${task.id}-resource-${idx}`}
                                      className="rounded-full border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground"
                                    >
                                      {resource.label}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          ) : null}
                          {task.resources_needed?.length ? (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                Materials
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {task.resources_needed.slice(0, 4).map((item) => (
                                  <span
                                    key={`${task.id}-material-${item}`}
                                    className="rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {prerequisites.length ? (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                Prep first
                              </p>
                              <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                                {prerequisites.slice(0, 3).map((item) => (
                                  <li key={`${task.id}-pre-${item}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {Object.keys(envRequirements).length ? (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                Environment
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {Object.entries(envRequirements).slice(0, 4).map(([key, value]) => (
                                  <span
                                    key={`${task.id}-env-${key}`}
                                    className="rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground"
                                  >
                                    {key}: {String(value)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {hints.length ? (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                Helpful hints
                              </p>
                              <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                                {hints.slice(0, 3).map((hint) => (
                                  <li key={`${task.id}-hint-${hint}`}>{hint}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {Object.keys(tools).length ? (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                Tools
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {Object.entries(tools).slice(0, 4).map(([key, value]) => (
                                  <span
                                    key={`${task.id}-tool-${key}`}
                                    className="rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground"
                                  >
                                    {key}: {String(value)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {task.kpis?.length ? (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                Success targets
                              </p>
                              <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                                {task.kpis.slice(0, 3).map((kpi, idx) => (
                                  <li key={`${task.id}-kpi-${idx}`}>
                                    {kpi.metric ? `${kpi.metric}: ` : ""}
                                    {kpi.target ?? "Target set"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {task.verification?.criteria || task.verification?.method ? (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                Verification
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {task.verification?.method
                                  ? `${task.verification.method}: `
                                  : ""}
                                {task.verification?.criteria ?? "Completion check"}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
