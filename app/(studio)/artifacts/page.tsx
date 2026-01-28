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

const statusLabel = (status?: string) => {
  if (!status) return "draft";
  return status.replace(/_/g, " ");
};

export default function ArtifactsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { data: artifacts = [], isLoading, error } = usePortfolioArtifacts();
  const [tab, setTab] = useState<"submitted" | "verified" | "promoted">("submitted");

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

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Artifacts</h1>
        <p className="text-sm text-muted-foreground">
          Track every submission and promote the best work into your Trophy Room.
        </p>
      </header>

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

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <Card>
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
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            {filteredArtifacts.length ? (
              filteredArtifacts.map((artifact) => (
                <div key={artifact.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{artifact.title}</span>
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
                    <p className="mt-1 text-muted-foreground">{artifact.description}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{artifact.artifact_type.replace(/_/g, " ")}</Badge>
                    {artifact.featured ? <Badge variant="secondary">Promoted</Badge> : null}
                    {artifact.url ? (
                      <a
                        href={artifact.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        View artifact
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p>No artifacts in this view yet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
