"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LiveAnalysisPanel } from "@/components/mirror/live-analysis-panel";
import { useQueryClient } from "@tanstack/react-query";
import { useMirrorSnapshot } from "@/hooks/use-mirror-snapshot";
import { authApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Upload,
  AlertCircle,
  RefreshCw,
  FlaskConical,
  CheckCircle2,
  Circle,
  XCircle,
  ChevronRight,
  Lightbulb,
  Clock,
  MessageCircle,
  GraduationCap,
  Award,
  ExternalLink,
  Eye,
  ThumbsUp,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type MasteryLevel = "demonstrated" | "mentioned" | "gap";
type Priority = "P1" | "P2" | "P3";
type ImpactLevel = "high" | "medium" | "low";
type Seniority = "junior" | "mid" | "senior";
type Verdict = "yes" | "maybe" | "no";

interface RoleMatch {
  title: string;
  match_score: number;
  match_reason: string;
  present_skills: string[];
  missing_skills: string[];
  seniority: Seniority;
}

interface SkillMastery {
  skill: string;
  level: MasteryLevel;
  evidence: string;
  used_in_projects: number;
  used_in_experience: number;
}

interface SkillGapDetail {
  skill: string;
  priority: Priority;
  why_matters: string;
  how_to_fill: string;
  time_estimate: string;
}

interface EmployerPerspective {
  first_impression: string;
  candidate_narrative: string;
  what_stands_out: string[];
  what_raises_flags: string[];
  shortlist_verdict: Verdict;
  shortlist_reason: string;
  resume_improvements: Array<{
    section: string;
    current_issue: string;
    suggested_fix: string;
  }>;
}

interface ExperienceEntry {
  company?: string;
  role?: string;
  timeframe?: string;
  highlights?: string[];
  technologies?: string[];
}

interface ProjectEntry {
  title?: string;
  description?: string;
  technologies?: string[];
  repo_url?: string;
  demo_url?: string;
}

interface EducationEntry {
  degree?: string;
  institution?: string;
  year?: string | number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function scoreBarColor(score: number) {
  if (score >= 75) return "[&>div]:bg-emerald-500";
  if (score >= 50) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-rose-500";
}

function atsLabel(score: number) {
  if (score >= 90)
    return {
      label: "Excellent",
      color: "text-emerald-600 dark:text-emerald-400",
    };
  if (score >= 75)
    return { label: "Good", color: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 60)
    return { label: "Fair", color: "text-amber-600 dark:text-amber-400" };
  return { label: "Needs Work", color: "text-rose-600 dark:text-rose-400" };
}

function seniorityStyle(s: Seniority) {
  if (s === "senior")
    return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/40";
  if (s === "mid")
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40";
  return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800";
}

function priorityStyle(p: Priority) {
  if (p === "P1")
    return {
      border: "border-l-rose-500",
      bg: "bg-rose-50/50 dark:bg-rose-950/15",
      badge:
        "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300",
    };
  if (p === "P2")
    return {
      border: "border-l-amber-500",
      bg: "bg-amber-50/50 dark:bg-amber-950/15",
      badge:
        "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300",
    };
  return {
    border: "border-l-blue-400",
    bg: "bg-blue-50/50 dark:bg-blue-950/15",
    badge:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300",
  };
}

function verdictStyle(v: Verdict) {
  if (v === "yes")
    return {
      bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40",
      text: "text-emerald-700 dark:text-emerald-300",
      label: "Would shortlist",
    };
  if (v === "maybe")
    return {
      bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40",
      text: "text-amber-700 dark:text-amber-300",
      label: "Maybe — needs work",
    };
  return {
    bg: "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40",
    text: "text-rose-700 dark:text-rose-300",
    label: "Would not shortlist",
  };
}

function impactStyle(v: ImpactLevel) {
  if (v === "high") return "bg-rose-50 text-rose-700 border-rose-200";
  if (v === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function effortStyle(v: ImpactLevel) {
  if (v === "low") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (v === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function findAnalysis<
  T extends { company?: string; role?: string; title?: string },
>(
  entry: { company?: string; role?: string; title?: string },
  arr: T[],
  index: number,
): T | undefined {
  if (!arr?.length) return undefined;
  const match = arr.find((a) => {
    if (entry.company && a.company)
      return (
        a.company.toLowerCase() === entry.company.toLowerCase() &&
        (!a.role ||
          !entry.role ||
          a.role.toLowerCase() === entry.role.toLowerCase())
      );
    if (entry.title && a.title)
      return a.title.toLowerCase() === entry.title.toLowerCase();
    return false;
  });
  return match ?? arr[index];
}

// ─── Small reusables ──────────────────────────────────────────────────────────

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

function ATSRing({ score }: { score: number }) {
  const info = atsLabel(score);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative flex h-28 w-28 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(hsl(var(--primary)) ${score * 3.6}deg, hsl(var(--muted)) ${score * 3.6}deg)`,
        }}
      >
        <div className="flex h-[86px] w-[86px] flex-col items-center justify-center rounded-full bg-card">
          <span className="text-3xl font-bold leading-none tabular-nums">
            {score}
          </span>
          <span className="text-[10px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className={cn("text-sm font-semibold", info.color)}>
        {info.label}
      </span>
      <span className="text-[10px] text-muted-foreground">ATS Score</span>
    </div>
  );
}

function VeloSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-8">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV !== "production";

// ─── Main component ───────────────────────────────────────────────────────────

export function VeloProfileTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useMirrorSnapshot();
  const [reanalysing, setReanalysing] = useState(false);

  const handleReanalyse = async () => {
    setReanalysing(true);
    try {
      await authApi.reanalyseResume();
      await queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
      toast.success("Re-analysis queued — VELO will update in a moment.");
    } catch {
      toast.error("Couldn't queue re-analysis.", {
        description:
          "Upload your resume in Settings first, then come back here.",
        action: { label: "Settings", onClick: () => router.push("/settings") },
      });
    } finally {
      setReanalysing(false);
    }
  };

  const mirror = data?.mirror;
  const normalized = (mirror?.normalized_profile ?? {}) as Record<
    string,
    unknown
  >;
  const skills = (normalized.skills as string[] | undefined) ?? [];
  const certifications =
    (normalized.certifications as string[] | undefined) ?? [];
  const experience =
    (normalized.experience as ExperienceEntry[] | undefined) ?? [];
  const projects = (normalized.projects as ProjectEntry[] | undefined) ?? [];
  const education =
    (normalized.education as EducationEntry[] | undefined) ?? [];
  const gaps = mirror?.skill_gaps ?? [];
  const deep = mirror?.deep_analysis ?? {};

  const isRunning = data?.status === "running" || data?.status === "empty";
  const isFailed = data?.status === "failed";
  const isReady = data?.status === "ready" && Boolean(mirror);

  if (isLoading) return <VeloSkeleton />;

  if (isRunning) {
    return <LiveAnalysisPanel progress={data?.analysis_job?.progress} />;
  }

  if (isFailed) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 dark:border-rose-900/30 dark:bg-rose-950/20">
          <div className="mb-2 flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">Analysis failed</span>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            {data?.analysis_job?.error ??
              "Something went wrong. Try re-uploading your resume."}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/settings")}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Go to Settings
          </Button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">No analysis yet</p>
            <p className="text-xs text-muted-foreground">
              Upload your resume in Settings and VELO will build your full
              career intelligence profile.
            </p>
          </div>
          <Button size="sm" onClick={() => router.push("/settings")}>
            Upload resume
          </Button>
        </div>
      </div>
    );
  }

  if (!mirror) return null;

  // ── Extract ───────────────────────────────────────────────────────────────
  const roleMatches = (deep.role_matches ?? []) as RoleMatch[];
  const skillMastery = (deep.skill_mastery ?? []) as SkillMastery[];
  const atsScore = deep.ats_score as number | undefined;
  const atsBreakdown = deep.ats_breakdown as Record<string, any> | undefined;
  const gapDetails = (deep.skill_gap_details ?? []) as SkillGapDetail[];
  const expAnalysis = (deep.experience_analysis ?? []) as any[];
  const projAnalysis = (deep.project_analysis ?? []) as any[];
  const actions = (deep.improvement_actions ?? []) as any[];
  const employerPerspective = deep.employer_perspective as
    | EmployerPerspective
    | undefined;
  const mentorSummary = (deep.mentor_state_v2_summary ?? null) as
    | {
        stage?: string;
        debrief_progress_percent?: number;
        missing_fields?: string[];
        weakest_dimensions?: Array<{ name: string; score: number }>;
      }
    | null;

  const demonstrated = skillMastery.filter((s) => s.level === "demonstrated");
  const mentioned = skillMastery.filter((s) => s.level === "mentioned");
  const masteryGaps = skillMastery.filter((s) => s.level === "gap");

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      {/* ── Dev toolbar ───────────────────────────────────────────────────── */}
      {IS_DEV && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 dark:border-amber-700/40 dark:bg-amber-950/20">
          <FlaskConical className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="flex-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            Dev
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 border-amber-300 text-xs text-amber-700 hover:bg-amber-50"
            disabled={reanalysing}
            onClick={handleReanalyse}
          >
            <RefreshCw
              className={cn("h-3 w-3", reanalysing && "animate-spin")}
            />
            {reanalysing ? "Queuing…" : "Re-analyse"}
          </Button>
        </div>
      )}

      {/* ── Overview: ATS ring + Narrative ────────────────────────────────── */}
      <div
        className={cn(
          "grid gap-4",
          atsScore !== undefined ? "sm:grid-cols-[160px_1fr]" : "",
        )}
      >
        {atsScore !== undefined && (
          <Card className="flex items-center justify-center py-6">
            <CardContent className="p-0">
              <ATSRing score={atsScore} />
            </CardContent>
          </Card>
        )}
        {mirror.role_readiness_narrative && (
          <Card>
            <CardContent className="pb-4 pt-5">
              <SectionLabel>Role Readiness</SectionLabel>
              <p className="text-sm leading-relaxed text-foreground/80">
                {mirror.role_readiness_narrative}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 h-8 text-xs"
                onClick={() => router.push("/chat?context=mirror_review")}
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Discuss with mentor
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Employer's View ───────────────────────────────────────────────── */}
      {employerPerspective && (
        <div>
          <SectionLabel>Employer's View</SectionLabel>
          <Card className="overflow-hidden">
            {/* Verdict banner */}
            {(() => {
              const vs = verdictStyle(employerPerspective.shortlist_verdict);
              return (
                <div
                  className={cn(
                    "flex items-center gap-3 border-b px-4 py-3",
                    vs.bg,
                  )}
                >
                  <Eye className={cn("h-4 w-4 shrink-0", vs.text)} />
                  <div className="min-w-0 flex-1">
                    <span className={cn("text-sm font-semibold", vs.text)}>
                      {vs.label}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {employerPerspective.shortlist_reason}
                    </span>
                  </div>
                </div>
              );
            })()}

            <CardContent className="pt-4 pb-4 space-y-4">
              {/* First impression */}
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  First impression
                </p>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {employerPerspective.first_impression}
                </p>
              </div>

              {/* Narrative */}
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Career story
                </p>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {employerPerspective.candidate_narrative}
                </p>
              </div>

              {/* Stands out + raises flags side by side */}
              <div className="grid gap-3 sm:grid-cols-2">
                {employerPerspective.what_stands_out.length > 0 && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/15">
                    <div className="mb-2 flex items-center gap-1.5">
                      <ThumbsUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        What stands out
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {employerPerspective.what_stands_out.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-foreground/80"
                        >
                          <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {employerPerspective.what_raises_flags.length > 0 && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/40 dark:bg-rose-950/15">
                    <div className="mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                        Raises flags
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {employerPerspective.what_raises_flags.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-foreground/80"
                        >
                          <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Resume improvements */}
              {employerPerspective.resume_improvements.length > 0 && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="improvements" className="border-0">
                    <AccordionTrigger className="py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline hover:text-foreground">
                      <span className="flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5" />
                        Resume improvements (
                        {employerPerspective.resume_improvements.length})
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <div className="space-y-3 pt-1">
                        {employerPerspective.resume_improvements.map(
                          (item, i) => (
                            <div
                              key={i}
                              className="rounded-lg border bg-muted/30 p-3"
                            >
                              <div className="mb-1.5 flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="h-5 text-[10px]"
                                >
                                  {item.section}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {item.current_issue}
                                </span>
                              </div>
                              <p className="flex items-start gap-1.5 text-xs">
                                <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                                {item.suggested_fix}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ATS Breakdown ─────────────────────────────────────────────────── */}
      {atsBreakdown && (
        <Card>
          <CardContent className="pb-2 pt-4">
            <Accordion type="single" collapsible>
              <AccordionItem value="ats" className="border-0">
                <AccordionTrigger className="py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline hover:text-foreground">
                  ATS Breakdown
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="space-y-2.5 pt-1">
                    {[
                      { key: "keyword_match", label: "Keyword Match" },
                      { key: "impact_statements", label: "Impact Statements" },
                      { key: "summary_quality", label: "Summary Quality" },
                      { key: "skills_coverage", label: "Skills Coverage" },
                      { key: "format_signals", label: "Format Signals" },
                    ]
                      .filter(({ key }) => atsBreakdown[key])
                      .map(({ key, label }) => {
                        const item = atsBreakdown[key];
                        const pct = (item.score / item.max) * 100;
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <span className="w-36 shrink-0 text-xs text-muted-foreground">
                              {label}
                            </span>
                            <Progress
                              value={pct}
                              className={cn("h-1.5 flex-1", scoreBarColor(pct))}
                            />
                            <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                              {item.score}/{item.max}
                            </span>
                          </div>
                        );
                      })}
                    {atsBreakdown.keyword_match?.missing?.length > 0 && (
                      <p className="pt-1 text-xs text-muted-foreground">
                        <span className="font-medium">Missing: </span>
                        {atsBreakdown.keyword_match.missing.join(", ")}
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* ── Career Fit ────────────────────────────────────────────────────── */}
      {roleMatches.length > 0 && (
        <div>
          <SectionLabel>Career Fit</SectionLabel>
          <Card>
            <CardContent className="p-0">
              <Accordion type="single" collapsible defaultValue="role-0">
                {roleMatches.map((role, i) => (
                  <AccordionItem
                    key={i}
                    value={`role-${i}`}
                    className="border-b last:border-b-0"
                  >
                    <AccordionTrigger className="rounded-none px-4 py-3.5 hover:bg-muted/30 hover:no-underline data-[state=open]:bg-muted/20">
                      <div className="flex w-full items-center gap-3 pr-2 min-w-0">
                        <span className="w-4 shrink-0 text-[11px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate text-left text-sm font-medium">
                          {role.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 h-5 text-[10px]",
                            seniorityStyle(role.seniority),
                          )}
                        >
                          {role.seniority}
                        </Badge>
                        <span
                          className={cn(
                            "w-8 shrink-0 text-right text-sm font-bold tabular-nums",
                            scoreColor(role.match_score),
                          )}
                        >
                          {role.match_score}%
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-0">
                      <Progress
                        value={role.match_score}
                        className={cn(
                          "mb-3 h-1.5",
                          scoreBarColor(role.match_score),
                        )}
                      />
                      <p className="mb-3 text-sm text-muted-foreground">
                        {role.match_reason}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {role.present_skills.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              You have
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {role.present_skills.map((s) => (
                                <Badge
                                  key={s}
                                  variant="outline"
                                  className="h-5 border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                                >
                                  <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {role.missing_skills.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                              Gaps
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {role.missing_skills.map((s) => (
                                <Badge
                                  key={s}
                                  variant="outline"
                                  className="h-5 border-dashed border-rose-300 bg-rose-50/50 text-[11px] text-rose-600 dark:border-rose-800/50 dark:bg-rose-950/20 dark:text-rose-400"
                                >
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Priority Actions ──────────────────────────────────────────────── */}
      {actions.length > 0 && (
        <div>
          <SectionLabel>Priority Actions</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            {actions.slice(0, 3).map((action: any, i: number) => {
              const isQuickWin =
                action.impact === "high" && action.effort === "low";
              return (
                <Card
                  key={i}
                  className={cn(
                    "relative overflow-hidden",
                    isQuickWin &&
                      "ring-1 ring-emerald-300 dark:ring-emerald-800",
                  )}
                >
                  {isQuickWin && (
                    <div className="absolute right-0 top-0 rounded-bl-lg bg-emerald-500 px-1.5 py-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white">
                        Quick win
                      </span>
                    </div>
                  )}
                  <CardContent className="pb-3 pt-4">
                    <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                      {i + 1}
                    </div>
                    <p className="mb-3 text-[13px] font-medium leading-snug">
                      {action.action}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 text-[10px]",
                          impactStyle(action.impact),
                        )}
                      >
                        {action.impact} impact
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 text-[10px]",
                          effortStyle(action.effort),
                        )}
                      >
                        {action.effort} effort
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mentor Readiness View ───────────────────────────────────────── */}
      {mentorSummary ? (
        <Card>
          <CardContent className="pb-4 pt-4">
            <SectionLabel className="mb-2">Mentor Readiness View</SectionLabel>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="font-medium">Debrief stage: </span>
                <span className="capitalize text-muted-foreground">
                  {mentorSummary.stage || "exploring"}
                </span>
              </div>
              <Badge variant="outline" className="text-[11px]">
                {Math.round(mentorSummary.debrief_progress_percent ?? 0)}% ready
              </Badge>
            </div>
            {mentorSummary.weakest_dimensions?.length ? (
              <div className="mb-3 space-y-2">
                {mentorSummary.weakest_dimensions.slice(0, 3).map((dim) => (
                  <div key={dim.name} className="flex items-center gap-3">
                    <span className="w-44 text-xs capitalize text-muted-foreground">
                      {dim.name.replace(/_/g, " ")}
                    </span>
                    <Progress
                      value={dim.score}
                      className={cn("h-1.5 flex-1", scoreBarColor(dim.score))}
                    />
                    <span
                      className={cn(
                        "w-8 text-right text-[11px] font-semibold",
                        scoreColor(dim.score),
                      )}
                    >
                      {dim.score}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              {mentorSummary.missing_fields?.length ? (
                <span className="text-xs text-muted-foreground">
                  Missing: {mentorSummary.missing_fields.join(", ")}
                </span>
              ) : (
                <span className="text-xs text-emerald-600">
                  Debrief context complete
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-8 text-xs"
                onClick={() => router.push("/chat?context=mirror_review")}
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Review with mentor
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Skill Mastery ─────────────────────────────────────────────────── */}
      {skillMastery.length > 0 && (
        <div>
          <SectionLabel>Skill Mastery</SectionLabel>
          <Card>
            <CardContent className="pb-4 pt-4">
              <p className="mb-4 text-xs text-muted-foreground">
                Skills you've actively proven in projects vs. merely listed vs.
                critical gaps.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Demonstrated ({demonstrated.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {demonstrated.map((s) => (
                      <div
                        key={s.skill}
                        className="flex items-baseline gap-1.5"
                      >
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                          {s.skill}
                        </span>
                        {s.used_in_projects > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {s.used_in_projects}p
                          </span>
                        )}
                      </div>
                    ))}
                    {demonstrated.length === 0 && (
                      <p className="text-[11px] italic text-muted-foreground">
                        None yet
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <Circle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                      Listed only ({mentioned.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {mentioned.map((s) => (
                      <span
                        key={s.skill}
                        className="inline-block w-fit rounded-md border border-amber-200 bg-amber-50/60 px-2 py-0.5 text-[12px] font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
                      >
                        {s.skill}
                      </span>
                    ))}
                    {mentioned.length === 0 && (
                      <p className="text-[11px] italic text-muted-foreground">
                        None
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                      Key gaps ({masteryGaps.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {masteryGaps.map((s) => (
                      <span
                        key={s.skill}
                        className="inline-block w-fit rounded-md border border-dashed border-rose-300 bg-rose-50/40 px-2 py-0.5 text-[12px] font-medium text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/15 dark:text-rose-400"
                      >
                        {s.skill}
                      </span>
                    ))}
                    {masteryGaps.length === 0 && (
                      <p className="text-[11px] italic text-muted-foreground">
                        None found
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Skill Gaps ────────────────────────────────────────────────────── */}
      {(gapDetails.length > 0 || gaps.length > 0) && (
        <div>
          <SectionLabel>Skill Gaps</SectionLabel>
          {gapDetails.length > 0 ? (
            <div className="space-y-2.5">
              {gapDetails.map((gap, i) => {
                const style = priorityStyle(gap.priority);
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-xl border-l-4 px-4 py-3",
                      style.border,
                      style.bg,
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("h-5 text-[10px]", style.badge)}
                        >
                          {gap.priority}
                        </Badge>
                        <span className="text-sm font-semibold">
                          {gap.skill}
                        </span>
                      </div>
                      {gap.time_estimate && (
                        <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {gap.time_estimate}
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {gap.why_matters}
                    </p>
                    {gap.how_to_fill && (
                      <p className="mt-1 flex items-start gap-1 text-xs">
                        <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                        {gap.how_to_fill}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-wrap gap-2 pb-4 pt-4">
                {gaps.map((g, i) => (
                  <Badge key={i} variant="outline" className="border-dashed">
                    {g}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Experience ────────────────────────────────────────────────────── */}
      {experience.length > 0 && (
        <div>
          <SectionLabel>Experience</SectionLabel>
          <div className="space-y-3">
            {experience.map((exp, i) => {
              const analysis = findAnalysis(exp, expAnalysis, i);
              return (
                <Card key={i}>
                  <CardContent className="pb-3 pt-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {exp.role || "Role"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {exp.company}
                          {exp.timeframe ? ` · ${exp.timeframe}` : ""}
                        </p>
                      </div>
                      {analysis && (
                        <div className="flex shrink-0 items-center gap-2">
                          {analysis.relevance_to_target && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-5 text-[10px]",
                                analysis.relevance_to_target === "high"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                                  : analysis.relevance_to_target === "medium"
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600",
                              )}
                            >
                              {analysis.relevance_to_target} fit
                            </Badge>
                          )}
                          {analysis.impact_score !== undefined && (
                            <span
                              className={cn(
                                "text-xs font-bold tabular-nums",
                                scoreColor(analysis.impact_score),
                              )}
                            >
                              {analysis.impact_score}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {analysis?.impact_score !== undefined && (
                      <div className="mb-3 flex items-center gap-2">
                        <span className="w-12 shrink-0 text-[10px] text-muted-foreground">
                          Impact
                        </span>
                        <Progress
                          value={analysis.impact_score}
                          className={cn(
                            "h-1 flex-1",
                            scoreBarColor(analysis.impact_score),
                          )}
                        />
                      </div>
                    )}

                    {exp.highlights && exp.highlights.length > 0 && (
                      <ul className="mb-2 space-y-1">
                        {exp.highlights.slice(0, 3).map((h, j) => (
                          <li
                            key={j}
                            className="flex items-start gap-1.5 text-xs text-muted-foreground"
                          >
                            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}

                    {exp.technologies && exp.technologies.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {exp.technologies.slice(0, 6).map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {analysis && (
                      <Accordion type="single" collapsible>
                        <AccordionItem value="ai" className="border-0">
                          <AccordionTrigger className="py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline hover:text-foreground">
                            AI Feedback
                          </AccordionTrigger>
                          <AccordionContent className="pb-1">
                            <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
                              {analysis.ats_commentary}
                            </p>
                            {analysis.quantified_bullets !== undefined && (
                              <p className="mb-2 text-[11px] text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {analysis.quantified_bullets}
                                </span>{" "}
                                of {analysis.total_bullets} bullets have
                                quantified outcomes.
                              </p>
                            )}
                            {analysis.improvement_suggestions?.length > 0 && (
                              <div className="space-y-1">
                                {analysis.improvement_suggestions.map(
                                  (s: string, k: number) => (
                                    <p
                                      key={k}
                                      className="flex items-start gap-1.5 text-[11px]"
                                    >
                                      <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                                      {s}
                                    </p>
                                  ),
                                )}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Projects ──────────────────────────────────────────────────────── */}
      {projects.length > 0 && (
        <div>
          <SectionLabel>Projects</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((proj, i) => {
              const analysis = findAnalysis(proj, projAnalysis, i);
              return (
                <Card key={i}>
                  <CardContent className="pb-3 pt-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug">
                        {proj.title || "Project"}
                      </p>
                      {(proj.repo_url || proj.demo_url) && (
                        <a
                          href={proj.repo_url || proj.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>

                    {analysis && (
                      <div className="mb-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-16 shrink-0 text-[10px] text-muted-foreground">
                            Relevance
                          </span>
                          <Progress
                            value={analysis.relevance_score}
                            className={cn(
                              "h-1 flex-1",
                              scoreBarColor(analysis.relevance_score),
                            )}
                          />
                          <span
                            className={cn(
                              "w-7 text-right text-[10px] font-bold",
                              scoreColor(analysis.relevance_score),
                            )}
                          >
                            {analysis.relevance_score}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-16 shrink-0 text-[10px] text-muted-foreground">
                            Depth
                          </span>
                          <Progress
                            value={analysis.technical_depth_score}
                            className={cn(
                              "h-1 flex-1",
                              scoreBarColor(analysis.technical_depth_score),
                            )}
                          />
                          <span
                            className={cn(
                              "w-7 text-right text-[10px] font-bold",
                              scoreColor(analysis.technical_depth_score),
                            )}
                          >
                            {analysis.technical_depth_score}%
                          </span>
                        </div>
                      </div>
                    )}

                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {proj.technologies.slice(0, 5).map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {analysis && (
                      <Accordion type="single" collapsible>
                        <AccordionItem value="ai" className="border-0">
                          <AccordionTrigger className="py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline hover:text-foreground">
                            AI Feedback
                          </AccordionTrigger>
                          <AccordionContent className="pb-1">
                            <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
                              {analysis.commentary}
                            </p>
                            {analysis.improvement_suggestions?.length > 0 && (
                              <div className="space-y-1">
                                {analysis.improvement_suggestions.map(
                                  (s: string, k: number) => (
                                    <p
                                      key={k}
                                      className="flex items-start gap-1.5 text-[11px]"
                                    >
                                      <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                                      {s}
                                    </p>
                                  ),
                                )}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Education + Certifications + All Skills ───────────────────────── */}
      {(education.length > 0 ||
        certifications.length > 0 ||
        skills.length > 0) && (
        <Card>
          <CardContent className="pb-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {education.length > 0 && (
                <div>
                  <SectionLabel className="mb-2">Education</SectionLabel>
                  {education.map((edu, i) => (
                    <div key={i} className="mb-2 flex items-start gap-2">
                      <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">{edu.degree}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {edu.institution}
                          {edu.year ? ` · ${edu.year}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {certifications.length > 0 && (
                <div>
                  <SectionLabel className="mb-2">Certifications</SectionLabel>
                  {certifications.map((cert, i) => (
                    <div key={i} className="mb-1.5 flex items-center gap-2">
                      <Award className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span className="text-xs">
                        {typeof cert === "string" ? cert : (cert as any).name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {skills.length > 0 && (
              <div
                className={cn(
                  education.length > 0 || certifications.length > 0
                    ? "mt-4 border-t pt-4"
                    : "",
                )}
              >
                <SectionLabel className="mb-2">All Skills</SectionLabel>
                <div className="flex flex-wrap gap-1">
                  {skills.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
