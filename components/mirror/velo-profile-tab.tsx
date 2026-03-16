"use client";

import { useRouter } from "next/navigation";
import { useMirrorSnapshot } from "@/hooks/use-mirror-snapshot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";

// ─── types ───────────────────────────────────────────────────────────────────

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

// ─── component ───────────────────────────────────────────────────────────────

export function VeloProfileTab() {
  const router = useRouter();
  const { data, isLoading } = useMirrorSnapshot();

  const mirror = data?.mirror;
  const normalized = (mirror?.normalized_profile ?? {}) as Record<string, unknown>;
  const skills = (normalized.skills as string[] | undefined) ?? [];
  const certifications = (normalized.certifications as string[] | undefined) ?? [];
  const experience = (normalized.experience as ExperienceEntry[] | undefined) ?? [];
  const projects = (normalized.projects as ProjectEntry[] | undefined) ?? [];
  const education = (normalized.education as EducationEntry[] | undefined) ?? [];
  const strengths = mirror?.strengths ?? [];
  const gaps = mirror?.skill_gaps ?? [];

  const isRunning = data?.status === "running" || data?.status === "empty";
  const isFailed = data?.status === "failed";
  const isReady = data?.status === "ready" && Boolean(mirror);

  // ── loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return <VeloSkeleton />;
  }

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
          <Button variant="outline" size="sm" onClick={() => router.push("/onboarding")}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Re-upload resume
          </Button>
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
            Upload your resume and VELO will extract your full professional profile.
          </p>
          <Button size="sm" onClick={() => router.push("/onboarding")}>
            Upload resume
          </Button>
        </div>
      </div>
    );
  }

  // ── ready: full render ────────────────────────────────────────────────────

  if (!mirror) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">

      {/* Role Readiness — hero card */}
      {mirror.role_readiness_narrative && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-blue-50/40 to-transparent p-5 dark:border-blue-900/30 dark:from-blue-950/25 dark:via-blue-950/10 dark:to-transparent">
          {/* decorative orb */}
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

      {/* Strengths + Skill Gaps */}
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

      {/* Skills cloud */}
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

      {/* Experience timeline */}
      {experience.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Experience</h2>
            <span className="font-mono text-[11px] text-muted-foreground">{experience.length} roles</span>
          </div>

          {/* vertical timeline */}
          <div className="relative space-y-3 pl-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border">
            {experience.map((entry, i) => (
              <div key={i} className="relative">
                {/* dot */}
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
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Projects</h2>
            <span className="font-mono text-[11px] text-muted-foreground">{projects.length} projects</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project, i) => (
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
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Education + Certifications */}
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
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}
