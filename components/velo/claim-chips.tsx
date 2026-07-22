"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClaimTested } from "@/types";

const CLAIM_LABEL: Record<ClaimTested["status"], string> = {
  verified: "Confirmed",
  partially_verified: "Partially confirmed",
  contradicted: "Contradicted",
  not_demonstrated: "Not demonstrated",
};

const CLAIM_CLASS: Record<ClaimTested["status"], string> = {
  verified: "status-strong",
  partially_verified: "status-solid",
  contradicted: "status-developing",
  not_demonstrated: "status-none",
};

/**
 * Resume claims tested against the transcript + real code — each one
 * expandable to the evidence behind its verdict. This is the honesty layer:
 * what the resume said vs. what survived cross-examination.
 */
export function ClaimsTested({
  claims,
  className,
}: {
  claims: ClaimTested[];
  className?: string;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  if (!claims.length) return null;

  return (
    <ul className={cn("space-y-2", className)}>
      {claims.map((c, i) => {
        const isOpen = expanded === i;
        const claimText = c.claim ?? c.claim_text ?? "";
        const evidenceText = c.evidence ?? c.note ?? "";
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : i)}
              className="flex w-full items-start justify-between gap-3 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-xs leading-relaxed text-foreground/90">&ldquo;{claimText}&rdquo;</span>
              <span className={cn("cstat mt-0.5 shrink-0", CLAIM_CLASS[c.status])}>
                <span className="status-dot" />
                {CLAIM_LABEL[c.status]}
                <ChevronDown className={cn("size-3 transition-transform", isOpen && "rotate-180")} />
              </span>
            </button>
            {isOpen && evidenceText && (
              <p className="mt-1.5 border-l-2 border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
                {evidenceText}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Compact inline read of the same claims for scan-many contexts. */
export function ClaimChipsInline({ claims }: { claims: ClaimTested[] }) {
  if (!claims.length) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {claims.map((c, i) => (
        <span key={i} title={c.evidence ?? c.note} className={cn("cstat", CLAIM_CLASS[c.status])}>
          <span className="status-dot" />
          {c.claim ?? c.claim_text ?? "Untitled claim"} · {CLAIM_LABEL[c.status].toLowerCase()}
        </span>
      ))}
    </div>
  );
}
