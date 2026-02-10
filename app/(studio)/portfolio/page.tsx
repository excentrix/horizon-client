"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Settings,
  Eye,
  Share2,
  Copy,
  Sparkles,
  ShieldCheck,
  Zap,
  Crown,
  Trophy,
  QrCode,
} from "lucide-react";
import Link from "next/link";

import { ArtifactDetailModal } from "@/components/portfolio/artifact-detail-modal";
import { CompetencyChart } from "@/components/portfolio/competency-chart";
import { GrowthTimeline } from "@/components/portfolio/growth-timeline";
import { PortfolioHeader } from "@/components/portfolio/portfolio-header";
import { EndorsementList } from "@/components/portfolio/endorsement-badge";

import {
  usePortfolioArtifacts,
  usePortfolioProfile,
  useGrowthTimeline,
  useAddReflection,
} from "@/hooks/use-portfolio";
import type { PortfolioArtifact } from "@/types";


export default function PortfolioPage() {

  const [selectedArtifact, setSelectedArtifact] = useState<PortfolioArtifact | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Queries
  const { data: artifacts = [] } = usePortfolioArtifacts();
  const { data: profileData } = usePortfolioProfile();
  const { data: timelineData } = useGrowthTimeline(90);

  // Mutations
  const { mutateAsync: addReflection } = useAddReflection();

  const handleArtifactClick = async (artifact: PortfolioArtifact) => {
    // Fetch full details if needed (for now using artifact data directly)
    setSelectedArtifact(artifact);
    setDetailModalOpen(true);
  };

  const handleReflectionSubmit = async (artifactId: string, reflection: string) => {
    await addReflection({ artifactId, reflection });
    // Refresh artifact details
    setDetailModalOpen(false);
  };

  const profile = profileData?.profile;
  const verifiedCount = artifacts.filter((a: PortfolioArtifact) =>
    a.verification_status && ["verified", "human_verified"].includes(a.verification_status)
  ).length;
  const featuredCount = artifacts.filter((a: PortfolioArtifact) => a.featured).length;
  const [copied, setCopied] = useState(false);
  const [badgeCopied, setBadgeCopied] = useState(false);
  const publicUrl = useMemo(() => {
    if (!profile?.slug || typeof window === "undefined") return "";
    return `${window.location.origin}/p/${profile.slug}`;
  }, [profile?.slug]);
  const highlightArtifacts = useMemo(() => {
    if (!artifacts.length) return [];
    const preferred = artifacts
      .filter((artifact: PortfolioArtifact) => artifact.featured)
      .slice(0, 3);
    if (preferred.length >= 3) return preferred;
    const verified = artifacts.filter((artifact: PortfolioArtifact) =>
      artifact.verification_status && ["verified", "human_verified"].includes(artifact.verification_status)
    );
    const remaining = verified
      .filter((artifact: PortfolioArtifact) => !preferred.includes(artifact))
      .slice(0, 3 - preferred.length);
    const fallback = artifacts
      .filter((artifact: PortfolioArtifact) => !preferred.includes(artifact) && !remaining.includes(artifact))
      .slice(0, 3 - preferred.length - remaining.length);
    return [...preferred, ...remaining, ...fallback];
  }, [artifacts]);

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">My Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            Showcase your learning journey and achievements
          </p>
        </div>
        <div className="flex gap-2">
          {profile?.is_public && (
            <Button variant="outline" asChild>
              <Link href={`/p/${profile.slug}`} target="_blank">
                <Eye className="h-4 w-4 mr-2" />
                View Public
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/portfolio/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href="/portfolio/create">
              <Plus className="h-4 w-4 mr-2" />
              New Artifact
            </Link>
          </Button>
        </div>
      </div>

      {/* Share CTA */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-emerald-700 text-white shadow-xl">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
              <Sparkles className="h-3 w-3" />
              Share-ready portfolio
            </div>
            <h2 className="text-2xl font-semibold">Turn proof into a public story</h2>
            <p className="text-sm text-white/80">
              Your verified artifacts, milestones, and skills are ready to share with mentors, recruiters,
              or collaborators.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-white/70">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-3 w-3" />
                Verified proofs
              </span>
              <span className="inline-flex items-center gap-2">
                <Zap className="h-3 w-3" />
                Skill transcript
              </span>
            </div>
          </div>
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Public portfolio link
            </p>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/90">
              <Share2 className="h-4 w-4" />
              <span className="truncate">
                {publicUrl || "Enable public portfolio in settings"}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                className="w-full"
                disabled={!publicUrl}
                onClick={async () => {
                  if (!publicUrl) return;
                  await navigator.clipboard.writeText(publicUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? "Copied!" : "Copy link"}
              </Button>
              <Button variant="secondary" className="w-full" asChild disabled={!publicUrl}>
                <Link href={publicUrl || "#"} target="_blank">
                  Open
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <PortfolioHeader
        totalArtifacts={artifacts.length}
        verifiedArtifacts={verifiedCount}
        featuredCount={featuredCount}
        viewCount={profile?.view_count || 0}
        proficientCompetencies={profile?.verified_artifacts || 0}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="artifacts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="competencies">Competencies</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="endorsements">Endorsements</TabsTrigger>
        </TabsList>

        {/* Artifacts Tab */}
        <TabsContent value="artifacts" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70">
                    <Crown className="h-3 w-3" />
                    Highlight reel
                  </div>
                  <span className="text-xs text-white/60">
                    Top artifacts
                  </span>
                </div>
                <CardTitle className="text-2xl">Your strongest proof, ready to share</CardTitle>
                <CardDescription className="text-white/70">
                  Curated automatically from featured and verified work.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {highlightArtifacts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/25 bg-white/5 p-6 text-sm text-white/70">
                    Add or verify an artifact to light up your highlight reel.
                  </div>
                ) : (
                  highlightArtifacts.map((artifact: PortfolioArtifact, index: number) => (
                    <button
                      key={artifact.id ?? `${artifact.title}-${index}`}
                      onClick={() => handleArtifactClick(artifact)}
                      className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/30 hover:bg-white/10"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/80">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          {artifact.title || "Untitled artifact"}
                          {artifact.verification_status ? (
                            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">
                              {artifact.verification_status.replace("_", " ")}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-white/70 line-clamp-2">
                          {artifact.description || "Proof of work captured from your learning journey."}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-b from-white to-slate-50 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  Trophy room
                </div>
                <CardTitle className="text-xl">Share your verified badge</CardTitle>
                <CardDescription>
                  A quick card you can drop into resumes, portfolios, and socials.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-semibold">Horizon Verified Learner</p>
                    <p className="text-xs text-muted-foreground">
                      {verifiedCount} verified artifacts • {featuredCount} featured
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <QrCode className="h-6 w-6" />
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-3 items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Share badge link
                    </p>
                    <p className="text-xs text-foreground break-all">
                      {publicUrl || "Enable your public portfolio to generate a share link."}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={!publicUrl}
                    onClick={async () => {
                      if (!publicUrl) return;
                      await navigator.clipboard.writeText(publicUrl);
                      setBadgeCopied(true);
                      setTimeout(() => setBadgeCopied(false), 2000);
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {badgeCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-muted-foreground">
                  Add this badge to your trophy room or link it in applications to highlight verified learning.
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-lg">
            <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Trophy Room Achievements</CardTitle>
                <CardDescription>
                  Highlighted outcomes, verified wins, and promoted work.
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/artifacts">View all artifacts</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {false ? ( // Keeping structure but removing unused loading var usage if needed, or better: just remove the check if artifacts is [] initially
                <div className="text-center py-12 text-muted-foreground">
                  Loading trophy room...
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {artifacts
                    .filter((artifact: PortfolioArtifact) => artifact.featured)
                    .slice(0, 6)
                    .map((artifact: PortfolioArtifact) => (
                      <button
                        key={artifact.id}
                        onClick={() => handleArtifactClick(artifact)}
                        className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                            Promoted
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {artifact.artifact_type?.replace(/_/g, " ") || "artifact"}
                          </span>
                        </div>
                        <div className="mt-2 text-base font-semibold text-foreground">
                          {artifact.title || "Untitled achievement"}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {artifact.description || "Proof of mastery captured from your learning journey."}
                        </p>
                      </button>
                    ))}
                  {!artifacts.filter((artifact: PortfolioArtifact) => artifact.featured).length && (
                    <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-muted-foreground">
                      Promote your best work to see it featured here.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competencies Tab */}
        <TabsContent value="competencies" className="space-y-6">
          <CompetencyChart
            competencies={timelineData?.competency_chart?.competencies || []}
          />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <GrowthTimeline milestones={timelineData?.timeline || []} />
        </TabsContent>

        {/* Endorsements Tab */}
        <TabsContent value="endorsements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skill Endorsements</CardTitle>
              <CardDescription>
                Recognition from AI mentors, peers, and human mentors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EndorsementList endorsements={[]} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Artifact Detail Modal */}
      <ArtifactDetailModal
        artifact={
          selectedArtifact
            ? {
                ...selectedArtifact,
                verification_status: selectedArtifact.verification_status ?? "pending",
                visibility: selectedArtifact.visibility ?? "private",
                featured: selectedArtifact.featured ?? false,
              }
            : null
        }
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onReflectionSubmit={handleReflectionSubmit}
      />
    </div>
  );
}
