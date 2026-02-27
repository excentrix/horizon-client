"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Flame, Loader2, Star, Trophy, Zap } from "lucide-react";

type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  weekly_xp: number;
  level: number;
  current_streak: number;
};

type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  period: string;
  updated_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function fetchLeaderboard(): Promise<LeaderboardData> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : "";
  const res = await fetch(`${API_BASE}/api/gamification/points/leaderboard/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

const PODIUM_CONFIG = [
  { rank: 1, icon: "🥇", bg: "from-amber-400/30 to-amber-500/10 border-amber-400/30", size: "text-4xl" },
  { rank: 2, icon: "🥈", bg: "from-slate-400/30 to-slate-500/10 border-slate-400/30", size: "text-3xl" },
  { rank: 3, icon: "🥉", bg: "from-orange-400/30 to-orange-500/10 border-orange-400/30", size: "text-3xl" },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard()
      .then(setData)
      .catch(() => setError("Could not load leaderboard"))
      .finally(() => setLoading(false));
  }, []);

  const entries = data?.leaderboard ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="flex justify-center mb-3">
          <Trophy className="h-10 w-10 text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Weekly Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Top learners by XP earned this week. Resets every Monday.</p>
        {data?.updated_at && (
          <p className="text-xs text-muted-foreground">Updated {new Date(data.updated_at).toLocaleTimeString()}</p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border p-12 text-center text-muted-foreground">
          <p className="text-4xl mb-3">📊</p>
          <p>No activity yet this week. Be the first to earn XP!</p>
        </div>
      ) : (
        <>
          {/* Podium top 3 */}
          <div className="grid grid-cols-3 gap-3">
            {/* Render in order: 2nd, 1st, 3rd for visual podium effect */}
            {[1, 0, 2].map((idx) => {
              const entry = top3[idx];
              if (!entry) return <div key={idx} />;
              const cfg = PODIUM_CONFIG[entry.rank - 1];
              const isMe = entry.user_id === user?.id;
              return (
                <div
                  key={entry.rank}
                  className={cn(
                    "rounded-2xl border bg-gradient-to-b p-4 text-center flex flex-col items-center gap-2 relative",
                    cfg.bg,
                    isMe && "ring-2 ring-primary",
                    entry.rank === 1 && "-mt-4"
                  )}
                >
                  <span className={cfg.size}>{cfg.icon}</span>
                  <div className="rounded-full bg-muted/50 h-12 w-12 flex items-center justify-center text-lg font-bold">
                    {entry.display_name.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold text-sm truncate max-w-full">{entry.display_name}{isMe && " (you)"}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3 text-amber-400" />
                    <span className="font-bold text-foreground">{entry.weekly_xp.toLocaleString()}</span> XP
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Lv {entry.level}</span>
                    {entry.current_streak > 0 && (
                      <span className="flex items-center gap-0.5 text-orange-400">
                        <Flame className="h-3 w-3" /> {entry.current_streak}d
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <div className="rounded-xl border overflow-hidden">
              {rest.map((entry) => {
                const isMe = entry.user_id === user?.id;
                return (
                  <div
                    key={entry.user_id}
                    className={cn(
                      "flex items-center gap-4 px-5 py-3 border-b last:border-b-0",
                      isMe ? "bg-primary/5" : "hover:bg-muted/30"
                    )}
                  >
                    <span className="text-muted-foreground font-mono w-5 text-sm text-right shrink-0">{entry.rank}</span>
                    <div className="rounded-full bg-muted/50 h-8 w-8 flex items-center justify-center text-sm font-bold shrink-0">
                      {entry.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.display_name}{isMe && " (you)"}</p>
                      <p className="text-xs text-muted-foreground">Level {entry.level}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm shrink-0">
                      {entry.current_streak > 0 && (
                        <span className="flex items-center gap-0.5 text-orange-400 text-xs">
                          <Flame className="h-3 w-3" /> {entry.current_streak}d
                        </span>
                      )}
                      <div className="flex items-center gap-1 font-semibold">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        {entry.weekly_xp.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
