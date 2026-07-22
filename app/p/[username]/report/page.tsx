"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer, GitBranch, ShieldAlert } from "lucide-react";
import { auditApi, type PublicVerifiedProfile } from "@/lib/api";
import { trackFunnel, FUNNEL } from "@/lib/funnel";
import { DimensionMeters } from "@/components/velo/dimension-meters";
import { useLocalQrCode } from "@/hooks/use-local-qr";
import { cn } from "@/lib/utils";

// The candidate report — the same document colleges receive for cohorts,
// issued for one person. Public (only verified facts), print-ready: File →
// Print gives HR a clean PDF with no app chrome.

const COVERAGE_LABEL: Record<string, string> = {
  strong: "Strong sample",
  partial: "Partial sample",
  limited: "Limited sample",
  unverified: "Unverified",
  none: "No evidence",
};

export default function CandidateReportPage() {
  const params = useParams();
  const username = (params?.username ?? "") as string;
  const [data, setData] = useState<PublicVerifiedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  // On paper the QR is the verification path — it points at the live profile,
  // so a printed report can't outlive or misrepresent the evidence behind it.
  const liveUrl =
    typeof window !== "undefined" && username
      ? `${window.location.origin}/p/${encodeURIComponent(username)}?tab=verified`
      : "";
  const { qrDataUrl } = useLocalQrCode(liveUrl);

  useEffect(() => {
    if (!username) return;
    auditApi
      .getPublicVerifiedProfile(username)
      .then((d) => {
        setData(d);
        trackFunnel(FUNNEL.CREDENTIAL_VIEWED, { username, surface: "report" });
      })
      .catch(() => setError("No verified report exists for this profile yet."));
  }, [username]);

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
            {data.claimed_role ? ` · target role: ${data.claimed_role}` : ""} ·{" "}
            <span className={vp.verified_project_count > 0 ? "status-strong" : "status-none"}>
              {(COVERAGE_LABEL[vp.coverage] ?? vp.coverage).toUpperCase()} — {vp.verified_project_count}/
              {vp.claimed_project_count} PROJECTS DEFENDED
            </span>
          </p>
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
            {vp.seniority_calibration?.level && (
              <p className="caseline mt-3">
                CALIBRATED LEVEL:{" "}
                <span className="status-strong uppercase">{vp.seniority_calibration.level}</span>
                {vp.seniority_calibration.held_to_reason && (
                  <span> — {vp.seniority_calibration.held_to_reason}</span>
                )}
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{vp.confidence_note}</p>
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

        {/* ── Defended projects — full evidence, meters open ──────────── */}
        <section className="mt-8">
          <SectionRule title={`Defended projects (${data.defended_projects.length})`} />
          <div className="mt-4 space-y-6">
            {data.defended_projects.map((p, i) => (
              <div key={i} className="rounded-xl border border-border p-5 print:break-inside-avoid">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="caseline">EX-{String(i + 1).padStart(2, "0")}</p>
                    <p className="font-display text-lg font-semibold tracking-tight">{p.project_title}</p>
                    <p className="caseline mt-1">
                      {p.questions_answered} questions defended
                      {p.expertise_estimate ? ` · expertise: ${p.expertise_estimate}` : ""}
                      {p.verified_at
                        ? ` · ${new Date(p.verified_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                        : ""}
                    </p>
                  </div>
                  {p.score != null && (
                    <span className="status-strong rounded-lg border border-(--status-strong)/40 px-3 py-1.5 font-display text-lg font-bold tabular-nums">
                      {Math.round(p.score * 100)}
                      <span className="text-[10px] font-medium opacity-60">/100</span>
                    </span>
                  )}
                </div>
                {p.verdict_summary && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{p.verdict_summary}</p>
                )}
                {p.dimension_scores && (
                  <div className="mt-4">
                    <DimensionMeters dimensionScores={p.dimension_scores} defaultOpen />
                  </div>
                )}
                {p.repos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.repos.map((r) => (
                      <span key={r.url} className="caseline inline-flex items-center gap-1">
                        <GitBranch className="size-3" /> {r.url.replace(/^https?:\/\//, "")}
                        {r.language ? ` (${r.language})` : ""}
                      </span>
                    ))}
                  </div>
                )}
                {p.audit_id && (
                  <p className="caseline mt-2">
                    Full auditable credential: /audit/public/{p.audit_id}
                  </p>
                )}
              </div>
            ))}
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
