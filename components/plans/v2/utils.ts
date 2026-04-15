import { format, isBefore, isSameDay, parseISO, startOfDay } from "date-fns";
import type { DailyTask, LearningPlan, TaskStatus } from "@/types";

export type QueueBucket = "today" | "scheduled" | "overdue";

export interface QueueTask extends DailyTask {
  bucket: QueueBucket;
}

export function toTaskDate(task: DailyTask) {
  return parseISO(task.scheduled_date);
}

export function sortTasksByDate(tasks: DailyTask[]) {
  return [...tasks].sort(
    (a, b) => toTaskDate(a).getTime() - toTaskDate(b).getTime(),
  );
}

export function classifyQueueTasks(tasks: DailyTask[]): QueueTask[] {
  const today = startOfDay(new Date());

  return sortTasksByDate(tasks).map((task) => {
    const date = toTaskDate(task);
    const isOverdueDate = isBefore(date, today);

    if (task.status === "overdue" || (isOverdueDate && task.status !== "completed")) {
      return { ...task, bucket: "overdue" };
    }
    if (isSameDay(date, today)) {
      return { ...task, bucket: "today" };
    }
    return { ...task, bucket: "scheduled" };
  });
}

export function statusTone(status: TaskStatus): string {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "in_progress":
      return "bg-[#5858CC]/15 text-[#5858CC] border-[#5858CC]/30";
    case "overdue":
      return "bg-[#EC5B13]/15 text-[#EC5B13] border-[#EC5B13]/30";
    case "rescheduled":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "skipped":
      return "bg-zinc-100 text-zinc-700 border-zinc-300";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-300";
  }
}

export function statusLabel(status: TaskStatus): string {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "overdue":
      return "Needs attention";
    case "rescheduled":
      return "Rescheduled";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export function planContext(plan: LearningPlan) {
  const status = plan.status.replace("_", " ");
  const mentor = plan.specialized_mentor?.name ?? plan.specialized_mentor_data?.name ?? "Mentor ready";
  const today = startOfDay(new Date());
  const tasks = plan.daily_tasks ?? [];

  const todayCount = tasks.filter((task) => isSameDay(parseISO(task.scheduled_date), today)).length;
  const activeCount = tasks.filter((task) => task.status === "in_progress").length;

  return {
    status,
    mentor,
    todayCount,
    activeCount,
  };
}

export function formatTaskDate(task: DailyTask) {
  return format(parseISO(task.scheduled_date), "EEE, MMM d");
}
