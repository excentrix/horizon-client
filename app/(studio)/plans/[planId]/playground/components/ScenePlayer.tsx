"use client";

import { useMemo, useState } from "react";
import { marked } from "marked";
import type { DailyTask } from "@/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { InteractiveSimScene } from "./InteractiveSimScene";
import { CodeChallengeScene } from "./CodeChallengeScene";
import { QuizScene } from "./QuizScene";
import { MermaidScene } from "./MermaidScene";
import { VegaChartScene } from "./VegaChartScene";
import { ProjectBriefScene } from "./ProjectBriefScene";
import { ProjectCheckpointScene } from "./ProjectCheckpointScene";

// Configure marked — v9+ compatible (setOptions still works in v17)
try { marked.setOptions({ gfm: true, breaks: true }); } catch { /* ignore */ }

interface ScenePlayerProps {
  task: DailyTask;
  lessonLoading: boolean;
  blockFeedback: Record<string, "helpful" | "unhelpful" | null>;
  onFeedbackChange: (feedback: Record<string, "helpful" | "unhelpful" | null>) => void;
  onHintRequested?: () => void;
  onRequestMentorReview?: (content: string) => void;
  /** Called when the learner clicks "Open Workspace" on a project_brief or project_checkpoint scene */
  onOpenWorkspace?: (phase?: string) => void;
  onExecutionEvent?: (payload: {
    event_type:
      | "run_started"
      | "run_completed"
      | "runtime_error"
      | "compile_error"
      | "test_passed"
      | "test_failed";
    language?: string;
    run_id?: string;
    status?: string;
    error_type?: string;
    meta?: Record<string, unknown>;
  }) => void;
}

const SCENE_LABELS: Record<string, string> = {
  objective: "Objective",
  concept: "Concept",
  code: "Code",
  example: "Example",
  recap: "Recap",
  exercise: "Practice",
  interactive_sim: "Interactive Sim",
  code_challenge: "Code Lab",
  quiz: "Quiz",
  mermaid_diagram: "Diagram",
  vega_chart: "Chart",
  project_brief: "Project Brief",
  project_checkpoint: "Checkpoint",
};

const SCENE_THEME: Record<string, { accent: string; dot: string; chip: string; badge: string }> = {
  objective:       { accent: "from-blue-500/70 to-indigo-500/70",   dot: "bg-blue-500",    chip: "text-blue-200",    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  concept:         { accent: "from-violet-500/70 to-fuchsia-500/70", dot: "bg-violet-500",  chip: "text-violet-200",  badge: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  code:            { accent: "from-slate-400/70 to-slate-500/70",    dot: "bg-slate-400",   chip: "text-slate-200",   badge: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  example:         { accent: "from-cyan-500/70 to-sky-500/70",       dot: "bg-cyan-500",    chip: "text-cyan-200",    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  recap:           { accent: "from-emerald-500/70 to-teal-500/70",   dot: "bg-emerald-500", chip: "text-emerald-200", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  exercise:        { accent: "from-amber-500/70 to-orange-500/70",   dot: "bg-amber-500",   chip: "text-amber-200",   badge: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  interactive_sim: { accent: "from-indigo-500/70 to-violet-500/70",  dot: "bg-indigo-500",  chip: "text-indigo-200",  badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  code_challenge:  { accent: "from-green-500/70 to-lime-500/70",     dot: "bg-green-500",   chip: "text-green-200",   badge: "bg-green-500/15 text-green-300 border-green-500/30" },
  quiz:            { accent: "from-rose-500/70 to-pink-500/70",       dot: "bg-rose-500",    chip: "text-rose-200",    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  mermaid_diagram: { accent: "from-teal-500/70 to-cyan-500/70",       dot: "bg-teal-500",    chip: "text-teal-200",    badge: "bg-teal-500/15 text-teal-300 border-teal-500/30" },
  vega_chart:        { accent: "from-rose-500/70 to-orange-500/70",   dot: "bg-rose-400",    chip: "text-rose-200",    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  project_brief:     { accent: "from-violet-600/80 to-indigo-600/80", dot: "bg-violet-500",  chip: "text-violet-200",  badge: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  project_checkpoint:{ accent: "from-emerald-600/80 to-teal-600/80",  dot: "bg-emerald-500", chip: "text-emerald-200", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
};

const SCENE_ICONS: Record<string, string> = {
  objective: "🎯",
  concept: "💡",
  code: "⌨️",
  example: "🔬",
  recap: "✅",
  exercise: "🏋️",
  mermaid_diagram: "🗺️",
  vega_chart: "📊",
  project_brief: "📁",
  project_checkpoint: "📋",
};

function SceneThumbnail({ sceneType }: { sceneType: string }) {
  const theme = SCENE_THEME[sceneType] ?? SCENE_THEME.concept;
  const icon = SCENE_ICONS[sceneType] ?? "📖";
  return (
    <div className="relative h-20 w-full overflow-hidden rounded-md border border-white/10 bg-[#0d1117] p-2">
      <div className={`h-1 w-full rounded-full bg-gradient-to-r ${theme.accent} opacity-80`} />
      <div className="mt-2 flex items-start gap-2">
        <span className="shrink-0 text-base leading-none">{icon}</span>
        <div className="flex-1 space-y-1.5 pt-0.5">
          <div className="h-1.5 w-full rounded-full bg-white/20" />
          <div className="h-1.5 w-4/5 rounded-full bg-white/15" />
          <div className="h-1.5 w-3/5 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

/** Renders lesson markdown — robust against marked API changes */
function MarkdownBlock({ content, dark = false }: { content: string; dark?: boolean }) {
  const html = useMemo(() => {
    if (!content) return "";
    try {
      const result = marked.parse(content);
      // marked v5+ may return Promise in async mode — guard against it
      if (typeof result === "string") return result;
      return `<p style="white-space:pre-wrap">${content}</p>`;
    } catch {
      return `<p style="white-space:pre-wrap">${content}</p>`;
    }
  }, [content]);

  return (
    <div
      className={dark ? "lesson-prose-dark max-w-none" : "lesson-prose max-w-none"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function TextScene({ scene, index, type, onHintRequested }: {
  scene: Record<string, unknown>;
  index: number;
  type: string;
  onHintRequested?: () => void;
}) {
  const title = String(scene.title ?? "Lesson Slide");
  const content = String(scene.content ?? "");
  const label = SCENE_LABELS[type] ?? "Slide";
  const theme = SCENE_THEME[type] ?? SCENE_THEME.concept;
  const icon = SCENE_ICONS[type] ?? "📖";
  const hints = (scene.hints as string[] | undefined) ?? [];

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0E1117] shadow-xl min-h-[420px]">
      {/* Slide header bar */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${theme.accent} px-6 py-5 shrink-0`}>
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -right-2 top-4 h-16 w-16 rounded-full bg-white/5" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl backdrop-blur-sm">
              {icon}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{label}</p>
              <h4 className="mt-0.5 text-xl font-bold leading-tight text-white drop-shadow">{title}</h4>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80">
            {index + 1}
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {content ? (
          <MarkdownBlock content={content} dark />
        ) : (
          <p className="text-sm text-slate-500">No content available yet.</p>
        )}
      </div>

      {/* Footer */}
      {(hints.length > 0 || onHintRequested) && (
        <div className="flex shrink-0 items-center justify-between border-t border-slate-800 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {hints.slice(0, 2).map((hint, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                <Lightbulb className="h-3 w-3" />
                {hint}
              </span>
            ))}
          </div>
          {onHintRequested && (
            <Button size="sm" variant="outline" className="h-7 border-slate-700 bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 hover:text-white" onClick={onHintRequested}>
              Ask mentor
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

export function ScenePlayer({
  task,
  lessonLoading,
  blockFeedback,
  onFeedbackChange,
  onHintRequested,
  onRequestMentorReview,
  onOpenWorkspace,
  onExecutionEvent,
}: ScenePlayerProps) {
  void lessonLoading;
  void blockFeedback;
  void onFeedbackChange;
  const scenes = useMemo(() => task.lesson_blocks ?? [], [task.lesson_blocks]);
  const [index, setIndex] = useState(0);
  const [railCollapsed, setRailCollapsed] = useState(false);

  const active = scenes[index] as Record<string, unknown> | undefined;
  const type = String(active?.type ?? "concept");
  const pct = scenes.length ? ((index + 1) / scenes.length) * 100 : 0;
  const theme = SCENE_THEME[type] ?? SCENE_THEME.concept;

  const renderActiveScene = () => {
    if (!active) return null;

    if (type === "interactive_sim") {
      return (
        <InteractiveSimScene
          scene={active as {
            title?: string;
            description?: string;
            html_content?: string;
            sim_subtype?: "simulation" | "code_lab" | "game" | "explorer";
            estimated_seconds?: number;
          }}
        />
      );
    }

    if (type === "code_challenge") {
      return (
        <CodeChallengeScene
          scene={active as {
            title?: string;
            language?: string;
            starter_code?: string;
            test_cases?: Array<{ input?: string; expected_output?: string }>;
            hints?: string[];
          }}
          onRequestMentorReview={onRequestMentorReview}
          onExecutionEvent={onExecutionEvent}
        />
      );
    }

    if (type === "quiz") {
      return (
        <QuizScene
          scene={active as {
            title?: string;
            questions?: Array<{
              id: string;
              type: "multiple_choice" | "true_false" | "short_answer";
              difficulty?: string;
              points?: number;
              question?: string;
              statement?: string;
              options?: Array<{ id: string; text: string }>;
              correct_option?: string;
              correct_answer?: boolean;
              explanation?: string;
              expected_answer?: string;
              key_concepts?: string[];
              concept_tested?: string;
              commentPrompt?: string;
            }>;
            analysis?: string;
            estimated_seconds?: number;
          }}
          onRequestMentorReview={onRequestMentorReview}
        />
      );
    }

    if (type === "mermaid_diagram") {
      return (
        <MermaidScene
          scene={active as {
            title?: string;
            description?: string;
            mermaid_syntax?: string;
            mermaid_subtype?: string;
          }}
        />
      );
    }

    if (type === "vega_chart") {
      return (
        <VegaChartScene
          scene={active as {
            title?: string;
            description?: string;
            vega_spec?: Record<string, unknown>;
          }}
        />
      );
    }

    if (type === "project_brief") {
      return (
        <ProjectBriefScene
          scene={active as { title?: string; content?: string }}
          onOpenWorkspace={onOpenWorkspace}
        />
      );
    }

    if (type === "project_checkpoint") {
      return (
        <ProjectCheckpointScene
          scene={active as { title?: string; content?: string }}
          onOpenWorkspace={onOpenWorkspace}
        />
      );
    }

    return <TextScene scene={active} index={index} type={type} onHintRequested={onHintRequested} />;
  };

  if (!scenes.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-[#0E1117] p-4 text-sm text-slate-500">
        No scenes available yet.
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Scene rail */}
      <aside className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-[#0D1321] text-white shadow-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
          {railCollapsed ? null : (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Story Board</p>
              <p className="text-sm font-semibold">{scenes.length} scenes</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/10 hover:text-white"
            onClick={() => setRailCollapsed((p) => !p)}
            title={railCollapsed ? "Expand scene previews" : "Collapse scene previews"}
          >
            {railCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <div className="h-full overflow-y-auto px-2 pb-2 pt-2">
          <div className="space-y-2">
            {scenes.map((scene, i) => {
              const sceneType = String((scene as { type?: string }).type ?? "concept");
              const title = String((scene as { title?: string }).title ?? SCENE_LABELS[sceneType] ?? `Scene ${i + 1}`);
              const activeRow = i === index;
              const t = SCENE_THEME[sceneType] ?? SCENE_THEME.concept;
              return (
                <button
                  key={`scene-rail-${i}`}
                  onClick={() => setIndex(i)}
                  className={`w-full rounded-lg border px-2 py-2 text-left transition ${
                    activeRow
                      ? "border-violet-400/60 bg-violet-500/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  {railCollapsed ? (
                    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                      {i + 1}
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/70">Scene {i + 1}</p>
                        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                      </div>
                      <SceneThumbnail sceneType={sceneType} />
                      <p className="mt-2 line-clamp-2 text-xs font-medium text-white/95">{title}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/60">
                        {SCENE_LABELS[sceneType] ?? sceneType.replace(/_/g, " ")}
                      </p>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main viewport */}
      <section className="flex min-h-0 flex-col gap-3">
        {/* Top info bar */}
        <div className="rounded-xl border border-slate-800 bg-[#0E1117] px-4 py-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Current scene</p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-slate-500">
              <Clapperboard className="h-3.5 w-3.5" />
              Scene {index + 1} / {scenes.length}
            </div>
          </div>
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold leading-snug text-slate-100">
              {String((active as { title?: string })?.title ?? "Untitled Scene")}
            </h3>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.badge}`}>
              {SCENE_LABELS[type] ?? type.replace(/_/g, " ")}
            </span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        {/* Scene content */}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-[#080C14] p-3 shadow-sm">
          <div className="min-h-full">
            {renderActiveScene()}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#0E1117] p-2 shadow-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={index === 0}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30"
            onClick={() => setIndex((n) => Math.max(0, n - 1))}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Previous
          </Button>
          <div className="flex gap-1.5">
            {scenes.map((_, i) => (
              <button
                key={`dot-${i}`}
                className={`h-2 w-2 rounded-full transition-all ${i === index ? "w-4 bg-violet-500" : "bg-slate-600 hover:bg-slate-500"}`}
                onClick={() => setIndex(i)}
                aria-label={`Go to scene ${i + 1}`}
              />
            ))}
          </div>
          <Button
            size="sm"
            disabled={index >= scenes.length - 1}
            className="bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-30"
            onClick={() => setIndex((n) => Math.min(scenes.length - 1, n + 1))}
          >
            Next
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </section>
    </div>
  );
}
