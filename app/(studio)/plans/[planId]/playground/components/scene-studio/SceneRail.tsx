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
}

interface SceneRailProps {
  scenes: SceneRailItem[];
  activeIndex: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectScene: (index: number) => void;
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
      <div className={`flex items-center justify-between border-b border-slate-100 px-3 py-2 ${collapsed ? "h-10" : ""}`}>
        {collapsed ? null : (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Scene Flow</p>
            <p className="text-lg font-semibold leading-none">{scenes.length} scenes</p>
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

      <div className="h-full overflow-y-auto px-2 pb-2 pt-2">
        <div className="space-y-1.5">
          {scenes.map((scene, i) => {
            const sceneType = String(scene.type ?? "concept");
            const title = String(scene.title ?? SCENE_LABELS[sceneType] ?? `Scene ${i + 1}`);
            const activeRow = i === activeIndex;
            return (
              <button
                key={`scene-rail-${i}`}
                onClick={() => onSelectScene(i)}
                className={`w-full rounded-lg border px-2 py-2 text-left transition ${
                  activeRow
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                {collapsed ? (
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {i + 1}
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500">Scene {i + 1}</p>
                    <div className="mt-1.5 h-12 w-full rounded-md border border-slate-200 bg-slate-50" />
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{title}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
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
  );
}
