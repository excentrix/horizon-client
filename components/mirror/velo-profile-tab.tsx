"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useMirrorSnapshot } from "@/hooks/use-mirror-snapshot";
import { authApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Zap,
  TrendingUp,
  Briefcase,
  Folder,
  GraduationCap,
  ExternalLink,
  MessageCircle,
  AlertCircle,
  Upload,
  Award,
  Target,
  ArrowRight,
  Clock,
  Lightbulb,
  CheckCircle2,
  KeyRound,
  ListChecks,
  RefreshCw,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";

// ─── types ────────────────────────────────────────────────────────────────────

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

// ─── helpers ──────────────────────────────────────────────────────────────────

function atsLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Excellent", color: "text-emerald-600" };
  if (score >= 75) return { label: "Good", color: "text-blue-600" };
  if (score >= 60) return { label: "Fair", color: "text-amber-600" };
  return { label: "Needs Work", color: "text-rose-600" };
}

function priorityColors(p: "P1" | "P2" | "P3") {
  if (p === "P1") return "border-l-rose-500 bg-rose-50/40 dark:bg-rose-950/20";
  if (p === "P2") return "border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20";
  return "border-l-blue-400 bg-blue-50/40 dark:bg-blue-950/20";
}

function priorityBadgeClass(p: "P1" | "P2" | "P3") {
  if (p === "P1") return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300";
  if (p === "P2") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300";
  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300";
}

function impactBadgeClass(v: "high" | "medium" | "low") {
  if (v === "high") return "border-rose-200 bg-rose-50 text-rose-700";
  if (v === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function relevanceBadgeClass(v: "high" | "medium" | "low") {
  if (v === "high") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300";
  if (v === "medium") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

/** Match an analysis entry to an experience/project entry. Try name match first, fall back to index. */
function findAnalysis<T extends { company?: string; role?: string; title?: string }>(
  entry: { company?: string; role?: string; title?: string },
  analysisArray: T[],
  index: number,
): T | undefined {
  if (!analysisArray?.length) return undefined;
  // Try name match
  const byName = analysisArray.find((a) => {
    if (entry.company && a.company) {
      return a.company.toLowerCase() === entry.company.toLowerCase() &&
        (!a.role || !entry.role || a.role.toLowerCase() === entry.role.toLowerCase());
    }
    if (entry.title && a.title) {
      return a.title.toLowerCase() === entry.title.toLowerCase();
    }
    return false;
  });
  return byName ?? analysisArray[index];
}

// ─── component ────────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV !== "production";

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
      toast.success("Re-analysis queued — VELO will update automatically.");
    } catch {
      toast.error("No resume found to re-analyse.", {
        description: "Upload your resume in Settings first, then come back here.",
        action: {
          label: "Go to Settings",
          onClick: () => router.push("/settings"),
        },
      });
    } finally {
      setReanalysing(false);
    }
  };

  const mirror = data?.mirror;
  const normalized = (mirror?.normalized_profile ?? {}) as Record<string, unknown>;
  const skills = (normalized.skills as string[] | undefined) ?? [];
  const certifications = (normalized.certifications as string[] | undefined) ?? [];
  const experience = (normalized.experience as ExperienceEntry[] | undefined) ?? [];
  const projects = (normalized.projects as ProjectEntry[] | undefined) ?? [];
  const education = (normalized.education as EducationEntry[] | undefined) ?? [];
  const strengths = mirror?.strengths ?? [];
  const gaps = mirror?.skill_gaps ?? [];
  const deep = mirror?.deep_analysis ?? {};

  const isRunning = data?.status === "running" || data?.status === "empty";
  const isFailed = data?.status === "failed";
  const isReady = data?.status === "ready" && Boolean(mirror);

  // ── loading ──────────────────────────────────────────────────────────────

  if (isLoading) return <VeloSkeleton />;

  // ── still analyzing ──────────────────────────────────────────────────────

  if (isRunning) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
          </span>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            VELO is scanning your resume — this usually takes under a minute. Page updates automatically.
          </p>
        </div>
        <VeloSkeleton />
      </div>
    );
  }

  // ── failed ───────────────────────────────────────────────────────────────

  if (isFailed) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 dark:border-rose-900/30 dark:bg-rose-950/20">
          <div className="mb-2 flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">Analysis failed</span>
          </div>
          <p className="mb-4 text-sm text-rose-600/80 dark:text-rose-400/80">
            {data?.analysis_job?.error ?? "Something went wrong. Try re-uploading your resume."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/settings")}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload in Settings
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/settings")}>
              Go to Settings →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── no data ───────────────────────────────────────────────────────────────

  if (!isReady) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <div className="mb-2 flex justify-center">
            <div className="rounded-full bg-muted p-3">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <p className="mb-1 text-sm font-medium">No analysis yet</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Upload your resume in Settings and VELO will extract your full professional profile.
          </p>
          <Button size="sm" onClick={() => router.push("/settings")}>
            Upload resume in Settings
          </Button>
        </div>
      </div>
    );
  }

  if (!mirror) return null;

  // ── ready: full render ────────────────────────────────────────────────────

  const atsScore = deep.ats_score;
  const atsBreakdown = deep.ats_breakdown;
  const keywordOpt = deep.keyword_optimization;
  const gapDetails = deep.skill_gap_details;
  const expAnalysis = deep.experience_analysis ?? [];
  const projAnalysis = deep.project_analysis ?? [];
  const improvementActions = deep.improvement_actions;

  // ATS score ring: conic-gradient trick
  const atsRingStyle = atsScore !== undefined
    ? {
        background: `conic-gradient(
          hsl(var(--primary)) ${atsScore * 3.6}deg,
          hsl(var(--muted)) ${atsScore * 3.6}deg
        )`,
      }
    : undefined;

  const atsInfo = atsScore !== undefined ? atsLabel(atsScore) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">

      {/* ── Dev toolbar (non-production only) ───────────────────────────────── */}
      {IS_DEV && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 dark:border-amber-700/40 dark:bg-amber-950/20">
          <FlaskConical className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="flex-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            Dev environment
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 border-amber-300 bg-white text-xs text-amber-700 hover:bg-amber-50 dark:border-amber-700/50 dark:bg-transparent dark:text-amber-400"
            disabled={reanalysing}
            onClick={handleReanalyse}
          >
            <RefreshCw className={`h-3 w-3 ${reanalysing ? "animate-spin" : ""}`} />
            {reanalysing ? "Queuing…" : "Re-analyse"}
          </Button>
        </div>
      )}

      {/* ── Role Readiness hero ─────────────────────────────────────────────── */}
      {mirror.role_readiness_narrative && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-blue-50/40 to-transparent p-5 dark:border-blue-900/30 dark:from-blue-950/25 dark:via-blue-950/10 dark:to-transparent">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-800/20" />
          <div className="relative">
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              VELO · Role Readiness Assessment
            </p>
            <p className="text-sm leading-relaxed text-foreground/85">{mirror.role_readiness_narrative}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => router.push("/chat?context=mirror_review")}>
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Discuss with mentor
              </Button>
              <Button size="sm" variant="outline" onClick={() => router.push("/chat")}>
                Open chat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── ATS Score card ──────────────────────────────────────────────────── */}
      {atsScore !== undefined && atsBreakdown && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-primary" />
              ATS Compatibility Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Circular ring gauge */}
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div
                  className="relative flex h-28 w-28 items-center justify-center rounded-full"
                  style={atsRingStyle}
                >
                  <div className="flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full bg-card">
                    <span className="text-2xl font-bold leading-none">{atsScore}</span>
                    <span className="text-[10px] text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${atsInfo?.color}`}>
                  {atsInfo?.label}
                </span>
              </div>

              {/* Breakdown accordion */}
              <div className="min-w-0 flex-1">
                <Accordion type="single" collapsible defaultValue="keyword_match">
                  {atsBreakdown.keyword_match && (
                    <AccordionItem value="keyword_match" className="border-b-0">
                      <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
                        <div className="flex w-full items-center gap-3 pr-2">
                          <span className="w-36 shrink-0 text-left">Keyword Match</span>
                          <Progress
                            value={(atsBreakdown.keyword_match.score / atsBreakdown.keyword_match.max) * 100}
                            className="h-1.5 flex-1"
                          />
                          <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                            {atsBreakdown.keyword_match.score}/{atsBreakdown.keyword_match.max}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-2 pl-0 text-xs text-muted-foreground">
                        {atsBreakdown.keyword_match.missing?.length > 0 && (
                          <p>Missing: {atsBreakdown.keyword_match.missing.join(", ")}</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {atsBreakdown.impact_statements && (
                    <AccordionItem value="impact" className="border-b-0">
                      <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
                        <div className="flex w-full items-center gap-3 pr-2">
                          <span className="w-36 shrink-0 text-left">Impact Statements</span>
                          <Progress
                            value={(atsBreakdown.impact_statements.score / atsBreakdown.impact_statements.max) * 100}
                            className="h-1.5 flex-1"
                          />
                          <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                            {atsBreakdown.impact_statements.score}/{atsBreakdown.impact_statements.max}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-2 pl-0 text-xs text-muted-foreground">
                        {atsBreakdown.impact_statements.quantified_count} of{" "}
                        {atsBreakdown.impact_statements.total_bullets} bullets have quantified outcomes.
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {atsBreakdown.summary_quality && (
                    <AccordionItem value="summary" className="border-b-0">
                      <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
                        <div className="flex w-full items-center gap-3 pr-2">
                          <span className="w-36 shrink-0 text-left">Summary Quality</span>
                          <Progress
                            value={(atsBreakdown.summary_quality.score / atsBreakdown.summary_quality.max) * 100}
                            className="h-1.5 flex-1"
                          />
                          <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                            {atsBreakdown.summary_quality.score}/{atsBreakdown.summary_quality.max}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-2 pl-0 text-xs text-muted-foreground">
                        {atsBreakdown.summary_quality.has_summary
                          ? "A professional summary is present."
                          : "No professional summary detected — add one targeting your role."}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {atsBreakdown.skills_coverage && (
                    <AccordionItem value="skills" className="border-b-0">
                      <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
                        <div className="flex w-full items-center gap-3 pr-2">
                          <span className="w-36 shrink-0 text-left">Skills Coverage</span>
                          <Progress
                            value={(atsBreakdown.skills_coverage.score / atsBreakdown.skills_coverage.max) * 100}
                            className="h-1.5 flex-1"
                          />
                          <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                            {atsBreakdown.skills_coverage.score}/{atsBreakdown.skills_coverage.max}
                          </span>
                        </div>
                      </AccordionTrigger>
                    </AccordionItem>
                  )}
                  {atsBreakdown.format_signals && (
                    <AccordionItem value="format" className="border-b-0 border-t">
                      <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
                        <div className="flex w-full items-center gap-3 pr-2">
                          <span className="w-36 shrink-0 text-left">Format Signals</span>
                          <Progress
                            value={(atsBreakdown.format_signals.score / atsBreakdown.format_signals.max) * 100}
                            className="h-1.5 flex-1"
                          />
                          <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                            {atsBreakdown.format_signals.score}/{atsBreakdown.format_signals.max}
                          </span>
                        </div>
                      </AccordionTrigger>
                      {atsBreakdown.format_signals.issues?.length > 0 && (
                        <AccordionContent className="pb-2 pl-0 text-xs text-muted-foreground">
                          {atsBreakdown.format_signals.issues.join("; ")}
                        </AccordionContent>
                      )}
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Keyword Optimisation ────────────────────────────────────────────── */}
      {keywordOpt && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="h-4 w-4 text-violet-500" />
              Keyword Optimisation
              {keywordOpt.target_role && (
                <span className="ml-auto font-mono text-[10px] font-normal text-muted-foreground">
                  for {keywordOpt.target_role}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {keywordOpt.density_score !== undefined && (
              <div className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-muted-foreground">Keyword density</span>
                <Progress value={keywordOpt.density_score} className="h-1.5 flex-1" />
                <span className="w-8 text-right font-mono text-[11px] text-muted-foreground">
                  {keywordOpt.density_score}%
                </span>
              </div>
            )}
            {keywordOpt.present_keywords?.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Present
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {keywordOpt.present_keywords.map((k) => (
                    <Badge
                      key={k}
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {keywordOpt.missing_high_value?.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  High-value missing
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {keywordOpt.missing_high_value.map((k) => (
                    <Badge
                      key={k}
                      variant="outline"
                      className="border-dashed border-rose-300 bg-rose-50/50 text-rose-600 dark:border-rose-800/50 dark:bg-rose-950/20 dark:text-rose-400"
                    >
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Strengths + Skill Gaps ──────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-amber-500" />
              Strengths
              {strengths.length > 0 && (
                <span className="ml-auto font-mono text-[10px] font-normal text-muted-foreground">
                  {strengths.length} identified
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strengths.length ? (
              <div className="flex flex-wrap gap-1.5">
                {strengths.map((s) => (
                  <Badge
                    key={s}
                    className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No strengths extracted yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Skill gaps — enriched if deep_analysis has details, else simple badges */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Priority Skill Gaps
              {gaps.length > 0 && (
                <span className="ml-auto font-mono text-[10px] font-normal text-muted-foreground">
                  {gaps.length} gaps
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gaps.length ? (
              <div className="flex flex-wrap gap-1.5">
                {gaps.map((g, i) => (
                  <Badge
                    key={g}
                    variant="outline"
                    className="border-blue-200 text-blue-700 dark:border-blue-900/50 dark:text-blue-400"
                  >
                    {i < 3 && (
                      <span className="mr-1 font-mono text-[9px] font-bold text-blue-500">
                        P{i + 1}
                      </span>
                    )}
                    {g}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No gaps identified yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Enriched Skill Gap Details ──────────────────────────────────────── */}
      {gapDetails && gapDetails.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Skill Gap Breakdown</h2>
          </div>
          <div className="space-y-3">
            {gapDetails.map((gap) => (
              <div
                key={gap.skill}
                className={`rounded-xl border-l-4 p-4 ${priorityColors(gap.priority)}`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-bold ${priorityBadgeClass(gap.priority)}`}
                  >
                    {gap.priority}
                  </Badge>
                  <span className="text-sm font-semibold">{gap.skill}</span>
                  {gap.time_estimate && (
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {gap.time_estimate}
                    </span>
                  )}
                </div>
                {gap.why_matters && (
                  <p className="mb-1.5 text-xs text-foreground/70">
                    <span className="font-medium text-foreground/90">Why it matters: </span>
                    {gap.why_matters}
                  </p>
                )}
                {gap.how_to_fill && (
                  <p className="flex items-start gap-1.5 text-xs text-foreground/70">
                    <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    {gap.how_to_fill}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── All Skills cloud ────────────────────────────────────────────────── */}
      {skills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              All Skills
              <span className="ml-auto font-mono text-[10px] font-normal text-muted-foreground">
                {skills.length} extracted
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Experience timeline with AI commentary ──────────────────────────── */}
      {experience.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Experience</h2>
            <span className="font-mono text-[11px] text-muted-foreground">{experience.length} roles</span>
          </div>

          <div className="relative space-y-3 pl-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border">
            {experience.map((entry, i) => {
              const analysis = findAnalysis(
                { company: entry.company, role: entry.role },
                expAnalysis,
                i,
              );
              return (
                <div key={i} className="relative">
                  <div className="absolute -left-5 top-4 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background bg-muted ring-1 ring-border" />
                  <Card className="transition-shadow hover:shadow-sm">
                    <CardContent className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{entry.role ?? "Role"}</p>
                          <p className="text-xs text-muted-foreground">{entry.company ?? ""}</p>
                        </div>
                        {entry.timeframe && (
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {entry.timeframe}
                          </span>
                        )}
                      </div>
                      {entry.highlights && entry.highlights.length > 0 && (
                        <ul className="mt-2.5 space-y-1 text-sm text-foreground/75">
                          {entry.highlights.map((h, hi) => (
                            <li key={hi} className="flex gap-2">
                              <span className="mt-0.5 shrink-0 text-muted-foreground">·</span>
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {entry.technologies && entry.technologies.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {entry.technologies.map((t) => (
                            <Badge key={t} variant="outline" className="text-[11px] font-normal">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* AI commentary accordion */}
                      {analysis && (
                        <Accordion type="single" collapsible className="mt-3 border-t pt-1">
                          <AccordionItem value="ai-feedback" className="border-0">
                            <AccordionTrigger className="py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:no-underline">
                              AI Feedback
                            </AccordionTrigger>
                            <AccordionContent className="space-y-3 pb-1">
                              {/* Impact score + relevance */}
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex flex-1 items-center gap-2">
                                  <span className="text-[11px] text-muted-foreground">Impact</span>
                                  <Progress
                                    value={analysis.impact_score}
                                    className="h-1.5 flex-1"
                                  />
                                  <span className="font-mono text-[11px] text-muted-foreground">
                                    {analysis.impact_score}
                                  </span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-[11px] ${relevanceBadgeClass(analysis.relevance_to_target)}`}
                                >
                                  {analysis.relevance_to_target} relevance
                                </Badge>
                              </div>
                              {/* Commentary */}
                              <p className="text-xs leading-relaxed text-foreground/70">
                                {analysis.ats_commentary}
                              </p>
                              {/* Suggestions */}
                              {analysis.improvement_suggestions?.length > 0 && (
                                <ul className="space-y-1">
                                  {analysis.improvement_suggestions.map((s, si) => (
                                    <li
                                      key={si}
                                      className="flex items-start gap-1.5 text-[11px] text-foreground/70"
                                    >
                                      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Projects with AI scoring ─────────────────────────────────────────── */}
      {projects.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Projects</h2>
            <span className="font-mono text-[11px] text-muted-foreground">{projects.length} projects</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project, i) => {
              const analysis = findAnalysis(
                { title: project.title },
                projAnalysis,
                i,
              );
              return (
                <Card key={i} className="transition-shadow hover:shadow-sm">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{project.title ?? `Project ${i + 1}`}</p>
                      {project.repo_url && (
                        <a
                          href={project.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    {project.description && (
                      <p className="mt-1.5 text-xs text-muted-foreground">{project.description}</p>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {project.technologies.map((t) => (
                          <Badge key={t} variant="outline" className="text-[11px] font-normal">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* AI score bars + commentary */}
                    {analysis && (
                      <>
                        <div className="mt-3 space-y-1.5 border-t pt-3">
                          <div className="flex items-center gap-2">
                            <span className="w-28 shrink-0 text-[11px] text-muted-foreground">Relevance</span>
                            <Progress value={analysis.relevance_score} className="h-1.5 flex-1" />
                            <span className="w-6 text-right font-mono text-[11px] text-muted-foreground">
                              {analysis.relevance_score}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-28 shrink-0 text-[11px] text-muted-foreground">Tech depth</span>
                            <Progress value={analysis.technical_depth_score} className="h-1.5 flex-1" />
                            <span className="w-6 text-right font-mono text-[11px] text-muted-foreground">
                              {analysis.technical_depth_score}
                            </span>
                          </div>
                        </div>
                        <Accordion type="single" collapsible className="mt-1 border-t pt-1">
                          <AccordionItem value="ai-feedback" className="border-0">
                            <AccordionTrigger className="py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:no-underline">
                              AI Feedback
                            </AccordionTrigger>
                            <AccordionContent className="space-y-2 pb-1">
                              <p className="text-xs leading-relaxed text-foreground/70">
                                {analysis.commentary}
                              </p>
                              {analysis.improvement_suggestions?.length > 0 && (
                                <ul className="space-y-1">
                                  {analysis.improvement_suggestions.map((s, si) => (
                                    <li
                                      key={si}
                                      className="flex items-start gap-1.5 text-[11px] text-foreground/70"
                                    >
                                      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Improvement Actions ──────────────────────────────────────────────── */}
      {improvementActions && improvementActions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-primary" />
              Improvement Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {improvementActions.map((action) => {
                const isQuickWin =
                  action.impact === "high" && action.effort === "low";
                return (
                  <li
                    key={action.priority}
                    className={`flex items-start gap-3 rounded-xl p-3 ${
                      isQuickWin
                        ? "ring-1 ring-emerald-200 bg-emerald-50/40 dark:ring-emerald-900/40 dark:bg-emerald-950/20"
                        : "bg-muted/40"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        isQuickWin
                          ? "bg-emerald-500 text-white"
                          : "bg-muted-foreground/20 text-foreground"
                      }`}
                    >
                      {action.priority}
                    </span>
                    <div className="flex-1 text-xs leading-relaxed">
                      <p className="font-medium text-foreground/90">{action.action}</p>
                      {isQuickWin && (
                        <p className="mt-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Quick win
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${impactBadgeClass(action.impact)}`}
                      >
                        {action.impact} impact
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {action.effort} effort
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* ── Education + Certifications ──────────────────────────────────────── */}
      {(education.length > 0 || certifications.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {education.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Education</h2>
              </div>
              <div className="space-y-2">
                {education.map((entry, i) => (
                  <Card key={i}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="text-sm font-medium">{entry.degree ?? "Degree"}</p>
                        <p className="text-xs text-muted-foreground">{entry.institution ?? ""}</p>
                      </div>
                      {entry.year && (
                        <span className="font-mono text-[11px] text-muted-foreground">{entry.year}</span>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {certifications.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Certifications</h2>
              </div>
              <Card>
                <CardContent className="py-4">
                  <ul className="space-y-1.5 text-sm">
                    {certifications.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 text-muted-foreground">·</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function VeloSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}
