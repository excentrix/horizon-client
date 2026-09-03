"use client";

import { useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  ChevronDown,
  GitBranch,
  MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicVerifiedProfile, DefendedProject, StackReconciliationItem } from "@/lib/api";
import { INTERROGATION_DIMENSIONS, type DimensionScores } from "@/types";
import { ShareActions } from "@/components/velo/share-actions";
import { isNotAssessed, DIMENSION_LABELS, statusClassForScore } from "@/components/velo/dimension-meters";
import { CapabilityByStack } from "@/components/verified/capability-by-stack";

/** A project's dimension breakdown as an actual shape, not six numbers to
 *  read — six thin bars, height = score, color on the evidence scale. Reads
 *  in under a second; the exact number is still one hover away. The full
 *  meters (with evidence citations) live one click away on the project's own
 *  public credential page. */
function DimensionBars({ dimensionScores }: { dimensionScores: DimensionScores }) {
  const rows = INTERROGATION_DIMENSIONS.map((dim) => ({ dim, data: dimensionScores[dim] }));
  if (rows.every((r) => !r.data)) return null;

  return (
    <div className="mt-2.5 flex items-end gap-1">
      {rows.map(({ dim, data }) => {
        const label = DIMENSION_LABELS[dim] ?? dim;
        if (!data) {
          return (
            <span
              key={dim}
              title={`${label}: not assessed`}
              className="h-6 w-2 rounded-full bg-muted/60"
            />
          );
        }
        const notAssessed = isNotAssessed(data.evidence);
        const pct = notAssessed ? 0 : Math.round(data.score * 100);
        const fillPct = notAssessed ? 6 : Math.max(pct, 8);
        const statusCls = notAssessed ? "status-none" : statusClassForScore(data.score);
        return (
          <span
            key={dim}
            title={`${label}: ${notAssessed ? "not assessed" : `${pct}/100`}`}
            className={cn("flex h-6 w-2 items-end rounded-full bg-muted/60", statusCls)}
          >
            <span
              className="w-full rounded-full"
              style={{ height: `${fillPct}%`, background: "currentColor" }}
            />
          </span>
        );
      })}
    </div>
  );
}

export type AggregateAxis = { dim: string; score: number | null };

/** Average each dimension across every defended project — the person-level
 *  capability shape, the same aggregate the candidate sees on `/verify`. One
 *  glance replaces reading six numbers per project times N projects. */
export function useAggregateAxes(defendedProjects: DefendedProject[]): AggregateAxis[] {
  return useMemo(() => {
    return INTERROGATION_DIMENSIONS.map((dim) => {
      const scores: number[] = [];
      for (const p of defendedProjects) {
        const d = p.dimension_scores?.[dim];
        if (!d || isNotAssessed(d.evidence)) continue;
        scores.push(d.score);
      }
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return { dim, score: avg };
    });
  }, [defendedProjects]);
}

/** The hero's "capability shape" — one bar per dimension, tall enough to
 *  actually resolve at a glance (unlike the compact per-project version). */
export function AggregateCapabilityBars({ axes }: { axes: AggregateAxis[] }) {
  return (
    <div className="flex items-end gap-1.5">
      {axes.map(({ dim, score }) => {
        const label = DIMENSION_LABELS[dim] ?? dim;
        const statusCls = score == null ? "status-none" : statusClassForScore(score);
        const fillPct = score == null ? 6 : Math.max(Math.round(score * 100), 8);
        return (
          <span
            key={dim}
            title={`${label}: ${score != null ? `${Math.round(score * 100)}/100` : "not assessed"}`}
            className={cn("flex h-11 w-2.5 items-end rounded-full bg-muted/60", statusCls)}
          >
            <span className="w-full rounded-full" style={{ height: `${fillPct}%`, background: "currentColor" }} />
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

export const SENIORITY_LABEL: Record<string, string> = {
  senior: "Senior-calibrated",
  mid: "Mid-calibrated",
  junior: "Junior-calibrated",
};

/** Per-status border color for the score badge — mirrors the border colors
 *  already used inline elsewhere in this file (`border-(--status-strong)/40`
 *  etc.), just keyed by the same class `statusClassForScore` returns so a
 *  project's badge border always matches its actual score, not a fixed
 *  "everything is indigo" default. */
export const SCORE_BORDER_CLASS: Record<string, string> = {
  "status-strong": "border-(--status-strong)/40",
  "status-solid": "border-(--status-solid)/40",
  "status-developing": "border-(--status-developing)/40",
  "status-none": "border-(--status-none)/40",
};

const STACK_STATUS_CLASS: Record<StackReconciliationItem["status"], string> = {
  confirmed: "status-strong",
  partial: "status-solid",
  undisclosed: "status-developing",
  unsubstantiated: "status-none",
};

/** Per-project claimed-vs-code reconciliation, as a compact badge row —
 *  today this only lives in the person-level "Capability by stack" rollup,
 *  disconnected from which specific project it came from. Surfacing it here
 *  makes each exhibit self-contained: what tech did THIS project confirm,
 *  and what did it claim but never substantiate. Capped so one noisy stack
 *  doesn't dominate the card; the rest is a hover-away "+N more". */
export function ProjectStackBadges({ items }: { items: StackReconciliationItem[] }) {
  if (items.length === 0) return null;
  const shown = items.slice(0, 4);
  const hiddenCount = items.length - shown.length;
  const hiddenNames = items.slice(4).map((it) => it.tech);
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {shown.map((it) => (
        <span
          key={it.tech}
          title={it.note}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium",
            STACK_STATUS_CLASS[it.status],
            SCORE_BORDER_CLASS[STACK_STATUS_CLASS[it.status]],
          )}
        >
          <span className="status-dot" /> {it.tech}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span
          title={hiddenNames.join(", ")}
          className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground"
        >
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}

export function seniorityStatusClass(level?: string | null): string {
  if (level === "senior") return "status-strong";
  if (level === "mid") return "status-solid";
  if (level === "junior") return "status-developing";
  return "status-none";
}

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
  const aggregateAxes = useAggregateAxes(defended_projects);
  const hasAggregateRadar = aggregateAxes.some((a) => a.score != null);
  const topSkills = vp.verified_skills.slice(0, 6);

  // Strongest defended work first — the exhibit numbering ("EX-01") is what
  // gets read, so it should point at the strongest evidence, not just
  // whatever order the backend happened to return.
  const rankedProjects = useMemo(
    () => [...defended_projects].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
    [defended_projects],
  );
  const scoredCount = rankedProjects.filter((p) => p.score != null).length;
  const avgProjectScore = scoredCount
    ? rankedProjects.reduce((sum, p) => sum + (p.score ?? 0), 0) / scoredCount
    : null;
  const [showAllProjects, setShowAllProjects] = useState(false);
  const VISIBLE_PROJECT_CAP = 3;
  const visibleProjects = showAllProjects ? rankedProjects : rankedProjects.slice(0, VISIBLE_PROJECT_CAP);
  const hiddenProjectCount = rankedProjects.length - visibleProjects.length;

  // Contradiction count per project, so the exhibit itself can flag "see the
  // honesty section below" instead of making the reader match project names
  // across two disconnected parts of the page.
  const contradictionCountByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of vp.contradictions) {
      map.set(c.project_title, (map.get(c.project_title) ?? 0) + 1);
    }
    return map;
  }, [vp.contradictions]);

  // Bare/no-token view — the fix for the enumerable-public-profile gap. This
  // is enough to know a verified profile exists; the evidence-grade dossier
  // (dimension scores, contradictions, examiner notes) requires a Hiring
  // Profile access request. See PublicVerifiedProfileAPIView.
  if (data.is_teaser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5">
          <span className="flex flex-col items-center rounded-lg border border-border bg-muted/40 px-3.5 py-2">
            <span className="font-display text-2xl font-bold leading-none tabular-nums">
              {vp.verified_project_count}
              <span className="text-sm opacity-50">/{vp.claimed_project_count}</span>
            </span>
            <span className="caseline mt-1 text-[8px]">defended</span>
          </span>
          <div className="min-w-0">
            <p className={cn("text-sm font-semibold", covStrong ? "status-strong" : "status-developing")}>
              {COVERAGE_LABEL[vp.coverage] ?? vp.coverage}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{vp.confidence_note}</p>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card/60 p-5 text-center">
          <p className="text-sm font-medium">The full dossier — dimension scores, examiner notes,
            and claim-vs-evidence honesty — is only shown to hiring teams.</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Request access with your work email and the reason is logged for {data.candidate.name}.
          </p>
          <a
            href={`/hire/${encodeURIComponent(data.candidate.username)}`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Request Hiring Profile →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── The verdict, at a glance — one card, everything a skim needs ── */}
      <div className="grain relative overflow-hidden rounded-2xl border border-(--brand-indigo)/25 bg-card p-6">
        <div className="relative">
          <p className="eyebrow mb-3 flex items-center gap-2">
            <span className="eyebrow-dot" /> VELO verdict
          </p>

          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 flex-1 basis-64">
              {vp.seniority_calibration?.level && (
                <span className={cn("stamp mb-3", seniorityStatusClass(vp.seniority_calibration.level))}>
                  {SENIORITY_LABEL[vp.seniority_calibration.level] ?? vp.seniority_calibration.level}
                </span>
              )}
              {vp.headline && (
                <p className="font-display text-2xl font-semibold leading-tight tracking-tight text-(--brand-indigo)">
                  {vp.headline}
                </p>
              )}
              {vp.narrative && (
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-foreground/70">
                  {vp.narrative}
                </p>
              )}
              {vp.seniority_calibration?.held_to_reason && (
                <p className="caseline mt-2 text-muted-foreground">
                  {vp.seniority_calibration.held_to_reason}
                </p>
              )}
              {/* Deterministic (non-LLM) percentile anchor — only shown once
                  enough verified profiles exist to make it meaningful. */}
              {vp.calibration_reference && !vp.calibration_reference.insufficient_data && vp.calibration_reference.note && (
                <p className="caseline mt-1 text-muted-foreground">{vp.calibration_reference.note}</p>
              )}
            </div>

            {hasAggregateRadar && (
              <div className="shrink-0">
                <p className="caseline mb-2">capability shape</p>
                <AggregateCapabilityBars axes={aggregateAxes} />
              </div>
            )}
          </div>

          {/* Stat rail — the two facts a skim needs before reading a word of prose */}
          <div className="mt-5 flex flex-wrap items-stretch gap-x-8 gap-y-3 border-t border-(--brand-indigo)/15 pt-4">
            <div>
              <p className="font-display text-2xl font-bold leading-none tabular-nums">
                {vp.verified_project_count}
                <span className="text-sm font-medium opacity-50">/{vp.claimed_project_count}</span>
              </p>
              <p className="caseline mt-1">projects defended</p>
            </div>
            <div>
              <p className={cn("font-display text-2xl font-bold leading-none", covStrong ? "status-strong" : "status-developing")}>
                {COVERAGE_LABEL[vp.coverage] ?? vp.coverage}
              </p>
              <p className="caseline mt-1">{vp.confidence_note}</p>
            </div>
            {topSkills.length > 0 && (
              <div className="min-w-0 flex-1 basis-56">
                <div className="flex flex-wrap gap-1.5">
                  {topSkills.map((s) => (
                    <span
                      key={s.skill}
                      title={`Defended in: ${s.via_projects.join(", ")}`}
                      className="status-strong inline-flex items-center gap-1 rounded-md border border-(--status-strong)/40 bg-(--status-strong)/5 px-2 py-0.5 text-[11px] font-medium"
                    >
                      <ShieldCheck className="size-2.5" /> <span className="text-foreground/90">{s.skill}</span>
                    </span>
                  ))}
                </div>
                <p className="caseline mt-1.5">backed by defended work</p>
              </div>
            )}
          </div>
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

      {/* Capability grouped by the tech-stack areas VELO detected in the repos:
          defended vs. claimed-but-unprobed vs. claimed-but-absent-from-code.
          Falls back to the flat chip lists for profiles built before this. */}
      {(vp.capability_by_stack?.length ?? 0) > 0 ? (
        <div>
          <p className="eyebrow mb-2 flex items-center gap-2">
            <span className="eyebrow-dot" /> Capability by stack
          </p>
          <CapabilityByStack rows={vp.capability_by_stack!} />
        </div>
      ) : (
        <>
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
          {(vp.claimed_unverified_skills?.length ?? 0) > 0 && (
            <div>
              <p className="eyebrow mb-2 flex items-center gap-2">
                <span className="eyebrow-dot" /> Claimed, not yet probed
              </p>
              <div className="flex flex-wrap gap-1.5">
                {vp.claimed_unverified_skills!.map((s) => (
                  <span
                    key={`${s.skill}-${s.project}`}
                    title={`Listed in ${s.project}'s tech stack, but the interrogation never asked about it`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-[13px] font-medium text-muted-foreground"
                  >
                    <span className="text-foreground/70">{s.skill}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Defended projects — the evidence, one exhibit per card, strongest first */}
      <div>
        <p className="eyebrow mb-3 flex items-center gap-2">
          <span className="eyebrow-dot" /> Defended projects
        </p>
        <div className="space-y-3">
          {visibleProjects.map((p, i) => {
            const scoreCls = p.score != null ? statusClassForScore(p.score) : "status-none";
            const scoreBorderCls = SCORE_BORDER_CLASS[scoreCls];
            const delta =
              p.score != null && avgProjectScore != null && scoredCount > 1
                ? Math.round((p.score - avgProjectScore) * 100)
                : null;
            const contradictionCount = contradictionCountByProject.get(p.project_title) ?? 0;
            return (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="caseline shrink-0 tabular-nums opacity-60">
                        EX-{String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="font-display text-base font-semibold tracking-tight">
                        {p.project_title}
                      </p>
                      {contradictionCount > 0 && (
                        <span
                          title="A claim tied to this project didn't hold up — see Claim vs. evidence below"
                          className="status-developing inline-flex items-center gap-1 rounded-md border border-(--status-developing)/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                        >
                          <ShieldAlert className="size-2.5" />
                          {contradictionCount > 1 ? `${contradictionCount} contradictions` : "contradicted"}
                        </span>
                      )}
                    </div>
                    <div className="caseline mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {p.expertise_estimate && <span>expertise: {p.expertise_estimate}</span>}
                      <span className="inline-flex items-center gap-1">
                        <MessagesSquare className="size-3" /> {p.questions_answered} questions defended
                      </span>
                      {p.verified_at && (
                        <span>
                          {new Date(p.verified_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.dimension_scores && <DimensionBars dimensionScores={p.dimension_scores} />}
                    {p.score != null && (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={cn("rounded-lg border px-2.5 py-1 font-display text-sm font-bold tabular-nums", scoreCls, scoreBorderCls)}>
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
                </div>
                {p.verdict_summary && (
                  <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{p.verdict_summary}</p>
                )}
                {!!p.stack_reconciliation?.length && <ProjectStackBadges items={p.stack_reconciliation} />}
                {p.repos.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {p.repos.map((r) => (
                      <a
                        key={r.url}
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <GitBranch className="size-3.5" /> {r.label}
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
            );
          })}
        </div>
        {hiddenProjectCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllProjects(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ChevronDown className="size-3.5" /> Show {hiddenProjectCount} more defended project
            {hiddenProjectCount > 1 ? "s" : ""}
          </button>
        )}
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
