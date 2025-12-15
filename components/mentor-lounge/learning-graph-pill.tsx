"use client";

import { motion } from "motion/react";
import { Network, BookOpen, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphLearningSnapshot } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LearningGraphPillProps {
  snapshot: GraphLearningSnapshot;
}

export function LearningGraphPill({ snapshot }: LearningGraphPillProps) {
  if (!snapshot.focus_concepts.length) return null;

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border-2 border-border bg-background p-3 font-mono text-xs shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Network className="h-3 w-3" />
        <span className="font-bold uppercase tracking-wider">Learning Graph</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {snapshot.focus_concepts.map((concept) => {
          const mastery = snapshot.mastery_map[concept.name];
          const missing = snapshot.missing_prerequisites[concept.name] || [];
          
          return (
            <TooltipProvider key={concept.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "group flex cursor-help items-center gap-2 rounded-md border px-2 py-1.5 transition-colors hover:bg-muted",
                    mastery?.level === "mastered" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300" :
                    mastery?.level === "proficient" ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300" :
                    "border-border bg-background"
                  )}>
                    <span className="font-semibold">{concept.name}</span>
                    {mastery && (
                      <span className="text-[10px] opacity-70">
                        {mastery.level} • {(mastery.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {missing.length > 0 && (
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] font-sans text-xs">
                  <p className="font-semibold">{concept.type} • {concept.domain}</p>
                  {missing.length > 0 && (
                    <div className="mt-2">
                      <p className="mb-1 font-medium text-amber-500">Missing Prerequisites:</p>
                      <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                        {missing.slice(0, 3).map(m => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
