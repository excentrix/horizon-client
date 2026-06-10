"use client";

import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import type { PortfolioArtifact } from "@/types";
import {
  Download,
  Linkedin,
  Github,
  Globe,
  AlertCircle,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  Shield,
  Sparkles,
  X,
  ExternalLink,
  MapPin,
  BookOpen,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Award,
  ChevronRight,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { usePublicPortfolio } from "@/hooks/use-portfolio";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type CompetencyData = {
  name: string;
  current_level: string;
  numeric_level: number;
  evidence_count: number;
  career_impact: number;
};

type Endorsement = {
  id: string;
  competency_name: string;
  endorser_display: string;
  endorser_type: "ai_mentor" | "human_mentor" | "peer" | "self" | "system";
  proficiency_endorsed: string;
  endorsement_strength: number;
  created_at: string;
};

type Milestone = {
  id: string;
  milestone_type: string;
  title: string;
  description: string;
  achieved_at: string;
  icon: string;
  color: string;
  is_featured: boolean;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand-indigo)]/10 text-[color:var(--brand-indigo)]">
        {icon}
      </span>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

function VerifiedBadge({ score }: { score?: number | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
      <ShieldCheck className="h-3 w-3" />
      VELO Verified{score != null ? ` · ${Math.round(score * 100)}%` : ""}
    </span>
  );
}

function UnverifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      <Shield className="h-3 w-3" />
      Unverified
    </span>
  );
}

function TechChip({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PublicPortfolioPage() {
  const params = useParams<{ username?: string }>();
  const searchParams = useSearchParams();
  const username = params?.username ?? "";
  const { data, isLoading, error } = usePublicPortfolio(username);
  const [showJoinCta, setShowJoinCta] = useState(false);
  const [ctaDismissed, setCtaDismissed] = useState(false);

  const shareSource = useMemo(() => {
    const source = (searchParams?.get("utm_source") || "").toLowerCase();
    if (source === "whatsapp" || source === "linkedin") return source;
    return null;
  }, [searchParams]);

  useEffect(() => {
    if (!shareSource || ctaDismissed) return;
    const key = `horizon-share-cta-dismissed:${username}:${shareSource}`;
    if (window.sessionStorage.getItem(key) === "1") { setCtaDismissed(true); return; }
    const onScroll = () => {
      const bodyHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (bodyHeight <= 0) return;
      if (window.scrollY / bodyHeight >= 0.2) setShowJoinCta(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [ctaDismissed, shareSource, username]);

  const dismissJoinCta = () => {
    if (shareSource) window.sessionStorage.setItem(`horizon-share-cta-dismissed:${username}:${shareSource}`, "1");
    setCtaDismissed(true);
    setShowJoinCta(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-[color:var(--brand-indigo)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Portfolio not found</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "This portfolio could not be found or is private."}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/"><ArrowLeft className="mr-1.5 h-4 w-4" /> Go Home</Link>
        </Button>
      </div>
    );
  }

  const { profile, featured_artifacts, competency_chart, growth_timeline, endorsements, stats, velo_verified_projects, resume_data } = data;

  // Derived data
  const displayName = profile.user_full_name || profile.user_username || profile.slug || username;
  const handle = profile.user_username || profile.slug || username;
  const initials = displayName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const joinYear = profile.user_created_at
    ? new Date(profile.user_created_at).getFullYear()
    : profile.created_at ? new Date(profile.created_at).getFullYear() : null;

  const veloProjects = velo_verified_projects ?? [];

  const resumeExperience = resume_data?.experience ?? [];
  const resumeProjects = resume_data?.projects ?? [];
  const resumeSkills = resume_data?.skills ?? [];
  const resumeEducation = resume_data?.education ?? [];
  const resumeSummary = resume_data?.summary ?? "";

  const competencies = Array.isArray(competency_chart?.competencies) ? (competency_chart.competencies as CompetencyData[]) : [];
  const endorsementsList = Array.isArray(endorsements) ? (endorsements as Endorsement[]) : [];
  const timelineMilestones = Array.isArray(growth_timeline) ? (growth_timeline as Milestone[]) : [];

  const courseBadges = Array.isArray(data.certifications)
    ? data.certifications.map((cert) => ({
        id: cert.id,
        title: cert.title,
        category: cert.category ?? "general",
        completed_at: cert.completed_at ?? cert.issued_date ?? "",
      }))
    : [];

  const hasCompetencies = Boolean(profile.show_competency_chart && competencies.length);
  const hasTimeline = Boolean(profile.show_growth_timeline && timelineMilestones.length);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0f0f1f_0%,#1a1a3e_50%,#0f0f1f_100%)]">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[color:var(--brand-indigo)]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          {/* Top bar */}
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white/80">
              <ArrowLeft className="h-3.5 w-3.5" /> Horizon
            </Link>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Public Profile
            </span>
          </div>

          {/* Profile identity */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar className="h-24 w-24 ring-2 ring-white/10 sm:h-28 sm:w-28">
                {profile.user_avatar_url ? <AvatarImage src={profile.user_avatar_url} alt={displayName} /> : null}
                <AvatarFallback className="bg-[color:var(--brand-indigo)]/30 text-2xl font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#0f0f1f]">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {displayName}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {handle && <span className="text-sm text-[color:var(--brand-indigo)]/80">@{handle}</span>}
                  {profile.headline && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="text-sm text-white/60">{profile.headline}</span>
                    </>
                  )}
                  {joinYear && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        <Calendar className="h-3 w-3" /> {joinYear}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {resumeSummary && (
                <p className="max-w-2xl text-sm leading-relaxed text-white/60">{resumeSummary}</p>
              )}
              {!resumeSummary && profile.bio && (
                <p className="max-w-2xl text-sm leading-relaxed text-white/60">{profile.bio}</p>
              )}

              {/* Links */}
              <div className="flex flex-wrap items-center gap-2">
                {profile.resume_url && (
                  <Button size="sm" className="h-8 gap-1.5 bg-[color:var(--brand-indigo)] text-xs text-white hover:bg-[color:var(--brand-indigo)]/80" asChild>
                    <Link href={profile.resume_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" /> Resume
                    </Link>
                  </Button>
                )}
                {profile.github_url && (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white" asChild>
                    <Link href={profile.github_url} target="_blank" rel="noopener noreferrer">
                      <Github className="h-3.5 w-3.5" /> GitHub
                    </Link>
                  </Button>
                )}
                {profile.linkedin_url && (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white" asChild>
                    <Link href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                    </Link>
                  </Button>
                )}
                {profile.portfolio_url && (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white" asChild>
                    <Link href={profile.portfolio_url} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-3.5 w-3.5" /> Website
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              { label: "Verified Artifacts", value: stats.total_verified_artifacts },
              { label: "Profile Views", value: stats.profile_views },
              { label: "VELO Projects", value: veloProjects.length },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 bg-[#0f0f1f]/80 px-4 py-4 text-center">
                <span className="font-display text-2xl font-bold tabular-nums text-white sm:text-3xl">{s.value}</span>
                <span className="text-[10px] uppercase tracking-widest text-white/40">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sticky nav ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl overflow-x-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-11 items-center gap-0.5">
            {[
              resumeExperience.length > 0 && { href: "#experience", label: "Experience" },
              resumeProjects.length > 0 && { href: "#projects", label: "Projects" },
              resumeSkills.length > 0 && { href: "#skills", label: "Skills" },
              resumeEducation.length > 0 && { href: "#education", label: "Education" },
              featured_artifacts.length > 0 && { href: "#artifacts", label: "Artifacts" },
              courseBadges.length > 0 && { href: "#certs", label: "Certifications" },
              hasTimeline && { href: "#journey", label: "Journey" },
            ]
              .filter(Boolean)
              .map((item) => {
                const i = item as { href: string; label: string };
                return (
                  <a
                    key={i.href}
                    href={i.href}
                    className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    {i.label}
                  </a>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">

          {/* ── Left: main content ─────────────────────────────────────── */}
          <div className="min-w-0 space-y-12">

            {/* Experience */}
            {resumeExperience.length > 0 && (
              <section id="experience">
                <SectionHeader icon={<Briefcase className="h-4 w-4" />} title="Experience" count={resumeExperience.length} />
                <div className="relative space-y-0">
                  <div className="absolute left-[11px] top-3 h-[calc(100%-24px)] w-px bg-border/60" />
                  {resumeExperience.map((exp, i) => (
                    <div key={i} className="relative pl-8">
                      <div className="absolute left-0 top-3 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-background bg-border ring-1 ring-border">
                        <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-indigo)]" />
                      </div>
                      <div className={cn("pb-8", i === resumeExperience.length - 1 && "pb-0")}>
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                          <div>
                            <h3 className="font-semibold leading-snug">{exp.role || "Role"}</h3>
                            <p className="text-sm text-muted-foreground">{exp.company}</p>
                          </div>
                          {exp.timeframe && (
                            <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {exp.timeframe}
                            </span>
                          )}
                        </div>
                        {(exp.highlights ?? []).length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {(exp.highlights ?? []).slice(0, 4).map((h, j) => (
                              <li key={j} className="flex gap-2 text-sm text-muted-foreground">
                                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--brand-indigo)]/60" />
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {(exp.technologies ?? []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(exp.technologies ?? []).map((t, j) => <TechChip key={j} label={t} />)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {resumeProjects.length > 0 && (
              <section id="projects">
                <SectionHeader icon={<FolderGit2 className="h-4 w-4" />} title="Projects" count={resumeProjects.length} />
                <div className="grid gap-4 sm:grid-cols-2">
                  {resumeProjects.map((proj, i) => {
                    const titleLower = (proj.title ?? "").toLowerCase();
                    const veloMatch = veloProjects.find((v) => v.project_title.toLowerCase() === titleLower);
                    return (
                      <div
                        key={i}
                        className={cn(
                          "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md",
                          veloMatch ? "border-emerald-200/60 dark:border-emerald-900/40" : "border-border/60",
                        )}
                      >
                        {/* Top: title + badge */}
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-semibold leading-snug">{proj.title || "Project"}</h3>
                          <div className="shrink-0">
                            {veloMatch
                              ? <VerifiedBadge score={veloMatch.verification_score} />
                              : <UnverifiedBadge />
                            }
                          </div>
                        </div>

                        {/* Description */}
                        {proj.description && (
                          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                            {proj.description}
                          </p>
                        )}

                        {/* Tech stack */}
                        {(proj.technologies ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(proj.technologies ?? []).map((t, j) => <TechChip key={j} label={t} />)}
                          </div>
                        )}

                        {/* Links */}
                        {(proj.repo_url || proj.demo_url) && (
                          <div className="mt-auto flex items-center gap-3 border-t border-border/40 pt-3">
                            {proj.repo_url && (
                              <Link
                                href={proj.repo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <Github className="h-3.5 w-3.5" /> Repo
                              </Link>
                            )}
                            {proj.demo_url && (
                              <Link
                                href={proj.demo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> Demo
                              </Link>
                            )}
                            {veloMatch?.verified_at && (
                              <span className="ml-auto text-[10px] text-muted-foreground">
                                Verified {new Date(veloMatch.verified_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* VELO-verified projects not in resume */}
                {veloProjects.filter((v) => !resumeProjects.find((p) => (p.title ?? "").toLowerCase() === v.project_title.toLowerCase())).length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Additional VELO verified
                    </p>
                    {veloProjects
                      .filter((v) => !resumeProjects.find((p) => (p.title ?? "").toLowerCase() === v.project_title.toLowerCase()))
                      .map((vp, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/30 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span className="flex-1 text-sm font-medium">{vp.project_title}</span>
                          <VerifiedBadge score={vp.verification_score} />
                        </div>
                      ))
                    }
                  </div>
                )}
              </section>
            )}

            {/* Featured Artifacts */}
            {featured_artifacts.length > 0 && (
              <section id="artifacts">
                <SectionHeader icon={<Star className="h-4 w-4" />} title="Featured Work" count={featured_artifacts.length} />
                <div className="grid gap-4 sm:grid-cols-2">
                  {featured_artifacts.slice(0, 6).map((artifact: PortfolioArtifact) => (
                    <div key={artifact.id} className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-snug text-sm">{artifact.title}</h3>
                        {(artifact.verification_status === "verified" || artifact.verification_status === "human_verified") ? (
                          <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <ShieldCheck className="h-3 w-3" /> Verified
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {artifact.description || "Captured from the learning journey."}
                      </p>
                      {(artifact.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(artifact.tags ?? []).map((t: string, j: number) => <TechChip key={j} label={t} />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Competency chart (if enabled) */}
            {hasCompetencies && (
              <section id="competencies">
                <SectionHeader icon={<BookOpen className="h-4 w-4" />} title="Competencies" count={competencies.length} />
                <div className="space-y-3">
                  {competencies.slice(0, 8).map((c, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-4">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{c.name}</span>
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">{c.current_level}</span>
                        </div>
                        <Progress value={(c.numeric_level / 5) * 100} className="h-1.5" />
                      </div>
                      <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                        {c.evidence_count} proof{c.evidence_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Endorsements */}
            {endorsementsList.length > 0 && (
              <section>
                <SectionHeader icon={<Award className="h-4 w-4" />} title="Endorsements" count={endorsementsList.length} />
                <div className="space-y-2">
                  {endorsementsList.slice(0, 6).map((e, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-indigo)]/10 text-[10px] font-bold text-[color:var(--brand-indigo)]">
                        {e.endorser_display?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{e.competency_name}</p>
                        <p className="text-xs text-muted-foreground">{e.endorser_display} · {e.proficiency_endorsed}</p>
                      </div>
                      <div className="shrink-0">
                        <span className="text-xs font-semibold tabular-nums text-[color:var(--brand-indigo)]">
                          {Math.round(e.endorsement_strength * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Learning Journey */}
            {hasTimeline && (
              <section id="journey">
                <SectionHeader icon={<MapPin className="h-4 w-4" />} title="Learning Journey" count={timelineMilestones.length} />
                <div className="relative space-y-0">
                  <div className="absolute left-[11px] top-3 h-[calc(100%-24px)] w-px bg-border/60" />
                  {timelineMilestones.slice(0, 8).map((m, i) => (
                    <div key={m.id ?? i} className="relative pl-8 pb-6 last:pb-0">
                      <div className="absolute left-0 top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-background bg-border text-[10px]">
                        {m.icon || "✦"}
                      </div>
                      <p className="font-medium leading-snug text-sm">{m.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
                      {m.achieved_at && (
                        <p className="mt-1 text-[10px] text-muted-foreground/60">
                          {new Date(m.achieved_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Right: sidebar ─────────────────────────────────────────── */}
          <aside className="space-y-10 lg:sticky lg:top-14 lg:self-start lg:max-h-[calc(100vh-56px)] lg:overflow-y-auto">

            {/* Skills */}
            {resumeSkills.length > 0 && (
              <section id="skills">
                <SectionHeader icon={<Sparkles className="h-4 w-4" />} title="Skills" />
                <div className="flex flex-wrap gap-1.5">
                  {resumeSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            {resumeEducation.length > 0 && (
              <section id="education">
                <SectionHeader icon={<GraduationCap className="h-4 w-4" />} title="Education" />
                <div className="space-y-4">
                  {resumeEducation.map((edu, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium leading-snug text-sm">{edu.degree || "Degree"}</p>
                        <p className="text-xs text-muted-foreground">{edu.institution}</p>
                        {edu.year && <p className="text-[11px] text-muted-foreground/60">{edu.year}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications */}
            {courseBadges.length > 0 && (
              <section id="certs">
                <SectionHeader icon={<Award className="h-4 w-4" />} title="Certifications" count={courseBadges.length} />
                <div className="space-y-2">
                  {courseBadges.slice(0, 6).map((cert) => (
                    <div key={cert.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
                        <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{cert.title}</p>
                        {cert.completed_at && (
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(cert.completed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* VELO explanation */}
            <div className="rounded-2xl border border-[color:var(--brand-indigo)]/20 bg-[color:var(--brand-indigo)]/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[color:var(--brand-indigo)]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--brand-indigo)]">
                  About VELO
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                VELO (Verification Engine for Learning Outcomes) validates projects through GitHub repo analysis and AI-driven technical interrogation. Verified projects confirm genuine ownership and technical understanding.
              </p>
            </div>

            {/* Footer */}
            <div className="border-t border-border/60 pt-6 text-center">
              <p className="text-[11px] text-muted-foreground">
                Powered by{" "}
                <Link href="/" className="font-medium text-[color:var(--brand-indigo)] hover:underline">
                  Horizon
                </Link>
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/50">
                Last updated {new Date().toLocaleDateString()}
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Join CTA (social referral) ────────────────────────────────────── */}
      {shareSource && showJoinCta && !ctaDismissed && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-[color:var(--brand-indigo)]/25 bg-card/95 p-4 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={dismissJoinCta}
            className="absolute right-3 top-3 rounded-full border border-border bg-background p-1 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--brand-indigo)]/25 bg-[color:var(--brand-indigo)]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--brand-indigo)]">
            <Sparkles className="h-3 w-3" /> Build your verified portfolio
          </div>
          <h3 className="font-semibold text-base leading-snug">
            Turn your learning into verified proof
          </h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Join free, get AI-powered analysis, VELO project verification, and a public portfolio with one link.
          </p>
          <div className="mt-4 flex gap-2">
            <Button asChild size="sm" className="flex-1 bg-[color:var(--brand-indigo)] text-white hover:bg-[color:var(--brand-indigo)]/80">
              <Link href="/register">Create profile</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="flex-1">
              <Link href="/">Explore</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
