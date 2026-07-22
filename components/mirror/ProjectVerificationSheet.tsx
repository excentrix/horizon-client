"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  GitBranch,
  Globe,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Check,
  Search,
  Unplug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useProjectVerification,
  type RepoEntry,
} from "@/hooks/use-project-verification";
import { INTERROGATION_DIMENSIONS, type DimensionScores } from "@/lib/api";
import { useGithubRepos, type GithubRepo } from "@/hooks/use-github-repos";
import { trackFunnel, FUNNEL } from "@/lib/funnel";


// ─── Constants ────────────────────────────────────────────────────────────────

const REPO_LABELS = ["Full Stack", "Frontend", "Backend", "Mobile", "ML / AI", "Other"];

// ─── Component ────────────────────────────────────────────────────────────────

interface ProjectVerificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
  projectIndex: number;
  projectTitle: string;
  /** Repo the project already points at — pre-seeds the picker so the user
   *  doesn't have to re-select it (and avoids a stray empty row). */
  initialRepoUrl?: string;
}

export function ProjectVerificationSheet({
  open,
  onOpenChange,
  snapshotId,
  projectIndex,
  projectTitle,
  initialRepoUrl,
}: ProjectVerificationSheetProps) {
  const hook = useProjectVerification(snapshotId);
  const github = useGithubRepos();

  const [repos, setRepos] = useState<RepoEntry[]>([{ url: "", label: "Full Stack" }]);
  const [demoUrl, setDemoUrl] = useState("");
  const [answer, setAnswer] = useState("");
  const [contextText, setContextText] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [githubConnecting, setGithubConnecting] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Reflect the real GitHub connection state when the drawer opens, so it
  // doesn't show "Connect GitHub" for an already-connected user.
  const githubFetch = github.fetchRepos;
  useEffect(() => {
    if (open) {
      githubFetch();
      // Pre-seed the repo the project already points at (replaces the empty
      // starter row) so the picker shows it selected — no re-selection needed.
      if (initialRepoUrl) setRepos([{ url: initialRepoUrl, label: "Full Stack" }]);
    }
  }, [open, githubFetch, initialRepoUrl]);

  // Fire VERIFICATION_COMPLETED once when a verdict lands.
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
    if (!open) verdictFired.current = false; // reset for the next session
  }, [hook.step, hook.verdict, open, projectTitle]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      hook.reset();
      setRepos([{ url: "", label: "Full Stack" }]);
      setDemoUrl("");
      setAnswer("");
      setContextText("");
      setHasStarted(false);
      setRepoSearch("");
    }
  };

  const handleBeginVerification = async () => {
    setHasStarted(true);
    trackFunnel(FUNNEL.VERIFICATION_STARTED, { project: projectTitle });
    await hook.startVerification(projectIndex);
  };

  const handleSubmitRepos = async () => {
    const valid = repos.filter((r) => r.url.trim());
    await hook.submitRepos(valid, demoUrl);
  };

  const submitOnEnter = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    action: () => void,
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    action();
  };

  const handleSubmitAnswer = async () => {
    if (!hook.currentQuestion || !answer.trim() || answer.trim().split(/\s+/).length < 5) return;
    const current = answer;
    setAnswer("");
    const done = await hook.submitAnswer(current);
    if (done) {
      await hook.completeAndFinalize();
    }
  };

  const handleSubmitContext = async () => {
    await hook.submitContext(contextText);
  };

  // Keep the transcript pinned to the latest turn as it grows.
  useEffect(() => {
    if (hook.step === "interrogating") {
      transcriptEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [hook.step, hook.answeredTurns.length, hook.currentQuestion]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {/* ── Fixed header ─────────────────────────────────────────────── */}
        <div className="border-b px-6 py-4">
          <SheetHeader className="space-y-1">
            <span className="eyebrow">
              <span className="eyebrow-dot mr-1.5" /> VELO Verification
            </span>
            <SheetTitle className="font-display text-lg font-medium leading-snug">
              {projectTitle}
            </SheetTitle>
            <SheetDescription className="text-[11px] text-muted-foreground">
              Submit repos → declare context → complete the adaptive interrogation
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-1 flex-col overflow-y-auto",
            hook.step === "interrogating" ? "gap-0 px-0 py-0" : "gap-5 px-6 py-5",
          )}
        >

          {/* ── Not started ─────────────────────────────────────────────── */}
          {!hasStarted && hook.step === "idle" && (
            <div className="flex flex-col gap-5">
              <div className="space-y-3">
                {[
                  { n: 1, title: "Submit repositories", body: "Add one or more GitHub repos for this project — frontend, backend, or both." },
                  { n: 2, title: "Declare your context", body: "Tell VELO what this project actually is and who it's for, so the bar calibrates fairly." },
                  { n: 3, title: "Complete the interrogation", body: "6–15 adaptive questions that probe ownership, architecture, trade-offs, and debugging depth." },
                  { n: 4, title: "Earn your badge", body: "A verified badge appears on this project in your public profile." },
                ].map(({ n, title, body }) => (
                  <div key={n} className="flex gap-3">
                    <span className="font-mono-ui mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {n}
                    </span>
                    <div>
                      <p className="text-xs font-medium">{title}</p>
                      <p className="text-[11px] text-muted-foreground">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={handleBeginVerification} className="w-full">
                Begin Verification
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ── Init loading ─────────────────────────────────────────────── */}
          {hook.isLoading && hook.step === "idle" && <CenteredSpinner />}

          {/* ── Evidence step ────────────────────────────────────────────── */}
          {hook.step === "evidence" && (
            <div className="flex flex-col gap-5">

              {/* GitHub connect + repo picker */}
              <GithubRepoPicker
                connected={github.connected}
                username={github.username}
                repos={github.repos}
                isLoading={github.isLoading}
                connecting={githubConnecting}
                search={repoSearch}
                onSearchChange={setRepoSearch}
                selected={repos}
                onSelect={(repo) => {
                  // Toggle: if already selected, deselect; otherwise add/replace
                  const exists = repos.findIndex((r) => r.url === repo.url);
                  if (exists >= 0) {
                    setRepos(repos.filter((_, i) => i !== exists));
                  } else if (repos.length < 4) {
                    setRepos([...repos, repo]);
                  }
                }}
                onLabelChange={(url, label) => {
                  setRepos(repos.map((r) => (r.url === url ? { ...r, label } : r)));
                }}
                onRemove={(url) => setRepos(repos.filter((r) => r.url !== url))}
                onConnect={async () => {
                  setGithubConnecting(true);
                  if (!github.connected) {
                    await github.connectGithub();
                  } else {
                    await github.fetchRepos();
                  }
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

              {/* Demo URL */}
              <div className="space-y-2">
                <SectionLabel icon={<Globe className="h-3.5 w-3.5" />}>
                  Deployed link{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </SectionLabel>
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
                className="w-full"
              >
                {hook.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GitBranch className="mr-2 h-4 w-4" />
                )}
                Check Repositories →
              </Button>

              {hook.error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {hook.error}
                </p>
              )}
            </div>
          )}

          {/* ── Checking ─────────────────────────────────────────────────── */}
          {hook.step === "checking" && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              <span className="eyebrow">Checking repositories and VELO_AUDIT.md…</span>
            </div>
          )}

          {/* ── Check results ────────────────────────────────────────────── */}
          {hook.step === "check_result" && (
            <div className="flex flex-col gap-4">

              {/* Per-repo */}
              <div className="space-y-2">
                <span className="eyebrow">
                  <span className="eyebrow-dot mr-1.5" /> Repository check
                </span>
                {hook.checkedRepos.map((repo, i) => (
                  <RepoResultRow key={i} repo={repo} />
                ))}
              </div>

              <Button
                onClick={hook.proceedToContext}
                disabled={hook.isLoading}
                className="w-full"
              >
                {hook.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue →
              </Button>

              {hook.error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {hook.error}
                </p>
              )}
            </div>
          )}

          {/* ── Declared context ─────────────────────────────────────────── */}
          {hook.step === "context" && (
            <div className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <span className="eyebrow">
                  <span className="eyebrow-dot mr-1.5" /> Before we begin
                </span>
                <p className="font-display text-base font-medium leading-snug">
                  What is this project, and who&apos;s it for?
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  A quick internal tool built for a team of interns is a different bar than a
                  production API serving paying customers. Tell VELO the scope so questions and
                  grading calibrate to what you were actually building — it never excuses a vague
                  or evasive answer, only the standard.
                </p>
              </div>

              <Textarea
                placeholder={
                  "e.g. \"This was a one-file internal script to pull data from a few sources for a " +
                  "small team of interns — not meant to be production-hardened, just functional and " +
                  "quick to build.\""
                }
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                onKeyDown={(e) => submitOnEnter(e, () => void handleSubmitContext())}
                className="min-h-[120px] resize-none text-sm"
                autoFocus
              />

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSubmitContext}
                  disabled={hook.isLoading}
                  className="flex-1"
                >
                  {hook.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {contextText.trim() ? "Continue with this context →" : "Begin Interrogation →"}
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

              {hook.error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {hook.error}
                </p>
              )}
            </div>
          )}

          {/* ── Starting interrogation ───────────────────────────────────── */}
          {hook.step === "starting_interrogation" && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              <span className="eyebrow">
                <span className="eyebrow-dot mr-1.5" /> VELO Interrogation
              </span>
              <ThinkingMessages
                messages={[
                  "Cloning a read-only view of your repository…",
                  "Reading your actual source files…",
                  "Analyzing your architecture and decisions…",
                  "Preparing your first question…",
                ]}
              />
              <p className="max-w-xs text-[11px] text-muted-foreground/70">
                VELO reads your real code so questions are specific to what you built. This
                takes a few seconds the first time.
              </p>
            </div>
          )}

          {/* ── Interrogation — case-file transcript ─────────────────────── */}
          {hook.step === "interrogating" && (
            <div className="flex h-full flex-col">
              {/* Sticky sub-header */}
              <div className="grain relative flex items-center justify-between border-b bg-muted/20 px-6 py-2.5">
                <span className="eyebrow">
                  <span className="relative mr-1.5 inline-flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-tangerine)] opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand-tangerine)]" />
                  </span>
                  Live Interrogation
                </span>
                <span className="font-mono-ui text-[10px] text-muted-foreground">
                  {hook.answeredTurns.length} logged
                </span>
              </div>

              {/* Growing transcript log */}
              <div className="flex-1 space-y-0 overflow-y-auto px-6 py-4">
                {hook.answeredTurns.map((turn) => (
                  <div key={turn.questionIndex} className="py-3">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="font-mono-ui text-[10px] font-medium text-muted-foreground">
                        Q{String(turn.questionIndex + 1).padStart(2, "0")}
                        {turn.area ? ` · ${turn.area.toUpperCase()}` : ""}
                      </span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      {turn.question}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">
                      {turn.answer}
                    </p>
                    <div className="rule mt-3" />
                  </div>
                ))}

                {/* Current, unanswered question — visually distinct from the log above */}
                <div className="py-3">
                  {hook.currentQuestion ? (
                    <div className="rounded-lg border-l-2 border-[var(--brand-tangerine)] bg-muted/30 py-3 pl-4 pr-3">
                      <span className="font-mono-ui text-[10px] font-medium text-muted-foreground">
                        Q{String(hook.questionCount + 1).padStart(2, "0")}
                        {hook.currentQuestionArea ? ` · ${hook.currentQuestionArea.toUpperCase()}` : ""}
                      </span>
                      <p className="mt-1.5 text-sm leading-relaxed">{hook.currentQuestion}</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-tangerine)]" />
                        Generating the next question…
                      </div>
                    </div>
                  )}
                </div>
                <div ref={transcriptEndRef} />
              </div>

              {/* Fixed answer composer */}
              <div className="border-t bg-card px-6 py-4">
                <Textarea
                  placeholder="Be specific — reference your actual code, the decisions you made, the problems you hit, and why you chose one approach over another. Vague answers trigger harder follow-ups."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => submitOnEnter(e, () => void handleSubmitAnswer())}
                  disabled={hook.isLoading || !hook.currentQuestion}
                  className="min-h-[110px] max-h-[220px] resize-none overflow-y-auto text-sm"
                  autoFocus
                />

                <p className="mt-2 text-[10px] text-muted-foreground">
                  VELO adapts based on your answers. Shallow responses go deeper on the same area.
                  Strong responses move to a harder uncovered topic. Enter submits. Shift+Enter adds
                  a new line.
                </p>

                <Button
                  onClick={handleSubmitAnswer}
                  disabled={
                    hook.isLoading ||
                    !hook.currentQuestion ||
                    !answer.trim() ||
                    answer.trim().split(/\s+/).length < 5
                  }
                  className="mt-3 w-full"
                >
                  {hook.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {hook.isLoading ? "Reviewing your answer…" : "Submit Answer →"}
                </Button>

                {hook.isLoading && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
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

                {hook.error && (
                  <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {hook.error}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Completing ───────────────────────────────────────────────── */}
          {hook.step === "completing" && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              <span className="eyebrow">Calculating verdict…</span>
            </div>
          )}

          {/* ── Verdict ──────────────────────────────────────────────────── */}
          {hook.step === "verdict" && hook.verdict && (
            <VerdictCard
              verdict={hook.verdict}
              questionCount={hook.questionCount}
              onClose={() => handleOpenChange(false)}
              onRetry={hook.retryFinalize}
              isRetrying={hook.isLoading}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── GitHub Repo Picker ───────────────────────────────────────────────────────

type GithubRepoPickerProps = {
  connected: boolean;
  username: string;
  repos: GithubRepo[];
  isLoading: boolean;
  connecting: boolean;
  search: string;
  onSearchChange: (s: string) => void;
  selected: RepoEntry[];
  onSelect: (repo: RepoEntry) => void;
  onLabelChange: (url: string, label: string) => void;
  onRemove: (url: string) => void;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  manualRepos: RepoEntry[];
  onManualAdd: () => void;
  onManualUrlChange: (i: number, url: string) => void;
};

function GithubRepoPicker({
  connected,
  username,
  repos,
  isLoading,
  connecting,
  search,
  onSearchChange,
  selected,
  onSelect,
  onLabelChange,
  onRemove,
  onConnect,
  onDisconnect,
  manualRepos,
  onManualAdd,
  onManualUrlChange,
}: GithubRepoPickerProps) {
  const filtered = repos.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <GitBranch className="h-3.5 w-3.5" />
          Repositories
        </div>
        {connected ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Check className="h-3 w-3 text-emerald-500" />
              {username}
            </span>
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
            >
              <Unplug className="h-3 w-3" />
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            disabled={connecting}
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {connecting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <GitBranch className="h-3 w-3" />
            )}
            Connect GitHub
          </button>
        )}
      </div>

      {/* Selected repos */}
      {selected.length > 0 && (
        <div className="space-y-1.5">
          {selected.map((repo) => (
            <div key={repo.url} className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
              <select
                value={repo.label}
                onChange={(e) => onLabelChange(repo.url, e.target.value)}
                className="h-7 rounded border-0 bg-transparent text-[11px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {REPO_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <span className="flex-1 truncate text-[11px] text-muted-foreground">{repo.url}</span>
              <button onClick={() => onRemove(repo.url)} className="shrink-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Repo picker when connected */}
      {connected && (
        <div className="rounded-lg border bg-muted/10">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search your repositories…"
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && !isLoading && (
              <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                {repos.length === 0 ? "No repositories found" : "No matches"}
              </p>
            )}
            {filtered.slice(0, 40).map((repo) => {
              const isSelected = selected.some((r) => r.url === repo.url);
              return (
                <button
                  key={repo.id}
                  onClick={() => onSelect({ url: repo.url, label: "Full Stack" })}
                  disabled={!isSelected && selected.length >= 4}
                  className={cn(
                    "flex w-full items-start gap-2.5 border-b px-3 py-2.5 text-left last:border-0 transition-colors",
                    isSelected
                      ? "bg-primary/5"
                      : "hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  <div className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/40",
                  )}>
                    {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{repo.name}</span>
                      {repo.language && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                          {repo.language}
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {repo.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual URL fallback */}
      {!connected && (
        <div className="space-y-2">
          {manualRepos.map((repo, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={repo.label}
                onChange={(e) => onLabelChange(repo.url, e.target.value)}
                className="h-9 shrink-0 rounded-md border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {REPO_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <input
                className="h-9 flex-1 rounded-md border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="https://github.com/you/project"
                value={repo.url}
                onChange={(e) => onManualUrlChange(i, e.target.value)}
              />
              {manualRepos.length > 1 && (
                <button
                  onClick={() => onRemove(repo.url)}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {manualRepos.length < 4 && (
            <button
              onClick={onManualAdd}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Add another repository
            </button>
          )}
          <p className="text-[10px] text-muted-foreground">
            Or connect GitHub above to browse your repos directly.
          </p>
        </div>
      )}
    </div>
  );
}

function SectionLabel({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium">
      {icon}
      {children}
    </div>
  );
}

function CenteredSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}


function RepoResultRow({ repo }: { repo: RepoEntry }) {
  const passed = repo.check_status === "passed";
  const skipped = repo.check_status === "skipped";
  const failed = !passed && !skipped;
  // We can't see private repos (public-only for now), so a 404 reads as
  // "not found". Tell the user the real, actionable reason.
  const failMessage =
    repo.reason === "repo_not_found"
      ? "Can't access this repo. VELO verifies public repos only right now — make it public, or pick a public one."
      : repo.reason === "unparseable_url"
      ? "That doesn't look like a GitHub repo URL."
      : failed
      ? "Couldn't verify this repo."
      : null;

  return (
    <div
      className={cn(
        "flex items-start justify-between rounded-md border px-3 py-2",
        passed
          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/20"
          : skipped
          ? "border-border bg-muted/20"
          : "border-rose-200 bg-rose-50/40 dark:border-rose-900/30 dark:bg-rose-950/20",
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        {passed ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : skipped ? (
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        ) : (
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-medium">{repo.label}</p>
          <p className="truncate text-[10px] text-muted-foreground">{repo.url || "—"}</p>
          {failMessage && (
            <p className="mt-1 text-[10px] leading-snug text-rose-600 dark:text-rose-400">
              {failMessage}
            </p>
          )}
        </div>
      </div>
      {repo.language && (
        <span className="ml-3 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {repo.language}
        </span>
      )}
    </div>
  );
}


function VerdictCard({
  verdict,
  questionCount,
  onClose,
  onRetry,
  isRetrying,
}: {
  verdict: {
    status: string;
    scoring_status?: "pending" | "scoring" | "scored" | "scoring_failed";
    verification_score: number | null;
    dimension_scores?: DimensionScores | null;
    verdict_summary: string;
  };
  questionCount: number;
  onClose: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  // Grading runs turn-by-turn off the request path — by the time the
  // interview ends, the last answer or two may still be mid-grading (or,
  // rarely, may have failed for every answer). Both are explicit states,
  // never a stale/fabricated number standing in for their absence.
  if (verdict.scoring_status === "scoring") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Scoring in progress…</p>
          <p className="max-w-xs text-[11px] text-muted-foreground">
            Grading is still catching up on your last answer(s). This usually takes a few seconds.
          </p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} disabled={isRetrying} variant="outline" size="sm">
            {isRetrying && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Check again
          </Button>
        )}
      </div>
    );
  }

  if (verdict.scoring_status === "scoring_failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <XCircle className="h-7 w-7 text-rose-500" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Scoring failed</p>
          <p className="max-w-xs text-[11px] text-muted-foreground">
            {verdict.verdict_summary || "Something went wrong grading this interview. This is usually transient."}
          </p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} disabled={isRetrying} variant="outline" size="sm">
            {isRetrying && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Retry scoring
          </Button>
        )}
      </div>
    );
  }

  const score =
    verdict.verification_score !== null
      ? Math.round(verdict.verification_score * 100)
      : null;
  const isVerified = verdict.status === "verified";
  const isSuspicious = verdict.status === "suspicious";

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      {score !== null && (
        <div
          className="relative flex h-28 w-28 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${
              isVerified
                ? "hsl(142 71% 45%)"
                : isSuspicious
                ? "hsl(38 92% 50%)"
                : "hsl(0 84% 60%)"
            } ${score * 3.6}deg, hsl(var(--muted)) ${score * 3.6}deg)`,
          }}
        >
          <div className="flex h-[86px] w-[86px] flex-col items-center justify-center rounded-full bg-card">
            <span className="text-3xl font-bold tabular-nums leading-none">{score}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
          isVerified &&
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
          isSuspicious &&
            "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
          !isVerified &&
            !isSuspicious &&
            "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
        )}
      >
        {isVerified && <ShieldCheck className="h-4 w-4" />}
        {isSuspicious && <ShieldAlert className="h-4 w-4" />}
        {!isVerified && !isSuspicious && <XCircle className="h-4 w-4" />}
        {isVerified ? "VELO Verified" : isSuspicious ? "Review Needed" : "Not Verified"}
      </div>

      <p className="text-center text-sm leading-relaxed text-muted-foreground">
        {verdict.verdict_summary}
      </p>

      {questionCount > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {questionCount} question{questionCount !== 1 ? "s" : ""} answered
        </p>
      )}

      {verdict.dimension_scores && Object.keys(verdict.dimension_scores).length > 0 && (
        <DimensionBreakdown dimensionScores={verdict.dimension_scores} />
      )}

      <Button onClick={onClose} variant="outline" className="w-full">
        View in Profile
      </Button>
    </div>
  );
}

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

/** Magnitude bars, one per scored dimension — a status-color read (good/
 *  warn/critical), same vocabulary as the verdict badge above, not an
 *  arbitrary categorical palette. Evidence citation expands on tap. */
function DimensionBreakdown({ dimensionScores }: { dimensionScores: DimensionScores }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows: { dim: string; data: { score: number; evidence: string } }[] = [];
  for (const dim of INTERROGATION_DIMENSIONS) {
    const data = dimensionScores[dim];
    if (data) rows.push({ dim, data });
  }
  if (rows.length === 0) return null;

  return (
    <div className="w-full space-y-2 rounded-lg border p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Breakdown
      </p>
      <div className="space-y-2.5">
        {rows.map(({ dim, data }) => {
          const notAssessed = NOT_ASSESSED_MARKERS.has((data.evidence || "").trim().toLowerCase());
          const pct = Math.round(data.score * 100);
          const barColor = notAssessed
            ? "bg-muted-foreground/20"
            : pct >= 70
            ? "bg-emerald-500"
            : pct >= 40
            ? "bg-amber-500"
            : "bg-rose-500";
          const isExpanded = expanded === dim;
          return (
            <button
              key={dim}
              type="button"
              onClick={() => setExpanded(isExpanded ? null : dim)}
              className="block w-full text-left"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium">{DIMENSION_LABELS[dim] ?? dim}</span>
                <span className={cn("tabular-nums", notAssessed && "text-muted-foreground")}>
                  {notAssessed ? "—" : pct}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                {!notAssessed && (
                  <div
                    className={cn("h-full rounded-full transition-all", barColor)}
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              {isExpanded && (
                <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                  {data.evidence}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Cycles through status messages so a long async wait feels alive and informed. */
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
