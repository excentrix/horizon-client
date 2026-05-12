"use client";

import { useMemo } from "react";
import { marked } from "marked";
import { ArrowRight, BookOpen, FolderOpen } from "lucide-react";

interface ProjectBriefSceneProps {
  scene: {
    title?: string;
    content?: string;
    target_phase?: string;
  };
  onOpenWorkspace?: (phase?: string) => void;
}

try { marked.setOptions({ gfm: true, breaks: true }); } catch { /* ignore */ }

function renderMarkdown(content: string): string {
  try {
    const result = marked.parse(content);
    if (typeof result === "string") return result;
  } catch { /* ignore */ }
  return `<p style="white-space:pre-wrap">${content}</p>`;
}

export function ProjectBriefScene({ scene, onOpenWorkspace }: ProjectBriefSceneProps) {
  const html = useMemo(() => renderMarkdown(scene.content ?? ""), [scene.content]);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-violet-500/30 bg-[#0E1117] shadow-xl">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600/80 to-indigo-600/80 px-6 py-5 shrink-0">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -right-2 top-4 h-16 w-16 rounded-full bg-white/5" />
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl backdrop-blur-sm">
            <FolderOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Project Brief</p>
            <h4 className="mt-0.5 text-xl font-bold leading-tight text-white drop-shadow">
              {scene.title ?? "Your Project"}
            </h4>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {html ? (
          <div className="lesson-prose-dark max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="text-sm text-slate-500">No brief content available.</p>
        )}
      </div>

      {/* CTA */}
      <div className="shrink-0 border-t border-violet-500/20 bg-violet-500/5 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-violet-300">
            <BookOpen className="h-4 w-4" />
            <span>Read through the options, then start your project in the workspace.</span>
          </div>
          {onOpenWorkspace && (
            <button
              onClick={() => onOpenWorkspace?.(scene.target_phase)}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-violet-500 active:scale-95"
            >
              Open Workspace
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
