"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  MessageSquare,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Zap,
  TrendingUp,
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  CircleUser,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useFlowSuggestion } from "@/hooks/use-flow-suggestion";
import { useGamificationSummary } from "@/hooks/use-gamification";
import { useHomeDashboard } from "@/hooks/use-home-dashboard";
import { useMirrorSnapshot } from "@/hooks/use-mirror-snapshot";
import { chatApi, planningApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MoodSensor, BackgroundTaskMonitor } from "./DashboardWidgets";
import { FlowStarter } from "@/components/dashboard/flow-starter";
import { useNotificationsSocket } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import type { LearningPlan, TodayTask, ActivityItem } from "@/types";

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function toTitleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function pluralise(n: number, word: string) {
  return `${n} ${word}${n !== 1 ? "s" : ""}`;
}

function relativeDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return `in ${diff}d`;
}

// ─── Skeleton loading state ───────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-4 px-3 py-3 pb-24 xl:px-5">
      <Skeleton className="h-14 w-full rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Focus task card ──────────────────────────────────────────────────────────

function FocusCard({
  task,
  onStart,
}: {
  task: TodayTask;
  onStart: () => void;
}) {
  const isOverdue = task.is_overdue;
  const durationLabel =
    task.estimated_duration != null ? `${task.estimated_duration} min` : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-1)] sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {isOverdue ? "Overdue · do this first" : "Up next"}
          </p>
          <h2 className="mt-1.5 text-lg font-semibold leading-snug line-clamp-2">
            {task.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
            {task.plan_title}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "hidden shrink-0 text-[10px] font-mono sm:inline-flex",
            isOverdue
              ? "border-[color:var(--brand-indigo)]/40 bg-[color:var(--brand-indigo)]/10 text-[color:var(--brand-indigo)]"
              : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
          )}
        >
          {isOverdue ? "Overdue" : task.time_tag}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={onStart}
          className="flex-1 gap-2 h-10"
          variant="cta"
          size="sm"
        >
          <Play className="h-4 w-4" />
          Start session
        </Button>
        {durationLabel && (
          <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
            <Clock className="h-3.5 w-3.5" />
            {durationLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Empty / onboarding state ─────────────────────────────────────────────────

function OnboardingNudge({ onCreatePlan }: { onCreatePlan: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--brand-indigo)]/40 bg-[color:var(--brand-indigo)]/5 p-6">
      <div className="mb-2 flex items-center gap-2.5">
        <LayoutDashboard className="h-5 w-5 text-[color:var(--brand-indigo)]" />
        <p className="text-base font-semibold">No learning plan yet</p>
      </div>
      <p className="mb-5 text-sm text-muted-foreground leading-relaxed">
        Your mentor can build a personalised plan from your goals and resume. It
        takes about 2 minutes to get started.
      </p>
      <Button
        size="default"
        variant="cta"
        onClick={onCreatePlan}
        className="gap-2 w-full h-10"
      >
        <Sparkles className="h-4 w-4" />
        Create my learning plan
      </Button>
    </div>
  );
}

// ─── Plan progress panel ──────────────────────────────────────────────────────

function PlanProgress({
  plan,
  upcomingTasks,
  onOpenTask,
}: {
  plan: LearningPlan;
  upcomingTasks: TodayTask[];
  onOpenTask: (t: TodayTask) => void;
}) {
  const pct = Math.round(plan.progress_percentage ?? 0);
  const weeksLeft = plan.estimated_duration_weeks
    ? Math.max(
        0,
        plan.estimated_duration_weeks -
          Math.floor((pct / 100) * plan.estimated_duration_weeks),
      )
    : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-1)] sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Plan progress
        </p>
        <span className="font-mono text-sm font-bold text-foreground">
          {pct}%
        </span>
      </div>

      <Progress value={pct} className="h-2 mb-3" />

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <span className="min-w-0 flex-1 truncate font-medium text-foreground/80">
          {plan.title}
        </span>
        {weeksLeft !== null && (
          <span className="shrink-0 whitespace-nowrap">
            {weeksLeft > 0
              ? `~${pluralise(weeksLeft, "week")} left`
              : "Final stretch"}
          </span>
        )}
      </div>

      {upcomingTasks.length > 0 && (
        <div className="space-y-2">
          {upcomingTasks.slice(0, 4).map((t) => (
            <button
              key={t.id}
              onClick={() => onOpenTask(t)}
              className="flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
            >
              <div className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--brand-indigo)]/50" />
              <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {relativeDate(t.scheduled_date)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stat strip ───────────────────────────────────────────────────────────────

function StatStrip({
  tasksCompleted,
  xpEarned,
  streak,
  dueCardCount,
  onReview,
}: {
  tasksCompleted: number;
  xpEarned: number;
  streak: number;
  dueCardCount: number;
  onReview: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-5 shadow-[var(--shadow-1)]">
        <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-500" />
        <span className="font-mono text-xl font-bold leading-none sm:text-2xl">
          {tasksCompleted}
        </span>
        <span className="mt-1.5 text-xs text-muted-foreground">this week</span>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-5 shadow-[var(--shadow-1)]">
        <Zap className="mb-2 h-5 w-5 text-amber-500" />
        <span className="font-mono text-xl font-bold leading-none sm:text-2xl">
          {xpEarned}
        </span>
        <span className="mt-1.5 text-xs text-muted-foreground">XP earned</span>
      </div>
      <button
        onClick={streak > 0 ? undefined : onReview}
        className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-5 shadow-[var(--shadow-1)] transition-colors hover:bg-muted/30"
      >
        <Flame
          className={cn(
            "mb-2 h-5 w-5",
            streak > 0 ? "text-orange-500" : "text-muted-foreground",
          )}
        />
        <span className="font-mono text-xl font-bold leading-none sm:text-2xl">
          {streak}
        </span>
        <span className="mt-1.5 text-xs text-muted-foreground">day streak</span>
      </button>
      {dueCardCount > 0 && (
        <button
          onClick={onReview}
          className="col-span-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left transition-colors hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-950/30"
        >
          <BookOpen className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              {dueCardCount} card{dueCardCount !== 1 ? "s" : ""} due for review
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              ~{Math.max(1, Math.round(dueCardCount * 0.4))} min · spaced
              repetition
            </p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        </button>
      )}
    </div>
  );
}

// ─── Mentor card ──────────────────────────────────────────────────────────────

function MentorCard({
  nudge,
  focusTask,
  mentorName,
  onChat,
  onStart,
  onPlans,
}: {
  nudge: string;
  focusTask: TodayTask | null;
  mentorName: string;
  onChat: (prompt: string) => void;
  onStart: () => void;
  onPlans: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const text = prompt.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onChat(text);
    } finally {
      setSending(false);
      setPrompt("");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--brand-indigo)]/25 bg-gradient-to-b from-[color:var(--brand-indigo)]/10 to-card p-4 shadow-[var(--shadow-1)] sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--brand-indigo)]/15 ring-1 ring-[color:var(--brand-indigo)]/20">
          <CircleUser className="h-5 w-5 text-[color:var(--brand-indigo)]" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold leading-tight">{mentorName}</p>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
      </div>

      {/* Nudge */}
      <p className="mb-5 text-sm leading-relaxed text-foreground/80 border-l-2 border-[color:var(--brand-indigo)]/30 pl-3">
        {nudge}
      </p>

      {/* Context line */}
      {focusTask && (
        <p className="mb-4 text-xs text-muted-foreground">
          Active focus:{" "}
          <span className="font-medium text-foreground/80 line-clamp-1">
            {focusTask.title}
          </span>
        </p>
      )}

      {/* Quick-ask input */}
      <div className="flex min-w-0 gap-2 mb-4">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Ask your mentor anything…"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-[color:var(--brand-indigo)]/40"
        />
        <Button
          size="sm"
          variant="cta"
          disabled={!prompt.trim() || sending}
          onClick={() => void handleSend()}
          className="shrink-0 px-3 h-10"
        >
          {sending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onChat("")}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background/70 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>
        <button
          onClick={onStart}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-[color:var(--brand-indigo)]/30 bg-[color:var(--brand-indigo)]/10 py-3 text-xs text-[color:var(--brand-indigo)] transition-colors hover:bg-[color:var(--brand-indigo)]/20"
        >
          <Play className="h-4 w-4" />
          Start task
        </button>
        <button
          onClick={onPlans}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background/70 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <MapPin className="h-4 w-4" />
          My plans
        </button>
      </div>
    </div>
  );
}

// ─── VELO signal card ─────────────────────────────────────────────────────────

function VeloSignalCard({
  atsScore,
  topGap,
  onOpenVelo,
}: {
  atsScore: number | undefined;
  topGap: string | undefined;
  onOpenVelo: () => void;
}) {
  if (atsScore === undefined && !topGap) {
    return (
      <button
        onClick={onOpenVelo}
        className="flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-border bg-card px-4 py-4 text-left sm:px-5 sm:py-5 transition-colors hover:bg-muted/30 shadow-[var(--shadow-1)]"
      >
        <ShieldCheck className="h-6 w-6 shrink-0 text-muted-foreground/60" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground/80">
            VELO not yet run
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload your resume to see ATS score &amp; skill gaps
          </p>
        </div>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/50" />
      </button>
    );
  }

  const scoreColor =
    atsScore === undefined
      ? "text-muted-foreground"
      : atsScore >= 75
        ? "text-emerald-600 dark:text-emerald-400"
        : atsScore >= 55
          ? "text-amber-600 dark:text-amber-400"
          : "text-rose-600 dark:text-rose-400";

  const scoreLabel =
    atsScore === undefined
      ? "—"
      : atsScore >= 75
        ? "Strong"
        : atsScore >= 55
          ? "Fair"
          : "Needs work";

  return (
    <button
      onClick={onOpenVelo}
      className="flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 text-left sm:px-5 sm:py-5 transition-colors hover:bg-muted/30 shadow-[var(--shadow-1)]"
    >
      <div className="flex shrink-0 flex-col items-center">
        {atsScore !== undefined ? (
          <>
            <span
              className={cn(
                "font-mono text-3xl font-bold leading-none",
                scoreColor,
              )}
            >
              {atsScore}
            </span>
            <span className={cn("text-xs font-medium mt-1", scoreColor)}>
              {scoreLabel}
            </span>
          </>
        ) : (
          <ShieldCheck className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">ATS Hiring Signal</p>
        {topGap && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
            Top gap: <span className="text-foreground/80">{topGap}</span>
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
    </button>
  );
}

// ─── Activity feed ────────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  task_completed: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  badge_earned: <Zap className="h-3.5 w-3.5 text-amber-500" />,
  artifact_created: (
    <TrendingUp className="h-3.5 w-3.5 text-[color:var(--brand-indigo)]" />
  ),
};

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items.length) {
    return (
      <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 shadow-[var(--shadow-1)] sm:px-5 sm:py-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Recent activity
        </p>
        <p className="text-sm text-muted-foreground">
          No activity yet — complete a task to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 shadow-[var(--shadow-1)] sm:px-5 sm:py-5">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Recent activity
      </p>
      <div className="space-y-3.5">
        {items.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {ACTIVITY_ICONS[item.type] ?? (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug line-clamp-1">{item.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {new Date(item.timestamp).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Today's task list (calendar-lite) ───────────────────────────────────────

function TodayList({
  tasks,
  onOpen,
}: {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    plan_id?: string;
    scheduled_time?: string | null;
    estimated_duration_minutes?: number;
    estimated_duration?: number;
    plan_title?: string;
  }>;
  onOpen: (id: string, planId?: string) => void;
}) {
  if (!tasks.length) {
    return (
      <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 shadow-[var(--shadow-1)] sm:px-5 sm:py-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Today
        </p>
        <p className="text-sm text-muted-foreground">
          No sessions scheduled for today.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 shadow-[var(--shadow-1)] sm:px-5 sm:py-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Today
        </p>
        <Badge variant="outline" className="font-mono text-xs">
          {tasks.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {tasks.map((t) => {
          const isActive = t.status === "in_progress";
          const isOverdue = t.status === "overdue";
          return (
            <button
              key={t.id}
              onClick={() => onOpen(t.id, t.plan_id)}
              className={cn(
                "flex w-full min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2.5 text-left transition-colors hover:bg-muted/30 sm:gap-3 sm:px-3 sm:py-3",
                isActive
                  ? "border-[color:var(--brand-indigo)]/40 bg-[color:var(--brand-indigo)]/8"
                  : isOverdue
                    ? "border-[color:var(--brand-indigo)]/30 bg-[color:var(--brand-indigo)]/5"
                    : "border-border bg-background",
              )}
            >
              <div
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  isActive
                    ? "bg-[color:var(--brand-indigo)] animate-pulse"
                    : isOverdue
                      ? "bg-[color:var(--brand-indigo)]/60"
                      : "bg-muted-foreground/30",
                )}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {t.title}
              </span>
              {(t.estimated_duration_minutes ?? t.estimated_duration) && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t.estimated_duration_minutes ?? t.estimated_duration}m
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const canQuery = !authLoading && !!user;

  const { data: homeData, isLoading: homeLoading } = useHomeDashboard({
    enabled: canQuery,
  });
  const { data: gamificationData } = useGamificationSummary({
    enabled: canQuery,
  });
  const { data: flowData } = useFlowSuggestion("dashboard", {
    enabled: canQuery,
  });
  const { data: mirrorData } = useMirrorSnapshot();
  const { analysisEvents } = useNotificationsSocket();

  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [todayTasksRaw, setTodayTasksRaw] = useState<
    Array<{
      id: string;
      title: string;
      status: string;
      plan_id?: string;
      scheduled_time?: string | null;
      estimated_duration_minutes?: number;
      estimated_duration?: number;
      plan_title?: string;
    }>
  >([]);
  const [dueCardCount, setDueCardCount] = useState(0);
  const [mentorSending, setMentorSending] = useState(false);
  const [flowSuggestionShownAt] = useState(() => new Date());

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!canQuery) return;
    planningApi
      .listPlans()
      .then(setPlans)
      .catch(() => {});
    planningApi
      .getTodaysTasks()
      .then((d) => setTodayTasksRaw((d.tasks ?? []) as typeof todayTasksRaw))
      .catch(() => {});
    planningApi
      .getSpacedRepetitionDue({ limit: 0 })
      .then(({ count }) => setDueCardCount(count))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canQuery]);

  // Derived data
  const activePlan = useMemo(
    () => plans.find((p) => p.status === "active") ?? plans[0] ?? null,
    [plans],
  );

  const focusTask = homeData?.today_task ?? null;
  const additionalTasks = homeData?.additional_tasks ?? [];
  const streak = homeData?.streak;
  const weekly = homeData?.weekly_stats;
  const activity = homeData?.recent_activity ?? [];

  const upcomingTasks = useMemo(
    () => [focusTask, ...additionalTasks].filter(Boolean) as TodayTask[],
    [focusTask, additionalTasks],
  );

  const profile = gamificationData?.profile;
  const currentStreak = streak?.current ?? profile?.current_streak ?? 0;

  const nudge =
    flowData?.suggestion?.title ??
    (focusTask
      ? `Your next step is "${focusTask.title}" — let's close it today.`
      : "Your mentor is ready. Pick a goal and let's build a plan.");

  const mentorPersona =
    activePlan?.specialized_mentor_data?.name ??
    activePlan?.specialized_mentor?.name ??
    "Aria";

  const deep = mirrorData?.mirror?.deep_analysis;
  const atsScore = deep?.ats_score;
  const topGap =
    deep?.skill_gap_details?.[0]?.skill ?? mirrorData?.mirror?.skill_gaps?.[0];

  const hasActivePlan = Boolean(activePlan);
  const isLoading = authLoading || homeLoading;

  // Handlers
  const openTask = (task: TodayTask) => {
    if (task.plan_id)
      router.push(`/plans/${task.plan_id}/playground?task=${task.id}`);
    else router.push("/plans");
  };

  const openTaskById = (id: string, planId?: string) => {
    if (planId) router.push(`/plans/${planId}/playground?task=${id}`);
    else router.push("/plans");
  };

  const handleMentorChat = async (prompt: string) => {
    if (mentorSending) return;
    setMentorSending(true);
    try {
      // Reuse the most recent conversation if one exists; create only when none do.
      const existing = await chatApi.listConversations();
      const existingId = existing?.[0]?.id;

      if (existingId) {
        if (prompt) {
          telemetry.track("dashboard_mentor_quickstart", { prompt_length: prompt.length });
          router.push(`/chat?conversation=${existingId}&message=${encodeURIComponent(prompt)}`);
        } else {
          router.push(`/chat?conversation=${existingId}`);
        }
        return;
      }

      const convo = await chatApi.createConversation({
        title: "Mentor session",
        topic: "Mentor quick-start",
      });
      if (prompt) {
        telemetry.track("dashboard_mentor_quickstart", { prompt_length: prompt.length });
        router.push(`/chat?conversation=${convo.id}&message=${encodeURIComponent(prompt)}`);
      } else {
        router.push(`/chat?conversation=${convo.id}`);
      }
    } catch {
      telemetry.toastError(
        "Could not start mentor session",
        "Please try again.",
      );
    } finally {
      setMentorSending(false);
    }
  };

  void mentorSending;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="h-full min-h-0 w-full overflow-x-hidden overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-[1720px] flex-col gap-4 bg-background px-3 py-4 pb-24 sm:px-4 xl:px-6">
        {/* ── Greeting ───────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold leading-tight sm:text-2xl lg:text-3xl">
              {timeOfDay()}{user?.first_name ? `, ${toTitleCase(user.first_name)}` : ""}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{nudge}</p>
          </div>
          
        </header>

        {/* ── Re-entry Banner ────────────────────────────────────────────── */}
        {(() => {
          const lastTs = activity[0]?.timestamp;
          if (!lastTs) return null;
          const daysSince = Math.floor((Date.now() - new Date(lastTs).getTime()) / 86_400_000);
          if (daysSince < 3) return null;
          return (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
              <span className="text-amber-800 dark:text-amber-300">
                Welcome back! It&apos;s been{" "}
                <strong>{daysSince} {daysSince === 1 ? "day" : "days"}</strong> since your last session. Ready to pick up where you left off?
              </span>
              <button
                onClick={() => focusTask ? openTask(focusTask) : router.push("/plans")}
                className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
              >
                Resume
              </button>
            </div>
          );
        })()}

        {/* ── Flow Suggestion ────────────────────────────────────────────── */}
        {flowData?.suggestion && (
          <FlowStarter suggestion={flowData.suggestion} shownAt={flowSuggestionShownAt} />
        )}

        {/* ── Responsive 3-column grid ───────────────────────────────────── */}
        {/* Mobile: single column · md: 2-col (col1+col2 / col3 stacks below) · xl: 3-col */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]">
          {/* ── Col 1: Focus + Progress + Stats + Monitor ──────────────── */}
          <section className="flex min-w-0 flex-col gap-4">
            {hasActivePlan && focusTask ? (
              <FocusCard task={focusTask} onStart={() => openTask(focusTask)} />
            ) : (
              <OnboardingNudge
                onCreatePlan={() => router.push("/chat?context=plan_create")}
              />
            )}

            {activePlan && (
              <PlanProgress
                plan={activePlan}
                upcomingTasks={upcomingTasks.slice(1)}
                onOpenTask={openTask}
              />
            )}

            <StatStrip
              tasksCompleted={weekly?.tasks_completed ?? 0}
              xpEarned={weekly?.xp_earned ?? 0}
              streak={currentStreak}
              dueCardCount={dueCardCount}
              onReview={() => router.push("/review")}
            />

            <BackgroundTaskMonitor analysisEvents={analysisEvents} />
          </section>

          {/* ── Col 2: Mentor + Mood ───────────────────────────────────── */}
          <section className="flex min-w-0 flex-col gap-4">
            <MentorCard
              nudge={nudge}
              focusTask={focusTask}
              mentorName={mentorPersona}
              onChat={handleMentorChat}
              onStart={() => {
                if (focusTask) openTask(focusTask);
                else router.push("/plans");
              }}
              onPlans={() => router.push("/plans")}
            />
            <MoodSensor />
          </section>

          {/* ── Col 3: VELO + Today + Activity · spans full width on md ── */}
          <section className="flex min-w-0 flex-col gap-4 md:col-span-2 xl:col-span-1">
            <VeloSignalCard
              atsScore={atsScore}
              topGap={topGap}
              onOpenVelo={() => router.push("/progress?tab=velo")}
            />
            {/* On md breakpoint, show Today + Activity side by side inside col-3 */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <TodayList tasks={todayTasksRaw} onOpen={openTaskById} />
              <ActivityFeed items={activity} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
