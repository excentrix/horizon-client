"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePortfolioArtifacts } from "@/hooks/use-portfolio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { telemetry } from "@/lib/telemetry";
import { Crown, Sparkles, Trophy } from "lucide-react";
import { ArtifactDetailModal } from "@/components/portfolio/artifact-detail-modal";

const statusLabel = (status?: string) => {
  if (!status) return "draft";
  return status.replace(/_/g, " ");
};

export default function ArtifactsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { data: artifacts = [], isLoading, error } = usePortfolioArtifacts();
  const [tab, setTab] = useState<"submitted" | "verified" | "promoted">("submitted");
  const [selectedArtifact, setSelectedArtifact] = useState<typeof artifacts[number] | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (error) {
      telemetry.error("Artifacts load error", { error });
    }
  }, [error]);

  const filteredArtifacts = useMemo(() => {
    if (!artifacts.length) return [];
    if (tab === "promoted") {
      return artifacts.filter((artifact) => artifact.featured);
    }
    if (tab === "verified") {
      return artifacts.filter(
        (artifact) =>
          artifact.verification_status === "verified" ||
          artifact.verification_status === "human_verified",
      );
    }
    return artifacts.filter(
      (artifact) =>
        !artifact.verification_status ||
        ["pending", "needs_revision", "rejected"].includes(artifact.verification_status),
    );
  }, [artifacts, tab]);

  const handleArtifactClick = (artifact: typeof artifacts[number]) => {
    setSelectedArtifact(artifact);
    setDetailModalOpen(true);
  };

  const promotedArtifacts = useMemo(() => {
    if (!artifacts.length) return [];
    return artifacts.filter((artifact) => artifact.featured).slice(0, 3);
  }, [artifacts]);

  const milestoneCollections = useMemo(() => {
    const groups = new Map<string, typeof artifacts>();
    artifacts.forEach((artifact) => {
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
      items: items.slice(0, 4),
    }));
  }, [artifacts]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Artifact vault
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Artifacts</h1>
        <p className="text-sm text-muted-foreground">
          Track every submission and promote the best work into your Trophy Room.
        </p>
      </header>

      <Card className="border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70">
              <Crown className="h-3 w-3" />
              Featured highlights
            </div>
            <span className="text-xs text-white/60">{promotedArtifacts.length} promoted</span>
          </div>
          <CardTitle className="text-2xl">Your most shareable work</CardTitle>
          <CardDescription className="text-white/70">
            These are the artifacts that show up in your Trophy Room.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {promotedArtifacts.length ? (
            promotedArtifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Trophy className="h-4 w-4 text-emerald-300" />
                  Promoted
                </div>
                <div className="mt-2 text-base font-semibold">{artifact.title}</div>
                <p className="mt-1 text-xs text-white/70 line-clamp-2">
                  {artifact.description || "Verified proof of your learning journey."}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/70">
              Promote an artifact to feature it here.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={tab === "submitted" ? "default" : "outline"}
          onClick={() => setTab("submitted")}
        >
          Submitted
        </Button>
        <Button
          size="sm"
          variant={tab === "verified" ? "default" : "outline"}
          onClick={() => setTab("verified")}
        >
          Verified
        </Button>
        <Button
          size="sm"
          variant={tab === "promoted" ? "default" : "outline"}
          onClick={() => setTab("promoted")}
        >
          Promoted
        </Button>
      </div>

      {milestoneCollections.length ? (
        <Card className="border-0 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-lg">
          <CardHeader>
            <CardTitle>Milestone collections</CardTitle>
            <CardDescription>
              Proof grouped by milestone: objective → approach → outcome → evidence.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {milestoneCollections.map((collection) => (
              <div key={collection.title} className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {collection.title}
                </p>
                <div className="mt-3 space-y-3">
                  {collection.items.map((artifact) => (
                    <button
                      key={artifact.id}
                      onClick={() => handleArtifactClick(artifact)}
                      className="w-full rounded-xl border bg-muted/10 px-3 py-2 text-left text-xs transition hover:border-muted-foreground/40"
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

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>
              {tab === "submitted"
                ? "Submitted artifacts"
                : tab === "verified"
                  ? "Verified artifacts"
                  : "Promoted artifacts"}
            </CardTitle>
            <CardDescription>
              {tab === "submitted"
                ? "Proofs awaiting verification or review."
                : tab === "verified"
                  ? "Artifacts that passed verification."
                  : "Artifacts highlighted in your Trophy Room."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredArtifacts.length ? (
              filteredArtifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  onClick={() => handleArtifactClick(artifact)}
                  className="rounded-2xl border bg-muted/10 p-4 text-left transition hover:-translate-y-0.5 hover:border-muted-foreground/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground line-clamp-1">
                      {artifact.title}
                    </span>
                    <Badge
                      variant={
                        artifact.verification_status === "verified" ||
                        artifact.verification_status === "human_verified"
                          ? "default"
                          : artifact.verification_status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {statusLabel(artifact.verification_status ?? artifact.status)}
                    </Badge>
                  </div>
                  {artifact.description ? (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {artifact.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">{artifact.artifact_type.replace(/_/g, " ")}</Badge>
                    {artifact.featured ? <Badge variant="secondary">Promoted</Badge> : null}
                  </div>
                  {artifact.url ? (
                    <a
                      href={artifact.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-xs font-semibold text-primary underline"
                    >
                      View artifact
                    </a>
                  ) : null}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No artifacts in this view yet.</p>
            )}
          </CardContent>
        </Card>
      )}

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
      />
    </div>
  );
}
