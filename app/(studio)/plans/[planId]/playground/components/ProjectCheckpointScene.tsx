"use client";

import { useMemo } from "react";
import { marked } from "marked";
import { ArrowRight, CheckSquare, ClipboardList } from "lucide-react";

interface ProjectCheckpointSceneProps {
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

/** Extract checklist items from markdown — matches `- [ ] ...` and `* [ ] ...` */
function extractChecklist(content: string): string[] {
  const items: string[] = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^[\s*-]+\[[ x]\]\s+(.+)/i);
    if (m) items.push(m[1].trim());
  }
  return items;
}

/** Extract section headers from markdown for a delivery overview */
function extractDeliverableSections(content: string): string[] {
  const sections: string[] = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^#{1,3}\s+(.+)/);
    if (m) sections.push(m[1].trim());
  }
  return sections.filter((s) => !s.toLowerCase().includes("checklist"));
}

export function ProjectCheckpointScene({ scene, onOpenWorkspace }: ProjectCheckpointSceneProps) {
  const content = scene.content ?? "";
  const html = useMemo(() => renderMarkdown(content), [content]);
  const checklist = useMemo(() => extractChecklist(content), [content]);
  const sections = useMemo(() => extractDeliverableSections(content), [content]);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-emerald-500/30 bg-[#0E1117] shadow-xl">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600/80 to-teal-600/80 px-6 py-5 shrink-0">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -right-2 top-4 h-16 w-16 rounded-full bg-white/5" />
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl backdrop-blur-sm">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Project Checkpoint</p>
            <h4 className="mt-0.5 text-xl font-bold leading-tight text-white drop-shadow">
              {scene.title ?? "Submission Requirements"}
            </h4>
          </div>
        </div>
      </div>

      {/* Two-column layout: full details left, acceptance checklist right */}
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        {/* Full deliverable content */}
        <div className="flex-1 overflow-y-auto border-r border-white/10 px-6 py-5">
          {html ? (
            <div className="lesson-prose-dark max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="text-sm text-slate-500">No checkpoint content available.</p>
          )}
        </div>

        {/* Acceptance checklist sidebar */}
        {checklist.length > 0 && (
          <div className="w-64 shrink-0 overflow-y-auto px-4 py-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
              Acceptance Checklist
            </p>
            <ul className="space-y-2.5">
              {checklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {sections.length > 0 && (
              <>
                <p className="mb-3 mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Deliverable Sections
                </p>
                <ul className="space-y-1.5">
                  {sections.map((s, i) => (
                    <li key={i} className="text-xs text-slate-500">
                      {i + 1}. {s}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="shrink-0 border-t border-emerald-500/20 bg-emerald-500/5 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-emerald-300">
            Complete these deliverables in your Project Workspace to pass this phase.
          </p>
          {onOpenWorkspace && (
            <button
              onClick={() => onOpenWorkspace?.(scene.target_phase)}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500 active:scale-95"
            >
              Go to Workspace
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
