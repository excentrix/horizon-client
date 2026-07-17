"use client";

import {
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  GitBranch,
  MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicVerifiedProfile } from "@/lib/api";
import { INTERROGATION_DIMENSIONS, type DimensionScores } from "@/types";
import { ShareActions } from "@/components/velo/share-actions";
import { isNotAssessed, DIMENSION_LABELS, statusClassForScore } from "@/components/velo/dimension-meters";

/** Lowest-density read of a project's dimension breakdown — a row of tiny
 *  status ticks. The full breakdown (bars + evidence citations) lives one
 *  click away on the project's own public credential page. */
function DimensionDots({ dimensionScores }: { dimensionScores: DimensionScores }) {
  const rows = INTERROGATION_DIMENSIONS.map((dim) => ({ dim, data: dimensionScores[dim] })).filter(
    (r) => r.data,
  );
  if (rows.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      {rows.map(({ dim, data }) => {
        if (!data) return null;
        const notAssessed = isNotAssessed(data.evidence);
        const pct = Math.round(data.score * 100);
        return (
          <span
            key={dim}
            title={`${DIMENSION_LABELS[dim] ?? dim}: ${notAssessed ? "not assessed" : `${pct}/100`}`}
            className={cn("cstat", notAssessed ? "status-none" : statusClassForScore(data.score))}
          >
            <span className="status-dot" />
            {DIMENSION_LABELS[dim] ?? dim}
            {!notAssessed && ` ${pct}`}
          </span>
        );
      })}
    </div>
  );
}

const COVERAGE_LABEL: Record<string, string> = {
  strong: "Strong sample",
  partial: "Partial sample",
  limited: "Limited sample",
  unverified: "Unverified",
  none: "No evidence",
};

/**
 * Presentational verified-capability view — the evidence-only, HR-trust lens.
 * Renders just the content blocks (no page chrome) so it embeds in the `/p/`
 * Verified tab, the /verify "Recruiter view" tab, and a standalone shell alike.
 */
export function VerifiedProfileView({
  data,
  shareUrl,
}: {
  data: PublicVerifiedProfile;
  shareUrl?: string;
}) {
  const { verified_profile: vp, defended_projects } = data;
  const covStrong = vp.coverage === "strong" || vp.coverage === "partial";

  return (
    <div className="space-y-6">
      {/* Capability synthesis — the centerpiece */}
      {vp.narrative && (
        <div className="grain relative overflow-hidden rounded-2xl border border-(--brand-indigo)/25 bg-card p-6">
          <div className="relative">
            {vp.headline && (
              <p className="font-display text-xl font-semibold tracking-tight text-(--brand-indigo)">
                {vp.headline}
              </p>
            )}
            <p className="mt-2 text-[15px] leading-relaxed text-foreground/85">{vp.narrative}</p>
            {vp.seniority_calibration?.level && (
              <p className="caseline mt-3">
                CALIBRATED LEVEL:{" "}
                <span className="status-strong uppercase">{vp.seniority_calibration.level}</span>
                {vp.seniority_calibration.held_to_reason && (
                  <span> — {vp.seniority_calibration.held_to_reason}</span>
                )}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Coverage / sample-size honesty — stated, never hidden */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
        <span className="flex flex-col items-center rounded-lg border border-border bg-muted/40 px-3 py-1.5">
          <span className="font-display text-xl font-bold leading-none tabular-nums">
            {vp.verified_project_count}
            <span className="text-xs opacity-60">/{vp.claimed_project_count}</span>
          </span>
          <span className="caseline mt-0.5 text-[8px]">defended</span>
        </span>
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold", covStrong ? "status-strong" : "status-developing")}>
            {COVERAGE_LABEL[vp.coverage] ?? vp.coverage}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{vp.confidence_note}</p>
        </div>
      </div>

      {/* What the evidence supports / doesn't */}
      {(!!vp.capability_verified?.length || !!vp.knowledge_gaps?.length) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {!!vp.capability_verified?.length && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="eyebrow mb-2.5 flex items-center gap-2">
                <span className="eyebrow-dot" /> Verified capability
              </p>
              <ul className="space-y-1.5">
                {vp.capability_verified.map((item, i) => (
                  <li key={i} className="status-strong flex items-start gap-2 text-xs">
                    <span className="status-dot mt-1.5" />
                    <span className="leading-relaxed text-foreground/85">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!vp.knowledge_gaps?.length && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="eyebrow mb-2.5 flex items-center gap-2">
                <span className="eyebrow-dot" /> Not yet demonstrated
              </p>
              <ul className="space-y-1.5">
                {vp.knowledge_gaps.map((item, i) => (
                  <li key={i} className="status-developing flex items-start gap-2 text-xs">
                    <span className="status-dot mt-1.5" />
                    <span className="leading-relaxed text-foreground/85">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {vp.examiner_note && (
        <div className="rounded-xl border border-dashed border-border bg-card/60 p-4">
          <p className="eyebrow mb-2 flex items-center gap-2">
            <span className="eyebrow-dot" /> Examiner&apos;s note
          </p>
          <p className="text-sm leading-relaxed text-foreground/85">{vp.examiner_note}</p>
        </div>
      )}

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
                className="status-strong inline-flex items-center gap-1.5 rounded-lg border border-(--status-strong)/40 bg-(--status-strong)/5 px-2.5 py-1 text-[13px] font-medium"
              >
                <ShieldCheck className="size-3" /> <span className="text-foreground/90">{s.skill}</span>
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
                  <p className="font-display text-base font-semibold tracking-tight">
                    {p.project_title}
                  </p>
                  <div className="caseline mt-1 flex flex-wrap items-center gap-3">
                    {p.expertise_estimate && <span>expertise: {p.expertise_estimate}</span>}
                    <span className="inline-flex items-center gap-1">
                      <MessagesSquare className="size-3" /> {p.questions_answered} questions defended
                    </span>
                  </div>
                </div>
                {p.score != null && (
                  <span className="status-strong rounded-lg border border-(--status-strong)/40 px-2.5 py-1 font-display text-sm font-bold tabular-nums">
                    {Math.round(p.score * 100)}
                    <span className="text-[10px] font-medium opacity-60">/100</span>
                  </span>
                )}
              </div>
              {p.dimension_scores && <DimensionDots dimensionScores={p.dimension_scores} />}
              {p.repos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.repos.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="caseline inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 hover:text-foreground"
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
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
                >
                  Full credential — verdict, dimensions, transcript <ArrowUpRight className="size-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Honesty: claim vs. evidence */}
      {vp.contradictions.length > 0 && (
        <div>
          <p className="status-developing mb-2 flex items-center gap-1.5 font-mono-ui text-[11px] uppercase tracking-[0.18em]">
            <ShieldAlert className="size-3.5" /> Claim vs. evidence
          </p>
          <div className="space-y-2">
            {vp.contradictions.map((c, i) => (
              <div
                key={i}
                className="rounded-xl border border-(--status-developing)/40 bg-(--status-developing)/5 p-3"
              >
                <p className="text-sm font-semibold">{c.project_title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{c.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {shareUrl && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="eyebrow mb-3 flex items-center gap-2">
            <span className="eyebrow-dot" /> Share this profile
          </p>
          <ShareActions
            url={shareUrl}
            label="VELO-verified profile"
            shareText={`${data.candidate.name}'s VELO-verified proof of work`}
            trackId={data.candidate.username}
          />
        </div>
      )}
    </div>
  );
}
