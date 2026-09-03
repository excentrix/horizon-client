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

/** A single dimension's score as a small ring — summary text sits to its
 *  left, the ring to its right, so a stack of these reads as a list of
 *  findings each with its own self-contained dial, not a shared chart axis
 *  running down the page. */
function DimensionRing({
  pct,
  notAssessed,
  statusCls,
  size = 52,
}: {
  pct: number;
  notAssessed: boolean;
  statusCls: string;
  size?: number;
}) {
  const strokeWidth = 4.5;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - (notAssessed ? 0 : Math.max(pct, 0) / 100));
  return (
    <div className={cn("relative shrink-0", statusCls)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        {!notAssessed && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-[13px] font-bold tabular-nums text-foreground">
        {notAssessed ? "—" : pct}
      </span>
    </div>
  );
}

/**
 * The six graded dimensions as labeled meters on the evidence scale, each
 * expandable to its evidence citation — the exact sentence the examiner
 * graded from. This is also the chart's table view: name + number always
 * visible, color never carries meaning alone.
 *
 * `defaultOpen` doubles as the "print/document" variant (used by the
 * standalone candidate report and the cohort PDF, where every dimension is
 * always shown, never toggled): instead of a full-width progress bar under
 * each label — six of them stacked per project reads as a bar chart bolted
 * onto a text document — the label and evidence sit on the left with a
 * small self-contained score ring on the right, so each dimension reads as
 * one finding rather than a row on a shared chart axis. The interactive
 * click-to-expand variant (verdict screen, public credential page) is
 * unchanged.
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

  if (defaultOpen) {
    return (
      <div className={cn("space-y-4", className)}>
        {rows.map(({ dim, data }) => {
          const notAssessed = isNotAssessed(data.evidence);
          const pct = Math.round(data.score * 100);
          const statusCls = notAssessed ? "status-none" : statusClassForScore(data.score);
          return (
            <div key={dim} className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{DIMENSION_LABELS[dim] ?? dim}</p>
                {data.evidence && !notAssessed && (
                  <p className="mt-1.5 border-l-2 border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
                    {data.evidence}
                  </p>
                )}
              </div>
              <DimensionRing pct={pct} notAssessed={notAssessed} statusCls={statusCls} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {rows.map(({ dim, data }) => {
        const notAssessed = isNotAssessed(data.evidence);
        const pct = Math.round(data.score * 100);
        const statusCls = notAssessed ? "status-none" : statusClassForScore(data.score);
        const isOpen = expanded === dim;
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
                  <ChevronDown className={cn("size-3 transition-transform", isOpen && "rotate-180")} />
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
