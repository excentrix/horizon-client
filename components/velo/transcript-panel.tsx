"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TurnReasoning } from "@/types";
import {
  DIMENSION_LABELS,
  isNotAssessed,
  statusClassForScore,
} from "@/components/velo/dimension-meters";
import { INTERROGATION_DIMENSIONS } from "@/types";

export type TranscriptEntry = {
  question: string;
  answer: string;
  area?: string | null;
  gradingStatus?: "scored" | "pending" | "failed" | "not_graded";
  reasoning?: TurnReasoning | null;
};

/** Compact per-turn version of DimensionMeters — same evidence-scale
 * language (status color, evidence citation), scoped to one answer instead
 * of the aggregate. */
function TurnReasoningBlock({ reasoning }: { reasoning: TurnReasoning }) {
  const rows = INTERROGATION_DIMENSIONS.flatMap((dim) => {
    const data = reasoning.dimensions[dim];
    return data && !isNotAssessed(data.evidence) ? [{ dim, data }] : [];
  });

  return (
    <div className="mt-3 space-y-2.5 rounded-lg border border-border/70 bg-muted/30 p-3">
      <p className="eyebrow flex items-center gap-2">
        <span className="eyebrow-dot" /> Why this scored the way it did
      </p>
      {rows.length > 0 && (
        <div className="space-y-1.5">
          {rows.map(({ dim, data }) => {
            const pct = Math.round(data.score * 100);
            const statusCls = statusClassForScore(data.score);
            return (
              <div key={dim} className="text-[11px] leading-relaxed">
                <span className={cn("font-medium tabular-nums", statusCls)}>
                  {pct}/100
                </span>{" "}
                <span className="font-medium text-foreground">{DIMENSION_LABELS[dim] ?? dim}</span>
                {data.evidence && (
                  <span className="text-muted-foreground"> — &ldquo;{data.evidence}&rdquo;</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {reasoning.grounding_note && (
        <p className="text-[11px] italic leading-relaxed text-muted-foreground">
          {reasoning.grounding_note}
        </p>
      )}
      {reasoning.contradiction && (
        <p className="status-developing rounded-md border border-current/30 bg-current/10 px-2 py-1.5 text-[11px] leading-relaxed">
          <span className="font-medium">Contradiction flagged: </span>
          <span className="text-foreground">
            {reasoning.contradiction.note ||
              `Conflicts with an earlier answer: "${reasoning.contradiction.prior_claim_excerpt ?? ""}"`}
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * The full interrogation transcript — shown pass or fail. This is the whole
 * credibility model ("auditable, not authoritative"): the reader can re-judge
 * the interview themselves. Collapsed by default in scan contexts, open on
 * credential pages.
 */
export function TranscriptPanel({
  turns,
  defaultOpen = false,
  className,
}: {
  turns: TranscriptEntry[];
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [reasoningOpen, setReasoningOpen] = useState<Set<number>>(new Set());
  if (!turns.length) return null;

  const toggleReasoning = (i: number) => {
    setReasoningOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 bg-muted/40 px-4 py-3 text-left"
      >
        <span className="eyebrow flex items-center gap-2">
          <span className="eyebrow-dot" /> Interrogation transcript
        </span>
        <span className="caseline flex items-center gap-1.5">
          {turns.length} question{turns.length !== 1 ? "s" : ""}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="divide-y divide-border bg-card">
          {turns.map((turn, i) => (
            <div key={i} className="px-4 py-4">
              <p className="caseline">
                Q{String(i + 1).padStart(2, "0")}
                {turn.area ? ` · ${turn.area.toUpperCase()}` : ""} · VELO — Examiner
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{turn.question}</p>
              <p className="caseline mt-3">Candidate</p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                {turn.answer || <span className="text-muted-foreground">(no answer recorded)</span>}
              </p>
              {turn.reasoning ? (
                <>
                  <button
                    type="button"
                    onClick={() => toggleReasoning(i)}
                    aria-expanded={reasoningOpen.has(i)}
                    className="caseline mt-3 flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    Why this scored the way it did
                    <ChevronDown
                      className={cn("size-3 transition-transform", reasoningOpen.has(i) && "rotate-180")}
                    />
                  </button>
                  {reasoningOpen.has(i) && <TurnReasoningBlock reasoning={turn.reasoning} />}
                </>
              ) : (
                turn.gradingStatus === "pending" && (
                  <p className="caseline mt-3 text-muted-foreground">Still grading…</p>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
