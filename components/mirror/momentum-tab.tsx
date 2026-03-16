"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGamificationSummary } from "@/hooks/use-gamification";
import { gamificationApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Zap, Flame, Trophy, Snowflake } from "lucide-react";

// ─── component ───────────────────────────────────────────────────────────────

export function MomentumTab() {
  const { data: summary, isLoading: summaryLoading } = useGamificationSummary();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: ledger, isLoading: ledgerLoading, isFetching } = useQuery({
    queryKey: ["gamification", "ledger", page],
    queryFn: () => gamificationApi.getLedger(page),
    staleTime: 30_000,
  });

  const freezeMutation = useMutation({
    mutationFn: () => gamificationApi.useStreakFreeze(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamification", "summary"] });
      toast.success("Streak freeze used.");
    },
    onError: () => toast.error("Couldn't use streak freeze."),
  });

  const profile = summary?.profile;
  const recentBadges = summary?.recent_badges ?? [];
  const streakFreezes = profile?.streak_freezes_available ?? 0;
  const freezeExpiry = profile?.streak_freeze_expires_at;
  const canFreeze =
    streakFreezes > 0 && (!freezeExpiry || new Date(freezeExpiry) >= new Date());
  const entries = ledger?.entries ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">

      {/* Stats strip */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : profile ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={<Zap className="h-4 w-4 text-indigo-500" />}
            value={profile.total_points?.toLocaleString() ?? "0"}
            label="Total XP"
            accent="indigo"
          />
          <StatCard
            icon={<Trophy className="h-4 w-4 text-amber-500" />}
            value={`Level ${profile.level ?? 1}`}
            label={`${summary?.badge_count ?? 0} badges earned`}
            accent="amber"
          />
          <StatCard
            icon={<Flame className="h-4 w-4 text-orange-500" />}
            value={String(profile.current_streak ?? 0)}
            label="day streak"
            accent="orange"
          />
          <StatCard
            icon={<Snowflake className="h-4 w-4 text-sky-500" />}
            value={String(streakFreezes)}
            label="freezes available"
            accent="sky"
          />
        </div>
      ) : null}

      {/* Level progress */}
      {profile && (
        <Card>
          <CardContent className="py-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                Level {profile.level} → Level {(profile.level ?? 1) + 1}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {profile.level_progress ?? 0} / {profile.xp_for_next_level ?? 100} XP ·{" "}
                {Math.round(profile.level_progress_percentage ?? 0)}%
              </span>
            </div>
            <Progress
              value={Math.min(100, profile.level_progress_percentage ?? 0)}
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      {/* Recent badges */}
      {recentBadges.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Recent Badges</h2>
          <div className="flex flex-wrap gap-2">
            {recentBadges.slice(0, 10).map((award) => {
              const badge = "badge" in award ? award.badge : award;
              return (
                <div
                  key={award.id}
                  title={(badge as { description?: string }).description}
                  className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm transition-shadow hover:shadow-sm"
                >
                  {(badge as { icon?: string }).icon && (
                    <span>{(badge as { icon: string }).icon}</span>
                  )}
                  <span className="font-medium">{(badge as { name: string }).name}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Streak freeze */}
      {profile && (
        <Card className="bg-muted/20">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium">Streak Freeze</p>
              <p className="text-xs text-muted-foreground">
                {streakFreezes} available
                {freezeExpiry
                  ? ` · expires ${new Date(freezeExpiry).toLocaleDateString()}`
                  : ""}
                {!canFreeze && streakFreezes === 0
                  ? " — keep a 7-day streak to unlock one"
                  : ""}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!canFreeze || freezeMutation.isPending}
              onClick={() => freezeMutation.mutate()}
            >
              Use freeze
            </Button>
          </CardContent>
        </Card>
      )}

      {/* XP Ledger */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">XP History</h2>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={page === 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={!ledger?.has_more || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>

        {ledgerLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : entries.length ? (
          <div className="space-y-1.5">
            {entries.map((entry) => (
              <div
                key={entry.id ?? entry.created_at}
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{entry.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`font-mono text-sm font-bold ${
                    entry.points >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {entry.points >= 0 ? "+" : ""}
                  {entry.points}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No XP entries yet — your first action earns points.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── stat card ────────────────────────────────────────────────────────────────

const accentBg: Record<string, string> = {
  indigo: "bg-indigo-50 dark:bg-indigo-950/20",
  amber: "bg-amber-50 dark:bg-amber-950/20",
  orange: "bg-orange-50 dark:bg-orange-950/20",
  sky: "bg-sky-50 dark:bg-sky-950/20",
};

function StatCard({
  icon,
  value,
  label,
  accent = "indigo",
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${accentBg[accent] ?? ""}`}>
      <div className="mb-2 flex items-center gap-1.5">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
