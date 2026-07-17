"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  GitBranch,
  ArrowUpRight,
  FileCode2,
  MessagesSquare,
  CircleCheck,
} from "lucide-react";
import { auditApi } from "@/lib/api";
import { trackFunnel, FUNNEL } from "@/lib/funnel";
import type { AuditReport } from "@/types";
import { DimensionMeters } from "@/components/velo/dimension-meters";
import { ClaimsTested } from "@/components/velo/claim-chips";
import { TranscriptPanel } from "@/components/velo/transcript-panel";

// VELO's marketing origin — where a recruiter/peer goes to get their own credential.
const VELO_URL = "https://excentrix.tech";

type Verdict = NonNullable<AuditReport["verification"]>["status"];

// Evidence-scale verdict theming — strong (indigo) / developing (tangerine) /
// none (neutral). Deliberately not green/red: the scale matches the cohort &
// profile reports colleges receive.
const VERDICT_THEME: Record<
  string,
  { label: string; ink: string; Icon: typeof ShieldCheck }
> = {
  verified: { label: "Verified", ink: "var(--status-strong)", Icon: ShieldCheck },
  suspicious: { label: "Flagged", ink: "var(--status-developing)", Icon: ShieldAlert },
  failed: { label: "Not defended", ink: "var(--status-none)", Icon: ShieldX },
};

function theme(status?: Verdict) {
  return VERDICT_THEME[status ?? ""] ?? VERDICT_THEME.failed;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function PublicAuditReportPage() {
  const params = useParams();
  const auditId = (params?.auditId ?? "") as string;
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auditId) return;
    auditApi
      .getPublicReport(auditId)
      .then((r) => {
        setReport(r);
        trackFunnel(FUNNEL.CREDENTIAL_VIEWED, {
          audit_id: auditId,
          status: r.verification?.status ?? r.status,
        });
      })
      .catch(() => setError("This credential is unavailable or has been revoked."));
  }, [auditId]);

  const v = report?.verification;
  const t = theme(v?.status);
  const score = v?.score != null ? Math.round(v.score * 100) : null;
  const verifiedDate = v?.verified_at
    ? new Date(v.verified_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="grain relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 340px at 12% -5%, rgb(88 88 204 / 9%), transparent 70%), radial-gradient(680px 320px at 100% 8%, rgb(236 91 19 / 7%), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8 md:py-14">
        {/* masthead */}
        <motion.header
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo/mark-color.svg" alt="" className="size-6" />
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg font-semibold tracking-tight">VELO</span>
              <span className="caseline uppercase tracking-[0.22em]">proof of work</span>
            </div>
          </div>
          {verifiedDate && (
            <span className="caseline uppercase tracking-[0.18em]">Verified {verifiedDate}</span>
          )}
        </motion.header>

        {error && <div className="mt-24 text-center font-mono-ui text-sm text-destructive">{error}</div>}

        {report && (
          <main className="flex flex-1 flex-col py-10">
            {/* ── Verdict seal ── */}
            <motion.div
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="flex flex-col items-center text-center"
            >
              <div className="relative mb-7 grid place-items-center">
                <svg width="148" height="148" viewBox="0 0 148 148" className="relative">
                  <circle cx="74" cy="74" r="68" fill="none" stroke="var(--border)" strokeWidth="2" />
                  <motion.circle
                    cx="74"
                    cy="74"
                    r="68"
                    fill="none"
                    stroke={t.ink}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 68}
                    initial={{ strokeDashoffset: 2 * Math.PI * 68 }}
                    animate={{
                      strokeDashoffset: 2 * Math.PI * 68 * (1 - (score ?? 0) / 100),
                    }}
                    transition={{ delay: 0.4, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    transform="rotate(-90 74 74)"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <t.Icon className="mb-1 size-5" style={{ color: t.ink }} />
                  {score != null ? (
                    <>
                      <span className="font-display text-4xl font-semibold leading-none tabular-nums">
                        {score}
                      </span>
                      <span className="caseline text-[9px] uppercase tracking-widest">/ 100</span>
                    </>
                  ) : (
                    <span className="caseline uppercase tracking-widest">pending</span>
                  )}
                </div>
              </div>

              <span className="stamp" style={{ color: t.ink }}>
                <t.Icon className="size-3" /> {t.label} proof of work
              </span>

              <h1 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                {v?.project_title || report.project_title}
              </h1>

              {v?.scoring_status === "scoring" && (
                <p className="caseline mt-4 uppercase">Scoring still in progress — check back shortly.</p>
              )}
              {v?.scoring_status === "scoring_failed" && (
                <p className="mt-4 font-mono-ui text-[11px] uppercase tracking-wide text-destructive">
                  Scoring failed for this interview — this credential is not yet final.
                </p>
              )}

              {v?.verdict_summary && (
                <p className="mt-4 max-w-lg text-balance text-[15px] leading-relaxed text-muted-foreground">
                  {v.verdict_summary}
                </p>
              )}
            </motion.div>

            {/* ── Graded dimensions ── */}
            {v?.dimension_scores && Object.keys(v.dimension_scores).length > 0 && (
              <motion.section custom={2} variants={fadeUp} initial="hidden" animate="show" className="mt-10">
                <p className="caseline mb-3 text-center uppercase tracking-[0.22em]">
                  Graded dimensions — tap a row for the evidence
                </p>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <DimensionMeters dimensionScores={v.dimension_scores} />
                </div>
              </motion.section>
            )}

            {/* ── Evidence stats ── */}
            <motion.section custom={3} variants={fadeUp} initial="hidden" animate="show" className="mt-10">
              <p className="caseline mb-4 text-center uppercase tracking-[0.22em]">What VELO checked</p>
              <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl border border-border bg-card/70">
                <Stat
                  icon={<MessagesSquare className="size-4" />}
                  value={v?.questions_answered ?? 0}
                  label="questions defended"
                />
                <Stat
                  icon={<FileCode2 className="size-4" />}
                  value={v?.files_analyzed ?? 0}
                  label="source files read"
                />
                <Stat
                  icon={<CircleCheck className="size-4" />}
                  value={v?.github_check_status === "passed" ? "Live" : "—"}
                  label="repo verified"
                />
              </div>

              {v?.repos && v.repos.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {v.repos.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="caseline inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 transition-colors hover:border-primary hover:text-foreground"
                    >
                      <GitBranch className="size-3" />
                      {r.url.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
                      {r.language && <span className="opacity-70">· {r.language}</span>}
                    </a>
                  ))}
                </div>
              )}
            </motion.section>

            {/* ── Resume claims, tested ── */}
            {!!v?.claims_tested?.length && (
              <motion.section custom={4} variants={fadeUp} initial="hidden" animate="show" className="mt-10">
                <p className="caseline mb-3 text-center uppercase tracking-[0.22em]">
                  Resume claims, tested against the evidence
                </p>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <ClaimsTested claims={v.claims_tested} />
                </div>
              </motion.section>
            )}

            {/* ── The full record ── */}
            {!!v?.transcript?.length && (
              <motion.section custom={5} variants={fadeUp} initial="hidden" animate="show" className="mt-10">
                <TranscriptPanel
                  turns={v.transcript.map((turn) => ({ question: turn.question, answer: turn.answer }))}
                />
              </motion.section>
            )}

            {/* ── Methodology / trust ── */}
            <motion.section
              custom={6}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-10 rounded-2xl border border-border bg-card/60 p-5"
            >
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">How this was verified.</span> VELO read
                the candidate&rsquo;s actual source code, then ran a live adaptive interrogation about
                their own implementation — probing architecture, decisions, trade-offs and debugging.
                Output is gameable; defending your work under questions that adapt to your answers is
                not. The transcript above is exactly what VELO graded — audit it yourself.
              </p>
            </motion.section>

            {/* ── CTA ── */}
            <motion.div
              custom={7}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-10 flex flex-col items-center gap-3"
            >
              <a
                href={VELO_URL}
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Get your own verified credential
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
              <span className="caseline uppercase tracking-[0.18em] opacity-70">
                excentrix.tech · proof of work in the AI era
              </span>
            </motion.div>
          </main>
        )}

        {!report && !error && (
          <div className="mt-32 flex flex-col items-center gap-3">
            <div className="size-7 animate-spin rounded-full border-2 border-border border-t-primary" />
            <p className="caseline uppercase tracking-widest">Loading credential…</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-3 py-5">
      <span className="text-(--brand-indigo)">{icon}</span>
      <span className="font-display text-2xl font-semibold tabular-nums">{value}</span>
      <span className="caseline text-center text-[9px] uppercase leading-tight">{label}</span>
    </div>
  );
}
