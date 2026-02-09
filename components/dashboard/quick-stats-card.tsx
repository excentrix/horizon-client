"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { WeeklyStats, DashboardStreak } from "@/types";
import { CheckCircle2, Zap, Target, Flame } from "lucide-react";

interface QuickStatsCardProps {
  stats: WeeklyStats | undefined;
  streak: DashboardStreak | undefined;
  isLoading?: boolean;
}

export function QuickStatsCard({ stats, streak, isLoading }: QuickStatsCardProps) {
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

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Quick Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Streak */}
        {streak && streak.current > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${streak.at_risk ? 'bg-orange-100 dark:bg-orange-950' : 'bg-orange-100 dark:bg-orange-950'}`}>
                <Flame className={`h-4 w-4 ${streak.at_risk ? 'text-orange-400' : 'text-orange-500'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {streak.current} day streak
                </p>
                {streak.at_risk && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    At risk! Complete a task today
                  </p>
                )}
              </div>
            </div>
            <span className="text-xl font-bold">{streak.current}</span>
          </div>
        )}

        {/* Tasks Completed */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium">Tasks this week</p>
          </div>
          <span className="text-xl font-bold">{stats?.tasks_completed ?? 0}</span>
        </div>

        {/* XP Earned */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-950">
              <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm font-medium">XP earned</p>
          </div>
          <span className="text-xl font-bold">{stats?.xp_earned ?? 0}</span>
        </div>

        {/* Weekly Goal Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950">
                <Target className="h-4 w-4 text-blue-600 dark:bg-blue-400" />
              </div>
              <p className="text-sm font-medium">Weekly goal</p>
            </div>
            <span className="text-sm font-medium">
              {Math.round((stats?.goal_progress ?? 0) * 100)}%
            </span>
          </div>
          <Progress value={(stats?.goal_progress ?? 0) * 100} className="h-2" />
        </div>

        {/* Days to Milestone */}
        {stats?.days_to_milestone !== null && stats?.days_to_milestone !== undefined && (
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Next milestone in</p>
            <p className="text-lg font-bold">{stats.days_to_milestone} days</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
