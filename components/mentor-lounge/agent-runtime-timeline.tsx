"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  BrainCircuit, 
  Database, 
  UserCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentRuntimeStep } from "@/types";

interface AgentRuntimeTimelineProps {
  steps: AgentRuntimeStep[];
}

export function AgentRuntimeTimeline({ steps }: AgentRuntimeTimelineProps) {
  const sortedSteps = useMemo(() => 
    [...steps].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), 
    [steps]
  );

  if (!steps.length) return null;

  return (
    <Card className="h-full border-l-0 rounded-none shadow-none bg-background/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-primary" />
          Agent Reasoning
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
          {sortedSteps.map((step) => (
            <div key={step.id} className="relative flex items-start gap-3 group">
              <div
                className={cn(
                  "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm transition-all",
                  step.status === "running" && "border-primary animate-pulse text-primary",
                  step.status === "completed" && "border-green-500 text-green-500",
                  step.status === "failed" && "border-red-500 text-red-500",
                  step.status === "waiting_for_input" && "border-amber-500 text-amber-500"
                )}
              >
                {step.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                {step.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                {step.status === "failed" && <XCircle className="h-3 w-3" />}
                {step.status === "waiting_for_input" && <UserCircle className="h-3 w-3" />}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground/90 leading-tight">
                    {step.step}
                  </p>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {format(new Date(step.timestamp), "HH:mm:ss")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="bg-muted px-1.5 py-0.5 rounded text-foreground/70 font-medium">
                    {String(step.agent)}
                  </span>
                  {step.details && (
                    <span className="truncate max-w-[180px]">{JSON.stringify(step.details)}</span>
                  )}
                </div>
                
                {!!step.output && (step.status === "completed" || step.status === "waiting_for_input") && (
                   <div className="mt-1.5 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground font-mono">
                      <Database className="w-3 h-3 inline mr-1 mb-0.5 opacity-70"/>
                      {JSON.stringify(step.output).slice(0, 100)}
                      {JSON.stringify(step.output).length > 100 && "..."}
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
