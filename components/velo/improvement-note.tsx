import { cn } from "@/lib/utils";
import { DIMENSION_LABELS } from "@/components/velo/dimension-meters";
import type { ImprovementNote } from "@/types";

/**
 * Project-scoped "how to improve" guidance — distinct from the person-level
 * examiner note/knowledge gaps on the verified profile (that one is
 * cross-project). This one is generated once per finalize(), grounded in
 * this project's own transcript, and tells the candidate what specifically
 * would have changed the outcome.
 */
export function ImprovementNoteCard({
  note,
  className,
}: {
  note: ImprovementNote;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-sm leading-relaxed text-foreground/85">{note.summary}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
          <p className="status-strong text-[11px] font-medium">
            Strongest — {DIMENSION_LABELS[note.strongest_dimension] ?? note.strongest_dimension}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{note.strongest_reason}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
          <p className="status-developing text-[11px] font-medium">
            Weakest — {DIMENSION_LABELS[note.weakest_dimension] ?? note.weakest_dimension}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{note.weakest_reason}</p>
        </div>
      </div>
      {note.actions.length > 0 && (
        <ul className="space-y-2">
          {note.actions.map((action, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-foreground">
              <span className="caseline mt-0.5 shrink-0 text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              {action}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
