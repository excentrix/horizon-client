"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, Briefcase, GraduationCap, Folder, Zap, TrendingUp, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMirrorSnapshot } from "@/hooks/use-mirror-snapshot";
import { telemetry } from "@/lib/telemetry";
import { useEffect } from "react";

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

// ─── page ────────────────────────────────────────────────────────────────────

export default function MirrorPage() {
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

  useEffect(() => {
    if (isReady) telemetry.track("mirror_viewed", { has_experience: experience.length > 0 });
  }, [isReady, experience.length]);

  const statusVariant = isRunning ? "secondary" : isFailed ? "destructive" : isReady ? "default" : "secondary";
  const statusLabel = isLoading ? "Loading" : isRunning ? "Analyzing…" : isFailed ? "Failed" : isReady ? "Ready" : "No data";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your Mirror</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resume analysis + skill gap intelligence, always up to date.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/chat")}
          >
            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
            Go to Chat
          </Button>
          {isReady && (
            <Button
              size="sm"
              onClick={() => router.push("/chat?context=mirror_review")}
            >
              Discuss with mentor
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && <SkeletonGrid />}

      {/* Analyzing */}
      {!isLoading && isRunning && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-blue-400" />
              <p className="text-sm text-muted-foreground">
                Analyzing your resume — this usually takes under a minute. The page updates automatically.
              </p>
            </div>
            <SkeletonGrid className="mt-4" />
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {!isLoading && isFailed && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-rose-700">
              {data?.analysis_job?.error ?? "Analysis failed. You can re-upload your resume from the onboarding page."}
            </p>
            <Button className="mt-3" variant="outline" size="sm" onClick={() => router.push("/onboarding")}>
              Re-upload resume
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && !isRunning && !isFailed && !isReady && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              No resume analysis found yet. Upload your resume to get started.
            </p>
            <Button className="mt-3" size="sm" onClick={() => router.push("/onboarding")}>
              Upload resume
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ready — full data */}
      {isReady && mirror && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Skills" value={skills.length} />
            <StatCard label="Experience" value={experience.length} />
            <StatCard label="Projects" value={projects.length} />
            <StatCard label="Education" value={education.length} />
          </div>

          {/* Strengths + Gaps */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Zap className="h-4 w-4 text-amber-500" /> Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {strengths.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {strengths.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
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
                  <TrendingUp className="h-4 w-4 text-blue-500" /> Priority Skill Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gaps.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {gaps.map((g) => (
                      <Badge key={g} variant="outline" className="border-blue-200 text-xs text-blue-700">{g}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No gaps identified yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Role Readiness */}
          {mirror.role_readiness_narrative && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Role Readiness</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/80">{mirror.role_readiness_narrative}</p>
              </CardContent>
            </Card>
          )}

          {/* Skills cloud */}
          {skills.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">All Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs font-normal">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {certifications.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-muted-foreground">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Briefcase className="h-4 w-4" /> Experience
              </h2>
              <div className="space-y-3">
                {experience.map((entry, i) => (
                  <Card key={i}>
                    <CardContent className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-1">
                        <div>
                          <p className="font-medium text-sm">{entry.role ?? "Role"}</p>
                          <p className="text-xs text-muted-foreground">{entry.company ?? ""}</p>
                        </div>
                        {entry.timeframe && (
                          <span className="text-xs text-muted-foreground">{entry.timeframe}</span>
                        )}
                      </div>
                      {entry.highlights && entry.highlights.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-sm text-foreground/80">
                          {entry.highlights.map((h, hi) => (
                            <li key={hi} className="flex gap-2">
                              <span className="mt-0.5 flex-shrink-0 text-muted-foreground">•</span>
                              {h}
                            </li>
                          ))}
                        </ul>
                      )}
                      {entry.technologies && entry.technologies.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.technologies.map((t) => (
                            <Badge key={t} variant="outline" className="text-xs font-normal">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Folder className="h-4 w-4" /> Projects
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {projects.map((project, i) => (
                  <Card key={i}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{project.title ?? `Project ${i + 1}`}</p>
                        {project.repo_url && (
                          <a
                            href={project.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {project.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{project.description}</p>
                      )}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {project.technologies.map((t) => (
                            <Badge key={t} variant="outline" className="text-xs font-normal">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <GraduationCap className="h-4 w-4" /> Education
              </h2>
              <div className="space-y-2">
                {education.map((entry, i) => (
                  <Card key={i}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <p className="text-sm font-medium">{entry.degree ?? "Degree"}</p>
                        <p className="text-xs text-muted-foreground">{entry.institution ?? ""}</p>
                      </div>
                      {entry.year && (
                        <span className="text-xs text-muted-foreground">{entry.year}</span>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SkeletonGrid({ className }: { className?: string }) {
  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
      <Skeleton className="h-20 rounded-lg" />
    </div>
  );
}
