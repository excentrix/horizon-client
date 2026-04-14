"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useFlowSuggestion } from "@/hooks/use-flow-suggestion";
import { useGamificationSummary } from "@/hooks/use-gamification";
import { useHomeDashboard } from "@/hooks/use-home-dashboard";
import { chatApi, planningApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface DashboardTask {
  id: string;
  title: string;
  plan_title?: string;
  estimated_duration?: number;
  estimated_duration_minutes?: number;
  learning_plan?: string;
  status: string;
  plan_id?: string;
  learning_plan_title?: string;
  description?: string;
  scheduled_date?: string;
  scheduled_time?: string | null;
}

interface TodaysTasksData {
  tasks: DashboardTask[];
  count: number;
}

type FocusTask = {
  id: string;
  title: string;
  planTitle?: string;
  duration?: number | null;
  tag: "Overdue" | "Today" | "Upcoming" | "Scheduled" | "In Progress";
  planId?: string;
  scheduledTime?: string | null;
};

type CalendarView = "day" | "week" | "month";

const SHELL =
  "rounded-2xl border border-border bg-[color:var(--surface)] shadow-[var(--shadow-1)]";

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/70">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[color:var(--brand-indigo)] to-[color:var(--cta)] transition-all duration-500"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function parseTimeToMinutes(raw?: string | null) {
  if (!raw) return null;
  const normalized = raw.trim();
  const parts = normalized.split(":");
  if (parts.length < 2) return null;
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = h % 24;
  const period = hh >= 12 ? "PM" : "AM";
  const twelve = hh % 12 === 0 ? 12 : hh % 12;
  return `${twelve.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")} ${period}`;
}

function MiniChartTile({
  label,
  value,
  caption,
  color,
  series,
  className,
}: {
  label: string;
  value: string;
  caption: string;
  color: "indigo" | "orange" | "neutral";
  series: number[];
  className?: string;
}) {
  const barTone =
    color === "indigo"
      ? "bg-[color:var(--brand-indigo)]"
      : color === "orange"
        ? "bg-[color:var(--cta)]"
        : "bg-[color:var(--brand-ink)]";

  return (
    <div
      className={`flex h-full min-h-0 flex-col rounded-xl border border-border/90 bg-background p-3.5 shadow-[var(--shadow-1)] ${className ?? ""}`}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-mono-ui mt-1 text-xl font-semibold">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{caption}</p>
      <div className="mt-auto flex h-8 items-end gap-1 pt-2">
        {series.map((point, index) => (
          <span
            key={`${label}-${index}`}
            className={`w-2.5 rounded-sm ${barTone}`}
            style={{
              height: `${Math.max(12, Math.min(100, point))}%`,
              opacity: 0.42 + index * 0.08,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MentorOrb({ active }: { active: boolean }) {
  return (
    <div className="relative mx-auto h-24 w-24">
      <span
        className={`absolute inset-0 rounded-full border border-white/40 ${
          active ? "animate-ping" : ""
        }`}
      />
      <span className="absolute inset-2 rounded-full border border-white/50 opacity-70" />
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#cfd3ff_45%,#7b84ff_100%)] shadow-[0_0_30px_rgba(88,88,204,0.45)]" />
      <div className="absolute inset-7 rounded-full bg-[color:var(--brand-indigo)]/24" />
    </div>
  );
}

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, delta: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatCalendarRange(view: CalendarView, anchor: Date) {
  if (view === "day") {
    return anchor.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  if (view === "week") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function buildMonthGrid(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, idx) => addDays(start, idx));
}

function parseTaskStartMinutes(task: DashboardTask, fallbackIndex = 0) {
  const parsed = parseTimeToMinutes(task.scheduled_time);
  if (parsed !== null) return parsed;
  return 9 * 60 + fallbackIndex * 45;
}

function CalendarBoard({
  tasks,
  view,
  anchorDate,
  onViewChange,
  onAnchorDateChange,
  onOpenTask,
}: {
  tasks: DashboardTask[];
  view: CalendarView;
  anchorDate: Date;
  onViewChange: (next: CalendarView) => void;
  onAnchorDateChange: (next: Date) => void;
  onOpenTask: (task: DashboardTask) => void;
}) {
  const dayStart = 7 * 60;
  const dayEnd = 22 * 60;
  const pxPerMinute = 0.62;
  const bodyHeight = (dayEnd - dayStart) * pxPerMinute;

  const days = useMemo(() => {
    if (view === "day") return [new Date(anchorDate)];
    return Array.from({ length: 7 }, (_, idx) => addDays(startOfWeek(anchorDate), idx));
  }, [anchorDate, view]);

  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, DashboardTask[]>();
    tasks.forEach((task) => {
      const key = task.scheduled_date || toIsoDate(anchorDate);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(task);
    });
    grouped.forEach((list) =>
      list.sort(
        (a, b) => parseTaskStartMinutes(a) - parseTaskStartMinutes(b),
      ),
    );
    return grouped;
  }, [anchorDate, tasks]);

  const onPrev = () => {
    if (view === "day") onAnchorDateChange(addDays(anchorDate, -1));
    else if (view === "week") onAnchorDateChange(addDays(anchorDate, -7));
    else onAnchorDateChange(new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 1));
  };
  const onNext = () => {
    if (view === "day") onAnchorDateChange(addDays(anchorDate, 1));
    else if (view === "week") onAnchorDateChange(addDays(anchorDate, 7));
    else onAnchorDateChange(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1));
  };

  const dayKey = toIsoDate(anchorDate);
  const dayTasks = tasksByDate.get(dayKey) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-background p-3.5 shadow-[var(--shadow-1)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onPrev}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[11px] font-mono-ui" onClick={() => onAnchorDateChange(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onNext}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <span className="ml-2 font-mono-ui text-[11px] text-muted-foreground">{formatCalendarRange(view, anchorDate)}</span>
        </div>
        <div className="inline-flex items-center rounded-lg border border-border bg-[color:var(--surface-2)] p-1">
          {(["day", "week", "month"] as CalendarView[]).map((preset) => (
            <Button
              key={preset}
              variant={view === preset ? "accent" : "ghost"}
              size="sm"
              className="h-7 px-2.5 font-mono-ui text-[10px] uppercase"
              onClick={() => onViewChange(preset)}
            >
              {preset}
            </Button>
          ))}
        </div>
      </div>

      {view === "day" ? (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/80 bg-[color:var(--surface-2)] p-2.5">
          {dayTasks.length ? (
            <div className="space-y-2">
              {dayTasks.map((task, idx) => {
                const startMin = parseTaskStartMinutes(task, idx);
                const duration = Math.max(
                  30,
                  task.estimated_duration_minutes || task.estimated_duration || 45,
                );
                const endMin = startMin + duration;
                const tone =
                  task.status === "overdue"
                    ? "border-[color:var(--cta)]/40 bg-[color:var(--cta)]/14"
                    : task.status === "in_progress"
                      ? "border-[color:var(--brand-indigo)]/40 bg-[color:var(--brand-indigo)]/16"
                      : "border-border bg-background";
                return (
                  <button
                    key={task.id}
                    onClick={() => onOpenTask(task)}
                    className={`w-full rounded-lg border p-3 text-left ${tone}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold">{task.title}</p>
                        <p className="font-mono-ui mt-0.5 text-[11px] text-muted-foreground">
                          {formatMinutes(startMin)} - {formatMinutes(endMin)}
                        </p>
                        <p className="line-clamp-1 text-[11px] text-muted-foreground">
                          {task.plan_title || task.learning_plan_title || "Horizon mission path"}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono-ui text-[10px]">
                        {task.status === "in_progress"
                          ? "In Progress"
                          : task.status === "overdue"
                            ? "Overdue"
                            : "Scheduled"}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground">
              No missions scheduled for today.
            </div>
          )}
        </div>
      ) : view === "month" ? (
        <div className="grid min-h-0 flex-1 grid-cols-7 gap-1 overflow-auto rounded-lg border border-border/80 bg-[color:var(--surface-2)] p-1.5">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="px-2 py-1 text-[10px] font-mono-ui text-muted-foreground">{day}</div>
          ))}
          {buildMonthGrid(anchorDate).map((cellDate) => {
            const key = toIsoDate(cellDate);
            const dayTasks = tasksByDate.get(key) ?? [];
            const inMonth = cellDate.getMonth() === anchorDate.getMonth();
            return (
              <div key={key} className={`min-h-[6.2rem] rounded-md border p-1.5 ${inMonth ? "border-border bg-background" : "border-border/50 bg-muted/30"}`}>
                <div className="mb-1 flex items-center justify-between">
                  <span className={`font-mono-ui text-[10px] ${inMonth ? "text-foreground" : "text-muted-foreground"}`}>{cellDate.getDate()}</span>
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      onClick={() => onOpenTask(task)}
                      className="w-full truncate rounded-sm border border-[color:var(--brand-indigo)]/35 bg-[color:var(--brand-indigo)]/12 px-1.5 py-0.5 text-left text-[10px]"
                    >
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 ? (
                    <p className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/80 bg-[color:var(--surface-2)]">
          <div
            className={`grid ${view === "day" ? "min-w-0" : "min-w-[620px]"}`}
            style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <div className="sticky top-0 z-20 border-r border-border bg-[color:var(--surface-2)] py-2" />
            {days.map((day) => (
              <div key={toIsoDate(day)} className="sticky top-0 z-20 border-b border-l border-border bg-[color:var(--surface-2)] px-2 py-2">
                <p className="text-[10px] font-mono-ui text-muted-foreground">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </p>
                <p className="text-xs font-semibold">{day.getDate()}</p>
              </div>
            ))}

            <div className="relative border-r border-border" style={{ height: `${bodyHeight}px` }}>
              {Array.from({ length: dayEnd - dayStart + 1 }, (_, i) => i)
                .filter((m) => m % 60 === 0)
                .map((m) => (
                  <div key={m} className="absolute right-1 text-[10px] text-muted-foreground" style={{ top: `${m * pxPerMinute - 6}px` }}>
                    {formatMinutes(dayStart + m)}
                  </div>
                ))}
            </div>

            {days.map((day) => {
              const key = toIsoDate(day);
              const dayTasks = tasksByDate.get(key) ?? [];
              return (
                <div key={key} className="relative border-l border-border" style={{ height: `${bodyHeight}px` }}>
                  {Array.from({ length: dayEnd - dayStart + 1 }, (_, i) => i)
                    .filter((m) => m % 30 === 0)
                    .map((m) => (
                      <div
                        key={m}
                        className={`absolute inset-x-0 ${m % 60 === 0 ? "border-t border-border/70" : "border-t border-border/35"}`}
                        style={{ top: `${m * pxPerMinute}px` }}
                      />
                    ))}
                  {dayTasks.map((task, idx) => {
                    const startMin = Math.max(dayStart, parseTaskStartMinutes(task, idx));
                    const duration = Math.max(30, task.estimated_duration_minutes || task.estimated_duration || 45);
                    const endMin = Math.min(dayEnd, startMin + duration);
                    const top = (startMin - dayStart) * pxPerMinute;
                    const height = Math.max(26, (endMin - startMin) * pxPerMinute);
                    const tone =
                      task.status === "overdue"
                        ? "border-[color:var(--cta)]/40 bg-[color:var(--cta)]/14"
                        : task.status === "in_progress"
                          ? "border-[color:var(--brand-indigo)]/40 bg-[color:var(--brand-indigo)]/16"
                          : "border-border bg-background";
                    return (
                      <button
                        key={task.id}
                        onClick={() => onOpenTask(task)}
                        className={`absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1 text-left ${tone}`}
                        style={{ top, height }}
                      >
                        <p className="truncate text-[11px] font-semibold">{task.title}</p>
                        <p className="font-mono-ui truncate text-[10px] text-muted-foreground">
                          {formatMinutes(startMin)} - {formatMinutes(endMin)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const canQuery = !authLoading && !!user;

  const { data: homeData } = useHomeDashboard({ enabled: canQuery });
  const { data: gamificationData } = useGamificationSummary({ enabled: canQuery });
  const { data: flowData } = useFlowSuggestion("dashboard", { enabled: canQuery });

  const [todaysTasksData, setTodaysTasksData] = useState<TodaysTasksData | null>(null);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [mentorPrompt, setMentorPrompt] = useState("");
  const [mentorLoading, setMentorLoading] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>("day");
  const [calendarAnchorDate, setCalendarAnchorDate] = useState<Date>(() => new Date());
  const [calendarTasks, setCalendarTasks] = useState<DashboardTask[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!canQuery) return;
    let mounted = true;

    import("@/lib/api")
      .then(({ planningApi }) => planningApi.getTodaysTasks())
      .then((data) => {
        if (!mounted) return;
        setTodaysTasksData(data);
        setTasksLoading(false);
      })
      .catch((error) => {
        telemetry.warn("Dashboard: failed to load planning tasks", { error });
        if (!mounted) return;
        setTasksLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [canQuery]);

  useEffect(() => {
    if (!canQuery) return;
    let mounted = true;
    setCalendarLoading(true);
    planningApi
      .getCalendarTasks({
        view: calendarView,
        anchor_date: toIsoDate(calendarAnchorDate),
      })
      .then((data) => {
        if (!mounted) return;
        setCalendarTasks((data.tasks ?? []) as unknown as DashboardTask[]);
      })
      .catch((error) => {
        telemetry.warn("Dashboard: failed to load calendar tasks", { error });
        if (!mounted) return;
        setCalendarTasks([]);
      })
      .finally(() => {
        if (mounted) setCalendarLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [calendarAnchorDate, calendarView, canQuery]);

  const profile = gamificationData?.profile;
  const currentLevel = profile?.level ?? 1;
  const totalXP = profile?.total_points ?? 0;
  const xpProgress = profile?.level_progress ?? 0;
  const xpNeeded = profile?.xp_for_next_level ?? 100;
  const progressPercent = profile?.level_progress_percentage ?? 0;
  const currentStreak = profile?.current_streak ?? 0;
  const badgeCount = gamificationData?.badge_count ?? 0;

  const allTasks = todaysTasksData?.tasks ?? [];

  const statusCounts = useMemo(() => {
    const active = allTasks.filter((task) => ["scheduled", "in_progress"].includes(task.status)).length;
    const overdue = allTasks.filter((task) => task.status === "overdue").length;
    const scheduled = allTasks.filter((task) => task.status === "scheduled").length;
    return { active, overdue, scheduled };
  }, [allTasks]);

  const focusTasks = useMemo<FocusTask[]>(() => {
    const fromHome = [homeData?.today_task, ...(homeData?.additional_tasks ?? [])]
      .filter(Boolean)
      .map((task) => ({
        id: task!.id,
        title: task!.title,
        planTitle: task!.plan_title,
        duration: task!.estimated_duration_minutes ?? task!.estimated_duration,
        tag: task!.time_tag,
        planId: task!.plan_id,
        scheduledTime: null,
      }));

    if (fromHome.length) return fromHome.slice(0, 5);

    return allTasks
      .filter((task) => ["scheduled", "in_progress"].includes(task.status))
      .slice(0, 5)
      .map((task) => ({
        id: task.id,
        title: task.title,
        planTitle: task.plan_title,
        duration: task.estimated_duration_minutes ?? task.estimated_duration,
        tag: task.status === "in_progress" ? "In Progress" : "Scheduled",
        planId: task.plan_id,
        scheduledTime: task.scheduled_time,
      }));
  }, [allTasks, homeData?.additional_tasks, homeData?.today_task]);

  const miniSeriesA = useMemo(() => {
    const base = Math.max(1, homeData?.weekly_stats?.tasks_completed ?? 1);
    return [30, 48, 40, 58, 52, 64, 70].map((value, idx) =>
      Math.max(14, Math.min(92, value + (base % 7) * (idx % 2 === 0 ? 1 : -1))),
    );
  }, [homeData?.weekly_stats?.tasks_completed]);

  const miniSeriesB = useMemo(() => {
    const base = Math.max(1, currentStreak);
    return [24, 30, 42, 36, 50, 62, 54].map((value, idx) =>
      Math.max(12, Math.min(92, value + (base % 5) * (idx % 3 === 0 ? 2 : -1))),
    );
  }, [currentStreak]);

  const miniSeriesC = useMemo(() => {
    const base = Math.max(1, badgeCount);
    return [18, 22, 30, 28, 34, 46, 42].map((value, idx) =>
      Math.max(12, Math.min(90, value + (base % 4) * (idx % 2 === 0 ? 3 : 1))),
    );
  }, [badgeCount]);

  const isLoading = authLoading || tasksLoading;
  const isCalendarExpanded = calendarView !== "day";
  const momentumHeadline =
    flowData?.suggestion?.title ?? "Pick one mission and close it with intent.";

  const openTask = (task: FocusTask) => {
    if (task.planId) {
      router.push(`/plans/${task.planId}/playground?task=${task.id}`);
      return;
    }
    router.push("/plans");
  };

  const openCalendarTask = (task: DashboardTask) => {
    const planId = task.plan_id || task.learning_plan;
    if (planId) {
      router.push(`/plans/${planId}/playground?task=${task.id}`);
      return;
    }
    router.push("/plans");
  };

  const startMentor = async () => {
    const content = mentorPrompt.trim();
    if (!content || mentorLoading) return;

    setMentorLoading(true);
    try {
      const conversation = await chatApi.createConversation({
        title: "Horizon Mentor Session",
        topic: "Dashboard planning",
      });

      await chatApi.sendMessage(conversation.id, {
        content,
        context: "dashboard",
        metadata: { source: "dashboard_quickstart" },
      });

      telemetry.track("dashboard_mentor_quickstart", {
        prompt_length: content.length,
      });

      setMentorPrompt("");
      router.push(`/chat?conversation=${conversation.id}&context=dashboard`);
    } catch (error) {
      telemetry.toastError(
        "Could not start mentor session",
        "Please try again in a few seconds.",
      );
      telemetry.error("Dashboard mentor quickstart failed", { error });
    } finally {
      setMentorLoading(false);
    }
  };

  return (
    <div className="h-full min-h-0 w-full overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1720px] flex-col gap-4 bg-background px-3 py-3 xl:px-5">
        <header className="flex shrink-0 items-center justify-between rounded-2xl border border-border/80 bg-[color:var(--surface)] px-4 py-3">
          <div>
            <p className="font-display text-2xl leading-tight">
              Good morning{user?.first_name ? `, ${user.first_name}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">{momentumHeadline}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="cta"
              size="sm"
              className="h-8 px-3 font-mono-ui text-[11px]"
              onClick={() => {
                if (focusTasks[0]) {
                  openTask(focusTasks[0]);
                  return;
                }
                router.push("/plans");
              }}
            >
              Continue Mission
            </Button>
            <Button
              variant="accent"
              size="sm"
              className="h-8 px-3 font-mono-ui text-[11px]"
              onClick={() => router.push("/chat?context=dashboard")}
            >
              Ask Mentor
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 font-mono-ui text-[11px]"
              onClick={() => router.push("/plans")}
            >
              View Plans
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)_minmax(0,1fr)] xl:grid-rows-[auto_minmax(0,1fr)]">
          <section className="grid min-h-0 content-start gap-4 overflow-y-auto pr-1 xl:col-start-1 xl:row-start-1 xl:row-span-2 xl:grid-rows-[auto_repeat(3,minmax(0,1fr))] xl:overflow-hidden">
            <div className={`${SHELL} p-4`}>
              <p className="font-display text-base">Today&apos;s Focus</p>
              <p className="mt-1 line-clamp-2 text-sm font-medium">
                {focusTasks[0]?.title || "No mission selected yet."}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                {focusTasks[0]?.planTitle || momentumHeadline}
              </p>
              <div className="mt-3">
                {focusTasks[0] ? (
                  <Button
                    variant="cta"
                    size="sm"
                    className="h-8 px-3 font-mono-ui text-[11px]"
                    onClick={() => openTask(focusTasks[0])}
                  >
                    Start Current Mission
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 font-mono-ui text-[11px]"
                    onClick={() => router.push("/plans")}
                  >
                    Open Plan Workspace
                  </Button>
                )}
              </div>
            </div>

            <MiniChartTile
              label="Missions Running"
              value={String(statusCounts.active)}
              caption="Active right now"
              color="indigo"
              series={miniSeriesA}
            />
            <MiniChartTile
              label="Queued Today"
              value={String(statusCounts.scheduled)}
              caption="Ready to start"
              color="neutral"
              series={miniSeriesB}
            />
            <MiniChartTile
              label="Needs Recovery"
              value={String(statusCounts.overdue)}
              caption="Behind schedule"
              color="orange"
              series={miniSeriesC}
            />
          </section>

          <section className="grid min-h-0 content-start gap-4 overflow-hidden xl:col-start-2 xl:row-start-1">
            <div className={`${SHELL} p-3`}>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border/80 bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Level</p>
                  <p className="font-mono-ui mt-1 text-xl font-semibold">L{currentLevel}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Total XP</p>
                  <p className="font-mono-ui mt-1 text-xl font-semibold">{totalXP.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Signals</p>
                  <p className="font-mono-ui mt-1 text-xl font-semibold">{statusCounts.active + statusCounts.scheduled}</p>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-border/80 bg-background p-3">
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Level progress</span>
                  <span className="font-mono-ui">{xpProgress}/{xpNeeded}</span>
                </div>
                <ProgressBar value={progressPercent} />
              </div>
            </div>
          </section>

          <section className="min-h-0 xl:col-start-3 xl:row-start-1">
            <div
              className={`flex h-full min-h-0 rounded-2xl border border-[color:var(--brand-indigo)]/25 bg-gradient-to-b from-[color:var(--brand-indigo)]/20 via-[color:var(--brand-indigo)]/14 to-[color:var(--surface)] p-4 shadow-[var(--shadow-1)] transition-all duration-300 ${
                isCalendarExpanded ? "flex-row items-center" : "flex-col"
              }`}
            >
              {isCalendarExpanded ? (
                <div className="flex h-full min-h-0 flex-1 flex-row items-center gap-4">
                  <div className="min-w-[7.5rem] shrink-0">
                    <MentorOrb active={mentorLoading} />
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-lg">Horizon Mentor</p>
                      <Badge
                        variant="outline"
                        className="font-mono-ui border-[color:var(--brand-indigo)]/40 text-[color:var(--brand-indigo)] text-[10px]"
                      >
                        Live
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium">
                      What should we work on next?
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 bg-background/70">
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="icon"
                        className="h-9 w-9 rounded-full bg-foreground text-background"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 bg-background/70">
                        <BrainCircuit className="h-4 w-4" />
                      </Button>
                      <div className="ml-2 min-w-0 flex-1">
                        <Input
                          value={mentorPrompt}
                          onChange={(event) => setMentorPrompt(event.target.value)}
                          placeholder="Ask Mentor..."
                          className="font-mono-ui bg-background"
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void startMentor();
                            }
                          }}
                        />
                      </div>
                      <Button
                        variant="cta"
                        className="px-3"
                        onClick={() => void startMentor()}
                        disabled={mentorLoading || !mentorPrompt.trim()}
                      >
                        {mentorLoading ? "Starting..." : "Start"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              {!isCalendarExpanded ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-lg">Horizon Mentor</p>
                    <Badge
                      variant="outline"
                      className="font-mono-ui border-[color:var(--brand-indigo)]/40 text-[color:var(--brand-indigo)] text-[10px]"
                    >
                      Live
                    </Badge>
                  </div>

                  <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-xl border border-[color:var(--brand-indigo)]/25 bg-[color:var(--brand-indigo)]/16 p-4">
                    <MentorOrb active={mentorLoading} />
                    <p className="mt-2 text-center text-sm font-medium">
                      What should we work on next?
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 bg-background/70">
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="icon"
                        className="h-9 w-9 rounded-full bg-foreground text-background"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 bg-background/70">
                        <BrainCircuit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <Input
                      value={mentorPrompt}
                      onChange={(event) => setMentorPrompt(event.target.value)}
                      placeholder="Ask Mentor..."
                      className="font-mono-ui bg-background"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void startMentor();
                        }
                      }}
                    />
                    <Button
                      variant="cta"
                      onClick={() => void startMentor()}
                      disabled={mentorLoading || !mentorPrompt.trim()}
                    >
                      {mentorLoading ? "Starting session..." : "Start mentor session"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {!isCalendarExpanded ? (
            <section className="min-h-0 overflow-hidden xl:col-start-2 xl:row-start-2">
              <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
                <div className={`${SHELL} p-3`}>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-display text-base">Today&apos;s Mission Queue</p>
                    <p className="text-[11px] text-muted-foreground">
                      Execute one mission at a time with clear intent.
                    </p>
                  </div>
                  <Button
                    variant="accent"
                    size="sm"
                    className="h-8 font-mono-ui text-[11px]"
                    onClick={() => router.push("/chat?context=dashboard")}
                  >
                    Open Mentor
                  </Button>
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  {isLoading ? (
                    [1, 2, 3].map((item) => (
                      <div key={item} className="h-16 animate-pulse rounded-lg bg-muted" />
                    ))
                  ) : focusTasks.length ? (
                    <>
                      <article className="rounded-lg border border-[color:var(--brand-indigo)]/35 bg-[color:var(--brand-indigo)]/10 p-3 lg:col-span-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-semibold">
                              {focusTasks[0].title}
                            </p>
                            <p className="font-mono-ui line-clamp-1 text-[11px] text-muted-foreground">
                              {focusTasks[0].planTitle || "Horizon mission path"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="accent"
                            className="h-8 px-3 text-[11px]"
                            onClick={() => openTask(focusTasks[0])}
                          >
                            Start now
                          </Button>
                        </div>
                      </article>
                      {focusTasks.slice(1, 3).map((task) => (
                        <article key={task.id} className="rounded-lg border border-border bg-background p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="line-clamp-1 text-xs font-semibold">{task.title}</p>
                              <p className="font-mono-ui line-clamp-1 text-[10px] text-muted-foreground">
                                {task.planTitle || "Horizon mission path"}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-[11px]"
                              onClick={() => openTask(task)}
                            >
                              Open
                            </Button>
                          </div>
                        </article>
                      ))}
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-background p-4 text-xs text-muted-foreground lg:col-span-2">
                      No missions queued. Ask Mentor to generate your next focused mission.
                    </div>
                  )}
                </div>
              </div>
                <div className={`${SHELL} min-h-0 p-3`}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-display text-base">Mentor Brief</p>
                    <Badge variant="outline" className="font-mono-ui text-[10px]">
                      Live
                    </Badge>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-background p-2.5">
                    <p className="text-[11px] text-muted-foreground">
                      Recommended next move
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {flowData?.suggestion?.description ||
                        "Run one focused mission block, then close with a short reflection in Mentor."}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        variant="accent"
                        size="sm"
                        className="h-8 px-3 font-mono-ui text-[11px]"
                        onClick={() => router.push("/chat?context=dashboard")}
                      >
                        Open Mentor
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 font-mono-ui text-[11px]"
                        onClick={() => router.push("/plans")}
                      >
                        Open Plans
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section
            className={`min-h-0 transition-all duration-300 ${
              isCalendarExpanded
                ? "xl:col-start-2 xl:col-span-2 xl:row-start-2"
                : "xl:col-start-3 xl:col-span-1 xl:row-start-2"
            }`}
          >
            <div className="h-full min-h-0">
              {calendarLoading ? (
                <div className="flex h-full min-h-[18rem] items-center justify-center rounded-2xl border border-border bg-background text-sm text-muted-foreground">
                  Loading calendar...
                </div>
              ) : (
                <CalendarBoard
                  tasks={calendarTasks}
                  view={calendarView}
                  anchorDate={calendarAnchorDate}
                  onViewChange={setCalendarView}
                  onAnchorDateChange={setCalendarAnchorDate}
                  onOpenTask={openCalendarTask}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
