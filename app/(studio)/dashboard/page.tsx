"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useHomeDashboard } from "@/hooks/use-home-dashboard";
import { useGamificationSummary } from "@/hooks/use-gamification";
import { useFlowSuggestion } from "@/hooks/use-flow-suggestion";
import { TodayFocusCard } from "@/components/dashboard/today-focus-card";
import { WeeklyMomentumCard } from "@/components/dashboard/weekly-momentum-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { FlowStarter } from "@/components/dashboard/flow-starter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { telemetry } from "@/lib/telemetry";
import {
  MessageSquare,
  Calendar,
  Target,
  Sparkles,
  TrendingUp,
  Award,
  Zap,
  Flame,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const canQuery = !authLoading && !!user;
  const { data: homeData, isLoading: homeLoading } = useHomeDashboard({ enabled: canQuery });
  const { data: gamificationData } = useGamificationSummary({ enabled: canQuery });
  const { data: flowData } = useFlowSuggestion('dashboard', { enabled: canQuery });
  const [flowShownAt] = useState(new Date());

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  const isLoading = authLoading || homeLoading;
  const profile = gamificationData?.profile;
  const currentLevel = profile?.level ?? 1;
  const totalXP = profile?.total_points ?? 0;
  const xpProgress = profile?.level_progress ?? 0;
  const xpNeeded = profile?.xp_for_next_level ?? 100;
  const progressPercent = profile?.level_progress_percentage ?? 0;
  const currentStreak = profile?.current_streak ?? 0;
  const longestStreak = profile?.longest_streak ?? 0;
  const badgeCount = gamificationData?.badge_count ?? 0;
  const tasksThisWeek = homeData?.weekly_stats?.tasks_completed ?? 0;
  const hasPlan = !!homeData?.today_task || tasksThisWeek > 0;
  const updatedAt = homeData?.generated_at
    ? formatDistanceToNow(new Date(homeData.generated_at), { addSuffix: true })
    : null;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Hero Section - Gamification Stats */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-violet-50/50 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] lg:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-10 top-6 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl" />
          <div className="absolute right-10 top-2 h-24 w-24 rounded-full bg-amber-200/30 blur-2xl" />
          <div className="absolute bottom-0 left-1/3 h-24 w-48 rounded-full bg-fuchsia-200/30 blur-3xl" />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 lg:text-4xl">
                Welcome back{user?.first_name ? `, ${user.first_name}` : ""}.
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Your learning journey continues — let&apos;s shape today with focus and momentum.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {currentStreak > 0 && (
                <div className="flex items-center gap-2 rounded-full border border-orange-200/60 bg-orange-50 px-4 py-2 text-orange-700">
                  <Flame className="h-4 w-4" />
                  <span className="text-sm font-semibold">{currentStreak} day streak</span>
                </div>
              )}
              <div className="flex items-center gap-3 rounded-2xl border border-violet-200/60 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
                  <span className="text-lg font-semibold">{currentLevel}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Level</p>
                  <p className="text-sm font-semibold text-slate-900">Learning cadence</p>
                </div>
              </div>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-slate-900">
                  {totalXP.toLocaleString()} Total XP
                </span>
              </div>
              <span className="text-muted-foreground">
                {xpProgress} / {xpNeeded} XP to Level {currentLevel + 1}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-violet-200/60 bg-white/80 px-4 py-2 text-sm shadow-sm">
              <Award className="h-4 w-4 text-violet-600" />
              <span className="font-medium text-slate-900">{badgeCount} Badges</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-200/60 bg-white/80 px-4 py-2 text-sm shadow-sm">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-slate-900">{tasksThisWeek} Tasks This Week</span>
            </div>
            {longestStreak > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/80 px-4 py-2 text-sm shadow-sm">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-slate-900">{longestStreak} Day Best Streak</span>
              </div>
            )}
            {updatedAt && (
              <span className="text-xs text-muted-foreground">
                Updated {updatedAt}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Flow Suggestion - Hero CTA */}
      {flowData?.suggestion && (
        <FlowStarter 
          suggestion={flowData.suggestion} 
          shownAt={flowShownAt}
        />
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodayFocusCard
            task={homeData?.today_task}
            additionalTasks={homeData?.additional_tasks}
            isLoading={isLoading}
          />
        </div>
        <WeeklyMomentumCard
          stats={homeData?.weekly_stats}
          hasPlan={hasPlan}
          isLoading={isLoading}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card 
            className="group cursor-pointer transition-all hover:border-violet-500 hover:shadow-md"
            onClick={() => {
              telemetry.track("dashboard_quick_action_clicked", { action: "chat" });
              router.push("/chat");
            }}
          >
            <CardContent className="p-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="font-semibold group-hover:text-violet-600">Chat with Mentor</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get personalized guidance
              </p>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer transition-all hover:border-blue-500 hover:shadow-md"
            onClick={() => {
              telemetry.track("dashboard_quick_action_clicked", { action: "plans" });
              router.push("/plans");
            }}
          >
            <CardContent className="p-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="font-semibold group-hover:text-blue-600">View Learning Plans</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Explore your roadmap
              </p>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer transition-all hover:border-green-500 hover:shadow-md"
            onClick={() => {
              telemetry.track("dashboard_quick_action_clicked", { action: "progress" });
              router.push("/progress");
            }}
          >
            <CardContent className="p-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="font-semibold group-hover:text-green-600">Progress Mural</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Track all dimensions
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity & Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityFeed items={homeData?.recent_activity} isLoading={isLoading} />

        {/* Recent Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-violet-600" />
              Recent Achievements
            </CardTitle>
            <CardDescription>Badges you&apos;ve unlocked on your journey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {gamificationData?.recent_badges?.length ? (
              gamificationData.recent_badges.slice(0, 4).map((item) => {
                const badge = "badge" in item ? item.badge : item;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border bg-gradient-to-r from-violet-50/50 to-fuchsia-50/50 p-3 dark:from-violet-950/20 dark:to-fuchsia-950/20"
                  >
                    <div className="text-2xl">{badge.icon || "🏆"}</div>
                    <div className="flex-1">
                      <p className="font-medium">{badge.name}</p>
                      {"description" in badge && badge.description && (
                        <p className="text-xs text-muted-foreground">
                          {badge.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center">
                <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Complete your first task to earn your first badge!
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push("/plans")}
                >
                  Explore Learning Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
