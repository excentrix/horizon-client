"use client";

import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePortfolioArtifacts,
  usePortfolioSkillsTranscript,
  useVerifyArtifact,
} from "@/hooks/use-portfolio";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArtifactDetailModal } from "@/components/portfolio/artifact-detail-modal";
import { CheckCircle2, Star, AlertTriangle, ShieldCheck } from "lucide-react";
import type { PortfolioArtifact } from "@/types";

type ArtifactFilter = "all" | "verified" | "featured";

const levelColor: Record<string, string> = {
  mastery: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40",
  application: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40",
  exposure: "bg-muted text-muted-foreground",
};

const isVeloPending = (a: PortfolioArtifact) =>
  (a.metadata as Record<string, unknown> | undefined)?.source === "velo_resume" &&
  a.verification_status !== "verified" &&
  a.verification_status !== "human_verified";

// ─── component ───────────────────────────────────────────────────────────────

export function EvidenceVaultTab() {
  const { data: artifacts = [], isLoading: artifactsLoading } = usePortfolioArtifacts();
  const { data: skillsTranscript = [], isLoading: skillsLoading } = usePortfolioSkillsTranscript();
  const { mutateAsync: verifyArtifact, isPending: verificationPending } = useVerifyArtifact();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<ArtifactFilter>("all");
  const [selectedArtifact, setSelectedArtifact] = useState<PortfolioArtifact | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Live refresh when a VELO verification event fires
  useEffect(() => {
    const refresh = () =>
      queryClient.invalidateQueries({ queryKey: ["portfolio-artifacts"] });
    window.addEventListener("artifact_verified", refresh);
    return () => window.removeEventListener("artifact_verified", refresh);
  }, [queryClient]);

  const veloQueue = useMemo(
    () =>
      artifacts.filter(
        (a) =>
          isVeloPending(a) &&
          ["pending", "needs_revision", "rejected"].includes(a.verification_status ?? "pending"),
      ),
    [artifacts],
  );

  const filtered = useMemo(() => {
    if (filter === "verified")
      return artifacts.filter(
        (a) =>
          a.verification_status === "verified" || a.verification_status === "human_verified",
      );
    if (filter === "featured") return artifacts.filter((a) => a.featured);
    return artifacts;
  }, [artifacts, filter]);

  const verifiedCount = artifacts.filter(
    (a) => a.verification_status === "verified" || a.verification_status === "human_verified",
  ).length;
  const featuredCount = artifacts.filter((a) => a.featured).length;

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      await verifyArtifact(id);
    } finally {
      setVerifyingId(null);
    }
  };

  const openArtifact = (artifact: PortfolioArtifact) => {
    setSelectedArtifact(artifact);
    setDetailModalOpen(true);
  };

  // ── skills transcript ─────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">

      {/* Verified Skills Transcript */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-semibold">Verified Skills</h2>
          <span className="text-xs text-muted-foreground">backed by portfolio evidence</span>
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
                <div
                  key={skill.competency}
                  className={`rounded-xl border p-3 ${colorClass}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-semibold leading-tight">{skill.competency}</p>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[9px] py-0 px-1.5 capitalize ${colorClass}`}
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

      {/* VELO Verification Queue */}
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
              Resume-imported artifacts awaiting AI verification before they count as evidence.
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
                  onClick={() => handleVerify(artifact.id)}
                  disabled={verificationPending && verifyingId === artifact.id}
                  className="shrink-0"
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

      {/* Artifacts section */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Artifacts</h2>
            <span className="text-xs text-muted-foreground">
              {artifacts.length} total · {verifiedCount} verified
            </span>
          </div>
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
        ) : filtered.length ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((artifact) => {
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
                      variant={isVerified ? "default" : isRejected ? "destructive" : "secondary"}
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
            <p className="text-sm text-muted-foreground">No artifacts in this view yet.</p>
          </div>
        )}
      </section>

      {/* Detail modal */}
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
