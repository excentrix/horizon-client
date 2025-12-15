"use client";

import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GuardrailsMetadata } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SafetyPillProps {
  metadata: GuardrailsMetadata;
}

export function SafetyPill({ metadata }: SafetyPillProps) {
  if (metadata.enforced) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
              <ShieldAlert className="h-3 w-3" />
              <span>Safety Override</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[250px] text-xs">
            <p className="font-semibold text-rose-500 mb-1">Intervention Required</p>
            <p>Risk Level: <span className="font-mono uppercase">{metadata.risk_level}</span></p>
            {metadata.triggered_categories && metadata.triggered_categories.length > 0 && (
               <p className="mt-1 opacity-80">Categories: {metadata.triggered_categories.join(", ")}</p>
            )}
            {metadata.notes && <p className="mt-1 italic border-t pt-1 border-border/50">{metadata.notes}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Subtle state for no issues
  return (
    <div className="mt-2 inline-flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
       <div className="inline-flex items-center gap-1 rounded-full bg-muted/50 border border-transparent px-2 py-0.5 text-[10px] text-muted-foreground hover:border-border hover:bg-muted">
        <ShieldCheck className="h-3 w-3" />
        <span>Safety check: none</span>
      </div>
    </div>
  );
}
