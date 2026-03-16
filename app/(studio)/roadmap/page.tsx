"use client";

import { useEffect, useMemo } from "react";
import { useRoadmap, roadmapKey } from "@/hooks/use-roadmap";
import RoadmapJourneyMap from "@/components/roadmap/RoadmapJourneyMap";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Sparkles,
  Loader2,
  Flag,
  Mountain,
  Target,
  Rocket,
  ArrowRight,
  PlayCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

export default function RoadmapPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useRoadmap();
  const roadmap = data?.roadmap;
  const { planBuildStatus, planBuildMessage } = useMentorLoungeStore();

  const levelStats = useMemo(() => {
    const levels = roadmap?.stages.flatMap((s) => s.levels) || [];
    const total = levels.length;
    const completed = levels.filter((l) => l.status === "completed").length;
    const inProgress = levels.filter((l) => l.status === "in_progress").length;
    const available = levels.filter((l) => l.status === "available").length;
    const locked = levels.filter((l) => l.status === "locked").length;
    return { levels, total, completed, inProgress, available, locked };
  }, [roadmap]);

  const radarData = useMemo(() => {
    const total = Math.max(levelStats.total, 1);
    const completion = (levelStats.completed / total) * 100;
    const momentum =
      ((levelStats.inProgress + levelStats.available) / total) * 100;
    const unlock = ((total - levelStats.locked) / total) * 100;
    const consistency =
      levelStats.inProgress > 0 ? 68 : levelStats.completed > 0 ? 52 : 30;
    const depth = Math.min(100, 35 + levelStats.completed * 8);
    const readiness = Math.round(completion * 0.6 + unlock * 0.4);
    return [
      { metric: "Mastery", value: Math.round(completion) },
      { metric: "Momentum", value: Math.round(momentum) },
      { metric: "Unlock", value: Math.round(unlock) },
      { metric: "Consistency", value: Math.round(consistency) },
      { metric: "Depth", value: Math.round(depth) },
      { metric: "Readiness", value: readiness },
    ];
  }, [levelStats]);

  const nextLevel = useMemo(() => {
    return (
      levelStats.levels.find((l) => l.status === "in_progress") ||
      levelStats.levels.find((l) => l.status === "available") ||
      levelStats.levels.find((l) => l.status === "locked") ||
      null
    );
  }, [levelStats]);

  const focusLevel = useMemo(() => {
    return (
      levelStats.levels.find((l) => l.status === "in_progress") ||
      levelStats.levels.find((l) => l.status === "available") ||
      levelStats.levels.find((l) => l.status === "completed") ||
      null
    );
  }, [levelStats]);

  // Re-fetch roadmap when generation completes
  useEffect(() => {
    if (planBuildStatus === "completed") {
      queryClient.invalidateQueries({ queryKey: roadmapKey });
      // Also clear the status after a delay so the "completed" UI doesn't stick forever if we move back and forth
      const timer = setTimeout(() => {
        // We might want to keep it completed for a bit, but invalidating the query is the key.
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [planBuildStatus, queryClient]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse font-medium">
          Loading your journey...
        </p>
      </div>
    );
  }

  if (!roadmap) {
    const isGenerating =
      planBuildStatus === "in_progress" || planBuildStatus === "queued";

    return (
      <div className="max-w-3xl mx-auto space-y-6 p-6 mt-12">
        {isGenerating ? (
          <Card className="border-primary/20 bg-primary/5 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Brain className="w-32 h-32" />
            </div>
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  AI Architect at work
                </span>
              </div>
              <CardTitle className="text-3xl">
                Architecting your career path...
              </CardTitle>
              <CardDescription className="text-lg">
                {planBuildMessage ||
                  "We're analyzing your profile to build a custom trajectory."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Building Roadmap Structure</span>
                  <span className="text-primary italic animate-pulse">
                    Processing...
                  </span>
                </div>
                <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-progress-indeterminate rounded-full" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This usually takes about 20-30 seconds. Feel free to stay here;
                your roadmap will appear automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2 shadow-none bg-muted/30">
            <CardHeader>
              <CardTitle>No roadmap found</CardTitle>
              <CardDescription>
                You haven&apos;t generated a career roadmap yet. Complete your
                mentor intake to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                onClick={() => router.push("/chat?context=mentor_intake")}
                className="gap-2"
              >
                <Brain className="w-4 h-4" />
                Start Mentor Intake
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4 lg:p-6">
      <div className="rounded-2xl border bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
              <Mountain className="h-4 w-4" />
              Journey Campaign
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {roadmap.target_role || "Career Trajectory"}
            </h1>
            {/* <p className="mt-1 text-sm text-slate-600">
              Your Roadmap Quest
            </p> */}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700">
            <Flag className="h-4 w-4 text-sky-600" />
            Unlock each region by completing quests
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex min-h-0 flex-col gap-4">
          <div className="min-h-0 overflow-hidden rounded-2xl border bg-background shadow-sm">
            <RoadmapJourneyMap roadmap={roadmap} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-indigo-600" />
                  Current Plan Focus
                </div>
                <div >
                  {focusLevel ? (
                    <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {focusLevel.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="secondary">Level {focusLevel.level_index}</Badge>
                    <Badge variant="outline">{focusLevel.duration_weeks} weeks</Badge>
                  </div>
                  ) : null}
                </div>
              </CardTitle>
              <CardDescription>
                Resume your ongoing level or launch the linked learning plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {focusLevel ? (
                <div className="space-y-3">
                  {/* <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {focusLevel.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="secondary">Level {focusLevel.level_index}</Badge>
                    <Badge variant="outline">{focusLevel.duration_weeks} weeks</Badge>
                  </div> */}
                  <p className="text-base font-semibold text-slate-900">{focusLevel.title}</p>
                  <p className="text-sm text-slate-600">
                    {focusLevel.description || "This level is your current progression target in the roadmap."}
                  </p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {focusLevel.objectives?.slice(0, 2).map((objective, index) => (
                      <div
                        key={`${focusLevel.id}-objective-${index}`}
                        className="rounded-lg border bg-slate-50 p-2.5 text-sm text-slate-700"
                      >
                        {objective}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {focusLevel.learning_plan_id ? (
                      <Button
                        className="gap-2"
                        onClick={() => router.push(`/plans/${focusLevel.learning_plan_id}/playground`)}
                      >
                        Open Learning Plan
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => router.push("/chat?context=mentor_intake")}
                      >
                        Ask Mentor To Generate Plan
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
                  No active level yet. Start the first available level to begin.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex min-h-0 flex-col gap-4">
          <Card className="overflow-hidden flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-sky-600" />
                Journey Insights
              </CardTitle>
              <CardDescription>
                Progress profile across roadmap dimensions
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] w-full pb-3 gap-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <Radar
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#93c5fd"
                    fillOpacity={0.45}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex flex-col items-center text-center w-full text-xs my-10 text-slate-500">
                <div className="text-[1rem] uppercase font-semibold">
                  Holistic Score
                </div>
                <div className="text-2xl uppercase font-semibold text-[#3b82f6]">
                  547
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex text-base mb-1 items-center gap-1.5 font-semibold uppercase tracking-[0.12em] text-sky-700">
                <Rocket className="h-3.5 w-3.5" />
                Upcoming Levels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {nextLevel ? (
                <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                  {/* <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700"></div> */}
                  <p className="text-sm font-semibold text-slate-900">
                    {nextLevel.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 ">
                    {nextLevel.description ||
                      "Continue this level to unlock the next region."}
                  </p>
                </div>
              ) : null}
              <div className="rounded-lg border bg-white p-2.5 text-xs text-slate-600">
                Complete available levels in sequence. Each completed level
                unlocks the next path segment.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
