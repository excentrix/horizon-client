"use client";

import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Linkedin,
  Github,
  Globe,
  Twitter,
  AlertCircle,
  ArrowLeft,
  MapPin,
  Mail,
  Calendar,
  Award,
  Briefcase,
} from "lucide-react";
import Link from "next/link";

import { ProjectShowcaseGrid } from "@/components/portfolio/project-showcase";
import { CompetencyChart } from "@/components/portfolio/competency-chart";
import { GrowthTimeline } from "@/components/portfolio/growth-timeline";
import { EndorsementList } from "@/components/portfolio/endorsement-badge";
import { CourseBadgeList } from "@/components/portfolio/course-badge";

import { usePublicPortfolio } from "@/hooks/use-portfolio";

interface PublicPortfolioPageProps {
  params: {
    username: string;
  };
}

export default function PublicPortfolioPage({ params }: PublicPortfolioPageProps) {
  const { data, isLoading, error } = usePublicPortfolio(params.username);

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

  const { profile, featured_artifacts, competency_chart, growth_timeline, endorsements, stats } =
    data;

  const initials = profile.user?.username
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "?";

  // Mock data for demonstration (will be replaced with real data)
  const courseBadges = [
    {
      id: "1",
      title: "Frontend Development",
      category: "frontend",
      completed_at: "2025-12-01",
      badge_type: "verified" as const,
      total_hours: 120,
    },
    {
      id: "2",
      title: "Backend Mastery",
      category: "backend",
      completed_at: "2025-11-15",
      badge_type: "excellence" as const,
      total_hours: 150,
    },
    {
      id: "3",
      title: "UI/UX Design",
      category: "ui_design",
      completed_at: "2025-10-20",
      badge_type: "completion" as const,
      total_hours: 80,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Professional Header - Resume Style */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Avatar */}
              <Avatar className="h-32 w-32 ring-4 ring-primary/10 shadow-xl">
                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Professional Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
                    {profile.user?.username}
                  </h1>
                  {profile.headline && (
                    <p className="text-xl md:text-2xl text-muted-foreground font-medium">
                      {profile.headline}
                    </p>
                  )}
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {profile.user?.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      <span>{profile.user.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(profile.created_at).getFullYear()}</span>
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button size="lg" className="shadow-lg">
                    <Download className="h-4 w-4 mr-2" />
                    Download Resume
                  </Button>
                  {profile.github_url && (
                    <Button variant="outline" size="lg" asChild>
                      <Link href={profile.github_url} target="_blank" rel="noopener noreferrer">
                        <Github className="h-4 w-4 mr-2" />
                        GitHub
                      </Link>
                    </Button>
                  )}
                  {profile.linkedin_url && (
                    <Button variant="outline" size="lg" asChild>
                      <Link href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </Link>
                    </Button>
                  )}
                  {profile.portfolio_url && (
                    <Button variant="outline" size="lg" asChild>
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
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-16">
          {/* Key Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {stats.total_verified_artifacts}
                </div>
                <div className="text-sm text-muted-foreground">Verified Projects</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {courseBadges.length}
                </div>
                <div className="text-sm text-muted-foreground">Certifications</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {endorsements?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Endorsements</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {stats.profile_views}
                </div>
                <div className="text-sm text-muted-foreground">Profile Views</div>
              </CardContent>
            </Card>
          </div>

          {/* Certifications & Badges */}
          {courseBadges.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Award className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Certifications & Achievements</h2>
              </div>
              <CourseBadgeList badges={courseBadges} max={10} />
            </section>
          )}

          <Separator />

          {/* Featured Projects */}
          {featured_artifacts.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Briefcase className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Featured Projects</h2>
              </div>
              <ProjectShowcaseGrid
                projects={featured_artifacts.map((artifact: any) => ({
                  id: artifact.id,
                  title: artifact.title,
                  description: artifact.description,
                  github_url: artifact.url,
                  tech_stack: artifact.tags || [],
                  featured: artifact.featured,
                }))}
              />
            </section>
          )}

          <Separator />

          {/* Skills & Competencies */}
          {profile.show_competency_chart && competency_chart?.competencies?.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Skills & Expertise</h2>
              <CompetencyChart competencies={competency_chart.competencies} />
            </section>
          )}

          {/* Professional Endorsements */}
          {endorsements?.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Professional Endorsements</h2>
              <EndorsementList endorsements={endorsements} />
            </section>
          )}

          {/* Learning Journey (Optional) */}
          {profile.show_growth_timeline && growth_timeline?.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Learning Journey</h2>
              <GrowthTimeline milestones={growth_timeline} />
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
  );
}
