"use client";

import {
  GitBranch,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Trash2,
  Check,
  Search,
  Unplug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RepoEntry } from "@/hooks/use-project-verification";
import type { GithubRepo } from "@/hooks/use-github-repos";

export const REPO_LABELS = ["Full Stack", "Frontend", "Backend", "Mobile", "ML / AI", "Other"];

type RepoPickerProps = {
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

/** GitHub connect + repo selection for the evidence step. Public repos only. */
export function RepoPicker({
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
}: RepoPickerProps) {
  const filtered = repos.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="eyebrow flex items-center gap-2">
          <span className="eyebrow-dot" /> Repositories
        </span>
        {connected ? (
          <div className="flex items-center gap-3">
            <span className="cstat status-strong">
              <Check className="size-3" /> {username}
            </span>
            <button
              onClick={onDisconnect}
              className="caseline flex items-center gap-1 transition-colors hover:text-destructive"
            >
              <Unplug className="size-3" /> Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            disabled={connecting}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 font-mono-ui text-[11px] font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {connecting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <GitBranch className="size-3" />
            )}
            Connect GitHub
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="space-y-1.5">
          {selected.map((repo) => (
            <div
              key={repo.url}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5"
            >
              <select
                value={repo.label}
                onChange={(e) => onLabelChange(repo.url, e.target.value)}
                className="h-7 rounded border-0 bg-transparent font-mono-ui text-[11px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {REPO_LABELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <span className="caseline flex-1 truncate">{repo.url}</span>
              <button
                onClick={() => onRemove(repo.url)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${repo.url}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {connected && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search your repositories…"
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {isLoading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
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
                    "flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left transition-colors last:border-0",
                    isSelected
                      ? "bg-primary/5"
                      : "hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/40",
                    )}
                  >
                    {isSelected && <Check className="size-2.5 text-primary-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{repo.name}</span>
                      {repo.language && <span className="caseline">{repo.language}</span>}
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

      {!connected && (
        <div className="space-y-2">
          {manualRepos.map((repo, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={repo.label}
                onChange={(e) => onLabelChange(repo.url, e.target.value)}
                className="h-9 shrink-0 rounded-md border border-border bg-background px-2 font-mono-ui text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {REPO_LABELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="https://github.com/you/project"
                value={repo.url}
                onChange={(e) => onManualUrlChange(i, e.target.value)}
              />
              {manualRepos.length > 1 && (
                <button
                  onClick={() => onRemove(repo.url)}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove repository row"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          {manualRepos.length < 4 && (
            <button
              onClick={onManualAdd}
              className="flex items-center gap-1.5 font-mono-ui text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-3" /> Add another repository
            </button>
          )}
          <p className="text-[10px] text-muted-foreground">
            Or connect GitHub above to browse your repos directly. Public repos only for now.
          </p>
        </div>
      )}
    </div>
  );
}

/** One repo's liveness-check result, on the evidence scale. */
export function RepoResultRow({ repo }: { repo: RepoEntry }) {
  const passed = repo.check_status === "passed";
  const skipped = repo.check_status === "skipped";
  const failed = !passed && !skipped;
  const failMessage =
    repo.reason === "repo_not_found"
      ? "Can't access this repo. VELO verifies public repos only right now — make it public, or pick a public one."
      : repo.reason === "unparseable_url"
        ? "That doesn't look like a GitHub repo URL."
        : failed
          ? "Couldn't verify this repo."
          : null;

  return (
    <div className="flex items-start justify-between rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        {passed ? (
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 status-strong" />
        ) : skipped ? (
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 status-developing" />
        ) : (
          <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-medium">{repo.label}</p>
          <p className="caseline truncate">{repo.url || "—"}</p>
          {failMessage && (
            <p className="mt-1 text-[10px] leading-snug text-destructive">{failMessage}</p>
          )}
        </div>
      </div>
      {repo.language && <span className="caseline ml-3 shrink-0">{repo.language}</span>}
    </div>
  );
}
