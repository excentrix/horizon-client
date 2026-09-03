"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Printer, ShieldCheck } from "lucide-react";
import { auditApi } from "@/lib/api";
import type { AuditInstitutionVerificationCohortReport } from "@/types";
import type { DimensionScores } from "@/types";
import { DimensionMeters } from "@/components/velo/dimension-meters";
import { useLocalQrCode } from "@/hooks/use-local-qr";
import { useInstitutionScope } from "../../../../_lib/useInstitutionScope";
import { cn } from "@/lib/utils";

// The cohort report — the same kind of document a college sends to
// recruiters, generated from real defended-evidence data instead of the
// dashboard section on /institution/reports. Authenticated (real student
// names/emails, unlike the public per-candidate report at /p/<username>/report):
// sharing it externally is "print/save as PDF, then send the file," not a
// public URL.

const SENIORITY_LABEL: Record<string, string> = { junior: "Junior", mid: "Mid", senior: "Senior" };

export default function CohortReportPrintPage() {
  const params = useParams();
  const cohortId = (params?.cohortId ?? "") as string;
  const { selectedOrgId } = useInstitutionScope();
  const [data, setData] = useState<AuditInstitutionVerificationCohortReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const liveUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/institution/reports?cohort=${encodeURIComponent(cohortId)}${
          selectedOrgId ? `&org=${encodeURIComponent(selectedOrgId)}` : ""
        }`
      : "";
  const { qrDataUrl } = useLocalQrCode(liveUrl);

  useEffect(() => {
    if (!cohortId) return;
    auditApi
      .getVerificationCohortReport(cohortId, { org: selectedOrgId || undefined })
      .then(setData)
      .catch(() => setError("Couldn't load this cohort's verification report."));
  }, [cohortId, selectedOrgId]);

  const cohortDimensionScores = useMemo<DimensionScores>(() => {
    if (!data) return {};
    const out: DimensionScores = {};
    for (const [dim, score] of Object.entries(data.avg_dimension_scores)) {
      out[dim as keyof DimensionScores] = {
        score,
        evidence: `Cohort average across ${data.total_students} verified student${data.total_students !== 1 ? "s" : ""}.`,
      };
    }
    return out;
  }, [data]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-7 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  const issued = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const seniorityRows: Array<{ key: "senior" | "mid" | "junior" | "unrated"; label: string }> = [
    { key: "senior", label: "Senior-ready" },
    { key: "mid", label: "Mid-ready" },
    { key: "junior", label: "Junior-ready" },
    { key: "unrated", label: "Not yet ready" },
  ];
  const seniorityMax = Math.max(1, ...seniorityRows.map((r) => data.seniority_distribution[r.key] ?? 0));

  return (
    <div className="min-h-screen bg-background text-foreground print:bg-white">
      {/* Screen-only toolbar */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <span className="caseline">Cohort report · {data.cohort_name}</span>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Printer className="size-3.5" /> Print / save as PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        {/* ── Report masthead ─────────────────────────────────────────── */}
        <header className="border-b-2 border-foreground pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo/mark-color.svg" alt="" className="size-7" />
              <div className="leading-none">
                <p className="font-display text-lg font-bold tracking-tight">VELO</p>
                <p className="caseline mt-0.5 text-[8.5px] uppercase tracking-[0.2em]">
                  Cohort verification report
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-right">
                <p className="caseline">Issued {issued}</p>
                {data.organization_name && <p className="caseline">{data.organization_name}</p>}
                <p className="caseline mt-1 opacity-70">scan for the live dashboard ↴</p>
              </div>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="QR code to the live cohort dashboard"
                  className="size-16 rounded border border-border bg-white p-0.5"
                />
              )}
            </div>
          </div>

          <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight">{data.cohort_name}</h1>
          <p className="caseline mt-2">
            {data.organization_name}
            {data.organization_name ? " · " : ""}
            <span className="status-strong">
              {data.total_students} student{data.total_students !== 1 ? "s" : ""} verified
            </span>
          </p>
        </header>

        {/* ── Verdict ─────────────────────────────────────────────────── */}
        <section className="mt-8">
          <p className="font-display text-xl font-semibold tracking-tight text-(--brand-indigo)">
            {data.headline}
          </p>
          <p className="caseline mt-3">
            <ShieldCheck className="mr-1 inline size-3.5" />
            {data.placement_ready_count} of {data.total_students} placement-ready (
            {Math.round(data.placement_ready_rate * 100)}%)
          </p>
        </section>

        {/* ── KPI tiles ───────────────────────────────────────────────── */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Students verified", value: data.total_students },
            { label: "Placement-ready", value: `${Math.round(data.placement_ready_rate * 100)}%` },
            { label: "Defended ≥1 project", value: data.verified_count },
            {
              label: "Senior-ready",
              value: data.seniority_distribution.senior,
            },
          ].map((tile) => (
            <div key={tile.label} className="rounded-xl border border-border p-4 print:break-inside-avoid">
              <p className="font-display text-2xl font-bold tabular-nums">{tile.value}</p>
              <p className="caseline mt-1">{tile.label}</p>
            </div>
          ))}
        </section>

        {/* ── Readiness distribution + dimension breakdown ───────────── */}
        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="print:break-inside-avoid">
            <SectionRule title="Readiness distribution" />
            <div className="mt-3 space-y-2.5">
              {seniorityRows.map((row) => {
                const count = data.seniority_distribution[row.key] ?? 0;
                const pct = Math.round((count / seniorityMax) * 100);
                return (
                  <div key={row.key} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 text-foreground/80">{row.label}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          row.key === "senior" || row.key === "mid" ? "status-strong" : "status-none"
                        )}
                        style={{ width: `${pct}%`, background: "currentColor" }}
                      />
                    </div>
                    <span className="caseline w-6 text-right tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="print:break-inside-avoid">
            <SectionRule title="Cohort dimension averages" />
            <div className="mt-3">
              <DimensionMeters dimensionScores={cohortDimensionScores} defaultOpen />
            </div>
          </div>
        </section>

        {/* ── Top knowledge gaps ──────────────────────────────────────── */}
        {data.top_claimed_unverified_skills.length > 0 && (
          <section className="mt-8 print:break-inside-avoid">
            <SectionRule title="Top knowledge gaps across the cohort — the training targets" />
            <div className="mt-3 space-y-2.5">
              {data.top_claimed_unverified_skills.slice(0, 5).map((gap) => {
                const pct = Math.round((gap.count / data.total_students) * 100) || 0;
                return (
                  <div key={gap.skill} className="flex items-center gap-2 text-xs">
                    <span className="w-40 shrink-0 truncate text-foreground/80">{gap.skill}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="status-developing h-full rounded-full"
                        style={{ width: `${pct}%`, background: "currentColor" }}
                      />
                    </div>
                    <span className="caseline w-10 text-right tabular-nums">{gap.count}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Students claiming this skill whom the interrogation never actually probed on it — the
              highest-leverage things to teach before the season.
            </p>
          </section>
        )}

        {/* ── Showcase shortlist ──────────────────────────────────────── */}
        {data.showcase_shortlist.length > 0 && (
          <section className="mt-8">
            <SectionRule title="Showcase shortlist — verified students to send recruiters" />
            <div className="mt-3 divide-y divide-border rounded-xl border border-border print:break-inside-avoid">
              <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>Student</span>
                <span>Readiness</span>
                <span>Strongest, verified</span>
                <span>Projects</span>
              </div>
              {data.showcase_shortlist.map((s) => (
                <a
                  key={s.student_id}
                  href={`/p/${s.username}?tab=verified`}
                  className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/40"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className={cn("caseline", s.seniority === "senior" ? "status-strong" : "status-solid")}>
                    {s.seniority ? SENIORITY_LABEL[s.seniority] : "—"}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {s.top_verified_skills.join(", ") || "—"}
                  </span>
                  <span className="caseline">{s.verified_project_count}</span>
                </a>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Each name links to that student&apos;s full verified profile — the transcript and the code
              VELO read — so a recruiter re-judges in two minutes.
            </p>
          </section>
        )}

        {/* ── Recommendations ─────────────────────────────────────────── */}
        <section className="mt-8 grid gap-6 sm:grid-cols-2 print:break-inside-avoid">
          <ReportList title="Train the batch on" items={data.recommendations.train_on} cls="status-developing" />
          <ReportList title="Showcase now" items={data.recommendations.showcase_now} cls="status-strong" />
        </section>

        {/* ── Methodology footer ──────────────────────────────────────── */}
        <footer className="mt-10 border-t border-border pt-5 print:break-inside-avoid">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">How to read this.</span> Every number here
            rolls up from individual reports you can open — each ships with the student&rsquo;s full
            interrogation transcript and the exact source files VELO read. Auditable, not authoritative;
            the bar is calibrated to fail, not flatter.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Figures shown are for one cohort — a limited sample of a program.
          </p>
          <p className="caseline mt-3">
            VELO by excentrix · Bangalore · excentrix.tech · report generated {issued}
          </p>
        </footer>
      </div>
    </div>
  );
}

function SectionRule({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className="eyebrow flex shrink-0 items-center gap-2">
        <span className="eyebrow-dot" /> {title}
      </p>
      <div className="rule" />
    </div>
  );
}

function ReportList({ title, items, cls }: { title: string; items: string[]; cls: string }) {
  return (
    <div className="print:break-inside-avoid">
      <SectionRule title={title} />
      <ul className="mt-3 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className={cn("flex items-start gap-2.5 text-sm", cls)}>
            <span className="status-dot mt-1.5" />
            <span className="leading-relaxed text-foreground/90">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
