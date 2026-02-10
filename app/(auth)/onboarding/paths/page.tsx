"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, Check, Clock, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

type MatchedPath = {
  id: number;
  slug: string;
  title: string;
  description: string;
  duration_weeks: number;
  hours_per_week: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  icon: string;
  cover_image_url: string;
  match_score: number;
  match_reasons: string[];
  quality_score?: number;
  is_generated?: boolean;
  match_source?: "seed" | "generated";
};

export default function PathSelectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paths, setPaths] = useState<MatchedPath[]>([]);
  const [selectedPathSlug, setSelectedPathSlug] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem("onboarding_session_key");
    if (!key) {
      router.push("/onboarding");
      return;
    }

    // Fetch session to get recommended paths
    fetch(`${API_URL}/onboarding/session/${key}/`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.recommended_paths || data.recommended_paths.length === 0) {
          // If no paths yet (maybe refreshing page?), could redirect back to form
          // router.push("/onboarding/form");
        }
        setPaths(data.recommended_paths || []);
      })
      .catch((err) => console.error("Failed to fetch paths", err))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSelectPath = async (pathSlug: string) => {
    setSelectedPathSlug(pathSlug);
    setInitializing(true);
    
    const key = localStorage.getItem("onboarding_session_key");
    if (!key) return;

    try {
        const response = await fetch(`${API_URL}/onboarding/personalize-path/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_key: key,
                path_slug: pathSlug
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to save path selection");
        }

        const data = await response.json();

        // Find the selected path for event properties
        const selectedPath = paths.find(p => p.slug === pathSlug);

        // Capture path selected event
        posthog.capture('onboarding_path_selected', {
          path_slug: pathSlug,
          path_title: selectedPath?.title,
          path_difficulty: selectedPath?.difficulty,
          path_duration_weeks: selectedPath?.duration_weeks,
          match_score: selectedPath?.match_score,
        });

        // Redirect to finalize page (plan generation happens after account creation)
        router.push(data.redirect_url || '/onboarding/finalize');
        
    } catch (err) {
        console.error("Failed to save path:", err);
        setInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-12">
      <div className="container mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-12 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                We found the perfect paths for you
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Based on your goals and background, our AI recommends starting with one of these specialized tracks.
            </p>
        </div>

        {/* Paths Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {paths.map((path, index) => (
                <Card 
                    key={path.id} 
                    className={cn(
                        "flex flex-col relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden",
                        index === 0 ? "border-violet-500 shadow-violet-500/20 ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-gray-950" : "border-gray-200 dark:border-gray-800"
                    )}
                >
                    {/* Top Match Badge */}
                    {index === 0 && (
                        <div className="absolute top-0 right-0 bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
                            TOP MATCH ({path.match_score}%)
                        </div>
                    )}
                    {path.is_generated && (
                        <div className="absolute top-3 left-3 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                            AI Generated
                        </div>
                    )}
                    
                    <CardHeader className="pb-4">
                        <div className="text-4xl mb-4">{path.icon}</div>
                        <CardTitle className="text-xl">{path.title}</CardTitle>
                        <CardDescription className="line-clamp-2 min-h-[40px]">
                            {path.description}
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex-1 space-y-4">
                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 py-2 border-y border-gray-100 dark:border-gray-800">
                             <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                {path.duration_weeks}w
                             </div>
                             <div className="flex items-center gap-1.5">
                                <BarChart className="h-4 w-4" />
                                <span className="capitalize">{path.difficulty}</span>
                             </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Match confidence</span>
                          <span className="font-semibold text-violet-600 dark:text-violet-300">
                            {path.match_score}%
                          </span>
                        </div>

                        {/* Match Reasons */}
                        <div className="space-y-2">
                             {path.match_reasons.map((reason, i) => (
                                 <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                     <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                     <span>{reason}</span>
                                 </div>
                             ))}
                        </div>
                    </CardContent>
                    
                    <CardFooter className="pt-4">
                        <Button 
                            className={cn(
                                "w-full text-base h-11", 
                                index === 0 ? "bg-violet-600 hover:bg-violet-700" : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                            )}
                            onClick={() => handleSelectPath(path.slug)}
                            disabled={initializing}
                        >
                            {initializing && selectedPathSlug === path.slug ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Initialzing...
                                </>
                            ) : (
                                "Select Path"
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
        
        {/* Fallback/Custom Option */}
        <div className="mt-16 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Don&apos;t see what you&apos;re looking for?</p>
            <Button variant="ghost" className="text-violet-600 hover:text-violet-700 dark:text-violet-400">
                Create a Custom Path from Scratch <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
        </div>

      </div>
    </div>
  );
}
