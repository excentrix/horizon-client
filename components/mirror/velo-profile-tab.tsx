"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LiveAnalysisPanel } from "@/components/mirror/live-analysis-panel";
import { ProjectVerificationSheet } from "@/components/mirror/ProjectVerificationSheet";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useMirrorSnapshot } from "@/hooks/use-mirror-snapshot";
import { useGithubRepos } from "@/hooks/use-github-repos";
import { authApi, auditApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Shield,
  ShieldCheck,
  ShieldAlert,
  Github,
  Sparkles,
  Download,
  Building2,
  FolderGit2,
  TrendingUp,
  Target,
  Zap,
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

interface AtsBreakdownItem { score: number; max: number; }
interface AtsBreakdown {
  keyword_match?: AtsBreakdownItem & { missing?: string[] };
  impact_statements?: AtsBreakdownItem;
  summary_quality?: AtsBreakdownItem;
  skills_coverage?: AtsBreakdownItem;
  format_signals?: AtsBreakdownItem;
  [key: string]: AtsBreakdownItem | (AtsBreakdownItem & { missing?: string[] }) | undefined;
}

interface ExperienceAnalysis {
  company?: string;
  role?: string;
  relevance_to_target?: string;
  impact_score?: number;
  ats_commentary?: string;
  quantified_bullets?: number;
  total_bullets?: number;
  improvement_suggestions?: string[];
}

interface ProjectAnalysis {
  title?: string;
  relevance_score?: number;
  technical_depth_score?: number;
  commentary?: string;
  improvement_suggestions?: string[];
}

interface ImprovementAction {
  action: string;
  impact: ImpactLevel;
  effort: ImpactLevel;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (s >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}
function scoreBarColor(s: number) {
  if (s >= 75) return "[&>div]:bg-emerald-500";
  if (s >= 50) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-rose-500";
}
function atsLabel(s: number) {
  if (s >= 90) return { label: "Excellent", color: "text-emerald-600 dark:text-emerald-400" };
  if (s >= 75) return { label: "Good",      color: "text-emerald-600 dark:text-emerald-400" };
  if (s >= 60) return { label: "Fair",      color: "text-amber-600 dark:text-amber-400" };
  return              { label: "Needs Work",color: "text-rose-600 dark:text-rose-400" };
}
function seniorityStyle(s: Seniority) {
  if (s === "senior") return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/40";
  if (s === "mid")    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40";
  return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800";
}
function priorityAccent(p: Priority) {
  if (p === "P1") return { stripe: "bg-rose-500",  text: "text-rose-700 dark:text-rose-400",  badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300", row: "bg-rose-50/40 dark:bg-rose-950/10" };
  if (p === "P2") return { stripe: "bg-amber-500", text: "text-amber-700 dark:text-amber-400",badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300", row: "bg-amber-50/40 dark:bg-amber-950/10" };
  return               { stripe: "bg-blue-400",   text: "text-blue-700 dark:text-blue-400",  badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300", row: "bg-blue-50/40 dark:bg-blue-950/10" };
}
function verdictStyle(v: Verdict) {
  if (v === "yes")   return { bg: "bg-emerald-500", label: "Would shortlist", sub: "text-emerald-50" };
  if (v === "maybe") return { bg: "bg-amber-500",   label: "Maybe — needs work", sub: "text-amber-50" };
  return                    { bg: "bg-rose-500",    label: "Would not shortlist", sub: "text-rose-50" };
}
function impactStyle(v: ImpactLevel) {
  if (v === "high")   return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30";
  if (v === "medium") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
  return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400";
}
function effortStyle(v: ImpactLevel) {
  if (v === "low")    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
  if (v === "medium") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
  return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400";
}

function findAnalysis<T extends { company?: string; role?: string; title?: string }>(
  entry: { company?: string; role?: string; title?: string },
  arr: T[],
  index: number,
): T | undefined {
  if (!arr?.length) return undefined;
  const match = arr.find((a) => {
    if (entry.company && a.company)
      return a.company.toLowerCase() === entry.company.toLowerCase() &&
        (!a.role || !entry.role || a.role.toLowerCase() === entry.role.toLowerCase());
    if (entry.title && a.title) return a.title.toLowerCase() === entry.title.toLowerCase();
    return false;
  });
  return match ?? arr[index];
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHead({
  icon,
  title,
  id,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  id?: string;
  count?: number;
}) {
  return (
    <div id={id} className="mb-4 flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand-indigo)]/10 text-[color:var(--brand-indigo)]">
        {icon}
      </span>
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

function VeloSkeleton() {
  return (
    <div className="space-y-6 p-5">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  );
}

// ─── ATS ring ─────────────────────────────────────────────────────────────────

function ATSRing({ score }: { score: number }) {
  const info = atsLabel(score);
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex h-32 w-32 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(hsl(var(--primary)) ${score * 3.6}deg, hsl(var(--muted)) ${score * 3.6}deg)`,
        }}
      >
        <div className="flex h-[98px] w-[98px] flex-col items-center justify-center rounded-full bg-background">
          <span className="font-display text-4xl font-bold leading-none tabular-nums">{score}</span>
          <span className="mt-0.5 text-[10px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <p className={cn("text-sm font-bold", info.color)}>{info.label}</p>
        <p className="text-[10px] text-muted-foreground">ATS Score</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function VeloProfileTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useMirrorSnapshot();
  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const [reanalysing, setReanalysing] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [verifyingProjectIndex, setVerifyingProjectIndex] = useState<number | null>(null);
  const [resettingVerificationId, setResettingVerificationId] = useState<string | null>(null);
  const [reanalysisBlocked, setReanalysisBlocked] = useState<{ next_reset: string | null; limit: number } | null>(null);
  const [jdSheetOpen, setJdSheetOpen] = useState(false);
  const [jdText, setJdText] = useState("");
  const [jdReanalysing, setJdReanalysing] = useState(false);
  const [jdReanalysisBlocked, setJdReanalysisBlocked] = useState<{
    next_reset: string | null; limit: number; used: number;
  } | null>(null);

  const { data: quotaData } = useQuery({
    queryKey: ["feature-quotas"],
    queryFn: authApi.getFeatureQuotas,
    staleTime: 60_000,
  });
  const github = useGithubRepos();

  useEffect(() => {
    github.fetchRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReanalyse = async () => {
    setReanalysing(true);
    try {
      await authApi.reanalyseResume();
      await queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
      toast.success("Re-analysis queued — VELO will update in a moment.");
    } catch (err: unknown) {
      const d = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (d?.quota_status === "exceeded") {
        setReanalysisBlocked({ next_reset: (d.next_reset as string | null) ?? null, limit: (d.limit as number) ?? 1 });
        return;
      }
      toast.error("Couldn't queue re-analysis.", {
        description: "Upload your resume in Settings first.",
        action: { label: "Settings", onClick: () => router.push("/settings") },
      });
    } finally { setReanalysing(false); }
  };

  const handleJdReanalyse = async () => {
    if (!jdText.trim()) { toast.error("Please paste a job description first."); return; }
    setJdReanalysing(true);
    try {
      await authApi.reanalyseWithJD(jdText.trim());
      await queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
      await queryClient.invalidateQueries({ queryKey: ["feature-quotas"] });
      setJdSheetOpen(false); setJdText("");
      toast.success("JD-targeted analysis queued — VELO will update in a moment.");
    } catch (err: unknown) {
      const d = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (d?.quota_status === "exceeded") {
        setJdSheetOpen(false);
        setJdReanalysisBlocked({ next_reset: (d.next_reset as string | null) ?? null, limit: (d.limit as number) ?? 2, used: (d.used as number) ?? 2 });
        return;
      }
      toast.error("Couldn't queue JD analysis.", { description: "Upload a resume first." });
    } finally { setJdReanalysing(false); }
  };

  const handleExportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const response = await auditApi.exportMirrorLatestPdf();
      const blob = response.data as Blob;
      const disposition = response.headers?.["content-disposition"] ?? "";
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const filename = match?.[1] ?? "resume-analysis-report.pdf";
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = filename;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF exported.");
    } catch {
      toast.error("Export failed. Could not generate the PDF report.");
    } finally { setExportingPdf(false); }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Please upload a PDF, JPG, or PNG resume.");
      event.target.value = ""; return;
    }
    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const response = await authApi.uploadResume(formData);
      if (response.job_id && typeof window !== "undefined")
        window.localStorage.setItem("resumeAnalysisJobId", response.job_id);
      await queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
      toast.success("Resume uploaded. VELO analysis is running.");
    } catch {
      toast.error("Failed to upload resume. Please try again.");
    } finally { event.target.value = ""; setUploadingResume(false); }
  };

  const handleReVerify = async (verificationId: string, projectIndex: number) => {
    setResettingVerificationId(verificationId);
    try {
      await auditApi.resetProjectVerification(verificationId);
      await queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
      setVerifyingProjectIndex(projectIndex);
    } catch {
      toast.error("Couldn't reset verification. Please try again.");
    } finally { setResettingVerificationId(null); }
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const mirror = data?.mirror;
  const normalized = (mirror?.normalized_profile ?? {}) as Record<string, unknown>;
  const skills        = (normalized.skills        as string[] | undefined) ?? [];
  const certifications= (normalized.certifications as string[] | undefined) ?? [];
  const experience    = (normalized.experience    as ExperienceEntry[] | undefined) ?? [];
  const projects      = (normalized.projects      as ProjectEntry[] | undefined) ?? [];
  const education     = (normalized.education     as EducationEntry[] | undefined) ?? [];
  const gaps          = mirror?.skill_gaps ?? [];
  const deep          = mirror?.deep_analysis ?? {};
  const projectVerifications = mirror?.project_verifications ?? [];

  const resumeUrls = new Set(
    projects.flatMap((p) => [p.repo_url, p.demo_url]).filter(Boolean).map((u) => u!.toLowerCase()),
  );
  const unlinkedRepos = github.repos.filter((r) => !resumeUrls.has(r.url.toLowerCase()));

  const isRunning = data?.status === "running" || data?.status === "empty";
  const isFailed  = data?.status === "failed";
  const isReady   = data?.status === "ready" && Boolean(mirror);

  if (isLoading) return <VeloSkeleton />;

  const resumeUploadInput = (
    <input
      ref={resumeInputRef} type="file"
      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
      className="hidden" onChange={handleResumeUpload}
    />
  );

  if (isRunning) {
    return (
      <div className="p-5 sm:p-6">
        {resumeUploadInput}
        <LiveAnalysisPanel progress={data?.analysis_job?.progress} />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" variant="outline" onClick={handleReanalyse} disabled={reanalysing}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", reanalysing && "animate-spin")} />
            {reanalysing ? "Re-queuing…" : "Re-queue analysis"}
          </Button>
          <Button size="sm" onClick={() => resumeInputRef.current?.click()} disabled={uploadingResume}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {uploadingResume ? "Uploading…" : "Upload new resume"}
          </Button>
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="p-5 sm:p-6">
        {resumeUploadInput}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 dark:border-rose-900/30 dark:bg-rose-950/20">
          <div className="mb-2 flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">Analysis failed</span>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            {data?.analysis_job?.error ?? "Something went wrong. Try re-uploading your resume."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => resumeInputRef.current?.click()} disabled={uploadingResume}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {uploadingResume ? "Uploading…" : "Upload new resume"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/settings?tab=resume")}>
              Open Resume Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="p-5 sm:p-6">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--brand-indigo)]/10">
            <Upload className="h-6 w-6 text-[color:var(--brand-indigo)]" />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">No analysis yet</p>
            <p className="text-xs text-muted-foreground">
              Upload your resume in Settings and VELO will build your full career intelligence profile.
            </p>
          </div>
          <Button onClick={() => router.push("/settings")}>Upload resume</Button>
        </div>
      </div>
    );
  }

  if (!mirror) return null;

  // ── Extract ───────────────────────────────────────────────────────────────
  const roleMatches  = (deep.role_matches      ?? []) as RoleMatch[];
  const skillMastery = (deep.skill_mastery     ?? []) as SkillMastery[];
  const atsScore     = deep.ats_score as number | undefined;
  const atsBreakdown = deep.ats_breakdown as AtsBreakdown | undefined;
  const gapDetails   = (deep.skill_gap_details ?? []) as SkillGapDetail[];
  const expAnalysis  = (deep.experience_analysis ?? []) as ExperienceAnalysis[];
  const projAnalysis = (deep.project_analysis  ?? []) as ProjectAnalysis[];
  const actions      = (deep.improvement_actions ?? []) as ImprovementAction[];
  const employerPerspective = deep.employer_perspective as EmployerPerspective | undefined;
  const mentorSummary = (deep.mentor_state_v2_summary ?? null) as {
    stage?: string;
    debrief_progress_percent?: number;
    missing_fields?: string[];
    weakest_dimensions?: Array<{ name: string; score: number }>;
  } | null;

  const demonstrated = skillMastery.filter((s) => s.level === "demonstrated");
  const mentioned    = skillMastery.filter((s) => s.level === "mentioned");
  const masteryGaps  = skillMastery.filter((s) => s.level === "gap");

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="pb-12 bg-white rounded-2xl">

      {/* ── Action bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-5 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Analysis
        </span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs"
            disabled={exportingPdf || !isReady} onClick={handleExportPdf}>
            <Download className={cn("h-3 w-3", exportingPdf && "animate-pulse")} />
            <span className="hidden sm:inline">{exportingPdf ? "Exporting…" : "Export PDF"}</span>
          </Button>
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs"
            disabled={reanalysing} onClick={handleReanalyse}>
            <RefreshCw className={cn("h-3 w-3", reanalysing && "animate-spin")} />
            <span className="hidden sm:inline">{reanalysing ? "Queuing…" : "Re-analyse"}</span>
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
            onClick={() => setJdSheetOpen(true)}>
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">Analyse with JD</span>
            <span className="sm:hidden">+ JD</span>
            {quotaData?.jd_reanalysis && !quotaData.jd_reanalysis.exempt && (
              <span className="rounded-full bg-[color:var(--brand-indigo)]/10 px-1.5 text-[10px] font-medium text-[color:var(--brand-indigo)]">
                {(quotaData.jd_reanalysis.limit ?? 2) - quotaData.jd_reanalysis.used} left
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">

        {/* ── Right column: ATS + Fit + Actions (below on mobile) ────────── */}
        <aside className="order-last border-t border-border/60 xl:order-none xl:col-start-2 xl:row-start-1 xl:row-span-[999] xl:border-l xl:border-t-0 xl:border-border/60">
          <div className="xl:sticky xl:top-0">

            {/* ATS score */}
            {atsScore !== undefined && (
              <div className="border-b border-border/60 p-5">
                <div className="mb-4 flex justify-center">
                  <ATSRing score={atsScore} />
                </div>

                {atsBreakdown && (
                  <div className="space-y-2">
                    {[
                      { key: "keyword_match",    label: "Keywords" },
                      { key: "impact_statements",label: "Impact"   },
                      { key: "summary_quality",  label: "Summary"  },
                      { key: "skills_coverage",  label: "Skills"   },
                      { key: "format_signals",   label: "Format"   },
                    ].filter(({ key }) => atsBreakdown[key]).map(({ key, label }) => {
                      const item = atsBreakdown[key] as AtsBreakdownItem;
                      const pct = (item.score / item.max) * 100;
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{label}</span>
                          <Progress value={pct} className={cn("h-1.5 flex-1", scoreBarColor(pct))} />
                          <span className="w-9 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                            {item.score}/{item.max}
                          </span>
                        </div>
                      );
                    })}
                    {atsBreakdown.keyword_match?.missing && atsBreakdown.keyword_match.missing.length > 0 && (
                      <p className="pt-1 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">Missing: </span>
                        {atsBreakdown.keyword_match.missing.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Role Fit */}
            {roleMatches.length > 0 && (
              <div className="border-b border-border/60 p-5">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Role Fit
                </p>
                <div className="space-y-3">
                  {roleMatches.slice(0, 4).map((role, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                          {role.title}
                        </span>
                        <span className={cn("shrink-0 text-sm font-bold tabular-nums", scoreColor(role.match_score))}>
                          {role.match_score}%
                        </span>
                      </div>
                      <Progress
                        value={role.match_score}
                        className={cn("h-1", scoreBarColor(role.match_score))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {actions.length > 0 && (
              <div className="border-b border-border/60 p-5">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Priority Actions
                </p>
                <div className="space-y-2">
                  {actions.slice(0, 3).map((action, i) => {
                    const isQuickWin = action.impact === "high" && action.effort === "low";
                    return (
                      <div
                        key={i}
                        className={cn(
                          "relative overflow-hidden rounded-xl border p-3",
                          isQuickWin && "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/15",
                        )}
                      >
                        {isQuickWin && (
                          <span className="absolute right-0 top-0 rounded-bl-lg bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                            Quick win
                          </span>
                        )}
                        <div className="mb-1.5 flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                            {i + 1}
                          </span>
                          <p className="text-[13px] font-medium leading-snug">{action.action}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className={cn("h-4 text-[10px]", impactStyle(action.impact))}>
                            {action.impact} impact
                          </Badge>
                          <Badge variant="outline" className={cn("h-4 text-[10px]", effortStyle(action.effort))}>
                            {action.effort} effort
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mentor readiness */}
            {mentorSummary && (
              <div className="p-5">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Mentor Readiness
                </p>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm capitalize text-muted-foreground">
                    {mentorSummary.stage || "exploring"}
                  </span>
                  <Badge variant="outline" className="text-[11px]">
                    {Math.round(mentorSummary.debrief_progress_percent ?? 0)}% ready
                  </Badge>
                </div>
                {mentorSummary.weakest_dimensions?.length ? (
                  <div className="mb-3 space-y-2">
                    {mentorSummary.weakest_dimensions.slice(0, 3).map((dim) => (
                      <div key={dim.name} className="flex items-center gap-2">
                        <span className="w-36 truncate text-[11px] capitalize text-muted-foreground">
                          {dim.name.replace(/_/g, " ")}
                        </span>
                        <Progress value={dim.score} className={cn("h-1.5 flex-1", scoreBarColor(dim.score))} />
                        <span className={cn("w-7 text-right text-[11px] font-semibold", scoreColor(dim.score))}>
                          {dim.score}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <Button size="sm" variant="outline" className="mt-2 w-full h-8 text-xs"
                  onClick={() => router.push("/chat?context=mirror_review")}>
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  Review with mentor
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Left column: main content ─────────────────────────────────── */}
        <div className="order-first min-w-0 divide-y divide-border/60 xl:order-none xl:col-start-1">

          {/* Role Readiness */}
          {mirror.role_readiness_narrative && (
            <section className="p-5 sm:p-6">
              <SectionHead icon={<Target className="h-3.5 w-3.5" />} title="Role Readiness" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {mirror.role_readiness_narrative}
              </p>
            </section>
          )}

          {/* Employer's View */}
          {employerPerspective && (
            <section className="p-5 sm:p-6">
              <SectionHead icon={<Eye className="h-3.5 w-3.5" />} title="Employer's View" />

              {/* Verdict banner */}
              {(() => {
                const vs = verdictStyle(employerPerspective.shortlist_verdict);
                return (
                  <div className={cn("mb-5 flex items-center gap-3 rounded-2xl px-5 py-4", vs.bg)}>
                    <Eye className="h-5 w-5 shrink-0 text-white" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{vs.label}</p>
                      <p className={cn("text-xs", vs.sub)}>{employerPerspective.shortlist_reason}</p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    First impression
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {employerPerspective.first_impression}
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Career story
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {employerPerspective.candidate_narrative}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {employerPerspective.what_stands_out.length > 0 && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/15">
                      <div className="mb-2.5 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-wide">Stands out</span>
                      </div>
                      <ul className="space-y-1.5">
                        {employerPerspective.what_stands_out.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {employerPerspective.what_raises_flags.length > 0 && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/40 dark:bg-rose-950/15">
                      <div className="mb-2.5 flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-wide">Raises flags</span>
                      </div>
                      <ul className="space-y-1.5">
                        {employerPerspective.what_raises_flags.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {employerPerspective?.resume_improvements?.length > 0 && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="improvements" className="border-0">
                      <AccordionTrigger className="py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline hover:text-foreground">
                        <span className="flex items-center gap-1.5">
                          <Wrench className="h-3.5 w-3.5" />
                          Resume improvements ({employerPerspective.resume_improvements.length})
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2.5">
                          {employerPerspective.resume_improvements.map((item, i) => (
                            <div key={i} className="rounded-xl border bg-muted/30 p-3">
                              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="h-5 text-[10px]">{item.section}</Badge>
                                <span className="text-xs text-muted-foreground">{item.current_issue}</span>
                              </div>
                              <p className="flex items-start gap-1.5 text-xs">
                                <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                                {item.suggested_fix}
                              </p>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            </section>
          )}

          {/* Skill Mastery */}
          {skillMastery.length > 0 && (
            <section className="p-5 sm:p-6">
              <SectionHead icon={<Zap className="h-3.5 w-3.5" />} title="Skill Mastery" />
              <div className="grid gap-5 sm:grid-cols-3">
                {/* Demonstrated */}
                <div>
                  <div className="mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      Demonstrated
                    </span>
                    <span className="ml-auto rounded-full bg-emerald-100 px-1.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {demonstrated.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {demonstrated.map((s) => (
                      <span key={s.skill} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                        {s.skill}
                      </span>
                    ))}
                    {demonstrated.length === 0 && <p className="text-[11px] italic text-muted-foreground">None yet</p>}
                  </div>
                </div>
                {/* Listed only */}
                <div>
                  <div className="mb-3 flex items-center gap-1.5">
                    <Circle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Listed only</span>
                    <span className="ml-auto rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                      {mentioned.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mentioned.map((s) => (
                      <span key={s.skill} className="rounded-lg border border-amber-200 bg-amber-50/60 px-2 py-0.5 text-[12px] font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                        {s.skill}
                      </span>
                    ))}
                    {mentioned.length === 0 && <p className="text-[11px] italic text-muted-foreground">None</p>}
                  </div>
                </div>
                {/* Gaps */}
                <div>
                  <div className="mb-3 flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">Key gaps</span>
                    <span className="ml-auto rounded-full bg-rose-100 px-1.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                      {masteryGaps.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {masteryGaps.map((s) => (
                      <span key={s.skill} className="rounded-lg border border-dashed border-rose-300 bg-rose-50/40 px-2 py-0.5 text-[12px] font-medium text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/15 dark:text-rose-400">
                        {s.skill}
                      </span>
                    ))}
                    {masteryGaps.length === 0 && <p className="text-[11px] italic text-muted-foreground">None</p>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Skill Gaps */}
          {(gapDetails.length > 0 || gaps.length > 0) && (
            <section className="p-5 sm:p-6">
              <SectionHead
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                title="Skill Gaps"
                count={gapDetails.length || gaps.length}
              />
              {gapDetails.length > 0 ? (
                <div className="space-y-2">
                  {gapDetails.map((gap, i) => {
                    const pa = priorityAccent(gap.priority);
                    return (
                      <div key={i} className={cn("flex gap-0 overflow-hidden rounded-xl border")}>
                        <div className={cn("w-1 shrink-0", pa.stripe)} />
                        <div className={cn("flex flex-1 flex-col gap-1.5 px-4 py-3", pa.row)}>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={cn("h-5 text-[10px]", pa.badge)}>
                              {gap.priority}
                            </Badge>
                            <span className="text-sm font-semibold">{gap.skill}</span>
                            {gap.time_estimate && (
                              <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" /> {gap.time_estimate}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{gap.why_matters}</p>
                          {gap.how_to_fill && (
                            <p className="flex items-start gap-1 text-xs">
                              <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                              {gap.how_to_fill}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {gaps.map((g, i) => (
                    <Badge key={i} variant="outline" className="border-dashed">{g}</Badge>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <section className="p-5 sm:p-6">
              <SectionHead
                icon={<Building2 className="h-3.5 w-3.5" />}
                title="Experience"
                count={experience.length}
              />
              <div className="relative space-y-0">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-3 h-[calc(100%-24px)] w-px bg-border/60" />
                {experience.map((exp, i) => {
                  const analysis = findAnalysis(exp, expAnalysis, i);
                  return (
                    <div key={i} className="relative pl-8">
                      {/* dot */}
                      <div className="absolute left-0 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-border ring-1 ring-border">
                        <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-indigo)]" />
                      </div>

                      <div className={cn("pb-6", i === experience.length - 1 && "pb-0")}>
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{exp.role || "Role"}</p>
                            <p className="text-xs text-muted-foreground">
                              {exp.company}{exp.timeframe ? ` · ${exp.timeframe}` : ""}
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
                                <span className={cn("text-xs font-bold tabular-nums", scoreColor(analysis.impact_score))}>
                                  {analysis.impact_score}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {analysis?.impact_score !== undefined && (
                          <div className="mb-2.5 flex items-center gap-2">
                            <span className="w-10 shrink-0 text-[10px] text-muted-foreground">Impact</span>
                            <Progress value={analysis.impact_score ?? 0} className={cn("h-1 flex-1", scoreBarColor(analysis.impact_score ?? 0))} />
                          </div>
                        )}

                        {exp.highlights && exp.highlights.length > 0 && (
                          <ul className="mb-2 space-y-1">
                            {exp.highlights.slice(0, 3).map((h, j) => (
                              <li key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 opacity-50" /> {h}
                              </li>
                            ))}
                          </ul>
                        )}

                        {exp.technologies && exp.technologies.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1">
                            {exp.technologies.slice(0, 6).map((t) => (
                              <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>
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
                                <p className="mb-2 text-xs leading-relaxed text-muted-foreground">{analysis.ats_commentary}</p>
                                {analysis.quantified_bullets !== undefined && (
                                  <p className="mb-2 text-[11px] text-muted-foreground">
                                    <span className="font-medium text-foreground">{analysis.quantified_bullets}</span> of {analysis.total_bullets} bullets have quantified outcomes.
                                  </p>
                                )}
                                {(analysis.improvement_suggestions?.length ?? 0) > 0 && (
                                  <div className="space-y-1">
                                    {analysis.improvement_suggestions?.map((s: string, k: number) => (
                                      <p key={k} className="flex items-start gap-1.5 text-[11px]">
                                        <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" /> {s}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <section className="p-5 sm:p-6">
              <SectionHead icon={<FolderGit2 className="h-3.5 w-3.5" />} title="Projects" count={projects.length} />
              <div className="grid gap-3 sm:grid-cols-2">
                {projects.map((proj, i) => {
                  const analysis = findAnalysis(proj, projAnalysis, i);
                  const pv = projectVerifications.find((v) => v.project_index === i);
                  return (
                    <div
                      key={i}
                      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 transition-shadow hover:shadow-sm"
                    >
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{proj.title || "Project"}</p>
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          {(proj.repo_url || proj.demo_url) && (
                            <a href={proj.repo_url || proj.demo_url} target="_blank" rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {(!pv || pv.status === "unverified") && (
                            <button onClick={() => setVerifyingProjectIndex(i)}
                              className="flex items-center gap-1 rounded-lg border border-dashed border-muted-foreground/40 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-[color:var(--brand-indigo)]/60 hover:text-[color:var(--brand-indigo)]">
                              <Shield className="h-2.5 w-2.5" /> Verify
                            </button>
                          )}
                          {pv?.status === "verified" && (
                            <span className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <ShieldCheck className="h-2.5 w-2.5" /> Verified
                            </span>
                          )}
                          {(pv?.status === "evidence_submitted" || pv?.status === "interrogating") && (
                            <span className="flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              <Shield className="h-2.5 w-2.5" /> In Progress
                            </span>
                          )}
                          {pv?.status === "suspicious" && (
                            <>
                              <span className="flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                <ShieldAlert className="h-2.5 w-2.5" /> Review Needed
                              </span>
                              <button disabled={resettingVerificationId === pv.verification_id}
                                onClick={() => handleReVerify(pv.verification_id, i)}
                                className="flex items-center gap-1 rounded-lg border border-dashed border-amber-400/60 px-2 py-0.5 text-[10px] text-amber-600 hover:border-amber-500 hover:text-amber-700 disabled:opacity-50">
                                <RefreshCw className="h-2.5 w-2.5" /> Re-verify
                              </button>
                            </>
                          )}
                          {pv?.status === "failed" && (
                            <>
                              <span className="flex items-center gap-1 rounded-lg bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                <XCircle className="h-2.5 w-2.5" /> Not Verified
                              </span>
                              <button disabled={resettingVerificationId === pv.verification_id}
                                onClick={() => handleReVerify(pv.verification_id, i)}
                                className="flex items-center gap-1 rounded-lg border border-dashed border-rose-400/60 px-2 py-0.5 text-[10px] text-rose-600 hover:border-rose-500 hover:text-rose-700 disabled:opacity-50">
                                <RefreshCw className="h-2.5 w-2.5" /> Re-verify
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Score bars */}
                      {analysis && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-16 shrink-0 text-[10px] text-muted-foreground">Relevance</span>
                            <Progress value={analysis.relevance_score ?? 0} className={cn("h-1 flex-1", scoreBarColor(analysis.relevance_score ?? 0))} />
                            <span className={cn("w-7 text-right text-[10px] font-bold", scoreColor(analysis.relevance_score ?? 0))}>
                              {analysis.relevance_score}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-16 shrink-0 text-[10px] text-muted-foreground">Depth</span>
                            <Progress value={analysis.technical_depth_score ?? 0} className={cn("h-1 flex-1", scoreBarColor(analysis.technical_depth_score ?? 0))} />
                            <span className={cn("w-7 text-right text-[10px] font-bold", scoreColor(analysis.technical_depth_score ?? 0))}>
                              {analysis.technical_depth_score}%
                            </span>
                          </div>
                        </div>
                      )}

                      {proj.technologies && proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {proj.technologies.slice(0, 5).map((t) => (
                            <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{t}</span>
                          ))}
                        </div>
                      )}

                      {analysis && (
                        <Accordion type="single" collapsible>
                          <AccordionItem value="ai" className="border-0">
                            <AccordionTrigger className="py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline hover:text-foreground">
                              AI Feedback
                            </AccordionTrigger>
                            <AccordionContent className="pb-1">
                              <p className="mb-2 text-xs leading-relaxed text-muted-foreground">{analysis.commentary}</p>
                              {(analysis.improvement_suggestions?.length ?? 0) > 0 && (
                                <div className="space-y-1">
                                  {analysis.improvement_suggestions?.map((s: string, k: number) => (
                                    <p key={k} className="flex items-start gap-1.5 text-[11px]">
                                      <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" /> {s}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* GitHub unlinked repos */}
          {github.connected && unlinkedRepos.length > 0 && (
            <section className="p-5 sm:p-6">
              <SectionHead icon={<Github className="h-3.5 w-3.5" />} title="GitHub — not on resume" count={unlinkedRepos.length} />
              <div className="grid gap-2 sm:grid-cols-2">
                {unlinkedRepos.map((repo) => (
                  <div key={repo.id} className="flex items-start justify-between gap-3 overflow-hidden rounded-xl border border-dashed p-3">
                    <div className="min-w-0">
                      <a href={repo.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium hover:underline">{repo.name}</a>
                      {repo.description && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{repo.description}</p>
                      )}
                      <p className="mt-1.5 text-[10px] italic text-muted-foreground">
                        Add to resume to verify with VELO
                      </p>
                    </div>
                    {repo.language && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{repo.language}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education + Certs + All Skills */}
          {(education.length > 0 || certifications.length > 0 || skills.length > 0) && (
            <section className="p-5 sm:p-6">
              <SectionHead icon={<GraduationCap className="h-3.5 w-3.5" />} title="Background" />
              <div className="grid gap-6 sm:grid-cols-2">
                {education.length > 0 && (
                  <div>
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Education</p>
                    {education.map((edu, i) => (
                      <div key={i} className="mb-3 flex items-start gap-2">
                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium">{edu.degree}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {edu.institution}{edu.year ? ` · ${edu.year}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {certifications.length > 0 && (
                  <div>
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Certifications</p>
                    {certifications.map((cert, i) => (
                      <div key={i} className="mb-2 flex items-center gap-2">
                        <Award className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span className="text-xs">{typeof cert === "string" ? cert : (cert as { name: string }).name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {skills.length > 0 && (
                <div className={cn(education.length > 0 || certifications.length > 0 ? "mt-5 border-t pt-5" : "")}>
                  <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">All Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s, i) => (
                      <span key={i} className="rounded-lg border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* ── Sheets & modals ───────────────────────────────────────────────── */}
      {mirror?.id && verifyingProjectIndex !== null && (
        <ProjectVerificationSheet
          open={verifyingProjectIndex !== null}
          onOpenChange={(open) => {
            if (!open) { setVerifyingProjectIndex(null); queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] }); }
          }}
          snapshotId={mirror.id}
          projectIndex={verifyingProjectIndex}
          projectTitle={(projects[verifyingProjectIndex]?.title as string | undefined) ?? `Project ${verifyingProjectIndex + 1}`}
        />
      )}

      <Sheet open={jdSheetOpen} onOpenChange={setJdSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="text-base">Analyse with Job Description</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Paste the full job description below. VELO will re-run the analysis targeted to this specific role.
            </p>
            {quotaData?.jd_reanalysis && !quotaData.jd_reanalysis.exempt && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="rounded-full bg-[color:var(--brand-indigo)]/10 px-2 py-0.5 font-medium text-[color:var(--brand-indigo)]">
                  {quotaData.jd_reanalysis.used} / {quotaData.jd_reanalysis.limit ?? 2} used this month
                </span>
                {quotaData.jd_reanalysis.next_reset && (
                  <span>· resets {new Date(quotaData.jd_reanalysis.next_reset).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                )}
              </div>
            )}
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
            <Textarea
              placeholder="Paste the full job description here…"
              className="min-h-[320px] resize-none text-sm"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste the raw job posting — requirements, responsibilities, and all. VELO will parse it automatically.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <Button variant="ghost" size="sm" onClick={() => setJdSheetOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={jdReanalysing || !jdText.trim()} onClick={handleJdReanalyse} className="gap-1.5">
              <Sparkles className={cn("h-3.5 w-3.5", jdReanalysing && "animate-pulse")} />
              {jdReanalysing ? "Queuing…" : "Run JD Analysis"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {jdReanalysisBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setJdReanalysisBlocked(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="bg-[color:var(--brand-indigo)]/8 px-6 pb-5 pt-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--brand-indigo)]/15 text-[color:var(--brand-indigo)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold">JD re-analysis limit reached</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your plan includes {jdReanalysisBlocked.limit} JD-targeted analyses per month ({jdReanalysisBlocked.used}/{jdReanalysisBlocked.limit} used).
                {jdReanalysisBlocked.next_reset ? ` Resets on ${new Date(jdReanalysisBlocked.next_reset).toLocaleDateString(undefined, { month: "long", day: "numeric" })}.` : ""}
              </p>
            </div>
            <div className="px-6 py-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300">
                Upgrade your plan for unlimited JD-targeted analyses.
              </div>
            </div>
            <div className="flex justify-end border-t px-6 py-4">
              <Button size="sm" variant="ghost" onClick={() => setJdReanalysisBlocked(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {reanalysisBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setReanalysisBlocked(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="bg-[color:var(--brand-indigo)]/8 px-6 pb-5 pt-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--brand-indigo)]/15 text-[color:var(--brand-indigo)]">
                <RefreshCw className="h-5 w-5 text-[color:var(--brand-indigo)]" />
              </div>
              <h2 className="text-base font-semibold">Re-analysis limit reached</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your free plan includes {reanalysisBlocked.limit} resume re-analysis per month.
                {reanalysisBlocked.next_reset ? ` Resets on ${new Date(reanalysisBlocked.next_reset).toLocaleDateString(undefined, { month: "long", day: "numeric" })}.` : ""}
              </p>
            </div>
            <div className="px-6 py-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300">
                Upgrade your plan to re-analyse whenever you need.
              </div>
            </div>
            <div className="flex justify-end border-t px-6 py-4">
              <Button size="sm" variant="ghost" onClick={() => setReanalysisBlocked(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
