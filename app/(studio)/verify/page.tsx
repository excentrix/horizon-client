"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Upload,
  Loader2,
  ExternalLink,
  CircleAlert,
  CheckCircle2,
  Share2,
  Star,
} from "lucide-react";
import { useMirrorSnapshot } from "@/hooks/use-mirror-snapshot";
import { useGithubRepos } from "@/hooks/use-github-repos";
import { useAuth } from "@/context/AuthContext";
import { ProjectVerificationSheet } from "@/components/mirror/ProjectVerificationSheet";
import { authApi, auditApi } from "@/lib/api";
import { INTERROGATION_DIMENSIONS, type DimensionScores } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VeloProfileTab } from "@/components/mirror/velo-profile-tab";
import { trackFunnel, FUNNEL } from "@/lib/funnel";
import { toast } from "sonner";

const ACCEPTED = ["application/pdf", "image/png", "image/jpeg"];

type ProjectEntry = {
  title?: string;
  description?: string;
  technologies?: string[];
  repo_url?: string;
  demo_url?: string;
};

type VerificationStatus =
  | "unverified"
  | "evidence_submitted"
  | "interrogating"
  | "verified"
  | "failed"
  | "suspicious";

// Statuses where finalize() has actually run — a real verdict with
// dimension_scores + verdict_summary exists, even when the outcome is
// unflattering. These must show their reasoning, not just a bare badge.
const DECIDED_STATUSES = new Set<string>(["verified", "suspicious", "failed"]);

const DIMENSION_LABELS: Record<string, string> = {
  ownership: "Ownership",
  technical_depth: "Technical depth",
  debugging_ability: "Debugging",
  communication: "Communication",
  honesty: "Honesty",
  consistency: "Consistency",
};

const NOT_ASSESSED_MARKERS = new Set([
  "not assessed across the interview",
  "not assessed in this answer",
]);

/** Compact breakdown for the project list card — same status-color
 *  language as the verdict sheet, low density since this is a scan-many-
 *  projects context. */
function CardDimensionBreakdown({ dimensionScores }: { dimensionScores: DimensionScores }) {
  const rows: { dim: string; score: number; evidence: string }[] = [];
  for (const dim of INTERROGATION_DIMENSIONS) {
    const data = dimensionScores[dim];
    if (!data) continue;
    if (NOT_ASSESSED_MARKERS.has((data.evidence || "").trim().toLowerCase())) continue;
    rows.push({ dim, score: Math.round(data.score * 100), evidence: data.evidence });
  }
  if (rows.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      {rows.map(({ dim, score, evidence }) => (
        <span
          key={dim}
          title={evidence}
          className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground"
        >
          <span
            className={
              "size-1.5 rounded-full " +
              (score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-rose-500")
            }
          />
          {DIMENSION_LABELS[dim] ?? dim} {score}
        </span>
      ))}
    </div>
  );
}

function statusBadge(status?: VerificationStatus, score?: number | null) {
  switch (status) {
    case "verified":
      return (
        <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
          <CheckCircle2 className="size-3" /> Verified{score != null ? ` · ${Math.round(score * 100)}` : ""}
        </Badge>
      );
    case "interrogating":
    case "evidence_submitted":
      return <Badge variant="secondary">In progress</Badge>;
    case "suspicious":
      return (
        <Badge variant="destructive" className="gap-1">
          <CircleAlert className="size-3" /> Flagged{score != null ? ` · ${Math.round(score * 100)}` : ""}
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          Not defended{score != null ? ` · ${Math.round(score * 100)}` : ""}
        </Badge>
      );
    default:
      return <Badge variant="outline">Unverified</Badge>;
  }
}

export default function VerifyPage() {
  const { data, isLoading } = useMirrorSnapshot();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickingUrl, setPickingUrl] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ snapshotId: string; index: number; title: string } | null>(
    null,
  );

  const status = data?.status;
  const mirror = data?.mirror ?? null;
  const analysisRunning =
    status === "running" || data?.analysis_job?.status === "running" || data?.analysis_job?.status === "queued";

  const normalized = (mirror?.normalized_profile ?? {}) as Record<string, unknown>;
  const projects = (normalized.projects as ProjectEntry[] | undefined) ?? [];
  const verifications = mirror?.project_verifications ?? [];
  const verifiedCount = verifications.filter((v) => v.status === "verified").length;
  const deep = (mirror?.deep_analysis ?? {}) as { ats_score?: number };
  const verifiedProfile = mirror?.verified_profile;

  // Fire ANALYSIS_READY once when the snapshot first flips to "ready".
  const analysisReadyFired = useRef(false);
  useEffect(() => {
    if (status === "ready" && mirror && !analysisReadyFired.current) {
      analysisReadyFired.current = true;
      trackFunnel(FUNNEL.ANALYSIS_READY, { projects: projects.length });
    }
  }, [status, mirror, projects.length]);

  const handleUpload = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Please upload a PDF, PNG or JPG resume.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("resume", file);
      await authApi.uploadResume(form);
      trackFunnel(FUNNEL.RESUME_UPLOADED);
      toast.success("Resume uploaded — VELO is extracting your claims.");
      await queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
    } catch {
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddProject = async (title: string, repoUrl: string) => {
    const res = await auditApi.addManualProject({ title, repo_url: repoUrl });
    await queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
    setSheet({ snapshotId: res.snapshot_id, index: res.project_index, title: res.title });
  };

  const handlePickRepo = async (repo: { name: string; url: string }) => {
    setPickingUrl(repo.url);
    try {
      await handleAddProject(repo.name, repo.url);
    } catch {
      toast.error("Couldn’t start verification for that repo.");
    } finally {
      setPickingUrl(null);
    }
  };

  const shareVerifiedProfile = async () => {
    if (!user?.username) return;
    const url = `${window.location.origin}/p/${encodeURIComponent(user.username)}?tab=verified`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Verified-profile link copied — send it to a recruiter.");
    } catch {
      toast.error(url);
    }
  };

  const copyCredentialLink = async (auditId: string) => {
    const url = `${window.location.origin}/audit/public/${auditId}`;
    try {
      await navigator.clipboard.writeText(url);
      trackFunnel(FUNNEL.CREDENTIAL_SHARED, { audit_id: auditId });
      toast.success("Credential link copied — share it anywhere.");
    } catch {
      toast.error(url);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // ── Empty: intake ────────────────────────────────────────────────────────────
  if (status === "empty" || (!mirror && !analysisRunning)) {
    return (
      <div className="mx-auto w-full max-w-2xl p-6">
        <div className="grain relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center">
          <ShieldCheck className="mx-auto mb-4 size-10 text-(--brand-tangerine)" />
          <p className="eyebrow mb-3 flex items-center justify-center gap-2">
            <span className="eyebrow-dot" /> Proof of work
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Verify the claims on your resume
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Upload your resume. VELO extracts the projects you claim, then interrogates you on each
            one — and turns the parts you can defend into a verifiable proof-of-work credential.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <Button
            className="mt-6 bg-(--brand-tangerine) text-accent-foreground hover:opacity-90"
            size="lg"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="size-4" /> Upload resume
              </>
            )}
          </Button>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            PDF / PNG / JPG · max 10MB · Free for your first verification
          </p>
        </div>
        <div className="mt-4 space-y-3">
          <p className="text-center font-mono text-xs uppercase tracking-wide text-muted-foreground">
            or skip the resume
          </p>
          <GithubReposPicker onPick={handlePickRepo} pickingUrl={pickingUrl} />
          <AddProjectForm onAdd={handleAddProject} />
        </div>
      </div>
    );
  }

  // ── Running: analysis in progress ────────────────────────────────────────────
  if (analysisRunning || (!mirror && status !== "failed")) {
    return (
      <div className="mx-auto w-full max-w-2xl p-6">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Loader2 className="mx-auto mb-4 size-8 animate-spin text-primary" />
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Extracting your claims…
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            VELO is analyzing your resume and pulling out the projects you’ll defend. This usually
            takes under a minute.
          </p>
        </div>
      </div>
    );
  }

  // ── Ready: credential + projects to verify ──────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <Tabs defaultValue="defend" className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="defend">Defend your work</TabsTrigger>
          <TabsTrigger value="analysis">Resume analysis</TabsTrigger>
        </TabsList>

        {/* Defend content stays readable at a narrower measure inside the wide shell */}
        <TabsContent value="defend" className="mx-auto max-w-3xl space-y-6">
      {/* Orientation */}
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">How VELO works:</span> we extract the projects
        you claim, then interrogate you on each one. Defend a project to earn a verifiable
        proof-of-work credential you can share. See the full breakdown of your resume under{" "}
        <span className="font-medium text-foreground">Resume analysis</span>.
      </div>

      {/* Credential header */}
      <div className="grain relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/5 blur-2xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="eyebrow flex items-center gap-2">
                <span className="eyebrow-dot" /> Your proof of work
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                {verifiedCount > 0
                  ? `${verifiedCount} project${verifiedCount > 1 ? "s" : ""} verified`
                  : "Nothing verified yet"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {verifiedCount > 0
                  ? "Share your verified credential where it counts."
                  : "Defend a project below to earn your first credential."}
              </p>
              {verifiedProfile?.narrative && (
                <div className="mt-3 max-w-xl rounded-xl border border-accent/20 bg-accent/[0.04] p-3">
                  {verifiedProfile.headline && (
                    <p className="mb-0.5 text-sm font-semibold text-accent">
                      {verifiedProfile.headline}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {verifiedProfile.narrative}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Synthesized from your defended work · see Resume analysis for the full breakdown
                  </p>
                </div>
              )}
              {verifiedCount > 0 && user?.username && (
                <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={shareVerifiedProfile}>
                  <Share2 className="size-3.5" /> Share verified profile
                </Button>
              )}
            </div>
          </div>
          {typeof deep.ats_score === "number" && (
            <div className="flex flex-col items-center rounded-xl border border-border bg-muted/40 px-5 py-3">
              <p className="font-display text-3xl font-semibold leading-none tabular-nums">
                {deep.ats_score}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                resume ATS
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Projects to defend
        </h2>
        {projects.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No projects were found on your resume — add a repo below to verify it directly.
          </p>
        )}
        {projects.map((p, index) => {
          const v = verifications.find((x) => x.project_index === index);
          return (
            <div
              key={index}
              className={
                "flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 transition-colors " +
                (v?.status === "verified"
                  ? "border border-emerald-500/80 "
                  : "border-border hover:border-accent/50")
              }
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{p.title ?? `Project ${index + 1}`}</span>
                  {statusBadge(v?.status as VerificationStatus, v?.verification_score)}
                </div>
                {p.repo_url && (
                  <a
                    href={p.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                  >
                    {p.repo_url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
                  </a>
                )}
                {DECIDED_STATUSES.has(v?.status ?? "") && v?.verdict_summary && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {v.verdict_summary}
                  </p>
                )}
                {DECIDED_STATUSES.has(v?.status ?? "") && v?.dimension_scores && (
                  <CardDimensionBreakdown dimensionScores={v.dimension_scores} />
                )}
                {v?.status === "verified" && v.audit_id && (
                  <button
                    type="button"
                    onClick={() => copyCredentialLink(v.audit_id!)}
                    className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                  >
                    <Share2 className="size-3" /> Copy share link
                  </button>
                )}
              </div>
              <Button
                size="sm"
                variant={DECIDED_STATUSES.has(v?.status ?? "") ? "outline" : "default"}
                onClick={() =>
                  mirror &&
                  setSheet({
                    snapshotId: mirror.id,
                    index,
                    title: p.title ?? `Project ${index + 1}`,
                  })
                }
              >
                {v?.status === "verified"
                  ? "Re-verify"
                  : DECIDED_STATUSES.has(v?.status ?? "")
                  ? "Review result"
                  : "Verify"}
              </Button>
            </div>
          );
        })}

        <GithubReposPicker onPick={handlePickRepo} pickingUrl={pickingUrl} />
        <AddProjectForm onAdd={handleAddProject} />
      </div>
        </TabsContent>

        <TabsContent value="analysis">
          <VeloProfileTab />
        </TabsContent>
      </Tabs>

      {sheet && (
        <ProjectVerificationSheet
          open={sheet !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSheet(null);
              queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
            }
          }}
          snapshotId={sheet.snapshotId}
          projectIndex={sheet.index}
          projectTitle={sheet.title}
          initialRepoUrl={projects[sheet.index]?.repo_url}
        />
      )}
    </div>
  );
}

/** Inline "verify a repo directly" form — works with or without a resume. */
function AddProjectForm({ onAdd }: { onAdd: (title: string, repoUrl: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!repoUrl.trim() && !title.trim()) {
      toast.error("Add a repo URL or a project title.");
      return;
    }
    setBusy(true);
    try {
      await onAdd(title.trim(), repoUrl.trim());
      setTitle("");
      setRepoUrl("");
    } catch {
      toast.error("Couldn’t add the project. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-4">
      <p className="mb-1 text-sm font-medium">Verify a repo directly</p>
      <p className="mb-3 text-xs text-muted-foreground">Public repos only for now.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/you/project"
          className="flex-1"
        />
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="sm:w-48"
        />
        <Button onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Add & verify"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Connect a GitHub account and pick a repo to verify — the robust path when a
 * resume lists no projects (experienced devs describe work as "experience").
 */
function GithubReposPicker({
  onPick,
  pickingUrl,
}: {
  onPick: (repo: { name: string; url: string }) => void;
  pickingUrl: string | null;
}) {
  const { connected, username, repos, isLoading, error, fetchRepos, connectGithub, disconnect } =
    useGithubRepos();
  const [connecting, setConnecting] = useState(false);
  const [query, setQuery] = useState("");

  const handleDisconnect = async () => {
    await disconnect();
    toast.success("GitHub disconnected.");
  };

  const handleReconnect = async () => {
    setConnecting(true);
    try {
      // Re-running OAuth overwrites the stored token. Don't await disconnect()
      // first — that would lose the click gesture and the popup gets blocked.
      const res = await connectGithub();
      if (!res.success) toast.error("GitHub reconnection was cancelled.");
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await connectGithub();
      if (!res.success) toast.error("GitHub connection was cancelled.");
    } finally {
      setConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline size-4 animate-spin" /> Loading your GitHub repos…
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-4">
        <p className="mb-1 text-sm font-medium">Connect your GitHub</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Pick a repo straight from your account to defend — no resume needed. Public repos only for now.
        </p>
        <Button onClick={handleConnect} disabled={connecting} variant="outline">
          {connecting ? <Loader2 className="size-4 animate-spin" /> : "Connect GitHub"}
        </Button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  const visible = repos
    .filter((r) => !r.fork)
    .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.pushed_at > a.pushed_at ? 1 : -1))
    .slice(0, 30);

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Your GitHub <span className="font-normal text-muted-foreground">@{username}</span>
        </p>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter repos…"
            className="h-8 w-40"
          />
          <button
            type="button"
            onClick={handleReconnect}
            disabled={connecting}
            className="font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {connecting ? "…" : "Reconnect"}
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="font-mono text-xs text-destructive hover:underline"
          >
            Disconnect
          </button>
        </div>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {visible.map((repo) => (
          <div
            key={repo.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
          >
            <div className="min-w-0">
              <span className="truncate text-sm font-medium">{repo.name}</span>
              <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                {repo.language && <span>{repo.language}</span>}
                {repo.stars > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3" /> {repo.stars}
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={pickingUrl === repo.url}
              onClick={() => onPick({ name: repo.name, url: repo.url })}
            >
              {pickingUrl === repo.url ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
            </Button>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-xs text-muted-foreground">No repos match.</p>
        )}
      </div>
    </div>
  );
}
