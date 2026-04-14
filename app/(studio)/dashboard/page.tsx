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
import { SkillRadarChart } from "@/components/intelligence/SkillRadarChart";
import { MentorInbox } from "@/components/intelligence/MentorInbox";
import { VeloTracker, XPQuests, TheCircleTeaser, BackgroundTaskMonitor, MoodSensor } from "./DashboardWidgets";
import { useNotificationsSocket } from "@/hooks/use-notifications";

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

function StatTile({
  label,
  value,
  caption,
  className,
}: {
  label: string;
  value: React.ReactNode;
  caption: string;
  className?: string;
}) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col rounded-xl border border-border/90 bg-background p-3.5 shadow-[var(--shadow-1)] ${className ?? ""}`}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="font-mono-ui mt-1 text-xl font-semibold">{value}</div>
      <p className="mt-1 text-[11px] text-muted-foreground">{caption}</p>
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
                    ? "border-[color:var(--brand-indigo)]/30 bg-[color:var(--surface-2)]"
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
                            ? "Backlog"
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
                        ? "border-[color:var(--brand-indigo)]/30 bg-[color:var(--surface-2)]"
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
  const { analysisEvents } = useNotificationsSocket();

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
          <div className="flex flex-wrap items-center justify-end gap-3">
            <VeloTracker />
            <div className="h-6 w-px bg-border my-auto hidden sm:block"></div>
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
          {/* ── Column 1: Identity & Action ───────────────────────────── */}
          <section className="grid min-h-0 content-start gap-4 overflow-y-auto pr-1 xl:col-start-1 xl:row-start-1 xl:row-span-2 xl:overflow-hidden">
            <TheCircleTeaser />
            <SkillRadarChart />
            <XPQuests />
            <BackgroundTaskMonitor analysisEvents={analysisEvents} />
          </section>

          {/* ── Column 2: Horizon Inbox + Mood ─────────────────────────── */}
          <section className="grid min-h-0 content-start gap-4 overflow-y-auto pr-1 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:overflow-hidden">
            <MentorInbox />
            <MoodSensor />
          </section>

          {/* ── Column 3: Mentor / Calendar ────────────────────────────── */}
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
