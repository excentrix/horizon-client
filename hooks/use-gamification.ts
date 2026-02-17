import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gamificationApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import type { 
  GamificationSummary, 
  GamificationBadge, 
  GamificationUserBadge,
  GamificationLeaderboard,
  GamificationEvent,
} from "@/types";
import { useCallback } from "react";

// Query keys
const summaryKey = ["gamification", "summary"];
const badgesKey = ["gamification", "badges"];
const earnedBadgesKey = ["gamification", "badges", "earned"];
const leaderboardKey = ["gamification", "leaderboard"];

export function useGamificationSummary(options?: { enabled?: boolean }) {
  return useQuery<GamificationSummary>({
    queryKey: summaryKey,
    queryFn: async () => {
      try {
        return await gamificationApi.getSummary();
      } catch (error) {
        telemetry.error("Failed to load gamification summary", { error });
        throw error;
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 60_000, // 1 minute - gamification changes frequently
    refetchOnWindowFocus: true, // Refresh on focus for up-to-date stats
  });
}

export function useGamificationBadges() {
  return useQuery<GamificationBadge[]>({
    queryKey: badgesKey,
    queryFn: async () => {
      try {
        return await gamificationApi.listBadges();
      } catch (error) {
        telemetry.error("Failed to load badges", { error });
        throw error;
      }
    },
    staleTime: 300_000, // 5 minutes - badges don't change often
    refetchOnWindowFocus: false,
  });
}

export function useEarnedBadges() {
  return useQuery<GamificationUserBadge[]>({
    queryKey: earnedBadgesKey,
    queryFn: async () => {
      try {
        return await gamificationApi.getEarnedBadges();
      } catch (error) {
        telemetry.error("Failed to load earned badges", { error });
        throw error;
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useLeaderboard() {
  return useQuery<GamificationLeaderboard>({
    queryKey: leaderboardKey,
    queryFn: async () => {
      try {
        return await gamificationApi.getLeaderboard();
      } catch (error) {
        telemetry.error("Failed to load leaderboard", { error });
        throw error;
      }
    },
    staleTime: 120_000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to handle real-time gamification events from WebSocket
 * and invalidate queries appropriately.
 */
export function useGamificationEvents(onEvent?: (event: GamificationEvent) => void) {
  const queryClient = useQueryClient();

  const handleEvent = useCallback((event: GamificationEvent) => {
    // Invalidate relevant queries based on event type
    switch (event.event_type) {
      case "points_earned":
      case "level_up":
        queryClient.invalidateQueries({ queryKey: summaryKey });
        queryClient.invalidateQueries({ queryKey: leaderboardKey });
        break;
      case "badge_earned":
        queryClient.invalidateQueries({ queryKey: summaryKey });
        queryClient.invalidateQueries({ queryKey: earnedBadgesKey });
        break;
      case "streak_milestone":
        queryClient.invalidateQueries({ queryKey: summaryKey });
        break;
    }

    // Call user's callback if provided
    if (onEvent) {
      onEvent(event);
    }
  }, [queryClient, onEvent]);

  return { handleEvent };
}

/**
 * Convenience hook for getting key stats
 */
export function useGamificationStats() {
  const { data: summary, isLoading, error } = useGamificationSummary();

  return {
    isLoading,
    error,
    totalPoints: summary?.profile?.total_points ?? 0,
    level: summary?.profile?.level ?? 1,
    levelProgress: summary?.profile?.level_progress ?? 0,
    xpForNextLevel: summary?.profile?.xp_for_next_level ?? 100,
    levelProgressPercentage: summary?.profile?.level_progress_percentage ?? 0,
    currentStreak: summary?.profile?.current_streak ?? 0,
    longestStreak: summary?.profile?.longest_streak ?? 0,
    recentBadges: summary?.recent_badges ?? [],
    badgeCount: summary?.badge_count ?? 0,
  };
}
