"use client";

import { useMemo, useState, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  usePortfolioArtifacts,
  usePortfolioProfile,
  usePortfolioSkillsTranscript,
  useVerifyArtifact,
  useAddReflection,
  useGrowthTimeline,
} from "@/hooks/use-portfolio";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArtifactDetailModal } from "@/components/portfolio/artifact-detail-modal";
import { PortfolioHeader } from "@/components/portfolio/portfolio-header";
import { CompetencyChart } from "@/components/portfolio/competency-chart";
import { GrowthTimeline } from "@/components/portfolio/growth-timeline";
import {
  CheckCircle2,
  Star,
  AlertTriangle,
  ShieldCheck,
  Crown,
  Plus,
  Settings,
  Eye,
} from "lucide-react";
import { portfolioApi } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import type { PortfolioArtifact } from "@/types";

// ─── types ────────────────────────────────────────────────────────────────────

type ArtifactFilter = "all" | "verified" | "featured";

const ARTIFACT_TYPES = [
  "project",
  "essay",
  "code_sample",
  "presentation",
  "certificate",
  "research",
  "design",
  "video",
  "other",
];

const levelColor: Record<string, string> = {
  mastery:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40",
  application:
    "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40",
  exposure: "bg-muted text-muted-foreground",
};

const isVeloPending = (a: PortfolioArtifact) =>
  (a.metadata as Record<string, unknown> | undefined)?.source === "velo_resume" &&
  a.verification_status !== "verified" &&
  a.verification_status !== "human_verified";

// ─── component ────────────────────────────────────────────────────────────────

export function PortfolioVaultTab() {
  const queryClient = useQueryClient();

  // data
  const { data: artifacts = [], isLoading: artifactsLoading } = usePortfolioArtifacts();
  const { data: profileData } = usePortfolioProfile();
  const { data: skillsTranscript = [], isLoading: skillsLoading } =
    usePortfolioSkillsTranscript();
  const { data: timelineData } = useGrowthTimeline(90);
  const { mutateAsync: verifyArtifact, isPending: verificationPending } = useVerifyArtifact();
  const { mutateAsync: addReflection } = useAddReflection();

  // local ui state
  const [filter, setFilter] = useState<ArtifactFilter>("all");
  const [selectedArtifact, setSelectedArtifact] = useState<PortfolioArtifact | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [newArtifactOpen, setNewArtifactOpen] = useState(false);

  // live refresh on VELO verification events
  useEffect(() => {
    const refresh = () =>
      queryClient.invalidateQueries({ queryKey: ["portfolio-artifacts"] });
    window.addEventListener("artifact_verified", refresh);
    return () => window.removeEventListener("artifact_verified", refresh);
  }, [queryClient]);

  // ── derived values ──────────────────────────────────────────────────────

  const profile = profileData?.profile;

  const verifiedCount = artifacts.filter(
    (a) => a.verification_status === "verified" || a.verification_status === "human_verified",
  ).length;
  const featuredCount = artifacts.filter((a) => a.featured).length;

  const highlightArtifacts = useMemo(() => {
    const featured = artifacts.filter((a) => a.featured).slice(0, 3);
    if (featured.length >= 3) return featured;
    const verified = artifacts
      .filter(
        (a) =>
          !featured.includes(a) &&
          (a.verification_status === "verified" || a.verification_status === "human_verified"),
      )
      .slice(0, 3 - featured.length);
    const fallback = artifacts
      .filter((a) => !featured.includes(a) && !verified.includes(a))
      .slice(0, 3 - featured.length - verified.length);
    return [...featured, ...verified, ...fallback];
  }, [artifacts]);

  const milestoneCollections = useMemo(() => {
    const groups = new Map<string, PortfolioArtifact[]>();
    artifacts.forEach((a) => {
      const title = (a.metadata as { milestone_title?: string } | undefined)?.milestone_title;
      if (!title) return;
      if (!groups.has(title)) groups.set(title, []);
      groups.get(title)!.push(a);
    });
    return Array.from(groups.entries()).map(([title, items]) => ({
      title,
      items: items.slice(0, 3),
    }));
  }, [artifacts]);

  const veloQueue = useMemo(
    () =>
      artifacts.filter(
        (a) =>
          isVeloPending(a) &&
          ["pending", "needs_revision", "rejected"].includes(a.verification_status ?? "pending"),
      ),
    [artifacts],
  );

  const filteredArtifacts = useMemo(() => {
    if (filter === "verified")
      return artifacts.filter(
        (a) =>
          a.verification_status === "verified" || a.verification_status === "human_verified",
      );
    if (filter === "featured") return artifacts.filter((a) => a.featured);
    return artifacts;
  }, [artifacts, filter]);

  // ── handlers ────────────────────────────────────────────────────────────

  const openArtifact = (artifact: PortfolioArtifact) => {
    setSelectedArtifact(artifact);
    setDetailModalOpen(true);
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      await verifyArtifact(id);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleReflectionSubmit = async (artifactId: string, reflection: string) => {
    await addReflection({ artifactId, reflection });
    setDetailModalOpen(false);
  };

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">

      {/* Portfolio management header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Portfolio</p>
          <h2 className="text-lg font-bold tracking-tight">Public Profile & Evidence</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile?.is_public && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/p/${profile.slug}`} target="_blank">
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                View Public
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/portfolio">
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Portfolio Settings
            </Link>
          </Button>
          <Button size="sm" onClick={() => setNewArtifactOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Artifact
          </Button>
        </div>
      </div>

      {/* Portfolio stats */}
      <PortfolioHeader
        totalArtifacts={artifacts.length}
        verifiedArtifacts={verifiedCount}
        featuredCount={featuredCount}
        viewCount={profile?.view_count ?? 0}
        proficientCompetencies={profile?.verified_artifacts ?? 0}
      />

      {/* Inner section tabs */}
      <Tabs defaultValue="artifacts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 md:w-[480px]">
          <TabsTrigger value="artifacts" className="text-xs font-semibold">
            Artifacts
          </TabsTrigger>
          <TabsTrigger value="skills" className="text-xs font-semibold">
            Skills & Competencies
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs font-semibold">
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* ── Artifacts ──────────────────────────────────────────────── */}
        <TabsContent value="artifacts" className="mt-0 space-y-5">

          {/* Highlight reel */}
          <Card className="border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70">
                  <Crown className="h-3 w-3" />
                  Highlight Reel
                </div>
                <span className="text-xs text-white/50">{highlightArtifacts.length} pieces</span>
              </div>
              <CardTitle className="text-xl">Your strongest proof, ready to share</CardTitle>
              <CardDescription className="text-white/65">
                Auto-curated from your featured and verified work.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {highlightArtifacts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-5 text-sm text-white/60">
                  Verify or feature an artifact to light up your highlight reel.
                </div>
              ) : (
                highlightArtifacts.map((artifact, idx) => (
                  <button
                    key={artifact.id}
                    onClick={() => openArtifact(artifact)}
                    className="flex w-full items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-3.5 text-left transition hover:border-white/25 hover:bg-white/10"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/70">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span className="line-clamp-1">{artifact.title || "Untitled"}</span>
                        {(artifact.verification_status === "verified" ||
                          artifact.verification_status === "human_verified") && (
                          <span className="shrink-0 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">
                            verified
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-1 text-xs text-white/55">
                        {artifact.description || "Proof of work from your learning journey."}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Milestone collections */}
          {milestoneCollections.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Milestone Collections</CardTitle>
                <CardDescription>
                  Objective → Approach → Outcome → Evidence, grouped by milestone.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {milestoneCollections.map((collection) => (
                  <div key={collection.title} className="rounded-xl border bg-muted/20 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {collection.title}
                    </p>
                    <div className="space-y-1.5">
                      {collection.items.map((artifact) => (
                        <button
                          key={artifact.id}
                          onClick={() => openArtifact(artifact)}
                          className="w-full rounded-lg border bg-card px-3 py-2 text-left text-xs transition hover:border-muted-foreground/40"
                        >
                          <p className="font-semibold text-foreground line-clamp-1">
                            {artifact.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {artifact.artifact_type.replace(/_/g, " ")}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* VELO verification queue */}
          {veloQueue.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  VELO Verification Queue
                  <Badge
                    variant="outline"
                    className="ml-1 border-amber-300 px-1.5 py-0 font-mono text-[10px] text-amber-700"
                  >
                    {veloQueue.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Resume-imported artifacts awaiting AI verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {veloQueue.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-white px-3 py-2.5 dark:border-amber-900/40 dark:bg-background"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{artifact.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {(artifact.verification_status ?? "pending").replace(/_/g, " ")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => handleVerify(artifact.id)}
                      disabled={verificationPending && verifyingId === artifact.id}
                    >
                      {verificationPending && verifyingId === artifact.id
                        ? "Verifying…"
                        : "Verify"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Artifact browser */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                All Artifacts
                <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                  {artifacts.length} total · {verifiedCount} verified
                </span>
              </h3>
              <div className="flex gap-1.5">
                {(["all", "verified", "featured"] as ArtifactFilter[]).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "default" : "outline"}
                    onClick={() => setFilter(f)}
                    className="h-7 text-xs"
                  >
                    {f === "all"
                      ? `All (${artifacts.length})`
                      : f === "verified"
                      ? `Verified (${verifiedCount})`
                      : `Featured (${featuredCount})`}
                  </Button>
                ))}
              </div>
            </div>

            {artifactsLoading ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 rounded-xl" />
                ))}
              </div>
            ) : filteredArtifacts.length ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredArtifacts.map((artifact) => {
                  const isVerified =
                    artifact.verification_status === "verified" ||
                    artifact.verification_status === "human_verified";
                  const isRejected = artifact.verification_status === "rejected";
                  return (
                    <button
                      key={artifact.id}
                      onClick={() => openArtifact(artifact)}
                      className="rounded-2xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {artifact.title}
                        </p>
                        <div className="flex shrink-0 items-center gap-1">
                          {isVerified && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                          {artifact.featured && (
                            <Star className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          {isVeloPending(artifact) && (
                            <Badge
                              variant="outline"
                              className="border-amber-300 px-1 py-0 text-[9px] text-amber-700"
                            >
                              VELO
                            </Badge>
                          )}
                        </div>
                      </div>
                      {artifact.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                          {artifact.description}
                        </p>
                      )}
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {artifact.artifact_type.replace(/_/g, " ")}
                        </Badge>
                        <Badge
                          variant={
                            isVerified ? "default" : isRejected ? "destructive" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {(
                            artifact.verification_status ??
                            artifact.status ??
                            "draft"
                          ).replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">No artifacts in this view.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Skills & Competencies ───────────────────────────────────── */}
        <TabsContent value="skills" className="mt-0 space-y-5">

          {/* Verified Skills Transcript */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-semibold">Verified Skills</h3>
              <span className="text-xs text-muted-foreground">
                evidence-backed, from your artifacts
              </span>
            </div>
            {skillsLoading ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-[72px] rounded-xl" />
                ))}
              </div>
            ) : skillsTranscript.length ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {skillsTranscript.map((skill) => {
                  const quality = Math.round((skill.avg_quality ?? 0) * 100);
                  const colorClass = levelColor[skill.best_level] ?? levelColor.exposure;
                  return (
                    <div key={skill.competency} className={`rounded-xl border p-3 ${colorClass}`}>
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold leading-tight">{skill.competency}</p>
                        <Badge
                          variant="outline"
                          className={`shrink-0 px-1.5 py-0 text-[9px] capitalize ${colorClass}`}
                        >
                          {skill.best_level}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-[10px] opacity-70">
                        {skill.evidence_count} evidence · {quality}% quality
                      </p>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-current/10">
                        <div
                          className="h-full rounded-full bg-current/50 transition-all"
                          style={{ width: `${quality}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Submit and verify artifacts to build your skills transcript.
                </p>
              </div>
            )}
          </section>

          {/* Competency chart */}
          <CompetencyChart
            competencies={timelineData?.competency_chart?.competencies ?? []}
          />
        </TabsContent>

        {/* ── Timeline ───────────────────────────────────────────────── */}
        <TabsContent value="timeline" className="mt-0">
          <GrowthTimeline milestones={timelineData?.timeline ?? []} />
        </TabsContent>
      </Tabs>

      {/* Artifact detail modal */}
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

      {/* New artifact dialog */}
      <NewArtifactDialog
        open={newArtifactOpen}
        onOpenChange={setNewArtifactOpen}
        onCreated={() =>
          queryClient.invalidateQueries({ queryKey: ["portfolio-artifacts"] })
        }
      />
    </div>
  );
}

// ─── new artifact dialog ──────────────────────────────────────────────────────

function NewArtifactDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("project");
  const [url, setUrl] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      portfolioApi.createArtifact({
        title,
        description,
        artifact_type: type as PortfolioArtifact["artifact_type"],
        url: url || undefined,
      }),
    onSuccess: () => {
      toast.success("Artifact created.");
      onCreated();
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setType("project");
      setUrl("");
    },
    onError: () => toast.error("Failed to create artifact."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Artifact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. ML Model for Churn Prediction"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ARTIFACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you build or learn?"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Link{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/..."
              type="url"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create Artifact"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
