"use client";

import {
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  GitBranch,
  MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { auditApi } from "@/lib/api";

type VerifiedProfileData = Awaited<ReturnType<typeof auditApi.getPublicVerifiedProfile>>;

const COVERAGE_THEME: Record<string, { label: string; cls: string }> = {
  strong: { label: "Strong sample", cls: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300" },
  partial: { label: "Partial sample", cls: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300" },
  limited: { label: "Limited sample", cls: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300" },
  unverified: { label: "Unverified", cls: "border-border bg-muted text-muted-foreground" },
  none: { label: "No evidence", cls: "border-border bg-muted text-muted-foreground" },
};

/**
 * Presentational verified-capability view — the evidence-only, HR-trust lens.
 * Renders just the content blocks (no page chrome) so it embeds in the `/p/`
 * Verified tab and in a standalone shell alike.
 */
export function VerifiedProfileView({ data }: { data: VerifiedProfileData }) {
  const { verified_profile: vp, defended_projects } = data;
  const cov = COVERAGE_THEME[vp.coverage] ?? COVERAGE_THEME.none;

  return (
    <div className="space-y-6">
      {/* Capability synthesis — the centerpiece */}
      {vp.narrative && (
        <div className="rounded-2xl border border-[color:var(--brand-indigo)]/25 bg-card p-6">
          {vp.headline && (
            <p className="mb-2 font-display text-lg font-semibold text-[color:var(--brand-indigo)]">
              {vp.headline}
            </p>
          )}
          <p className="text-[15px] leading-relaxed text-foreground/80">{vp.narrative}</p>
        </div>
      )}

      {/* Coverage / sample-size honesty */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <span className={cn("flex flex-col items-center rounded-lg border px-3 py-1.5", cov.cls)}>
          <span className="font-display text-xl font-bold leading-none tabular-nums">
            {vp.verified_project_count}
            <span className="text-xs opacity-60">/{vp.claimed_project_count}</span>
          </span>
          <span className="mt-0.5 text-[8px] uppercase tracking-wide opacity-80">defended</span>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{cov.label}</p>
          <p className="text-xs text-muted-foreground">{vp.confidence_note}</p>
        </div>
      </div>

      {/* Skills backed by defended work */}
      {vp.verified_skills.length > 0 && (
        <div>
          <p className="eyebrow mb-2 flex items-center gap-2">
            <span className="eyebrow-dot" /> Backed by defended work
          </p>
          <div className="flex flex-wrap gap-1.5">
            {vp.verified_skills.map((s) => (
              <span
                key={s.skill}
                title={`Defended in: ${s.via_projects.join(", ")}`}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[13px] font-medium text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              >
                <ShieldCheck className="size-3" /> {s.skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Defended projects — the evidence */}
      <div>
        <p className="eyebrow mb-3 flex items-center gap-2">
          <span className="eyebrow-dot" /> Defended projects
        </p>
        <div className="space-y-3">
          {defended_projects.map((p, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold">{p.project_title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
                    {p.expertise_estimate && <span>expertise: {p.expertise_estimate}</span>}
                    <span className="inline-flex items-center gap-1">
                      <MessagesSquare className="size-3" /> {p.questions_answered} defended
                    </span>
                  </div>
                </div>
                {p.score != null && (
                  <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-display text-sm font-bold text-emerald-800 tabular-nums dark:bg-emerald-950/40 dark:text-emerald-300">
                    {Math.round(p.score * 100)}
                    <span className="text-[10px] font-medium opacity-60">/100</span>
                  </span>
                )}
              </div>
              {p.repos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.repos.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground/80 hover:bg-muted/70"
                    >
                      <GitBranch className="size-3" /> {r.label}
                      {r.language ? ` · ${r.language}` : ""}
                    </a>
                  ))}
                </div>
              )}
              {p.audit_id && (
                <a
                  href={`/audit/public/${p.audit_id}`}
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[color:var(--brand-indigo)] hover:underline"
                >
                  View full credential <ArrowUpRight className="size-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Honesty: claim vs. evidence */}
      {vp.contradictions.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-rose-700 dark:text-rose-400">
            <ShieldAlert className="size-3.5" /> Claim vs. evidence
          </p>
          <div className="space-y-2">
            {vp.contradictions.map((c, i) => (
              <div key={i} className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/40 dark:bg-rose-950/15">
                <p className="text-sm font-semibold">{c.project_title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
