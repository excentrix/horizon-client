"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { WeeklyStats } from "@/types";
import { Target, Zap, CalendarClock } from "lucide-react";

interface WeeklyMomentumCardProps {
  stats: WeeklyStats | undefined;
  hasPlan: boolean;
  isLoading?: boolean;
}

export function WeeklyMomentumCard({
  stats,
  hasPlan,
  isLoading,
}: WeeklyMomentumCardProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasPlan) {
    return (
      <Card className="h-full border-dashed">
        <CardHeader>
          <CardTitle>Weekly Momentum</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Start a learning plan to unlock weekly progress, XP, and milestone tracking.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Weekly Momentum</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-950">
                <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium">Weekly goal</span>
            </div>
            <span className="font-medium">
              {Math.round((stats?.goal_progress ?? 0) * 100)}%
            </span>
          </div>
          <Progress value={(stats?.goal_progress ?? 0) * 100} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-950">
              <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="font-medium">XP earned</span>
          </div>
          <span className="text-lg font-semibold">{stats?.xp_earned ?? 0}</span>
        </div>

        {stats?.days_to_milestone !== null && stats?.days_to_milestone !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-950">
                <CalendarClock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="font-medium">Next milestone</span>
            </div>
            <span className="font-semibold">{stats.days_to_milestone} days</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
