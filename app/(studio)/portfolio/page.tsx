"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus,
  Settings,
  Eye,
  Copy,
  Sparkles,
  ShieldCheck,
  Zap,
  Crown,
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
  const [qrOpen, setQrOpen] = useState(false);

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

  const milestoneCollections = useMemo(() => {
    const groups = new Map<string, typeof artifacts>();
    artifacts.forEach((artifact: PortfolioArtifact) => {
      const meta = artifact.metadata as { milestone_title?: string } | undefined;
      const title = meta?.milestone_title;
      if (!title) return;
      if (!groups.has(title)) {
        groups.set(title, []);
      }
      groups.get(title)?.push(artifact);
    });
    return Array.from(groups.entries()).map(([title, items]) => ({
      title,
      items: items.slice(0, 3),
    }));
  }, [artifacts]);

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] bg-[radial-gradient(1200px_600px_at_0%_0%,rgba(56,189,248,0.08),transparent),radial-gradient(900px_500px_at_100%_10%,rgba(249,115,22,0.06),transparent)] px-6 py-8">
      <div className="container mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[var(--shadow-2)] backdrop-blur">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Portfolio</p>
          <h1 className="text-4xl font-bold tracking-tight">Public Profile & Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            Manage the public-facing profile, links, and visibility settings for your portfolio.
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
          <Button variant="outline" asChild className="rounded-full">
            <Link href="/portfolio/settings">
              <Settings className="h-4 w-4 mr-2" />
              Edit Public Profile
            </Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link href="/portfolio/create">
              <Plus className="h-4 w-4 mr-2" />
              New Artifact
            </Link>
          </Button>
        </div>
      </div>

      {/* Share CTA */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-emerald-700 text-white shadow-xl">
        <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
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
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/20 bg-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                  Horizon Verified Learner
                </p>
                <p className="text-sm text-white">
                  {verifiedCount} verified artifacts • {featuredCount} featured
                </p>
              </div>
              <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
                    aria-label="Open QR share"
                  >
                    <QrCode className="h-6 w-6" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Share your portfolio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="mx-auto flex w-full max-w-[240px] items-center justify-center rounded-2xl border border-border bg-muted/40 p-4">
                      {publicUrl ? (
                        <img
                          alt="Portfolio QR"
                          className="h-48 w-48"
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                            publicUrl
                          )}`}
                        />
                      ) : (
                        <div className="text-center text-xs text-muted-foreground">
                          Enable your public portfolio to generate a QR code.
                        </div>
                      )}
                    </div>
                    <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                      {publicUrl || "Enable your public portfolio to generate a share link."}
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                        {badgeCopied ? "Copied" : "Copy link"}
                      </Button>
                      <Button size="sm" variant="outline" asChild disabled={!publicUrl}>
                        <Link href={publicUrl || "#"} target="_blank">
                          Open public
                        </Link>
                      </Button>
                      <Button size="sm" variant="secondary" asChild>
                        <Link href="/portfolio/settings">
                          Manage sharing
                        </Link>
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-3 text-xs text-white/70">
              The badge updates as you verify artifacts. Tap the QR to share instantly.
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
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-4 rounded-full bg-white/80 p-1.5 shadow-[var(--shadow-1)] backdrop-blur lg:w-[720px]">
            <TabsTrigger value="artifacts" className="rounded-full text-xs font-semibold">Artifacts</TabsTrigger>
            <TabsTrigger value="competencies" className="rounded-full text-xs font-semibold">Competencies</TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-full text-xs font-semibold">Timeline</TabsTrigger>
            <TabsTrigger value="endorsements" className="rounded-full text-xs font-semibold">Endorsements</TabsTrigger>
          </TabsList>
          <span className="hidden rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-[var(--shadow-1)] lg:inline-flex">
            4 tabs
          </span>
        </div>

        {/* Artifacts Tab */}
        <TabsContent value="artifacts" className="space-y-6">
          <div className="space-y-6">
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

            {milestoneCollections.length ? (
              <Card className="border border-white/80 bg-white/85 shadow-[var(--shadow-2)] backdrop-blur">
                <CardHeader>
                  <CardTitle>Milestone collections</CardTitle>
                  <CardDescription>
                    Objective → Approach → Outcome → Evidence, grouped by milestone.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {milestoneCollections.map((collection) => (
                    <div key={collection.title} className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {collection.title}
                      </p>
                      <div className="mt-3 space-y-2">
                        {collection.items.map((artifact: PortfolioArtifact) => (
                          <button
                            key={artifact.id}
                            onClick={() => handleArtifactClick(artifact)}
                            className="w-full rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-left text-xs transition hover:border-muted-foreground/40"
                          >
                            <div className="font-semibold text-foreground">{artifact.title}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Evidence: {artifact.artifact_type.replace(/_/g, " ")}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card className="border border-white/80 bg-white/85 shadow-[var(--shadow-2)] backdrop-blur">
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
                        className="group rounded-2xl border border-white/70 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
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
    </div>
  );
}
