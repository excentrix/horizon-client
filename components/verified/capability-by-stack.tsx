import { AlertTriangle, CircleDashed, ShieldCheck } from "lucide-react";
import type { CapabilityByStackRow } from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<string, string> = {
  framework: "Frameworks",
  datastore: "Data stores",
  infra: "Infrastructure",
  language: "Languages",
  library: "Libraries",
  testing: "Testing",
  build: "Build & tooling",
  other: "Other",
};
const CATEGORY_ORDER = [
  "framework", "datastore", "infra", "language", "library", "testing", "build", "other",
];

const STATUS_META: Record<
  CapabilityByStackRow["status"],
  { label: string; className: string; Icon: typeof ShieldCheck }
> = {
  verified: {
    label: "Defended under interrogation",
    className: "status-strong border-(--status-strong)/40 bg-(--status-strong)/5 text-foreground/90",
    Icon: ShieldCheck,
  },
  partial: {
    label: "Present, but the claim overshoots the code",
    className: "border-(--status-developing)/40 bg-(--status-developing)/5 text-foreground/80",
    Icon: AlertTriangle,
  },
  unsubstantiated: {
    label: "On the résumé, no trace in the repo",
    className: "status-none border-(--status-none)/40 bg-(--status-none)/5 text-foreground/80",
    Icon: AlertTriangle,
  },
  claimed_unverified: {
    label: "Claimed, but the interrogation never probed it",
    className: "border-border bg-muted/30 text-muted-foreground",
    Icon: CircleDashed,
  },
  undisclosed_in_code: {
    label: "In the repo, not listed on the résumé",
    className: "border-border bg-card text-muted-foreground",
    Icon: CircleDashed,
  },
};

/**
 * The evidence-gated capability picture, grouped by the tech-stack areas VELO
 * detected in the actual repos — replaces the flat verified-skills /
 * claimed-unverified chip lists.
 */
export function CapabilityByStack({ rows }: { rows: CapabilityByStackRow[] }) {
  if (!rows.length) return null;

  const byCategory = new Map<string, CapabilityByStackRow[]>();
  for (const r of rows) {
    const arr = byCategory.get(r.category) ?? [];
    arr.push(r);
    byCategory.set(r.category, arr);
  }
  const categories = [...byCategory.keys()].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b),
  );

  return (
    <div className="space-y-4">
      {categories.map((cat) => (
        <div key={cat}>
          <p className="caseline mb-1.5">{CATEGORY_LABEL[cat] ?? cat}</p>
          <div className="flex flex-wrap gap-1.5">
            {byCategory.get(cat)!.map((r) => {
              const meta = STATUS_META[r.status];
              const Icon = meta.Icon;
              const via = r.via_projects.length
                ? `${meta.label} — ${r.via_projects.join(", ")}`
                : meta.label;
              return (
                <span
                  key={`${r.area}-${r.status}`}
                  title={via}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-medium",
                    meta.className,
                  )}
                >
                  <Icon className="size-3 shrink-0" />
                  <span className="text-foreground/90">{r.area}</span>
                  {r.status === "verified" && r.evidence_count > 0 && (
                    <span className="caseline">×{r.evidence_count}</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
