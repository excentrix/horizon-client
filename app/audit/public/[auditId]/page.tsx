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

// VELO's marketing origin — where a recruiter/peer goes to get their own credential.
const VELO_URL = "https://excentrix.tech";

type Verdict = NonNullable<AuditReport["verification"]>["status"];

const VERDICT_THEME: Record<
  string,
  { label: string; ink: string; ring: string; soft: string; Icon: typeof ShieldCheck }
> = {
  verified: {
    label: "Verified",
    ink: "#0f7a52",
    ring: "#10b981",
    soft: "rgba(16,185,129,0.10)",
    Icon: ShieldCheck,
  },
  suspicious: {
    label: "Flagged",
    ink: "#a15c00",
    ring: "#e0930a",
    soft: "rgba(224,147,10,0.12)",
    Icon: ShieldAlert,
  },
  failed: {
    label: "Not defended",
    ink: "#a13a2f",
    ring: "#d6553f",
    soft: "rgba(214,85,63,0.10)",
    Icon: ShieldX,
  },
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
    <div className="relative min-h-screen overflow-hidden bg-[#fffcf5] text-[#2b2b2b]">
      {/* atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 340px at 12% -5%, rgba(88,88,204,0.10), transparent 70%), radial-gradient(680px 320px at 100% 8%, rgba(236,91,19,0.07), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8 md:py-14">
        {/* masthead */}
        <motion.header
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="flex items-center justify-between"
        >
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold tracking-tight text-[#414141]">
              VELO
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#9a9286]">
              proof of work
            </span>
          </div>
          {verifiedDate && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#9a9286]">
              Verified {verifiedDate}
            </span>
          )}
        </motion.header>

        {error && (
          <div className="mt-24 text-center font-mono text-sm text-[#a13a2f]">{error}</div>
        )}

        {report && (
          <main className="flex flex-1 flex-col justify-center py-10">
            {/* ── Verdict seal ── */}
            <motion.div
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="flex flex-col items-center text-center"
            >
              <div className="relative mb-7 grid place-items-center">
                <div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{ background: t.soft }}
                />
                <svg width="148" height="148" viewBox="0 0 148 148" className="relative">
                  <circle cx="74" cy="74" r="68" fill="none" stroke="#e7dcc2" strokeWidth="2" />
                  <motion.circle
                    cx="74"
                    cy="74"
                    r="68"
                    fill="none"
                    stroke={t.ring}
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
                  <t.Icon className="mb-1 h-5 w-5" style={{ color: t.ink }} />
                  {score != null ? (
                    <>
                      <span className="font-display text-4xl font-semibold leading-none tabular-nums text-[#2b2b2b]">
                        {score}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-[#9a9286]">
                        / 100
                      </span>
                    </>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#9a9286]">
                      pending
                    </span>
                  )}
                </div>
              </div>

              <span
                className="rounded-full px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.2em]"
                style={{ background: t.soft, color: t.ink }}
              >
                {t.label} proof of work
              </span>

              <h1 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight text-[#1f1f1f] md:text-4xl">
                {v?.project_title || report.project_title}
              </h1>

              {v?.verdict_summary && (
                <p className="mt-4 max-w-lg text-balance text-[15px] leading-relaxed text-[#5a544a]">
                  {v.verdict_summary}
                </p>
              )}
            </motion.div>

            {/* ── Evidence ── */}
            <motion.section
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-12"
            >
              <p className="mb-4 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-[#9a9286]">
                What VELO checked
              </p>
              <div className="grid grid-cols-3 divide-x divide-[#e7dcc2] overflow-hidden rounded-2xl border border-[#e7dcc2] bg-white/70">
                <Stat
                  icon={<MessagesSquare className="h-4 w-4" />}
                  value={v?.questions_answered ?? 0}
                  label="questions defended"
                />
                <Stat
                  icon={<FileCode2 className="h-4 w-4" />}
                  value={v?.files_analyzed ?? 0}
                  label="source files read"
                />
                <Stat
                  icon={<CircleCheck className="h-4 w-4" />}
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
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#e7dcc2] bg-white/70 px-3 py-1.5 font-mono text-[11px] text-[#5a544a] transition-colors hover:border-[#5858cc] hover:text-[#414141]"
                    >
                      <GitBranch className="h-3 w-3" />
                      {r.url.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
                      {r.language && <span className="text-[#9a9286]">· {r.language}</span>}
                    </a>
                  ))}
                </div>
              )}
            </motion.section>

            {/* ── Methodology / trust ── */}
            <motion.section
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-10 rounded-2xl border border-[#e7dcc2] bg-white/50 p-5"
            >
              <p className="text-[13px] leading-relaxed text-[#5a544a]">
                <span className="font-medium text-[#2b2b2b]">How this was verified.</span> VELO
                read the candidate&rsquo;s actual source code, then ran a live adaptive
                interrogation about their own implementation — probing architecture, decisions,
                trade-offs and debugging. Output is gameable; defending your work under questions
                that adapt to your answers is not. The full transcript is withheld for privacy.
              </p>
            </motion.section>

            {/* ── CTA ── */}
            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-10 flex flex-col items-center gap-3"
            >
              <a
                href={VELO_URL}
                className="group inline-flex items-center gap-2 rounded-full bg-[#414141] px-5 py-2.5 text-sm font-medium text-[#fffcf5] transition-colors hover:bg-[#2b2b2b]"
              >
                Get your own verified credential
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8b0a2]">
                excentrix.tech · proof of work in the AI era
              </span>
            </motion.div>
          </main>
        )}

        {!report && !error && (
          <div className="mt-32 flex flex-col items-center gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#e7dcc2] border-t-[#5858cc]" />
            <p className="font-mono text-xs uppercase tracking-widest text-[#9a9286]">
              Loading credential…
            </p>
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
      <span className="text-[#5858cc]">{icon}</span>
      <span className="font-display text-2xl font-semibold tabular-nums text-[#1f1f1f]">
        {value}
      </span>
      <span className="text-center font-mono text-[9px] uppercase leading-tight tracking-wide text-[#9a9286]">
        {label}
      </span>
    </div>
  );
}
