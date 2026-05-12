"use client";

import type { DailyTask } from "@/types";

interface TaskLockedScreenProps {
  task: DailyTask;
  onNavigate: (taskId: string) => void;
  tasks: DailyTask[];
}

export function TaskLockedScreen({ task, onNavigate, tasks }: TaskLockedScreenProps) {
  const blockingTask = tasks.find((t) => t.title === task.locked_by_task_title);

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
        🔒
      </div>
      <h2 className="text-lg font-bold text-slate-900">This task is locked</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Complete{" "}
        <span className="font-semibold text-slate-700">
          {task.locked_by_task_title ?? "the previous task"}
        </span>{" "}
        to unlock this one.
      </p>
      {blockingTask && (
        <button
          onClick={() => onNavigate(blockingTask.id)}
          className="mt-6 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
        >
          Go to previous task
        </button>
      )}
    </div>
  );
}
