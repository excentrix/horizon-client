"use client";

import { Shield, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import type { GuardrailsMetadata, SafetyMetadata } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SafetyPillProps {
  metadata?: GuardrailsMetadata;
  safety?: SafetyMetadata;
}

export function SafetyPill({ metadata, safety }: SafetyPillProps) {
  const isEnforced = metadata?.enforced || safety?.flagged;
  const riskLevel = safety?.label || metadata?.risk_level;
  const score = safety?.score !== undefined ? Math.round(safety.score * 100) : null;
  const categories = Array.from(new Set([
    ...(metadata?.triggered_categories || []),
    ...(safety?.categories || [])
  ]));

  if (isEnforced) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300 cursor-help">
              <ShieldAlert className="h-3 w-3" />
              <span>Safety Intervention</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[250px] text-xs">
            <div className="space-y-1">
              <p className="font-semibold text-rose-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Potential Incident
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground my-1">
                 {riskLevel && <div>Risk: <span className="font-mono uppercase text-foreground">{riskLevel}</span></div>}
                 {score !== null && <div>Score: <span className="font-mono text-foreground">{score}%</span></div>}
              </div>
              
              {categories.length > 0 && (
                 <div className="border-t pt-1 mt-1 border-border/50">
                    <span className="opacity-70">Categories:</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {categories.map(c => (
                        <span key={c} className="bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 px-1 rounded-[2px]">{c}</span>
                      ))}
                    </div>
                 </div>
              )}
              
              {metadata?.notes && <p className="mt-1 italic border-t pt-1 border-border/50 opacity-80">{metadata.notes}</p>}
              {safety?.block_reason && <p className="mt-1 text-rose-600/80">{safety.block_reason}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Safe state
  // Only show if we actually have some metadata or score to show
  if (!metadata && !safety) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="mt-2 inline-flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity cursor-help">
             <div className="inline-flex items-center gap-1 rounded-full bg-muted/50 border border-transparent px-2 py-0.5 text-[10px] text-muted-foreground hover:border-border hover:bg-muted">
              {score && score > 80 ? <Shield className="h-3 w-3 text-amber-500" /> : <ShieldCheck className="h-3 w-3" />}
              <span>Safety check: {score !== null ? `${score}%` : "passed"}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Pass | Score: {score ?? "N/A"}% | Label: {safety?.label ?? "Safe"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
