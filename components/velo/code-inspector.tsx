"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileCode2, Loader2, Search } from "lucide-react";
import { auditApi, type CitedFile, type InspectorEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { SourceFileViewer } from "@/components/velo/source-file-viewer";

function parseLines(lines?: string | null): [number, number] | null {
  if (!lines) return null;
  const m = lines.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  return a <= b ? [a, b] : [b, a];
}

function shortSha(sha: string) {
  return sha ? sha.slice(0, 7) : "";
}

type Props = {
  verificationId: string | null;
  citedFiles: CitedFile[];
  questionIndex: number;
  onEvent: (e: InspectorEvent) => void;
};

export function CodeInspector({ verificationId, citedFiles, questionIndex, onEvent }: Props) {
  const [activePath, setActivePath] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<[number, number] | null>(null);
  const [filter, setFilter] = useState("");
  const openedAtRef = useRef<number>(0);
  const emit = useCallback(
    (e: Omit<InspectorEvent, "q_index" | "ts">) =>
      onEvent({ ...e, q_index: questionIndex, ts: new Date().toISOString() }),
    [onEvent, questionIndex],
  );

  const tree = useQuery({
    queryKey: ["velo-source", verificationId],
    enabled: !!verificationId,
    staleTime: Infinity,
    refetchInterval: (q) =>
      (q.state.data as { state?: string } | undefined)?.state === "rebuilding" ? 2000 : false,
    queryFn: () => auditApi.getVerificationSource(verificationId as string, { rebuild: true }),
  });

  const file = useQuery({
    queryKey: ["velo-source-file", verificationId, activePath],
    enabled: !!verificationId && !!activePath,
    staleTime: Infinity,
    retry: false,
    queryFn: () => auditApi.getVerificationSourceFile(verificationId as string, activePath as string),
  });

  // Change the active file, logging dwell on the file we're leaving.
  const openFile = useCallback(
    (path: string, via: "file_open" | "cite_jump") => {
      setActivePath((prev) => {
        if (prev && prev !== path && openedAtRef.current) {
          onEvent({
            type: "scroll",
            path: prev,
            q_index: questionIndex,
            ts: new Date().toISOString(),
            dwell_ms: Date.now() - openedAtRef.current,
          });
        }
        openedAtRef.current = Date.now();
        return path;
      });
      emit({ type: via, path });
    },
    [emit, onEvent, questionIndex],
  );

  // Auto-open the file the current question cites.
  const citedKey = citedFiles.map((f) => `${f.path}:${f.lines ?? ""}`).join("|");
  const treeReady = tree.data?.state === "ready";
  useEffect(() => {
    if (!treeReady || citedFiles.length === 0) return;
    const paths = new Set((tree.data?.files ?? []).map((f) => `${f.repo}/${f.path}`));
    const first = citedFiles[0];
    const resolved =
      paths.has(first.path)
        ? first.path
        : [...paths].find((p) => p.endsWith("/" + first.path)) ?? null;
    if (resolved) {
      setHighlight(parseLines(first.lines));
      openFile(resolved, "cite_jump");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citedKey, treeReady]);

  // A manual file pick clears any cited-line highlight.
  const pickFile = (path: string) => {
    setHighlight(null);
    openFile(path, "file_open");
  };

  const filesByRepo = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const groups = new Map<string, { repo: string; path: string }[]>();
    for (const f of tree.data?.files ?? []) {
      if (q && !f.path.toLowerCase().includes(q)) continue;
      const arr = groups.get(f.repo) ?? [];
      arr.push({ repo: f.repo, path: f.path });
      groups.set(f.repo, arr);
    }
    return [...groups.entries()];
  }, [tree.data, filter]);

  const repoMeta = useMemo(
    () => new Map((tree.data?.repos ?? []).map((r) => [r.full_name, r])),
    [tree.data],
  );

  if (!verificationId) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-muted/10 text-xs text-muted-foreground">
        Loading verification…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2.5">
        <span className="eyebrow flex items-center gap-1.5">
          <FileCode2 className="size-3.5" /> Your source
        </span>
        {tree.data?.repos?.[0]?.commit_sha && (
          <a
            href={tree.data.repos[0].html_url || "#"}
            target="_blank"
            rel="noreferrer"
            className="caseline inline-flex items-center gap-1 hover:text-foreground"
            title="View this commit on GitHub"
          >
            @ {shortSha(tree.data.repos[0].commit_sha)} <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="velo-inspector-split"
        className="min-h-0 flex-1"
      >
        {/* File list */}
        <ResizablePanel defaultSize={30} minSize={16} maxSize={60} className="flex min-h-0 flex-col">
          <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
            <Search className="size-3 text-muted-foreground" />
            <input
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                if (e.target.value.trim()) emit({ type: "search", query: e.target.value.trim() });
              }}
              placeholder="Filter files"
              className="w-full bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {tree.isLoading && (
              <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Cloning a read-only view…
              </div>
            )}
            {tree.data?.state === "rebuilding" && (
              <div className="px-3 py-2 text-[11px] text-muted-foreground">Building snapshot…</div>
            )}
            {tree.data?.state === "unavailable" && (
              <div className="px-3 py-2 text-[11px] text-muted-foreground">
                Source snapshot unavailable for this verification.
              </div>
            )}
            {tree.isError && (
              <div className="px-3 py-2 text-[11px] text-destructive">Couldn&apos;t load your source.</div>
            )}
            {filesByRepo.map(([repo, files]) => {
              const meta = repoMeta.get(repo);
              return (
                <div key={repo} className="mb-1">
                  <div className="flex items-center justify-between px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="truncate">{repo.split("/").pop()}</span>
                    {meta?.unavailable && <span className="text-destructive">offline</span>}
                  </div>
                  {files.map(({ path }) => {
                    const key = `${repo}/${path}`;
                    return (
                      <button
                        key={key}
                        onClick={() => pickFile(key)}
                        className={cn(
                          "block w-full truncate px-3 py-0.5 text-left font-mono text-[11px] hover:bg-muted",
                          activePath === key ? "bg-muted text-primary" : "text-foreground/80",
                        )}
                        title={path}
                      >
                        {path}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Viewer */}
        <ResizablePanel defaultSize={70} minSize={30} className="flex min-h-0 flex-col">
          {citedFiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-1.5">
              <span className="caseline">Referenced:</span>
              {citedFiles.map((f) => {
                const label = f.path.split("/").pop();
                return (
                  <button
                    key={f.path}
                    onClick={() => {
                      const paths = new Set((tree.data?.files ?? []).map((t) => `${t.repo}/${t.path}`));
                      const resolved = paths.has(f.path)
                        ? f.path
                        : [...paths].find((p) => p.endsWith("/" + f.path));
                      if (resolved) {
                        setHighlight(parseLines(f.lines));
                        openFile(resolved, "cite_jump");
                      }
                    }}
                    className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] hover:border-primary hover:text-primary"
                  >
                    {label}
                    {f.lines ? `:${f.lines}` : ""}
                  </button>
                );
              })}
            </div>
          )}

          {!activePath ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-muted-foreground">
              Pick a file to read it — this is the exact code VELO analysed. Questions that cite a
              file open it here.
            </div>
          ) : file.isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : file.isError || !file.data ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-muted-foreground">
              That file isn&apos;t in the analysed snapshot, or the repo is no longer reachable.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
                <span className="truncate font-mono text-[11px] text-muted-foreground" title={activePath}>
                  {activePath}
                </span>
                <span className="caseline shrink-0">
                  {shortSha(file.data.commit_sha)}
                  {file.data.truncated ? " · truncated" : ""}
                </span>
              </div>
              <SourceFileViewer
                content={file.data.content}
                lang={file.data.lang}
                highlightRange={highlight}
              />
            </>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
