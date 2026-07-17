"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type TranscriptEntry = {
  question: string;
  answer: string;
  area?: string | null;
};

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
  if (!turns.length) return null;

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
