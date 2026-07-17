"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, GitBranch, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useProjectVerification, type RepoEntry, type Verdict } from "@/hooks/use-project-verification";
import { useGithubRepos } from "@/hooks/use-github-repos";
import { auditApi, type ClaimTested, type TranscriptTurn } from "@/lib/api";
import { RepoPicker, RepoResultRow } from "@/components/velo/repo-picker";
import { VerdictStamp } from "@/components/velo/verdict-stamp";
import { DimensionMeters } from "@/components/velo/dimension-meters";
import { ClaimsTested } from "@/components/velo/claim-chips";
import { TranscriptPanel, type TranscriptEntry } from "@/components/velo/transcript-panel";
import { ShareActions } from "@/components/velo/share-actions";
import { trackFunnel, FUNNEL } from "@/lib/funnel";

// The interrogation is VELO's core moment — a full-page session, not a side
// drawer. Deep-linkable and refresh-safe: startProjectVerification is
// idempotent, and reopening a decided verification lands directly on its
// verdict with the stored reasoning.

const RAIL_STEPS = [
  { key: "evidence", label: "Evidence" },
  { key: "context", label: "Context" },
  { key: "interrogation", label: "Interrogation" },
  { key: "verdict", label: "Verdict" },
] as const;

function railIndexFor(step: string): number {
  switch (step) {
    case "context":
      return 1;
    case "starting_interrogation":
    case "interrogating":
      return 2;
    case "completing":
    case "verdict":
      return 3;
    default:
      return 0;
  }
}

export function VerificationSession({
  snapshotId,
  projectIndex,
  projectTitle,
  initialRepoUrl,
}: {
  snapshotId: string;
  projectIndex: number;
  projectTitle: string;
  initialRepoUrl?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hook = useProjectVerification(snapshotId);
  const github = useGithubRepos();

  const [repos, setRepos] = useState<RepoEntry[]>(
    initialRepoUrl ? [{ url: initialRepoUrl, label: "Full Stack" }] : [],
  );
  const [demoUrl, setDemoUrl] = useState("");
  const [answer, setAnswer] = useState("");
  const [contextText, setContextText] = useState("");
  const [repoSearch, setRepoSearch] = useState("");
  const [githubConnecting, setGithubConnecting] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-start: the user already chose to defend this project on the case
  // file — landing here should never ask again.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    trackFunnel(FUNNEL.VERIFICATION_STARTED, { project: projectTitle });
    hook.startVerification(projectIndex);
    github.fetchRepos();
    // hook/github actions are useCallback-stable; run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verdictFired = useRef(false);
  useEffect(() => {
    if (hook.step === "verdict" && hook.verdict && !verdictFired.current) {
      verdictFired.current = true;
      trackFunnel(FUNNEL.VERIFICATION_COMPLETED, {
        project: projectTitle,
        status: hook.verdict.status,
        score: hook.verdict.verification_score,
      });
    }
  }, [hook.step, hook.verdict, projectTitle]);

  useEffect(() => {
    if (hook.step === "interrogating") {
      transcriptEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [hook.step, hook.answeredTurns.length, hook.currentQuestion]);

  const exit = () => {
    queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
    router.push("/verify");
  };

  const handleSubmitRepos = async () => {
    await hook.submitRepos(repos.filter((r) => r.url.trim()), demoUrl);
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || answer.trim().split(/\s+/).length < 5) return;
    const current = answer;
    setAnswer("");
    const done = await hook.submitAnswer(current);
    if (done) await hook.completeAndFinalize();
  };

  const activeRail = railIndexFor(hook.step);
  const isBusy = hook.isLoading && (hook.step === "idle" || hook.step === "evidence") && !hook.verificationId;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      {/* ── Session header + progress rail ─────────────────────────────── */}
      <div className="grain relative border-b border-border bg-card/60">
        <div className="relative mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 pt-5">
          <button
            onClick={exit}
            className="caseline flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Case file
          </button>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo/mark-color.svg" alt="" className="size-6" />
            <div className="leading-none">
              <div className="font-display text-sm font-bold tracking-tight">VELO</div>
              <div className="font-mono-ui text-[8.5px] uppercase tracking-[0.16em] text-muted-foreground">
                Interrogation session
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-3xl px-6 pb-4 pt-2">
          <h1 className="font-display text-xl font-semibold leading-snug tracking-tight">
            {projectTitle || <span className="text-muted-foreground">Untitled project</span>}
          </h1>
          <div className="mt-4 flex items-center gap-2">
            {RAIL_STEPS.map((rail, i) => (
              <div key={rail.key} className="flex flex-1 items-center gap-2 last:flex-none">
                <span
                  className={cn(
                    "font-mono-ui text-[10px] font-medium uppercase tracking-wide",
                    i < activeRail && "text-muted-foreground",
                    i === activeRail && "text-primary",
                    i > activeRail && "text-muted-foreground/50",
                  )}
                >
                  {rail.label}
                </span>
                {i < RAIL_STEPS.length - 1 && (
                  <div className={cn("h-px flex-1", i < activeRail ? "bg-primary" : "bg-border")} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Flow body ────────────────────────────────────────────────────── */}
      {isBusy ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div
          className={cn(
            "mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col",
            hook.step === "interrogating" ? "" : "overflow-y-auto px-6 py-6",
          )}
        >
          {/* ── Evidence ─────────────────────────────────────────────────── */}
          {hook.step === "evidence" && (
            <div className="rise-in flex flex-col gap-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Submit the repositories behind this project. VELO reads the actual source — every
                question you get is grounded in your real code, and shallow answers trigger harder
                follow-ups.
              </p>

              <RepoPicker
                connected={github.connected}
                username={github.username}
                repos={github.repos}
                isLoading={github.isLoading}
                connecting={githubConnecting}
                search={repoSearch}
                onSearchChange={setRepoSearch}
                selected={repos}
                onSelect={(repo) => {
                  const exists = repos.findIndex((r) => r.url === repo.url);
                  if (exists >= 0) setRepos(repos.filter((_, i) => i !== exists));
                  else if (repos.length < 4) setRepos([...repos, repo]);
                }}
                onLabelChange={(url, label) =>
                  setRepos(repos.map((r) => (r.url === url ? { ...r, label } : r)))
                }
                onRemove={(url) => setRepos(repos.filter((r) => r.url !== url))}
                onConnect={async () => {
                  setGithubConnecting(true);
                  if (!github.connected) await github.connectGithub();
                  else await github.fetchRepos();
                  setGithubConnecting(false);
                }}
                onDisconnect={github.disconnect}
                manualRepos={repos.filter((r) => !github.repos.find((gr) => gr.url === r.url))}
                onManualAdd={() => setRepos([...repos, { url: "", label: "Full Stack" }])}
                onManualUrlChange={(i, url) => {
                  const next = [...repos];
                  next[i] = { ...next[i], url };
                  setRepos(next);
                }}
              />

              <div className="space-y-2">
                <span className="eyebrow flex items-center gap-2">
                  <Globe className="size-3.5" /> Deployed link
                  <span className="normal-case tracking-normal text-muted-foreground">(optional)</span>
                </span>
                <Input
                  className="h-9 text-xs"
                  placeholder="https://your-project.vercel.app"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                />
              </div>

              <Button
                onClick={handleSubmitRepos}
                disabled={hook.isLoading || !repos.some((r) => r.url.trim())}
                size="lg"
              >
                {hook.isLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <GitBranch className="mr-2 size-4" />
                )}
                Check repositories
              </Button>

              <FlowError error={hook.error} />
            </div>
          )}

          {/* ── Checking ─────────────────────────────────────────────────── */}
          {hook.step === "checking" && (
            <WaitBlock label="Checking repositories…" />
          )}

          {/* ── Check results ────────────────────────────────────────────── */}
          {hook.step === "check_result" && (
            <div className="rise-in flex flex-col gap-4">
              <span className="eyebrow flex items-center gap-2">
                <span className="eyebrow-dot" /> Repository check
              </span>
              <div className="space-y-2">
                {hook.checkedRepos.map((repo, i) => (
                  <RepoResultRow key={i} repo={repo} />
                ))}
              </div>
              <Button onClick={hook.proceedToContext} disabled={hook.isLoading} size="lg">
                {hook.isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Continue
              </Button>
              <FlowError error={hook.error} />
            </div>
          )}

          {/* ── Declared context ─────────────────────────────────────────── */}
          {hook.step === "context" && (
            <div className="rise-in flex flex-col gap-4">
              <div className="space-y-1.5">
                <span className="eyebrow flex items-center gap-2">
                  <span className="eyebrow-dot" /> Before the interrogation
                </span>
                <p className="font-display text-lg font-semibold leading-snug tracking-tight">
                  What is this project, and who&apos;s it for?
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  A quick internal tool is a different bar than a production API serving paying
                  customers. Declare the scope so questions and grading calibrate to what you
                  actually built — it never excuses a vague answer, only sets the standard.
                </p>
              </div>

              <Textarea
                placeholder={
                  'e.g. "A one-file internal script pulling data from a few sources for a small team — not production-hardened, just functional and quick to build."'
                }
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                className="min-h-[120px] resize-none text-sm"
                autoFocus
              />

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => hook.submitContext(contextText)}
                  disabled={hook.isLoading}
                  size="lg"
                  className="flex-1"
                >
                  {hook.isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {contextText.trim() ? "Continue with this context" : "Begin interrogation"}
                </Button>
                {contextText.trim() && (
                  <Button
                    onClick={() => {
                      setContextText("");
                      hook.submitContext("");
                    }}
                    disabled={hook.isLoading}
                    variant="ghost"
                    size="sm"
                  >
                    Skip
                  </Button>
                )}
              </div>
              <FlowError error={hook.error} />
            </div>
          )}

          {/* ── Starting ─────────────────────────────────────────────────── */}
          {hook.step === "starting_interrogation" && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Loader2 className="size-7 animate-spin text-muted-foreground" />
              <ThinkingMessages
                messages={[
                  "Cloning a read-only view of your repository…",
                  "Reading your actual source files…",
                  "Analyzing your architecture and decisions…",
                  "Preparing your first question…",
                ]}
              />
              <p className="max-w-xs text-[11px] text-muted-foreground/70">
                VELO reads your real code so questions are specific to what you built. This takes a
                few seconds the first time.
              </p>
            </div>
          )}

          {/* ── Interrogation — the growing case record ──────────────────── */}
          {hook.step === "interrogating" && hook.currentQuestion && (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-2.5">
                <span className="eyebrow flex items-center gap-2">
                  <span className="relative inline-flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                  </span>
                  On the record
                </span>
                <span className="caseline">{hook.answeredTurns.length} answered</span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                {hook.answeredTurns.map((turn) => (
                  <div key={turn.questionIndex} className="py-3">
                    <p className="caseline">
                      Q{String(turn.questionIndex + 1).padStart(2, "0")}
                      {turn.area ? ` · ${turn.area.toUpperCase()}` : ""} · VELO — Examiner
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{turn.question}</p>
                    <p className="caseline mt-2.5">Candidate</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-foreground">{turn.answer}</p>
                    <div className="rule mt-3" />
                  </div>
                ))}

                <div className="py-3">
                  <div className="rounded-lg border-l-2 border-primary bg-muted/30 py-3 pl-4 pr-3">
                    <p className="caseline">
                      Q{String(hook.questionCount + 1).padStart(2, "0")}
                      {hook.currentQuestionArea ? ` · ${hook.currentQuestionArea.toUpperCase()}` : ""} ·
                      VELO — Examiner
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed">{hook.currentQuestion}</p>
                  </div>
                </div>
                <div ref={transcriptEndRef} />
              </div>

              <div className="border-t border-border bg-card px-6 py-4">
                <Textarea
                  placeholder="Be specific — reference your actual code, the decisions you made, the problems you hit, and why you chose one approach over another."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="min-h-[110px] resize-none text-sm"
                  autoFocus
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] text-muted-foreground">
                    Shallow answers go deeper on the same area. Strong answers move to a harder
                    topic. Minimum 5 words.
                  </p>
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={
                      hook.isLoading || !answer.trim() || answer.trim().split(/\s+/).length < 5
                    }
                  >
                    {hook.isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {hook.isLoading ? "Reviewing…" : "Submit answer"}
                  </Button>
                </div>
                {hook.isLoading && (
                  <div className="mt-2 flex items-center justify-center">
                    <ThinkingMessages
                      small
                      messages={[
                        "Weighing your answer against the code…",
                        "Deciding where to probe next…",
                        "Writing the next question…",
                      ]}
                    />
                  </div>
                )}
                <FlowError error={hook.error} className="mt-2" />
              </div>
            </div>
          )}

          {/* ── Completing ───────────────────────────────────────────────── */}
          {hook.step === "completing" && <WaitBlock label="Grading the interrogation…" />}

          {/* ── Verdict ──────────────────────────────────────────────────── */}
          {hook.step === "verdict" && hook.verdict && (
            <VerdictPanel
              verdict={hook.verdict}
              auditId={hook.auditId}
              projectTitle={projectTitle}
              liveTurns={hook.answeredTurns}
              onDone={exit}
              onRetry={hook.retryFinalize}
              isRetrying={hook.isLoading}
            />
          )}

          {/* Hook-level error outside a step (e.g. start failed) */}
          {hook.step === "idle" && <FlowError error={hook.error} />}
        </div>
      )}
    </div>
  );
}

// ─── Verdict ─────────────────────────────────────────────────────────────────

function VerdictPanel({
  verdict,
  auditId,
  projectTitle,
  liveTurns,
  onDone,
  onRetry,
  isRetrying,
}: {
  verdict: Verdict;
  auditId: string | null;
  projectTitle: string;
  liveTurns: Array<{ questionIndex: number; question: string; answer: string; area: string | null }>;
  onDone: () => void;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  // Fresh sessions carry the transcript locally; reopened ones fetch the
  // stored record (transcript + claims tested) from the public credential —
  // the same evidence a recruiter sees.
  const [claims, setClaims] = useState<ClaimTested[] | null>(null);
  const [storedTranscript, setStoredTranscript] = useState<TranscriptTurn[] | null>(null);
  useEffect(() => {
    if (!auditId) return;
    let active = true;
    auditApi
      .getPublicReport(auditId)
      .then((report) => {
        if (!active) return;
        setClaims(report.verification?.claims_tested ?? null);
        setStoredTranscript(report.verification?.transcript ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [auditId]);

  if (verdict.scoring_status === "scoring" || verdict.scoring_status === "scoring_failed") {
    const failed = verdict.scoring_status === "scoring_failed";
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        {failed ? (
          <span className="stamp stamp-pending">Scoring failed</span>
        ) : (
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
        )}
        <div className="space-y-1">
          <p className="text-sm font-medium">{failed ? "Grading hit an error" : "Grading in progress…"}</p>
          <p className="max-w-xs text-[11px] text-muted-foreground">
            {failed
              ? verdict.verdict_summary ||
                "Something went wrong grading this interview. This is usually transient — retry it."
              : "The last answers are still being graded. This usually takes a few seconds."}
          </p>
        </div>
        <Button onClick={onRetry} disabled={isRetrying} variant="outline" size="sm">
          {isRetrying && <Loader2 className="mr-2 size-3.5 animate-spin" />}
          {failed ? "Retry scoring" : "Check again"}
        </Button>
      </div>
    );
  }

  const score = verdict.verification_score != null ? Math.round(verdict.verification_score * 100) : null;
  const isVerified = verdict.status === "verified";
  const transcript: TranscriptEntry[] =
    liveTurns.length > 0
      ? liveTurns.map((t) => ({ question: t.question, answer: t.answer, area: t.area }))
      : (storedTranscript ?? []).map((t) => ({ question: t.question, answer: t.answer }));

  const credentialUrl =
    auditId && typeof window !== "undefined"
      ? `${window.location.origin}/audit/public/${auditId}`
      : "";

  return (
    <div className="rise-in flex flex-col gap-6 pb-10">
      {/* The record header — stamp first, number second. */}
      <div className="grain relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-2">
              <span className="eyebrow-dot" /> Verdict on record
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">{projectTitle}</h2>
            <div className="mt-3">
              <VerdictStamp status={verdict.status} score={verdict.verification_score} />
            </div>
          </div>
          {score != null && (
            <div className="flex flex-col items-center rounded-xl border border-border bg-muted/40 px-5 py-3">
              <p className="font-display text-4xl font-semibold leading-none tabular-nums">{score}</p>
              <p className="caseline mt-1">/ 100</p>
            </div>
          )}
        </div>
        <p className="relative mt-4 max-w-xl text-sm leading-relaxed text-foreground/85">
          {verdict.verdict_summary}
        </p>
        {isVerified && credentialUrl && (
          <div className="relative mt-5">
            <p className="caseline mb-2">This credential is public and auditable — share it:</p>
            <ShareActions
              url={credentialUrl}
              label={`${projectTitle} — VELO credential`}
              shareText={`I defended "${projectTitle}" under VELO's code-grounded interrogation`}
              trackId={auditId ?? undefined}
            />
          </div>
        )}
      </div>

      {/* What the examiner graded, dimension by dimension. */}
      {verdict.dimension_scores && Object.keys(verdict.dimension_scores).length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="eyebrow mb-4 flex items-center gap-2">
            <span className="eyebrow-dot" /> Graded dimensions
          </p>
          <DimensionMeters dimensionScores={verdict.dimension_scores} />
        </div>
      )}

      {/* Resume claims vs. evidence. */}
      {claims && claims.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="eyebrow mb-4 flex items-center gap-2">
            <span className="eyebrow-dot" /> Resume claims, tested
          </p>
          <ClaimsTested claims={claims} />
        </div>
      )}

      {/* The full record, pass or fail. */}
      <TranscriptPanel turns={transcript} defaultOpen={!isVerified} />

      <Button onClick={onDone} size="lg" className="self-start">
        Back to your case file
      </Button>
    </div>
  );
}

// ─── Small pieces ────────────────────────────────────────────────────────────

function WaitBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <Loader2 className="size-7 animate-spin text-muted-foreground" />
      <span className="eyebrow">{label}</span>
    </div>
  );
}

function FlowError({ error, className }: { error: string | null; className?: string }) {
  if (!error) return null;
  return (
    <p className={cn("rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive", className)}>
      {error}
    </p>
  );
}

function ThinkingMessages({ messages, small }: { messages: string[]; small?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % messages.length), 2200);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <p className={small ? "text-[11px] text-muted-foreground" : "text-sm text-muted-foreground"}>
      {messages[i]}
    </p>
  );
}
