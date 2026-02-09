"use client";

import { motion } from "framer-motion";
import { Flame, Star, Trophy, Zap, Award, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useGamificationStats } from "@/hooks/use-gamification";
import { XPProgressBar, StreakDisplay, LevelBadge } from "./celebration";

interface GamificationStatsCardProps {
  className?: string;
  variant?: "full" | "compact" | "minimal";
}

export function GamificationStatsCard({ 
  className, 
  variant = "full" 
}: GamificationStatsCardProps) {
  const {
    isLoading,
    totalPoints,
    level,
    levelProgress,
    xpForNextLevel,
    levelProgressPercentage,
    currentStreak,
    longestStreak,
    recentBadges,
    badgeCount,
  } = useGamificationStats();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <LevelBadge level={level} size="sm" />
        <div className="flex-1 min-w-0">
          <XPProgressBar
            currentXP={levelProgress}
            xpForNextLevel={xpForNextLevel}
            level={level}
            size="sm"
            showNumbers={false}
          />
        </div>
        {currentStreak > 0 && (
          <StreakDisplay 
            currentStreak={currentStreak} 
            longestStreak={longestStreak}
            showLongest={false}
          />
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <LevelBadge level={level} size="lg" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{totalPoints.toLocaleString()} XP</span>
                <StreakDisplay 
                  currentStreak={currentStreak} 
                  longestStreak={longestStreak} 
                />
              </div>
              <XPProgressBar
                currentXP={levelProgress}
                xpForNextLevel={xpForNextLevel}
                level={level}
                size="md"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="w-5 h-5 text-primary" />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Level & XP */}
        <div className="flex items-start gap-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <LevelBadge level={level} size="lg" />
          </motion.div>
          <div className="flex-1 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{totalPoints.toLocaleString()}</span>
              <span className="text-muted-foreground">XP</span>
            </div>
            <XPProgressBar
              currentXP={levelProgress}
              xpForNextLevel={xpForNextLevel}
              level={level}
              size="md"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-orange-500 mb-1">
              <Flame className="w-4 h-4" />
              <span className="font-bold">{currentStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-purple-500 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="font-bold">{badgeCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Badges</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="font-bold">{longestStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
        </div>

        {/* Recent Badges */}
        {recentBadges.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Badges</h4>
            <div className="flex flex-wrap gap-2">
              {recentBadges.slice(0, 4).map((award) => (
                <motion.div
                  key={award.badge.id}
                  whileHover={{ scale: 1.1 }}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    "bg-gradient-to-r from-purple-500/10 to-pink-500/10",
                    "border border-purple-500/20 text-purple-700 dark:text-purple-300"
                  )}
                  title={award.badge.description}
                >
                  {award.badge.name}
                </motion.div>
              ))}
              {recentBadges.length > 4 && (
                <span className="px-2.5 py-1 text-xs text-muted-foreground">
                  +{recentBadges.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
