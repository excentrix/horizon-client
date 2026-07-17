"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { INTERROGATION_DIMENSIONS, type DimensionScores } from "@/types";

export const DIMENSION_LABELS: Record<string, string> = {
  ownership: "Ownership",
  technical_depth: "Technical depth",
  debugging_ability: "Debugging",
  communication: "Communication",
  honesty: "Honesty",
  consistency: "Consistency",
};

export const NOT_ASSESSED_MARKERS = new Set([
  "not assessed across the interview",
  "not assessed in this answer",
]);

export function statusClassForScore(score: number): string {
  if (score >= 0.75) return "status-strong";
  if (score >= 0.45) return "status-solid";
  if (score > 0) return "status-developing";
  return "status-none";
}

export function isNotAssessed(evidence?: string | null): boolean {
  return NOT_ASSESSED_MARKERS.has((evidence || "").trim().toLowerCase());
}

/**
 * The six graded dimensions as labeled meters on the evidence scale, each
 * expandable to its evidence citation — the exact sentence the examiner
 * graded from. This is also the chart's table view: name + number always
 * visible, color never carries meaning alone.
 */
export function DimensionMeters({
  dimensionScores,
  defaultOpen = false,
  className,
}: {
  dimensionScores: DimensionScores;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = INTERROGATION_DIMENSIONS.flatMap((dim) => {
    const data = dimensionScores[dim];
    return data ? [{ dim, data }] : [];
  });
  if (rows.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {rows.map(({ dim, data }) => {
        const notAssessed = isNotAssessed(data.evidence);
        const pct = Math.round(data.score * 100);
        const statusCls = notAssessed ? "status-none" : statusClassForScore(data.score);
        const isOpen = defaultOpen || expanded === dim;
        return (
          <div key={dim}>
            <button
              type="button"
              onClick={() => setExpanded(expanded === dim ? null : dim)}
              className="block w-full text-left"
              aria-expanded={isOpen}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-foreground">
                  {DIMENSION_LABELS[dim] ?? dim}
                </span>
                <span className={cn("caseline flex items-center gap-1.5 tabular-nums", statusCls)}>
                  {notAssessed ? "not assessed" : `${pct}/100`}
                  {!defaultOpen && (
                    <ChevronDown
                      className={cn("size-3 transition-transform", isOpen && "rotate-180")}
                    />
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                {!notAssessed && (
                  <div
                    className={cn("h-full rounded-full", statusCls)}
                    style={{ width: `${pct}%`, background: "currentColor" }}
                  />
                )}
              </div>
            </button>
            {isOpen && data.evidence && !notAssessed && (
              <p className="mt-1.5 border-l-2 border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
                {data.evidence}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
