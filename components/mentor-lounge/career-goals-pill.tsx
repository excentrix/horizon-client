"use client";

import { Target, Briefcase, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphCareerSnapshot } from "@/types";
import { Badge } from "@/components/ui/badge";

interface CareerGoalsPillProps {
  snapshot: GraphCareerSnapshot;
}

export function CareerGoalsPill({ snapshot }: CareerGoalsPillProps) {
  if (!snapshot.goals.length) return null;

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border-2 border-border bg-background p-3 font-mono text-xs shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Target className="h-3 w-3" />
        <span className="font-bold uppercase tracking-wider">Career Alignment</span>
      </div>

      <div className="space-y-2">
        {snapshot.goals.map((goal) => (
          <div key={goal.id} className="rounded-md border bg-muted/30 p-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-semibold">{goal.title}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {goal.domains?.filter(d => typeof d === 'string').map(d => (
                    <span key={d} className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] bg-background text-muted-foreground border">
                      <Briefcase className="h-2 w-2" /> {d}
                    </span>
                  ))}
                </div>
              </div>
              <Badge variant="outline" className={cn(
                "rounded-none border-b-2 px-1.5 py-0 text-[10px] uppercase",
                goal.status === "in_progress" ? "border-b-blue-500 text-blue-500" :
                goal.status === "completed" ? "border-b-emerald-500 text-emerald-500" :
                "text-muted-foreground"
              )}>
                {goal.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
