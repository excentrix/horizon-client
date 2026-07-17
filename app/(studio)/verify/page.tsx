"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Loader2,
  ExternalLink,
  Star,
  ArrowRight,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { useMirrorSnapshot } from "@/hooks/use-mirror-snapshot";
import { useGithubRepos } from "@/hooks/use-github-repos";
import { usePublicVerifiedProfile } from "@/hooks/use-portfolio";
import { useAuth } from "@/context/AuthContext";
import { authApi, auditApi, type ClaimTested, type VerifiedProfileSummary } from "@/lib/api";
import { INTERROGATION_DIMENSIONS, type DimensionScores } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VeloProfileTab } from "@/components/mirror/velo-profile-tab";
import { VerifiedProfileView } from "@/components/verified/verified-profile-view";
import { RadarChart, type RadarAxis } from "@/components/velo/radar-chart";
import { ShareActions } from "@/components/velo/share-actions";
import { VerdictStamp, DECIDED_STATUSES } from "@/components/velo/verdict-stamp";
import {
  DIMENSION_LABELS,
  isNotAssessed,
  statusClassForScore,
} from "@/components/velo/dimension-meters";
import { ClaimChipsInline } from "@/components/velo/claim-chips";
import { trackFunnel, FUNNEL } from "@/lib/funnel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ACCEPTED = ["application/pdf", "image/png", "image/jpeg"];

type ProjectEntry = {
  title?: string;
  description?: string;
  technologies?: string[];
  repo_url?: string;
  demo_url?: string;
};

type Verification = NonNullable<
  NonNullable<Awaited<ReturnType<typeof auditApi.getMirrorLatest>>["mirror"]>["project_verifications"]
>[number];

const COVERAGE_LABEL: Record<string, string> = {
  none: "No evidence yet",
  unverified: "Nothing defended yet",
  limited: "Limited evidence",
  partial: "Partial evidence",
  strong: "Strong evidence",
};

export default function VerifyPage() {
  const { data, isLoading } = useMirrorSnapshot();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickingUrl, setPickingUrl] = useState<string | null>(null);

  const status = data?.status;
  const mirror = data?.mirror ?? null;
  const analysisRunning =
    status === "running" ||
    data?.analysis_job?.status === "running" ||
    data?.analysis_job?.status === "queued";

  const normalized = (mirror?.normalized_profile ?? {}) as Record<string, unknown>;
  const projects = (normalized.projects as ProjectEntry[] | undefined) ?? [];
  const verifications = useMemo(
    () => mirror?.project_verifications ?? [],
    [mirror?.project_verifications],
  );
  const verifiedCount = verifications.filter((v) => v.status === "verified").length;
  const decidedCount = verifications.filter((v) => DECIDED_STATUSES.has(v.status)).length;
  const deep = (mirror?.deep_analysis ?? {}) as { ats_score?: number };
  const verifiedProfile = mirror?.verified_profile;

  const publicVerified = usePublicVerifiedProfile(verifiedCount > 0 ? (user?.username ?? "") : "");

  // Aggregate radar — everything VELO has graded about this person, averaged
  // per dimension across every decided interrogation (the private view sees
  // failed evidence too; the public one only shows what was defended).
  const radarAxes: RadarAxis[] = useMemo(() => {
    return INTERROGATION_DIMENSIONS.map((dim) => {
      const scores: number[] = [];
      for (const v of verifications) {
        if (!DECIDED_STATUSES.has(v.status) || !v.dimension_scores) continue;
        const d = v.dimension_scores[dim];
        if (!d || isNotAssessed(d.evidence)) continue;
        scores.push(d.score);
      }
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return { key: dim, label: DIMENSION_LABELS[dim] ?? dim, score: avg };
    });
  }, [verifications]);
  const hasRadarData = radarAxes.some((a) => a.score != null);

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

  const openSession = (snapshotId: string, index: number, title: string, repoUrl?: string) => {
    const params = new URLSearchParams({
      snapshot: snapshotId,
      project: String(index),
      title,
    });
    if (repoUrl) params.set("repo", repoUrl);
    router.push(`/verify/session?${params.toString()}`);
  };

  const handleAddProject = async (title: string, repoUrl: string) => {
    const res = await auditApi.addManualProject({ title, repo_url: repoUrl });
    await queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
    openSession(res.snapshot_id, res.project_index, res.title || title, repoUrl);
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

  const verifiedProfileUrl =
    user?.username && typeof window !== "undefined"
      ? `${window.location.origin}/p/${encodeURIComponent(user.username)}?tab=verified`
      : "";

  // The one thing to do next — computed, always present, always tangerine.
  const nextAction = useMemo(() => {
    if (!mirror) return null;
    const undefendedIndex = projects.findIndex((_, i) => {
      const v = verifications.find((x) => x.project_index === i);
      return !v || !DECIDED_STATUSES.has(v.status);
    });
    if (undefendedIndex >= 0) {
      const p = projects[undefendedIndex];
      return {
        label: `Defend “${p.title ?? `Project ${undefendedIndex + 1}`}”`,
        hint:
          decidedCount === 0
            ? "Your first interrogation — 6–15 questions grounded in your real code."
            : "Keep building coverage — every defended project strengthens the profile.",
        run: () =>
          openSession(mirror.id, undefendedIndex, p.title ?? `Project ${undefendedIndex + 1}`, p.repo_url),
      };
    }
    if (projects.length === 0) {
      return {
        label: "Add a repo to defend",
        hint: "No projects were found on your resume — verify a repo directly.",
        run: () =>
          document.getElementById("add-evidence")?.scrollIntoView({ behavior: "smooth", block: "center" }),
      };
    }
    if (verifiedCount > 0 && verifiedProfileUrl) {
      return {
        label: "Share your verified profile",
        hint: "Every claim on it survived interrogation — send it to a recruiter.",
        run: async () => {
          await navigator.clipboard.writeText(verifiedProfileUrl).catch(() => {});
          trackFunnel(FUNNEL.CREDENTIAL_SHARED, { url: verifiedProfileUrl });
          toast.success("Profile link copied.");
        },
      };
    }
    const firstDecided = verifications.find((v) => DECIDED_STATUSES.has(v.status));
    if (firstDecided) {
      const p = projects[firstDecided.project_index];
      return {
        label: `Re-defend “${firstDecided.project_title || p?.title || "your project"}”`,
        hint: "The verdict didn't go your way — review the reasoning and take it again.",
        run: () =>
          openSession(
            mirror.id,
            firstDecided.project_index,
            firstDecided.project_title || p?.title || "",
            p?.repo_url,
          ),
      };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mirror, projects, verifications, decidedCount, verifiedCount, verifiedProfileUrl]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // ── Empty: open the case file ────────────────────────────────────────────
  if (status === "empty" || (!mirror && !analysisRunning)) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <div className="rise-in">
          <p className="eyebrow flex items-center gap-2">
            <span className="eyebrow-dot" /> Case file · VELO
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Open your case file
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Upload your resume. VELO extracts every project you claim, interrogates you on each one
            against your real code, and turns what you can defend into a credential recruiters can
            audit — transcript included.
          </p>
        </div>

        <div className="rise-in-1 grain relative mt-8 overflow-hidden rounded-2xl border border-border bg-card p-6">
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
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Start with your resume</p>
              <p className="caseline mt-1">PDF / PNG / JPG · max 10MB · free first verification</p>
            </div>
            <Button size="lg" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
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
          </div>
        </div>

        <div className="rise-in-2 mt-6 space-y-3">
          <p className="caseline text-center uppercase tracking-[0.18em]">or skip the resume</p>
          <GithubReposPicker onPick={handlePickRepo} pickingUrl={pickingUrl} />
          <AddProjectForm onAdd={handleAddProject} />
        </div>
      </div>
    );
  }

  // ── Running: extraction progress, stage by stage ───────────────────────────
  if (analysisRunning || (!mirror && status !== "failed")) {
    return <AnalysisProgress progress={data?.analysis_job?.progress} />;
  }

  // ── Ready: the case file ─────────────────────────────────────────────────
  const displayName = user?.full_name || user?.username || "Your case file";
  const coverage = verifiedProfile?.coverage ?? "unverified";
  const updated = mirror?.updated_at
    ? new Date(mirror.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      {/* ── Masthead — the dossier cover ─────────────────────────────────── */}
      <div className="rise-in grain relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative flex flex-wrap items-start justify-between gap-6 p-6 md:p-8">
          <div className="min-w-0 max-w-2xl">
            <p className="eyebrow flex items-center gap-2">
              <span className="eyebrow-dot" /> Case file · VELO
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {verifiedProfile?.headline || displayName}
            </h1>
            <p className="caseline mt-2">
              {user?.username ? `@${user.username}` : ""}
              {updated ? ` · updated ${updated}` : ""} ·{" "}
              <span className={verifiedCount > 0 ? "status-strong" : "status-none"}>
                {(COVERAGE_LABEL[coverage] ?? coverage).toUpperCase()} — {verifiedCount}/
                {projects.length || verifications.length} DEFENDED
              </span>
            </p>
            {verifiedProfile?.narrative && (
              <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                {verifiedProfile.narrative}
              </p>
            )}

            {nextAction && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={nextAction.run}>
                  {nextAction.label} <ArrowRight className="size-4" />
                </Button>
                <p className="max-w-xs text-xs leading-snug text-muted-foreground">{nextAction.hint}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {typeof deep.ats_score === "number" && (
              <StatTile value={String(deep.ats_score)} label="resume ATS" />
            )}
            <StatTile
              value={`${verifiedCount}`}
              sub={`/${projects.length || verifications.length}`}
              label="defended"
            />
            {verifiedProfile?.seniority_calibration?.level && (
              <StatTile
                value={verifiedProfile.seniority_calibration.level}
                label="calibrated level"
                title={verifiedProfile.seniority_calibration.held_to_reason}
              />
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="rise-in-1 w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="defend">Defend</TabsTrigger>
          <TabsTrigger value="analysis">Resume analysis</TabsTrigger>
          <TabsTrigger value="verified">Recruiter view</TabsTrigger>
        </TabsList>

        {/* ── Overview ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="eyebrow mb-1 flex items-center gap-2">
                <span className="eyebrow-dot" /> Capability fingerprint
              </p>
              <p className="caseline mb-3">
                {decidedCount > 0
                  ? `averaged across ${decidedCount} graded interrogation${decidedCount > 1 ? "s" : ""}`
                  : "no graded interrogations yet"}
              </p>
              {hasRadarData ? (
                <div className="mx-auto w-full max-w-[430px]">
                  <RadarChart axes={radarAxes} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Defend a project and this fills in — six dimensions, graded per answer.
                  </p>
                  {nextAction && (
                    <Button size="sm" variant="outline" onClick={nextAction.run}>
                      {nextAction.label}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <SynthesisBlocks profile={verifiedProfile} />
              {verifiedCount > 0 && verifiedProfileUrl && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="eyebrow mb-3 flex items-center gap-2">
                    <span className="eyebrow-dot" /> Share the proof
                  </p>
                  <ShareActions
                    url={verifiedProfileUrl}
                    label="VELO-verified profile"
                    shareText="My VELO-verified proof of work"
                    trackId={user?.username}
                  />
                  {user?.username && (
                    <a
                      href={`/p/${encodeURIComponent(user.username)}/report`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <FileText className="size-3.5" /> Open the full printable report
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Defend — the exhibits ────────────────────────────────────── */}
        <TabsContent value="defend" className="mx-auto max-w-3xl space-y-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Each project your resume claims is an exhibit. Defend it in a code-grounded
            interrogation and the verdict — with its full transcript — goes on the record.
          </p>

          <div className="space-y-3">
            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No projects were found on your resume — add a repo below to verify it directly.
              </p>
            )}
            {projects.map((p, index) => {
              const v = verifications.find((x) => x.project_index === index);
              return (
                <ExhibitRow
                  key={index}
                  index={index}
                  project={p}
                  verification={v}
                  onOpen={() =>
                    mirror && openSession(mirror.id, index, p.title ?? `Project ${index + 1}`, p.repo_url)
                  }
                />
              );
            })}
          </div>

          <div id="add-evidence" className="space-y-3 pt-2">
            <p className="caseline uppercase tracking-[0.18em]">Add evidence</p>
            <GithubReposPicker onPick={handlePickRepo} pickingUrl={pickingUrl} />
            <AddProjectForm onAdd={handleAddProject} />
          </div>
        </TabsContent>

        {/* ── Resume analysis ──────────────────────────────────────────── */}
        <TabsContent value="analysis">
          <VeloProfileTab />
        </TabsContent>

        {/* ── Recruiter view — exactly what they see ───────────────────── */}
        <TabsContent value="verified" className="mx-auto max-w-3xl space-y-4">
          {verifiedCount === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
              <p className="text-sm font-medium">Nothing on the public record yet.</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Defend at least one project and this becomes your verified profile — the page a
                recruiter sees when you share your credential.
              </p>
              {nextAction && (
                <Button size="sm" className="mt-4" onClick={nextAction.run}>
                  {nextAction.label}
                </Button>
              )}
            </div>
          ) : publicVerified.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : publicVerified.data ? (
            <>
              <p className="text-sm text-muted-foreground">
                This is exactly what a recruiter sees at{" "}
                <a
                  href={verifiedProfileUrl}
                  className="font-medium text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {verifiedProfileUrl.replace(/^https?:\/\//, "")}
                </a>
                .
              </p>
              <VerifiedProfileView data={publicVerified.data} shareUrl={verifiedProfileUrl} />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
              Couldn’t load the public view right now — the share link itself still works.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function StatTile({
  value,
  sub,
  label,
  title,
}: {
  value: string;
  sub?: string;
  label: string;
  title?: string;
}) {
  return (
    <div
      title={title}
      className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/40 px-5 py-3"
    >
      <p className="font-display text-3xl font-semibold capitalize leading-none tabular-nums">
        {value}
        {sub && <span className="text-base opacity-60">{sub}</span>}
      </p>
      <p className="caseline mt-1.5">{label}</p>
    </div>
  );
}

/** Case synthesis — what the examiner concluded about the person. */
function SynthesisBlocks({ profile }: { profile?: VerifiedProfileSummary }) {
  if (!profile?.narrative && !profile?.capability_verified?.length) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        Defend your first project to unlock the examiner&apos;s capability summary here.
      </div>
    );
  }
  return (
    <>
      {!!profile.capability_verified?.length && (
        <ListBlock title="Verified capability" items={profile.capability_verified} cls="status-strong" />
      )}
      {!!profile.knowledge_gaps?.length && (
        <ListBlock title="Gaps to close" items={profile.knowledge_gaps} cls="status-developing" />
      )}
      {!!profile.recommended_next_steps?.apply_now?.length && (
        <ListBlock
          title="Ready to apply for"
          items={profile.recommended_next_steps.apply_now}
          cls="status-solid"
        />
      )}
      {profile.examiner_note && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5">
          <p className="eyebrow mb-2 flex items-center gap-2">
            <span className="eyebrow-dot" /> Examiner&apos;s note
          </p>
          <p className="text-sm leading-relaxed text-foreground/85">{profile.examiner_note}</p>
        </div>
      )}
    </>
  );
}

function ListBlock({ title, items, cls }: { title: string; items: string[]; cls: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="eyebrow mb-3 flex items-center gap-2">
        <span className="eyebrow-dot" /> {title}
      </p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className={cn("flex items-start gap-2.5 text-sm", cls)}>
            <span className="status-dot mt-1.5" />
            <span className="leading-relaxed text-foreground/85">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One exhibit — a claimed project and everything on record about it. */
function ExhibitRow({
  index,
  project,
  verification: v,
  onOpen,
}: {
  index: number;
  project: ProjectEntry;
  verification?: Verification;
  onOpen: () => void;
}) {
  const decided = DECIDED_STATUSES.has(v?.status ?? "");
  const dimRows = useMemo(() => {
    if (!v?.dimension_scores) return [];
    const rows: { dim: string; pct: number; evidence: string }[] = [];
    for (const dim of INTERROGATION_DIMENSIONS) {
      const d = (v.dimension_scores as DimensionScores)[dim];
      if (!d || isNotAssessed(d.evidence)) continue;
      rows.push({ dim, pct: Math.round(d.score * 100), evidence: d.evidence });
    }
    return rows;
  }, [v?.dimension_scores]);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors",
        v?.status === "verified" ? "border-(--status-strong)/50" : "border-border hover:border-primary/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="caseline">EX-{String(index + 1).padStart(2, "0")}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
            <span className="truncate font-display text-base font-semibold tracking-tight">
              {project.title ?? `Project ${index + 1}`}
            </span>
            <VerdictStamp status={v?.status} score={v?.verification_score} />
          </div>
          {project.repo_url && (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noreferrer"
              className="caseline mt-1 inline-flex items-center gap-1 hover:text-foreground"
            >
              {project.repo_url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        <Button size="sm" variant={decided ? "outline" : "default"} onClick={onOpen}>
          {v?.status === "verified"
            ? "Review verdict"
            : decided
              ? "Review & retry"
              : v?.status === "interrogating" || v?.status === "evidence_submitted"
                ? "Resume session"
                : "Defend"}
        </Button>
      </div>

      {decided && v?.verdict_summary && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{v.verdict_summary}</p>
      )}
      {decided && dimRows.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
          {dimRows.map(({ dim, pct, evidence }) => (
            <span key={dim} title={evidence} className={cn("cstat", statusClassForScore(pct / 100))}>
              <span className="status-dot" />
              {DIMENSION_LABELS[dim] ?? dim} {pct}
            </span>
          ))}
        </div>
      )}
      {decided && !!v?.claims_tested?.length && (
        <div className="mt-2.5">
          <ClaimChipsInline claims={v.claims_tested as ClaimTested[]} />
        </div>
      )}
      {v?.status === "verified" && v.audit_id && typeof window !== "undefined" && (
        <div className="mt-3">
          <ShareActions
            url={`${window.location.origin}/audit/public/${v.audit_id}`}
            label={`${project.title ?? "Project"} — VELO credential`}
            shareText={`I defended "${project.title ?? "my project"}" under VELO's code-grounded interrogation`}
            trackId={v.audit_id}
          />
        </div>
      )}
    </div>
  );
}

/** The 7-stage analysis pipeline, live — the user watches VELO work instead
 *  of staring at one spinner. */
const ANALYSIS_STAGES: Array<{ key: string; label: string }> = [
  { key: "parsing", label: "Parsing your resume" },
  { key: "mirror", label: "Extracting claimed projects & skills" },
  { key: "ats", label: "Scoring ATS readability" },
  { key: "experience", label: "Reading each experience entry" },
  { key: "projects_gaps", label: "Analyzing projects & skill gaps" },
  { key: "role_matching", label: "Matching against target roles" },
  { key: "employer_view", label: "Writing the employer's first impression" },
];

function AnalysisProgress({ progress }: { progress?: Record<string, string | undefined> }) {
  return (
    <div className="mx-auto w-full max-w-xl px-6 py-12">
      <p className="eyebrow flex items-center gap-2">
        <span className="relative inline-flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
        Analysis in progress
      </p>
      <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
        VELO is reading your resume
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Extracting every claim you make so you can defend them. Usually under a minute.
      </p>
      <ul className="mt-6 space-y-2.5">
        {ANALYSIS_STAGES.map(({ key, label }) => {
          const state = progress?.[key];
          return (
            <li key={key} className="flex items-center gap-2.5 text-sm">
              {state === "complete" ? (
                <CheckCircle2 className="status-strong size-4 shrink-0" />
              ) : state === "running" ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
              ) : (
                <span className="size-4 shrink-0 rounded-full border border-border" />
              )}
              <span className={cn(state ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            </li>
          );
        })}
      </ul>
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
          {busy ? <Loader2 className="size-4 animate-spin" /> : "Add & defend"}
        </Button>
      </div>
    </div>
  );
}

/** Connect GitHub and pick a repo to defend — the robust path when a resume
 *  lists no projects. */
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
          Pick a repo straight from your account to defend — no resume needed. Public repos only
          for now.
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
          Your GitHub <span className="caseline">@{username}</span>
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
            className="caseline hover:text-foreground"
          >
            {connecting ? "…" : "Reconnect"}
          </button>
          <button type="button" onClick={disconnect} className="caseline hover:text-destructive">
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
              <div className="caseline flex items-center gap-3">
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
              {pickingUrl === repo.url ? <Loader2 className="size-4 animate-spin" /> : "Defend"}
            </Button>
          </div>
        ))}
        {visible.length === 0 && <p className="text-xs text-muted-foreground">No repos match.</p>}
      </div>
    </div>
  );
}
