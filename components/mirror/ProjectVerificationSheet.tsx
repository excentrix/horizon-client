"use client";

import { useState } from "react";
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
  Copy,
  Check,
  RefreshCw,
  FileText,
  ChevronDown,
  Search,
  Unplug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useProjectVerification,
  type RepoEntry,
  type AuditDocSection,
} from "@/hooks/use-project-verification";
import { useGithubRepos, type GithubRepo } from "@/hooks/use-github-repos";

// ─── VELO_AUDIT.md template (hardcoded so copy works before any API call) ────

function buildTemplate(projectName: string) {
  return `# VELO Technical Audit — ${projectName}

> Commit this file as \`VELO_AUDIT.md\` in the root of your primary repository.
> VELO uses it to generate your personalised interview questions.
> **Minimum 50 words per section. Vague or placeholder text will fail validation.**

---

## Architecture

Describe the complete system architecture:
- What are the main components or modules? How do they fit together?
- How do they communicate — REST, WebSocket, message queue, direct calls?
- What design patterns did you follow (MVC, Clean Architecture, event-driven…) and why?
- How is data stored and retrieved? Describe your data layer.
- If you have a frontend and backend, describe both and how they integrate.
- Sketch a rough component diagram in text if it helps.

<!-- Your answer -->


---

## Technology Choices

For each major technology, library, or framework:
- Why did you choose it specifically over the obvious alternative?
- What trade-offs did you accept?
- Would you make the same choice today?

"I chose React because it's popular" will fail validation.
"I chose React over Vue because react-query gave me server-state caching out of the box,
which saved ~2 weeks of manual cache invalidation logic" is what VELO is looking for.

<!-- Your answer -->


---

## Key Implementation Decisions

List at least 3 significant technical decisions. For each:
1. **What was the decision?** (e.g., how to handle auth tokens, schema design, caching strategy)
2. **What alternatives did you consider?** (name at least two)
3. **Why did you choose this approach?** (be specific — not just "it was simpler")
4. **What did you give up?** (every decision has a trade-off)
5. **Would you change it today?** If yes, what would you do instead?

<!-- Your answer -->


---

## Hardest Problem Solved

Describe the hardest technical problem you hit while building this project:

1. **The symptom** — what were you observing? Error messages, wrong output, slow performance?
2. **Why it was hard** — what made it non-obvious to diagnose?
3. **What you tried first** — approaches that didn't work and exactly why they failed
4. **The root cause** — what was actually wrong
5. **The fix** — what you changed and why it worked
6. **What you learned** — what would prevent this class of problem in future

If you solved multiple hard problems, describe the one that took the longest.

<!-- Your answer -->


---

## Known Limitations & Technical Debt

Be brutally honest. What is currently broken, incomplete, or held together with duct tape?

- What breaks under moderate load (100+ concurrent users)?
- What input edge cases are unhandled?
- What security assumptions are you making that might not hold?
- What did you hardcode that should be configurable?
- What needs to be refactored before this goes to production?
- What is on your backlog that you never got to?

This section is not marked negatively — every real project has debt. Hiding it from VELO
just results in harder interview questions.

<!-- Your answer -->


---

## Testing Approach

Describe your testing strategy:
- What kinds of tests exist? (unit, integration, e2e, manual only)
- What specific things are covered? Name the most important test cases.
- What is NOT tested and why? (time constraints, complexity, difficulty)
- How did you verify your main user flows work end-to-end?
- If you had to add 10 tests tomorrow, what would they cover and why those?
- Name at least one bug you shipped that a test would have caught.

If you wrote zero automated tests, explain your manual testing process in detail.

<!-- Your answer -->


---

## Security & Performance

**Security:**
- How is authentication implemented? Where are tokens stored and why?
- What input validation exists? Where could XSS, SQLi, or IDOR occur?
- What are the trust boundaries? What do you trust that you perhaps shouldn't?
- What would you harden first if this went to production next week?

**Performance:**
- What are the slowest operations right now? Have you profiled them?
- What happens if the database grows to 1 million rows?
- Where do you make N+1 queries or redundant API calls?
- What caching have you implemented? What would you add next and why?

<!-- Your answer -->
`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REPO_LABELS = ["Full Stack", "Frontend", "Backend", "Mobile", "ML / AI", "Other"];

const AUDIT_SECTIONS = [
  "Architecture",
  "Technology Choices",
  "Key Implementation Decisions",
  "Hardest Problem Solved",
  "Known Limitations & Technical Debt",
  "Testing Approach",
  "Security & Performance",
];

// ─── Component ────────────────────────────────────────────────────────────────

interface ProjectVerificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string;
  projectIndex: number;
  projectTitle: string;
}

export function ProjectVerificationSheet({
  open,
  onOpenChange,
  snapshotId,
  projectIndex,
  projectTitle,
}: ProjectVerificationSheetProps) {
  const hook = useProjectVerification(snapshotId);
  const github = useGithubRepos();

  const [repos, setRepos] = useState<RepoEntry[]>([{ url: "", label: "Full Stack" }]);
  const [demoUrl, setDemoUrl] = useState("");
  const [answer, setAnswer] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [githubConnecting, setGithubConnecting] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      hook.reset();
      setRepos([{ url: "", label: "Full Stack" }]);
      setDemoUrl("");
      setAnswer("");
      setHasStarted(false);
      setCopied(false);
      setRepoSearch("");
    }
  };

  const handleBeginVerification = async () => {
    setHasStarted(true);
    await hook.startVerification(projectIndex);
  };

  const handleSubmitRepos = async () => {
    const valid = repos.filter((r) => r.url.trim());
    await hook.submitRepos(valid, demoUrl);
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || answer.trim().split(/\s+/).length < 5) return;
    const current = answer;
    setAnswer("");
    const done = await hook.submitAnswer(current);
    if (done) {
      await hook.completeAndFinalize();
    }
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(buildTemplate(projectTitle));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canStartInterrogation = hook.auditDoc?.status === "accepted";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]"
      >
        {/* ── Fixed header ─────────────────────────────────────────────── */}
        <div className="border-b px-5 py-4">
          <SheetHeader className="space-y-0.5">
            <SheetTitle className="text-sm font-semibold leading-snug">
              Verify: {projectTitle}
            </SheetTitle>
            <SheetDescription className="text-[11px] text-muted-foreground">
              Submit repos → add VELO_AUDIT.md → complete adaptive interrogation
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">

          {/* ── Not started ─────────────────────────────────────────────── */}
          {!hasStarted && hook.step === "idle" && (
            <div className="flex flex-col gap-5">
              <div className="space-y-3">
                {[
                  { n: 1, title: "Submit repositories", body: "Add one or more GitHub repos for this project — frontend, backend, or both." },
                  { n: 2, title: "Add VELO_AUDIT.md", body: "Document your technical decisions in a structured file. VELO uses it to generate your interview questions." },
                  { n: 3, title: "Complete the interrogation", body: "6–15 adaptive questions that probe ownership, architecture, trade-offs, and debugging depth." },
                  { n: 4, title: "Earn your badge", body: "A verified badge appears on this project in your public profile." },
                ].map(({ n, title, body }) => (
                  <div key={n} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
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

              {/* VELO_AUDIT.md */}
              <AuditDocGuide onCopy={handleCopyTemplate} copied={copied} />

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
              <p className="text-sm text-muted-foreground">
                Checking repositories and VELO_AUDIT.md…
              </p>
            </div>
          )}

          {/* ── Check results ────────────────────────────────────────────── */}
          {hook.step === "check_result" && (
            <div className="flex flex-col gap-4">

              {/* Per-repo */}
              <div className="space-y-2">
                <SectionLabel icon={<GitBranch className="h-3.5 w-3.5" />}>
                  Repository check
                </SectionLabel>
                {hook.checkedRepos.map((repo, i) => (
                  <RepoResultRow key={i} repo={repo} />
                ))}
              </div>

              {/* Audit doc */}
              <AuditDocResultCard
                result={hook.auditDoc}
                onCopy={handleCopyTemplate}
                copied={copied}
                onRecheck={hook.recheckAuditDoc}
                isRechecking={hook.isLoading}
              />

              {!canStartInterrogation && (
                <p className="text-[11px] text-muted-foreground">
                  Fix the VELO_AUDIT.md issues, push the file to your repo, then hit
                  Re-check. The interrogation unlocks once the document is accepted.
                </p>
              )}

              <Button
                onClick={hook.startInterrogation}
                disabled={hook.isLoading || !canStartInterrogation}
                className="w-full"
              >
                {hook.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Begin Interrogation →
              </Button>

              {hook.error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {hook.error}
                </p>
              )}
            </div>
          )}

          {/* ── Starting interrogation ───────────────────────────────────── */}
          {hook.step === "starting_interrogation" && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Preparing your interrogation…</p>
            </div>
          )}

          {/* ── Interrogation ────────────────────────────────────────────── */}
          {hook.step === "interrogating" && hook.currentQuestion && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  VELO Interrogation
                </span>
                {hook.questionCount > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {hook.questionCount} answered
                  </span>
                )}
              </div>

              <div className="rounded-lg border-l-2 border-primary bg-muted/30 py-3 pl-4 pr-3">
                <p className="text-sm leading-relaxed">{hook.currentQuestion}</p>
              </div>

              <Textarea
                placeholder="Be specific — reference your actual code, the decisions you made, the problems you hit, and why you chose one approach over another. Vague answers trigger harder follow-ups."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="min-h-[160px] resize-none text-sm"
                autoFocus
              />

              <p className="text-[10px] text-muted-foreground">
                VELO adapts based on your answers. Shallow responses go deeper on the same area.
                Strong responses move to a harder uncovered topic. Minimum 5 words to submit.
              </p>

              <Button
                onClick={handleSubmitAnswer}
                disabled={
                  hook.isLoading ||
                  !answer.trim() ||
                  answer.trim().split(/\s+/).length < 5
                }
                className="w-full"
              >
                {hook.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Answer →
              </Button>

              {hook.error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {hook.error}
                </p>
              )}
            </div>
          )}

          {/* ── Completing ───────────────────────────────────────────────── */}
          {hook.step === "completing" && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Calculating verdict…</p>
            </div>
          )}

          {/* ── Verdict ──────────────────────────────────────────────────── */}
          {hook.step === "verdict" && hook.verdict && (
            <VerdictCard
              verdict={hook.verdict}
              questionCount={hook.questionCount}
              onClose={() => handleOpenChange(false)}
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

function AuditDocGuide({
  onCopy,
  copied,
}: {
  onCopy: () => void;
  copied: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-muted/20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">VELO_AUDIT.md required</span>
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            REQUIRED
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t px-3 pb-3 pt-2.5 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Add a <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">VELO_AUDIT.md</code>{" "}
            file to the root of your primary repository. It must contain all 7 sections
            with at least 50 words each. VELO generates your interview questions directly
            from this document — the more honest and specific you are, the more accurately
            it can assess your depth.
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {AUDIT_SECTIONS.map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                {s}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs"
            onClick={onCopy}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                Copied to clipboard
              </>
            ) : (
              <>
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy VELO_AUDIT.md template
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function RepoResultRow({ repo }: { repo: RepoEntry }) {
  const passed = repo.check_status === "passed";
  const skipped = repo.check_status === "skipped";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2",
        passed
          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/20"
          : skipped
          ? "border-border bg-muted/20"
          : "border-rose-200 bg-rose-50/40 dark:border-rose-900/30 dark:bg-rose-950/20",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {passed ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : skipped ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        ) : (
          <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-medium">{repo.label}</p>
          <p className="truncate text-[10px] text-muted-foreground">{repo.url || "—"}</p>
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

function AuditDocResultCard({
  result,
  onCopy,
  copied,
  onRecheck,
  isRechecking,
}: {
  result: {
    status: string;
    sections: AuditDocSection[];
    feedback: string;
    template?: string;
  } | null;
  onCopy: () => void;
  copied: boolean;
  onRecheck: () => void;
  isRechecking: boolean;
}) {
  if (!result) return null;

  const accepted = result.status === "accepted";
  const missing = result.status === "missing";

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2.5",
        accepted
          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/20"
          : missing
          ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/20"
          : "border-rose-200 bg-rose-50/40 dark:border-rose-900/30 dark:bg-rose-950/20",
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs font-semibold",
            accepted
              ? "text-emerald-700 dark:text-emerald-400"
              : missing
              ? "text-amber-700 dark:text-amber-400"
              : "text-rose-700 dark:text-rose-400",
          )}
        >
          {accepted ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          VELO_AUDIT.md —{" "}
          {accepted ? "Accepted" : missing ? "Not found" : "Needs more detail"}
        </div>
        {!accepted && (
          <button
            onClick={onRecheck}
            disabled={isRechecking}
            className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <RefreshCw
              className={cn("h-3 w-3", isRechecking && "animate-spin")}
            />
            Re-check
          </button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">{result.feedback}</p>

      {result.sections.length > 0 && !accepted && (
        <div className="space-y-1 pt-0.5">
          {result.sections.map((s) => (
            <div key={s.name} className="flex items-center justify-between text-[10px]">
              <span
                className={cn(
                  "flex items-center gap-1.5",
                  s.passed ? "text-muted-foreground" : "font-medium text-rose-600 dark:text-rose-400",
                )}
              >
                {s.passed ? (
                  <Check className="h-2.5 w-2.5 text-emerald-500" />
                ) : (
                  <XCircle className="h-2.5 w-2.5" />
                )}
                {s.name}
              </span>
              <span className="text-muted-foreground">
                {s.word_count} / {s.required_words} words
              </span>
            </div>
          ))}
        </div>
      )}

      {!accepted && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-full text-[11px]"
          onClick={onCopy}
        >
          {copied ? (
            <>
              <Check className="mr-1.5 h-3 w-3 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-3 w-3" />
              Copy VELO_AUDIT.md template
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function VerdictCard({
  verdict,
  questionCount,
  onClose,
}: {
  verdict: {
    status: string;
    verification_score: number | null;
    verdict_summary: string;
  };
  questionCount: number;
  onClose: () => void;
}) {
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

      <Button onClick={onClose} variant="outline" className="w-full">
        View in Profile
      </Button>
    </div>
  );
}
