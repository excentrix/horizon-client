"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, Calendar, CheckCircle, BookOpen, Trophy } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

type PlanPreview = {
  id: string;
  title: string;
  task_count: number;
  estimated_duration_weeks: number;
  milestones: {
    week: number;
    title: string;
    description: string;
  }[];
  first_tasks: {
    title: string;
    description: string;
    duration_minutes: number;
  }[];
};

export default function PlanPreviewPage({ params }: { params: Promise<{ planId: string }> }) {
  const router = useRouter();
  // Unwrap params using use() hook or await if possible, but params is a Promise in Next.js 15
  // Actually, in client components we need to use `use` from React or await it.
  // Let's assume passed as prop for now or handle the promise.
  // Next.js 15 breaking change: params are promises.
  const [planId, setPlanId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanPreview | null>(null);

  useEffect(() => {
    params.then((p) => {
        setPlanId(p.planId);
        fetchPlan(p.planId);
    });
  }, [params]);

  const fetchPlan = async (id: string) => {
    try {
        // We need a robust endpoint to get plan details.
        // Re-using existing plan detail endpoint or creating a specific preview one?
        // Let's assume a public/session-guarded preview endpoint exists or use the general one if Auth allows.
        // Actually, since we are authenticating via session key for now...
        // We might need to handle auth. But wait, `personalize_path` created a user.
        // But the frontend doesn't have the token yet.
        // So we need a public preview endpoint or use the session key.
        
        // Simulating plan data fetch for now until endpoint is confirmed.
        // In real implementation, we'd fetch `${API_URL}/plans/${id}/preview/`
        
        // HACK: For Phase 3 demo, let's assume we get minimal data or mock it if fetch fails
        // because we haven't built GET /api/plans/{id}/preview yet.
        // Wait, I should build that endpoint.
        
        // Let's try to fetch session again to get the draft plan details?
        // Or specific preview endpoint.
        
        // I will add a preview endpoint in backend quickly.
        const response = await fetch(`${API_URL}/onboarding/plan-preview/${id}/`);
        if (response.ok) {
            const data = await response.json();
            setPlan(data);
        } else {
             console.error("Failed to fetch plan preview");
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleStartJourney = () => {
    // Navigate to Finalization
    router.push(`/onboarding/finalize?plan=${planId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <span className="ml-2 text-gray-500">Loading your personalized plan...</span>
      </div>
    );
  }

  if (!plan) return <div>Failed to load plan.</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-violet-600 px-6 py-16 text-white sm:px-12 sm:py-24">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <Badge className="mb-6 bg-violet-500/50 text-white hover:bg-violet-500/50">
             AI Generated Just For You
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {plan.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-violet-100">
            A {plan.estimated_duration_weeks}-week journey tailored to your goals. 
            We've curated {plan.task_count} high-impact tasks to get you there.
          </p>
          
          <div className="mt-10 flex justify-center gap-4">
            <Button size="lg" onClick={handleStartJourney} className="bg-white text-violet-600 hover:bg-violet-50">
                Start Learning Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Background blobs */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            
            {/* Timeline Column */}
            <div>
                <h2 className="mb-8 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
                    <Calendar className="h-6 w-6 text-violet-600" />
                    Your Roadmap
                </h2>
                
                <div className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-3 space-y-8 pb-8">
                    {plan.milestones.map((milestone, idx) => (
                        <div key={idx} className="relative pl-8">
                            <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-white bg-violet-600 ring-1 ring-gray-100 dark:border-gray-950 dark:ring-gray-800" />
                            <div className="mb-1 text-sm font-bold uppercase tracking-wider text-violet-600">
                                Week {milestone.week}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{milestone.title}</h3>
                            <p className="mt-1 text-gray-600 dark:text-gray-400">{milestone.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tasks Preview Column */}
            <div>
                 <h2 className="mb-8 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
                    <BookOpen className="h-6 w-6 text-violet-600" />
                    First Week Sample
                </h2>
                
                <div className="space-y-4">
                    {plan.first_tasks.map((task, idx) => (
                        <Card key={idx} className="overflow-hidden border-gray-200 shadow-sm transition-all hover:border-violet-200 dark:border-gray-800 dark:hover:border-violet-800">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                     <h4 className="font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                                     <Badge variant="secondary" className="text-xs">{task.duration_minutes} min</Badge>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-8 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-100 dark:border-amber-900/50">
                    <div className="flex items-start gap-4">
                        <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/50">
                            <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Verification System</h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                Every task includes automated verification. We'll check your code, quiz your knowledge, or review your projects to ensure you're actually learning.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
