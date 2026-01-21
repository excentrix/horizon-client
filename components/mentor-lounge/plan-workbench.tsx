"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { 
  ArrowRight, 
  Map, 
  Zap, 
  AlertTriangle, 
  Target,
  Trophy,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlanCreationResponse, InsightEvent } from "@/types";

interface PlanWorkbenchProps {
  planData: Partial<PlanCreationResponse>;
  insights: InsightEvent[];
  progress?: number; 
  status: "idle" | "queued" | "in_progress" | "warning" | "completed" | "failed";
  statusMessage?: string;
  statusMeta?: { agent?: string; tool?: string; stepType?: string };
}

export function PlanWorkbench({ 
  planData, 
  insights, 
  progress = 0,
  status,
  statusMessage,
  statusMeta
}: PlanWorkbenchProps) {
  
  const latestInsight = insights[0]; // Assuming sorted by recency
  const hint = (() => {
    switch (status) {
      case "queued":
        return "Queueing your plan and loading your context.";
      case "in_progress":
        return "Drafting milestones and daily tasks.";
      case "warning":
        return "Waiting on your answers to continue.";
      case "completed":
        return "Plan is ready. You can start now.";
      case "failed":
        return "Something went wrong. Try again in a moment.";
      default:
        return "Ready when you are.";
    }
  })();

  return (
    <Card className="border-l-4 border-l-primary shadow-sm bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" />
              {planData.plan_title || "New Learning Plan"}
            </CardTitle>
            <CardDescription className="text-xs">
              {planData.task_count 
                 ? `${planData.task_count} tasks queued • Est. ${planData.estimated_duration || 0} hours`
                 : "Plan structure generated"}
            </CardDescription>
          </div>
          {status === "in_progress" && (
            <Badge variant="secondary" className="animate-pulse">Building...</Badge>
          )}
          {status === "completed" && (
            <Badge className="bg-green-500 hover:bg-green-600">Ready</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3 space-y-4">
        {/* Progress Section */}
        <div className="space-y-1.5">
           <div className="flex justify-between text-xs text-muted-foreground">
             <span>Completion</span>
             <span>{progress}%</span>
           </div>
           <Progress value={progress} className="h-2" />
        </div>
        <div className="rounded-md border bg-muted/40 px-2 py-2 text-xs">
          <p className="text-foreground/90">
            {statusMessage ?? hint}
          </p>
          {statusMeta && (statusMeta.agent || statusMeta.tool || statusMeta.stepType) ? (
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              {statusMeta.agent ? <span>Agent: {statusMeta.agent}</span> : null}
              {statusMeta.tool ? <span>Tool: {statusMeta.tool}</span> : null}
              {statusMeta.stepType ? <span>Step: {statusMeta.stepType}</span> : null}
            </div>
          ) : null}
        </div>

        {/* Insight Ticker */}
        {latestInsight && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2 flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                        Latest Insight
                    </span>
                    <p className="text-xs text-foreground/90 truncate">
                        {latestInsight.message}
                    </p>
                </div>
            </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex justify-between items-center gap-3">
         <div className="flex -space-x-2">
            {/* Mock avatars for now, could be mentors or peers */}
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-background flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300">
               AI
            </div>
            {planData.mentor_id && (
               <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 border-2 border-background flex items-center justify-center text-[10px] font-bold text-purple-700 dark:text-purple-300">
                  <Target className="w-3 h-3" />
               </div>
            )}
         </div>

         <Button asChild size="sm" className="gap-2">
           <Link href={planData.learning_plan_id ? `/plans?plan=${planData.learning_plan_id}` : "/plans"}>
             Start Journey <ArrowRight className="w-3.5 h-3.5" />
           </Link>
         </Button>
      </CardFooter>
    </Card>
  );
}
