"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LearningPlan } from "@/types";

interface PlanIntelligencePanelProps {
  plan: LearningPlan;
  onSessionComplete?: (durationMinutes: number) => void;
}

export function PlanIntelligencePanel({
  plan,
  onSessionComplete,
}: PlanIntelligencePanelProps) {
  const [isTimerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isTimerRunning) {
      return;
    }
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isTimerRunning]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [elapsedSeconds]);

  const focusDuration = 25 * 60;
  const shortBreak = 5 * 60;
  const longBreak = 15 * 60;
  const [mode, setMode] = useState<"focus" | "break" | "long">("focus");
  const sessionDuration =
    mode === "focus"
      ? focusDuration
      : mode === "break"
        ? shortBreak
        : longBreak;
  const progressRatio = Math.min(1, elapsedSeconds / sessionDuration);
  const ringStyle = {
    background: `conic-gradient(from 180deg, #111827 ${progressRatio * 360}deg, #e5e7eb 0deg)`,
  } as const;
  const totalTasks =
    plan.daily_tasks_summary?.total ?? plan.daily_tasks?.length ?? 0;
  const completedTasks = plan.daily_tasks_summary?.completed ?? 0;
  const currentStreak = plan.progress_summary?.current_streak ?? 0;
  const bestStreak = plan.progress_summary?.best_streak ?? currentStreak;
  const timeInvestedMinutes = plan.progress_summary?.time_invested_minutes ?? 0;
  const hasRealProgress = Boolean(
    plan.progress_summary || plan.daily_tasks_summary,
  );

  return (
    <Card className="h-fit max-h-[calc(100vh-10rem)] overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[var(--shadow-2)] backdrop-blur">
      <CardHeader className="space-y-1 pb-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Learning cockpit
        </p>
        <CardTitle className="text-base">Stay in flow</CardTitle>
        <CardDescription className="text-xs">
          Focus sessions, streaks, and ambience in one place.
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          {plan.difficulty_level} · {plan.estimated_duration_weeks} weeks
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0">
        <section className="rounded-2xl border border-transparent bg-gradient-to-br from-slate-50 to-white p-3 shadow-[var(--shadow-1)] ring-1 ring-white/60">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Focus timer</span>
            <span className="uppercase tracking-wide">{mode}</span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="relative h-20 w-20 shrink-0">
              <div
                className="absolute inset-0 rounded-full p-1 shadow-inner"
                style={ringStyle}
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                  <div className="text-lg font-semibold text-slate-900">
                    {formattedTime}
                  </div>
                </div>
              </div>
              <div className="absolute -right-2 -top-2 h-3 w-3 animate-pulse rounded-full bg-emerald-400 shadow-sm" />
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="text-sm font-medium text-foreground">
                {isTimerRunning
                  ? "Deep focus in progress"
                  : "Ready when you are"}
              </p>
              <p>
                {mode === "focus"
                  ? "25 minute sprint, no distractions."
                  : "Quick recharge before the next round."}
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full mt-4">
            <Button
              // size=""
              variant={isTimerRunning ? "secondary" : "default"}
              className="w-1/2"
              onClick={() => {
                if (isTimerRunning && elapsedSeconds >= 60) {
                  onSessionComplete?.(Math.round(elapsedSeconds / 60));
                }
                setTimerRunning((prev) => !prev);
              }}
            >
              {isTimerRunning ? "Pause" : "Start"}
            </Button>
            <Button
              // size=""
              variant="outline"
              className="w-1/2"
              onClick={() => setElapsedSeconds(0)}
            >
              Reset
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              className={`rounded-lg border px-2 py-1 text-center font-medium ${
                mode === "focus"
                  ? "border-primary bg-primary/10 text-primary"
                  : "bg-white"
              }`}
              onClick={() => {
                setMode("focus");
                setElapsedSeconds(0);
                setTimerRunning(false);
              }}
            >
              Focus 25
            </button>
            <button
              type="button"
              className={`rounded-lg border px-2 py-1 text-center font-medium ${
                mode === "break"
                  ? "border-primary bg-primary/10 text-primary"
                  : "bg-white"
              }`}
              onClick={() => {
                setMode("break");
                setElapsedSeconds(0);
                setTimerRunning(false);
              }}
            >
              Break 5
            </button>
            <button
              type="button"
              className={`rounded-lg border px-2 py-1 text-center font-medium ${
                mode === "long"
                  ? "border-primary bg-primary/10 text-primary"
                  : "bg-white"
              }`}
              onClick={() => {
                setMode("long");
                setElapsedSeconds(0);
                setTimerRunning(false);
              }}
            >
              Long 15
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-transparent bg-gradient-to-br from-amber-50 via-white to-rose-50 p-3 shadow-[var(--shadow-1)] ring-1 ring-white/60">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Streak tracker</span>
            <span className="uppercase tracking-wide">Gamify</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold text-slate-900">
                {currentStreak} days
              </p>
              <p className="text-xs text-muted-foreground">Current streak</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-slate-900">
                {bestStreak} days
              </p>
              <p className="text-xs text-muted-foreground">Best streak</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="rounded-lg border bg-white px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide">Tasks</p>
              <p className="text-sm font-semibold text-foreground">
                {completedTasks}/{totalTasks}
              </p>
            </div>
            <div className="rounded-lg border bg-white px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide">Time</p>
              <p className="text-sm font-semibold text-foreground">
                {timeInvestedMinutes} min
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={`streak-${index}`}
                className={`flex h-7 items-center justify-center rounded-lg border text-[10px] font-medium shadow-sm ${
                  index < currentStreak
                    ? "bg-amber-100 text-amber-700"
                    : "bg-white text-muted-foreground"
                }`}
              >
                Day {index + 1}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {hasRealProgress
              ? "Keep a daily task streak to level up."
              : "Finish one task per day to keep the streak glowing. Future badges will live here."}
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-3 text-white shadow-[var(--shadow-1)]">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/70">
            <span>Lofi player</span>
            <span>Study mode</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white/10 shadow-inner">
              <div className="flex h-full w-full items-center justify-center rounded-full border border-white/20 text-sm">
                🎧
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Midnight Focus</p>
              <p className="text-xs text-white/60">Lo-fi · 72 bpm</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                <div className="h-full w-1/3 rounded-full bg-white/70" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold">
                Play
              </button>
              <button className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold">
                Skip
              </button>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
