"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Printer, GitBranch, ShieldAlert } from "lucide-react";
import { auditApi, type PublicVerifiedProfile } from "@/lib/api";
import { trackFunnel, FUNNEL } from "@/lib/funnel";
import { DimensionMeters, statusClassForScore } from "@/components/velo/dimension-meters";
import {
  AggregateCapabilityBars,
  ProjectStackBadges,
  SCORE_BORDER_CLASS,
  SENIORITY_LABEL,
  seniorityStatusClass,
  useAggregateAxes,
} from "@/components/verified/verified-profile-view";
import { useLocalQrCode } from "@/hooks/use-local-qr";
import { cn } from "@/lib/utils";

// The candidate report — the same document colleges receive for cohorts,
// issued for one person. Print-ready (File → Print gives HR a clean PDF
// with no app chrome). Without a valid ?token= (minted by requesting the
// Hiring Profile — see /hire/<username>) this is a teaser only, same gate
// as the /p/<username>?tab=verified view — the evidence-grade dossier isn't
// open at a guessable URL anymore.

const COVERAGE_LABEL: Record<string, string> = {
  strong: "Strong sample",
  partial: "Partial sample",
  limited: "Limited sample",
  unverified: "Unverified",
  none: "No evidence",
};

export default function CandidateReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const username = (params?.username ?? "") as string;
  const token = searchParams?.get("token") ?? undefined;
  const [data, setData] = useState<PublicVerifiedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  // On paper the QR is the verification path — it points at the live profile,
  // so a printed report can't outlive or misrepresent the evidence behind it.
  const liveUrl =
    typeof window !== "undefined" && username
      ? `${window.location.origin}/p/${encodeURIComponent(username)}?tab=verified`
      : "";
  const { qrDataUrl } = useLocalQrCode(liveUrl);
  const aggregateAxes = useAggregateAxes(data?.defended_projects ?? []);
  const hasAggregateCapability = aggregateAxes.some((a) => a.score != null);
  // Strongest defended work first — same convention as the embedded view.
  const rankedProjects = useMemo(
    () => [...(data?.defended_projects ?? [])].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
    [data],
  );
  const scoredCount = rankedProjects.filter((p) => p.score != null).length;
  const avgProjectScore = scoredCount
    ? rankedProjects.reduce((sum, p) => sum + (p.score ?? 0), 0) / scoredCount
    : null;
  const contradictionCountByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of data?.verified_profile.contradictions ?? []) {
      map.set(c.project_title, (map.get(c.project_title) ?? 0) + 1);
    }
    return map;
  }, [data]);

  useEffect(() => {
    if (!username) return;
    auditApi
      .getPublicVerifiedProfile(username, token)
      .then((d) => {
        setData(d);
        trackFunnel(FUNNEL.CREDENTIAL_VIEWED, { username, surface: "report" });
      })
      .catch(() => setError("No verified report exists for this profile yet."));
  }, [username, token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <p className="text-sm font-medium">{error}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            A report is issued once at least one project has been defended.
          </p>
        </div>
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

  if (data.is_teaser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div className="max-w-sm">
          <p className="text-sm font-medium">
            {data.candidate.name} has a VELO-verified profile — {data.verified_profile.verified_project_count}/
            {data.verified_profile.claimed_project_count} projects defended.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            The full report (dimension scores, examiner notes) is only issued to hiring teams —
            request it with your work email.
          </p>
          <a
            href={`/hire/${encodeURIComponent(username)}`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Request Hiring Profile →
          </a>
        </div>
      </div>
    );
  }

  const vp = data.verified_profile;
  const issued = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground print:bg-white">
      {/* Screen-only toolbar */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <span className="caseline">Candidate report · {data.candidate.username}</span>
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
                  Verified capability report
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-right">
                <p className="caseline">Issued {issued}</p>
                <p className="caseline">velo.excentrix.tech/p/{data.candidate.username}</p>
                <p className="caseline mt-1 opacity-70">scan to verify live ↴</p>
              </div>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="QR code to the live verified profile"
                  className="size-16 rounded border border-border bg-white p-0.5"
                />
              )}
            </div>
          </div>

          <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight">
            {data.candidate.name}
          </h1>
          <p className="caseline mt-2">
            @{data.candidate.username}
            {data.claimed_role ? ` · target role: ${data.claimed_role}` : ""}
          </p>
          {vp.seniority_calibration?.level && (
            <span className={cn("stamp mt-3", seniorityStatusClass(vp.seniority_calibration.level))}>
              {SENIORITY_LABEL[vp.seniority_calibration.level] ?? vp.seniority_calibration.level}
            </span>
          )}

          {/* Vitals — the facts a 5-second skim needs, before any prose */}
          <div className="mt-5 flex flex-wrap items-stretch gap-x-10 gap-y-3 print:break-inside-avoid">
            <div>
              <p className="font-display text-3xl font-bold leading-none tabular-nums">
                {vp.verified_project_count}
                <span className="text-base font-medium opacity-50">/{vp.claimed_project_count}</span>
              </p>
              <p className="caseline mt-1">projects defended</p>
            </div>
            <div>
              <p className={cn("font-display text-3xl font-bold leading-none", vp.verified_project_count > 0 ? "status-strong" : "status-none")}>
                {COVERAGE_LABEL[vp.coverage] ?? vp.coverage}
              </p>
              <p className="caseline mt-1">{vp.confidence_note}</p>
            </div>
            {hasAggregateCapability && (
              <div>
                <AggregateCapabilityBars axes={aggregateAxes} />
                <p className="caseline mt-1.5">capability shape</p>
              </div>
            )}
          </div>
        </header>

        {/* ── Synthesis ───────────────────────────────────────────────── */}
        {vp.narrative && (
          <section className="mt-8">
            {vp.headline && (
              <p className="font-display text-xl font-semibold tracking-tight text-(--brand-indigo)">
                {vp.headline}
              </p>
            )}
            <p className="mt-2 text-[15px] leading-relaxed">{vp.narrative}</p>
            {vp.seniority_calibration?.held_to_reason && (
              <p className="caseline mt-3">
                {vp.seniority_calibration.held_to_reason}
              </p>
            )}
            {vp.calibration_reference && !vp.calibration_reference.insufficient_data && vp.calibration_reference.note && (
              <p className="caseline mt-1 text-muted-foreground">{vp.calibration_reference.note}</p>
            )}
          </section>
        )}

        {/* ── Capability vs. gaps ─────────────────────────────────────── */}
        {(!!vp.capability_verified?.length || !!vp.knowledge_gaps?.length) && (
          <section className="mt-8 grid gap-6 sm:grid-cols-2">
            {!!vp.capability_verified?.length && (
              <ReportList title="Verified capability" items={vp.capability_verified} cls="status-strong" />
            )}
            {!!vp.knowledge_gaps?.length && (
              <ReportList title="Not yet demonstrated" items={vp.knowledge_gaps} cls="status-developing" />
            )}
          </section>
        )}

        {!!vp.recommended_next_steps?.apply_now?.length && (
          <section className="mt-6">
            <ReportList
              title="Ready to apply for"
              items={vp.recommended_next_steps.apply_now}
              cls="status-solid"
            />
          </section>
        )}

        {vp.examiner_note && (
          <section className="mt-6 rounded-xl border border-dashed border-border p-4 print:break-inside-avoid">
            <p className="eyebrow mb-2 flex items-center gap-2">
              <span className="eyebrow-dot" /> Examiner&apos;s note
            </p>
            <p className="text-sm leading-relaxed">{vp.examiner_note}</p>
          </section>
        )}

        {/* ── Verified skills ─────────────────────────────────────────── */}
        {vp.verified_skills.length > 0 && (
          <section className="mt-8">
            <SectionRule title="Skills backed by defended work" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {vp.verified_skills.map((s) => (
                <span
                  key={s.skill}
                  className="status-strong inline-flex items-center rounded-md border border-(--status-strong)/40 px-2 py-0.5 text-xs font-medium"
                >
                  <span className="text-foreground/90">{s.skill}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── Defended projects — full evidence, meters open, strongest first ── */}
        <section className="mt-8">
          <SectionRule title={`Defended projects (${data.defended_projects.length})`} />
          <div className="mt-4 space-y-6">
            {rankedProjects.map((p, i) => {
              const scoreCls = p.score != null ? statusClassForScore(p.score) : "status-none";
              const delta =
                p.score != null && avgProjectScore != null && scoredCount > 1
                  ? Math.round((p.score - avgProjectScore) * 100)
                  : null;
              const contradictionCount = contradictionCountByProject.get(p.project_title) ?? 0;
              return (
              <div key={i} className="rounded-xl border border-border p-5 print:break-inside-avoid">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p className="caseline">EX-{String(i + 1).padStart(2, "0")}</p>
                      <p className="font-display text-lg font-semibold tracking-tight">{p.project_title}</p>
                      {contradictionCount > 0 && (
                        <span className="status-developing inline-flex items-center gap-1 rounded-md border border-(--status-developing)/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                          <ShieldAlert className="size-2.5" />
                          {contradictionCount > 1 ? `${contradictionCount} contradictions` : "contradicted"}
                        </span>
                      )}
                    </div>
                    <p className="caseline mt-1">
                      {p.questions_answered} questions defended
                      {p.expertise_estimate ? ` · expertise: ${p.expertise_estimate}` : ""}
                      {p.verified_at
                        ? ` · ${new Date(p.verified_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                        : ""}
                    </p>
                  </div>
                  {p.score != null && (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={cn("rounded-lg border px-3 py-1.5 font-display text-lg font-bold tabular-nums", scoreCls, SCORE_BORDER_CLASS[scoreCls])}>
                        {Math.round(p.score * 100)}
                        <span className="text-[10px] font-medium opacity-60">/100</span>
                      </span>
                      {delta != null && delta !== 0 && (
                        <span className={cn("caseline", delta > 0 ? "status-strong" : "status-developing")}>
                          {delta > 0 ? "+" : ""}
                          {delta} vs. avg
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {p.verdict_summary && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{p.verdict_summary}</p>
                )}
                {!!p.stack_reconciliation?.length && <ProjectStackBadges items={p.stack_reconciliation} />}
                {p.dimension_scores && (
                  <div className="mt-4">
                    <DimensionMeters dimensionScores={p.dimension_scores} defaultOpen />
                  </div>
                )}
                {p.repos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.repos.map((r) => (
                      <a
                        key={r.url}
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary print:border-none print:p-0 print:text-muted-foreground"
                      >
                        <GitBranch className="size-3.5 print:hidden" /> {r.url.replace(/^https?:\/\//, "")}
                        {r.language ? ` (${r.language})` : ""}
                      </a>
                    ))}
                  </div>
                )}
                {p.audit_id && (
                  <p className="caseline mt-2">
                    Full auditable credential: /audit/public/{p.audit_id}
                  </p>
                )}
              </div>
              );
            })}
          </div>
        </section>

        {/* ── Contradictions ──────────────────────────────────────────── */}
        {vp.contradictions.length > 0 && (
          <section className="mt-8 print:break-inside-avoid">
            <p className="status-developing flex items-center gap-1.5 font-mono-ui text-[11px] uppercase tracking-[0.18em]">
              <ShieldAlert className="size-3.5" /> Claim vs. evidence
            </p>
            <div className="mt-3 space-y-2">
              {vp.contradictions.map((c, i) => (
                <div key={i} className="rounded-lg border border-(--status-developing)/40 p-3">
                  <p className="text-sm font-semibold">{c.project_title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{c.note}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Methodology footer ──────────────────────────────────────── */}
        <footer className="mt-10 border-t border-border pt-5 print:break-inside-avoid">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Methodology.</span> Every score in this
            report comes from a live, adaptive interrogation grounded in the candidate&rsquo;s actual
            source code — graded per answer across ownership, technical depth, debugging, communication,
            honesty and consistency. Nothing here restates the resume; only what survived questioning
            is reported, and every project links to its full public transcript. Scores read on an
            evidence scale (strong / solid / developing), not pass-fail.
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
