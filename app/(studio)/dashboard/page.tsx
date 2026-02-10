"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useHomeDashboard } from "@/hooks/use-home-dashboard";
import { useGamificationSummary } from "@/hooks/use-gamification";
import { useFlowSuggestion } from "@/hooks/use-flow-suggestion";
import { TodayFocusCard } from "@/components/dashboard/today-focus-card";
import { QuickStatsCard } from "@/components/dashboard/quick-stats-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { FlowStarter } from "@/components/dashboard/flow-starter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { telemetry } from "@/lib/telemetry";
import { 
  MessageSquare, 
  Calendar, 
  Target, 
  Sparkles,
  TrendingUp,
  Award,
  Zap,
  BookOpen,
  Flame
} from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { data: homeData, isLoading: homeLoading } = useHomeDashboard();
  const { data: gamificationData } = useGamificationSummary();
  const { data: flowData } = useFlowSuggestion('dashboard');
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

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Hero Section - Gamification Stats */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 p-6 lg:p-8">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                Welcome back{user?.first_name ? `, ${user.first_name}` : ""}! 👋
              </h1>
              <p className="mt-1 text-muted-foreground">
                Your learning journey continues — let&apos;s make today count
              </p>
            </div>
            
            {/* Level Badge */}
            <div className="flex items-center gap-4">
              {currentStreak > 0 && (
                <div className="flex items-center gap-2 rounded-full bg-orange-500/20 px-4 py-2 text-orange-700 dark:text-orange-300">
                  <Flame className="h-5 w-5" />
                  <span className="font-semibold">{currentStreak} day streak!</span>
                </div>
              )}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg">
                <div className="text-center">
                  <div className="text-xs font-medium text-white/80">Level</div>
                  <div className="text-2xl font-bold text-white">{currentLevel}</div>
                </div>
              </div>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="font-medium">
                  {totalXP.toLocaleString()} Total XP
                </span>
              </div>
              <span className="text-muted-foreground">
                {xpProgress} / {xpNeeded} XP to Level {currentLevel + 1}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/50 dark:bg-black/20">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-sm backdrop-blur-sm dark:bg-black/20">
              <Award className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span className="font-medium">
                {gamificationData?.recent_badges?.length ?? 0} Badges
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-sm backdrop-blur-sm dark:bg-black/20">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-medium">
                {homeData?.weekly_stats?.tasks_completed ?? 0} Tasks This Week
              </span>
            </div>
            {longestStreak > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-sm backdrop-blur-sm dark:bg-black/20">
                <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="font-medium">
                  {longestStreak} Day Best Streak
                </span>
              </div>
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
          <TodayFocusCard task={homeData?.today_task} isLoading={isLoading} />
        </div>
        <QuickStatsCard
          stats={homeData?.weekly_stats}
          streak={homeData?.streak}
          isLoading={isLoading}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card 
            className="group cursor-pointer transition-all hover:border-violet-500 hover:shadow-lg"
            onClick={() => {
              telemetry.track("dashboard_quick_action_clicked", { action: "chat" });
              router.push("/chat");
            }}
          >
            <CardContent className="p-6">
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
            className="group cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg"
            onClick={() => {
              telemetry.track("dashboard_quick_action_clicked", { action: "plans" });
              router.push("/plans");
            }}
          >
            <CardContent className="p-6">
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
            className="group cursor-pointer transition-all hover:border-green-500 hover:shadow-lg"
            onClick={() => {
              telemetry.track("dashboard_quick_action_clicked", { action: "progress" });
              router.push("/progress");
            }}
          >
            <CardContent className="p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="font-semibold group-hover:text-green-600">Progress Mural</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Track all dimensions
              </p>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer transition-all hover:border-amber-500 hover:shadow-lg"
            onClick={() => {
              telemetry.track("dashboard_quick_action_clicked", { action: "portfolio" });
              router.push("/portfolio");
            }}
          >
            <CardContent className="p-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-semibold group-hover:text-amber-600">Portfolio</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Showcase your work
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
              gamificationData.recent_badges.slice(0, 5).map((item) => {
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
