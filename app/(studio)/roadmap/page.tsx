"use client";

import { useEffect } from "react";
import { useRoadmap, roadmapKey } from "@/hooks/use-roadmap";
import RoadmapJourneyMap from "@/components/roadmap/RoadmapJourneyMap";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { useQueryClient } from "@tanstack/react-query";
import { Brain, Sparkles, Loader2 } from "lucide-react";

export default function RoadmapPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useRoadmap();
  const roadmap = data?.roadmap;
  const { planBuildStatus, planBuildMessage } = useMentorLoungeStore();

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
        <p className="text-muted-foreground animate-pulse font-medium">Loading your journey...</p>
      </div>
    );
  }

  if (!roadmap) {
    const isGenerating = planBuildStatus === "in_progress" || planBuildStatus === "queued";
    
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
                 <span className="text-xs font-bold uppercase tracking-wider">AI Architect at work</span>
              </div>
              <CardTitle className="text-3xl">Architecting your career path...</CardTitle>
              <CardDescription className="text-lg">
                {planBuildMessage || "We're analyzing your profile to build a custom trajectory."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
               <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                     <span>Building Roadmap Structure</span>
                     <span className="text-primary italic animate-pulse">Processing...</span>
                  </div>
                  <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                     <div className="h-full bg-primary animate-progress-indeterminate rounded-full" />
                  </div>
               </div>
               <p className="text-sm text-muted-foreground">This usually takes about 20-30 seconds. Feel free to stay here; your roadmap will appear automatically.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-2 shadow-none bg-muted/30">
            <CardHeader>
              <CardTitle>No roadmap found</CardTitle>
              <CardDescription>
                You haven&apos;t generated a career roadmap yet. Complete your mentor intake to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={() => router.push("/chat?context=mentor_intake")} className="gap-2">
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
    <div className="h-full w-full p-4 lg:p-6 flex flex-col">
       <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Your Journey</h1>
          <p className="text-muted-foreground">
            {roadmap.target_role || "Career Trajectory"}
          </p>
       </div>
       
       <div className="flex-1 min-h-0 border rounded-xl overflow-hidden shadow-sm bg-background">
          <RoadmapJourneyMap roadmap={roadmap} />
       </div>
    </div>
  );
}
