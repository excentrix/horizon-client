"use client";

import { useMemo } from "react";
import { format } from "date-fns";
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
    return tasks.reduce<Record<string, DailyTask[]>>((acc, task) => {
      const key = task.scheduled_date;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const sortedDates = useMemo(() => {
    return Object.keys(grouped).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );
  }, [grouped]);

  if (!tasks.length) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Once your mentor generates tasks they will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((dateKey) => {
        const dateTasks = grouped[dateKey];
        const heading = format(new Date(dateKey), "EEE, MMM d");
        return (
          <div key={dateKey} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">{heading}</h3>
            <div className="grid gap-3">
              {dateTasks.map((task) => {
                const isCompleted = task.status === "completed";
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border bg-muted/20 p-4 text-sm shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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
