"use client";

import { useMemo } from "react";
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
import type { DailyTask } from "@/types";

interface TaskListProps {
  tasks: DailyTask[];
  onToggleStatus: (task: DailyTask) => void;
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

export function TaskList({ tasks, onToggleStatus, isUpdating }: TaskListProps) {
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
                        onClick={() => onToggleStatus(task)}
                        disabled={isUpdating}
                      >
                        {isUpdating
                          ? "Updating…"
                          : isCompleted
                          ? "Mark incomplete"
                          : "Mark complete"}
                      </Button>
                    </div>
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
