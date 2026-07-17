"use client";

import { ShieldCheck, ShieldAlert, ShieldX, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerdictStatus =
  | "unverified"
  | "evidence_submitted"
  | "interrogating"
  | "verified"
  | "failed"
  | "suspicious";

/** Statuses where finalize() has run — a real verdict exists and its full
 *  reasoning (summary, dimensions, claims, transcript) must be shown. */
export const DECIDED_STATUSES = new Set<string>(["verified", "suspicious", "failed"]);

const STAMP: Record<
  string,
  { label: string; cls: string; Icon: typeof ShieldCheck }
> = {
  verified: { label: "Verified", cls: "stamp-verified", Icon: ShieldCheck },
  suspicious: { label: "Flagged", cls: "stamp-flagged", Icon: ShieldAlert },
  failed: { label: "Not defended", cls: "stamp-failed", Icon: ShieldX },
  interrogating: { label: "In session", cls: "stamp-pending", Icon: CircleDashed },
  evidence_submitted: { label: "In session", cls: "stamp-pending", Icon: CircleDashed },
  unverified: { label: "Undefended", cls: "stamp-pending", Icon: CircleDashed },
};

/** The verdict as a record stamp — mono, bordered, evidence-scale colored.
 *  Never a green/red pill: verified is indigo (strong evidence), flagged is
 *  tangerine (developing), failed is neutral. Score rides along when known. */
export function VerdictStamp({
  status,
  score,
  className,
}: {
  status?: string;
  score?: number | null;
  className?: string;
}) {
  const s = STAMP[status ?? "unverified"] ?? STAMP.unverified;
  const Icon = s.Icon;
  return (
    <span className={cn("stamp", s.cls, className)}>
      <Icon className="size-3" />
      {s.label}
      {score != null && DECIDED_STATUSES.has(status ?? "") && (
        <span className="opacity-80">· {Math.round(score * 100)}</span>
      )}
    </span>
  );
}
