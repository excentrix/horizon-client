"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SCENE_LABELS: Record<string, string> = {
  objective: "Objective",
  concept: "Concept",
  example: "Example",
  recap: "Recap",
  exercise: "Practice",
  interactive_sim: "Interactive Sim",
  agent_dialogue: "Mentor Dialogue",
  code_challenge: "Code Lab",
};

export interface SceneRailItem {
  type?: string;
  title?: string;
  content?: unknown;
  description?: unknown;
  starter_code?: unknown;
}

interface SceneRailProps {
  scenes: SceneRailItem[];
  activeIndex: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectScene: (index: number) => void;
}

function textFromUnknown(input: unknown): string {
  if (typeof input === "string") return input;
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  return "";
}

function compactPreview(scene: SceneRailItem): string {
  const sceneType = String(scene.type ?? "concept");
  if (sceneType === "code_challenge") {
    const code = textFromUnknown(scene.starter_code);
    if (code.trim()) return code.split("\n").slice(0, 2).join(" ").slice(0, 110);
  }
  const raw = textFromUnknown(scene.content) || textFromUnknown(scene.description);
  if (!raw.trim()) return "";
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function previewAccent(sceneType: string, active: boolean): string {
  if (sceneType === "interactive_sim") {
    return active
      ? "border-indigo-300 bg-indigo-50/70"
      : "border-indigo-100 bg-indigo-50/40";
  }
  if (sceneType === "code_challenge") {
    return active
      ? "border-emerald-300 bg-emerald-50/70"
      : "border-emerald-100 bg-emerald-50/40";
  }
  if (sceneType === "exercise") {
    return active
      ? "border-amber-300 bg-amber-50/70"
      : "border-amber-100 bg-amber-50/40";
  }
  return active
    ? "border-slate-300 bg-slate-50/80"
    : "border-slate-200 bg-slate-50/50";
}

function SceneThumb({ sceneType, active }: { sceneType: string; active: boolean }) {
  const shell = active
    ? "border-slate-300 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]"
    : "border-slate-200";

  if (sceneType === "interactive_sim") {
    return (
      <div className={`h-12 w-full overflow-hidden rounded-md border bg-slate-950 ${shell}`}>
        <div className="h-full w-full bg-[radial-gradient(circle_at_30%_40%,rgba(99,102,241,0.45),transparent_45%),radial-gradient(circle_at_70%_65%,rgba(6,182,212,0.35),transparent_45%)]">
          <div className="flex h-full items-center justify-between px-2">
            <div className="h-6 w-6 rounded-full border border-indigo-300/50 bg-indigo-400/30" />
            <div className="h-4 w-14 rounded bg-cyan-200/30" />
          </div>
        </div>
      </div>
    );
  }

  if (sceneType === "code_challenge") {
    return (
      <div className={`h-12 w-full overflow-hidden rounded-md border bg-[#0b1220] ${shell}`}>
        <div className="flex h-full">
          <div className="h-full w-8 border-r border-slate-700/60 bg-slate-800/50" />
          <div className="flex-1 space-y-1 px-2 py-1.5">
            <div className="h-1.5 w-3/4 rounded bg-emerald-300/70" />
            <div className="h-1.5 w-2/3 rounded bg-sky-300/60" />
            <div className="h-1.5 w-1/2 rounded bg-violet-300/60" />
          </div>
        </div>
      </div>
    );
  }

  if (sceneType === "exercise") {
    return (
      <div className={`h-12 w-full overflow-hidden rounded-md border bg-amber-50 ${shell}`}>
        <div className="space-y-1 px-2 py-1.5">
          <div className="h-2 w-2/3 rounded bg-amber-300/80" />
          <div className="h-1.5 w-full rounded bg-amber-200/80" />
          <div className="h-1.5 w-5/6 rounded bg-amber-200/80" />
        </div>
      </div>
    );
  }

  return (
    <div className={`h-12 w-full overflow-hidden rounded-md border bg-slate-50 ${shell}`}>
      <div className="space-y-1 px-2 py-1.5">
        <div className="h-2 w-1/2 rounded bg-slate-300/80" />
        <div className="h-1.5 w-full rounded bg-slate-200/90" />
        <div className="h-1.5 w-4/5 rounded bg-slate-200/90" />
      </div>
    </div>
  );
}

export function SceneRail({
  scenes,
  activeIndex,
  collapsed,
  onToggleCollapsed,
  onSelectScene,
}: SceneRailProps) {
  return (
    <aside className="h-full min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white/90 text-slate-900">
      <div className={`flex items-center justify-between border-b border-slate-100 px-2.5 py-2 ${collapsed ? "h-9" : ""}`}>
        {collapsed ? null : (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Scene Flow</p>
            <p className="text-base font-semibold leading-none">{scenes.length} scenes</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand scene previews" : "Collapse scene previews"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="h-full overflow-y-auto px-1.5 pb-1.5 pt-1.5">
        <div className="space-y-1">
          {scenes.map((scene, i) => {
            const sceneType = String(scene.type ?? "concept");
            const title = String(scene.title ?? SCENE_LABELS[sceneType] ?? `Scene ${i + 1}`);
            const preview = compactPreview(scene);
            const activeRow = i === activeIndex;
            return (
              <button
                key={`scene-rail-${i}`}
                onClick={() => onSelectScene(i)}
                className={`w-full rounded-lg border px-2 py-1.5 text-left transition ${
                  activeRow
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                {collapsed ? (
                  <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                    {i + 1}
                  </div>
                ) : (
                  <>
                    {/* <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">S{i + 1}</p> */}
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        S{i + 1}
                      </p>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                        {SCENE_LABELS[sceneType] ?? sceneType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className={`mt-1 ${previewAccent(sceneType, activeRow).split(" ").slice(0, 2).join(" ")} rounded-md p-1`}>
                      <SceneThumb sceneType={sceneType} active={activeRow} />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-4 text-slate-900">{title}</p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-600">
                      {preview || "Scene content preview"}
                    </p>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
