"use client";

import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { PortfolioArtifact } from "@/types";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Linkedin,
  Github,
  Globe,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Award,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ProjectShowcaseGrid } from "@/components/portfolio/project-showcase";
import { CompetencyChart } from "@/components/portfolio/competency-chart";
import { GrowthTimeline } from "@/components/portfolio/growth-timeline";
import { EndorsementList } from "@/components/portfolio/endorsement-badge";
import { CourseBadgeList } from "@/components/portfolio/course-badge";

import { usePublicPortfolio } from "@/hooks/use-portfolio";
import { cn } from "@/lib/utils";

export default function PublicPortfolioPage() {
  const params = useParams<{ username?: string }>();
  const username = params?.username ?? "";
  const { data, isLoading, error } = usePublicPortfolio(username);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h2 className="text-xl font-semibold mb-2">Portfolio Not Available</h2>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : "This portfolio could not be found."}
              </p>
            </div>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h2 className="text-xl font-semibold mb-2">Portfolio Not Available</h2>
              <p className="text-muted-foreground">
                This portfolio could not be found.
              </p>
            </div>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    profile,
    featured_artifacts,
    competency_chart,
    growth_timeline,
    endorsements,
    stats,
  } = data;

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
    milestone_type:
      | "competency_level_up"
      | "plan_completed"
      | "task_streak"
      | "first_artifact"
      | "reflection_insight"
      | "external_validation"
      | "breakthrough_moment"
      | "skill_endorsed";
    title: string;
    description: string;
    achieved_at: string;
    icon: string;
    color: string;
    is_featured: boolean;
    related_artifact_title?: string;
    related_competency_name?: string;
  };

  const displayName = profile.user_full_name || profile.user_username || profile.slug || username;
  const handle = profile.user_username || profile.slug || username;
  const proofStack = [
    { label: "Verified artifacts", value: stats.total_verified_artifacts },
    { label: "Featured", value: stats.featured_count },
    { label: "Profile views", value: stats.profile_views },
  ];

  const initials = displayName
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "?";

  const hasHeadline = Boolean(profile.headline);
  const hasBio = Boolean(profile.bio);
  const hasContacts = Boolean(
    profile.github_url || profile.linkedin_url || profile.portfolio_url
  );
  const hasProfileDetails = hasHeadline || hasBio || hasContacts;
  const hasFeatured = featured_artifacts.length > 0;
  const competencies = Array.isArray(competency_chart?.competencies)
    ? (competency_chart?.competencies as CompetencyData[])
    : [];
  const endorsementsList = Array.isArray(endorsements)
    ? (endorsements as Endorsement[])
    : [];
  const timelineMilestones = Array.isArray(growth_timeline)
    ? (growth_timeline as Milestone[])
    : [];
  const hasCompetencies = Boolean(profile.show_competency_chart && competencies.length);
  const hasEndorsements = Boolean(endorsementsList.length);
  const hasTimeline = Boolean(profile.show_growth_timeline && timelineMilestones.length);
  
  const courseBadges = Array.isArray(data.certifications)
    ? data.certifications.map((cert) => ({
        id: cert.id,
        title: cert.title,
        category: cert.category ?? "general",
        completed_at: cert.completed_at ?? cert.issued_date ?? "",
        badge_type: cert.badge_type ?? "completion",
        total_hours: cert.total_hours ?? 0,
      }))
    : [];
  const hasCourseBadges = courseBadges.length > 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_700px_at_10%_-10%,rgba(99,102,241,0.15),transparent),radial-gradient(900px_500px_at_90%_-5%,rgba(14,165,233,0.12),transparent),linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,1))]">
      {/* Professional Header - Resume Style */}
      <div className="border-b border-white/60 bg-white/80 backdrop-blur">
        <div className={cn("container mx-auto px-4", hasProfileDetails ? "py-10" : "py-6")}>
          <div className="max-w-5xl mx-auto">
            <div
              className={cn(
                "flex flex-col rounded-[32px] border border-white/80 bg-white/90 shadow-[var(--shadow-2)]",
                hasProfileDetails ? "gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-8" : "gap-4 p-5 md:flex-row md:items-center md:gap-6 md:p-6"
              )}
            >
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-32 w-32 ring-4 ring-primary/10 shadow-xl">
                  {profile.user_avatar_url ? (
                    <AvatarImage src={profile.user_avatar_url} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Verified profile
                </span>
              </div>

              {/* Professional Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
                    {displayName}
                  </h1>
                  {handle ? (
                    <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                      @{handle}
                    </p>
                  ) : null}
                  {hasHeadline && (
                    <p className="text-xl md:text-2xl text-muted-foreground font-medium">
                      {profile.headline}
                    </p>
                  )}
                </div>

                {/* Contact Info */}
                {hasContacts ? (
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Joined{" "}
                        {profile.user_created_at
                          ? new Date(profile.user_created_at).getFullYear()
                          : profile.created_at
                          ? new Date(profile.created_at).getFullYear()
                          : "—"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Joined{" "}
                      {profile.user_created_at
                        ? new Date(profile.user_created_at).getFullYear()
                        : profile.created_at
                        ? new Date(profile.created_at).getFullYear()
                        : "—"}
                    </span>
                  </div>
                )}

                {/* Bio */}
                {hasBio && <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {profile.resume_url ? (
                    <Button size="lg" className="shadow-lg rounded-full" asChild>
                      <Link href={profile.resume_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download Resume
                      </Link>
                    </Button>
                  ) : null}
                  {profile.github_url && (
                    <Button variant="outline" size="lg" className="rounded-full" asChild>
                      <Link href={profile.github_url} target="_blank" rel="noopener noreferrer">
                        <Github className="h-4 w-4 mr-2" />
                        GitHub
                      </Link>
                    </Button>
                  )}
                  {profile.linkedin_url && (
                    <Button variant="outline" size="lg" className="rounded-full" asChild>
                      <Link href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </Link>
                    </Button>
                  )}
                  {profile.portfolio_url && (
                    <Button variant="outline" size="lg" className="rounded-full" asChild>
                      <Link href={profile.portfolio_url} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Sticky Mini Nav */}
          <div className="sticky top-4 z-20">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-[var(--shadow-1)] backdrop-blur">
              <div className="flex flex-wrap gap-2">
                <a href="#stats" className="rounded-full px-3 py-1 hover:bg-muted/60">Proof</a>
                <a href="#projects" className="rounded-full px-3 py-1 hover:bg-muted/60">Projects</a>
                <a href="#skills" className="rounded-full px-3 py-1 hover:bg-muted/60">Skills</a>
                <a href="#timeline" className="rounded-full px-3 py-1 hover:bg-muted/60">Journey</a>
              </div>
              <span className="rounded-full bg-muted/60 px-3 py-1 text-[10px]">Public profile</span>
            </div>
          </div>

          {/* Proof Stack */}
          <div id="stats" className="grid gap-4 md:grid-cols-3">
            {proofStack.map((item) => (
              <Card
                key={item.label}
                className="border border-white/80 bg-white/85 shadow-[var(--shadow-1)] backdrop-blur"
              >
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {item.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className={cn(hasProfileDetails ? "space-y-16" : "space-y-10")}>
          {/* Legacy stats bar removed in favor of Proof Stack */}

          {/* Certifications & Badges */}
          {hasCourseBadges && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Award className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Certifications & Achievements</h2>
              </div>
              <CourseBadgeList badges={courseBadges} max={10} />
            </section>
          )}

          {(hasCourseBadges || hasFeatured) && hasCourseBadges && hasFeatured ? <Separator /> : null}

          {/* Featured Projects */}
          {hasFeatured && (
            <section id="projects">
              <div className="flex items-center gap-3 mb-6">
                <Briefcase className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Featured Projects</h2>
              </div>
              <div className="mb-6 overflow-x-auto pb-2">
                <div className="flex gap-4">
                  {featured_artifacts.slice(0, 5).map((artifact: PortfolioArtifact) => (
                    <div
                      key={artifact.id}
                      className="min-w-[280px] rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Impact reel
                      </p>
                      <h3 className="mt-2 text-lg font-semibold">{artifact.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                        {artifact.description || "Verified work captured from the learning journey."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <ProjectShowcaseGrid
                projects={featured_artifacts.map((artifact: PortfolioArtifact) => ({
                  id: artifact.id,
                  title: artifact.title,
                  description:
                    artifact.description ||
                    "Verified work captured from the learning journey.",
                  github_url: artifact.url,
                  tech_stack: artifact.tags || [],
                  featured: Boolean(artifact.featured),
                }))}
              />
            </section>
          )}

          {(hasFeatured && (hasCompetencies || hasEndorsements || hasTimeline)) ? <Separator /> : null}

          {/* Skills & Competencies */}
          {hasCompetencies && (
            <section id="skills">
              <h2 className="text-2xl font-bold mb-6">Skills & Expertise</h2>
              <CompetencyChart competencies={competencies} />
            </section>
          )}

          {/* Professional Endorsements */}
          {hasEndorsements && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Professional Endorsements</h2>
              <EndorsementList endorsements={endorsementsList} />
            </section>
          )}

          {/* Learning Journey (Optional) */}
          {hasTimeline && (
            <section id="timeline">
              <h2 className="text-2xl font-bold mb-6">Learning Journey</h2>
              <GrowthTimeline milestones={timelineMilestones} />
            </section>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-8 border-t">
            <p>
              Professional portfolio powered by{" "}
              <Link href="/" className="text-primary hover:underline font-medium">
                Horizon Learning Platform
              </Link>
            </p>
            <p className="mt-2">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
