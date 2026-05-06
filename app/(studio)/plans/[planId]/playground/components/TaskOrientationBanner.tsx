"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Brain, Code2, FlaskConical, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepId } from "./surface-runtime-router";

interface Step {
  id: StepId;
  label: string;
}

interface TaskOrientationBannerProps {
  taskId: string;
  surfaceRationale: string;
  steps: Step[];
  surfaceType?: string;
}

const STEP_DESCRIPTIONS: Record<StepId, string> = {
  ingest: "Read and interact with your personalised lesson",
  micro: "Practice with targeted questions and flashcards",
  prove: "Teach the concept back to demonstrate understanding",
  scenario: "Apply your knowledge in a realistic simulation",
  omni: "Build your solution in a live workspace",
  verify: "Submit your proof for AI evaluation",
};

const STEP_ICONS: Record<StepId, React.ElementType> = {
  ingest: BookOpen,
  micro: RefreshCw,
  prove: Brain,
  scenario: FlaskConical,
  omni: Code2,
  verify: ShieldCheck,
};

const SURFACE_COLORS: Record<string, { bg: string; border: string; badge: string; icon: string }> = {
  simulation_scenario: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800",
    icon: "text-amber-600",
  },
  code_playground: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-800",
    icon: "text-violet-600",
  },
  flashcard_session: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    icon: "text-blue-600",
  },
  teachback_session: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-800",
    icon: "text-rose-600",
  },
  diagram_workspace: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    badge: "bg-teal-100 text-teal-800",
    icon: "text-teal-600",
  },
  canvas_workspace: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    badge: "bg-teal-100 text-teal-800",
    icon: "text-teal-600",
  },
};

const SURFACE_LABEL: Record<string, string> = {
  simulation_scenario: "Simulation",
  code_playground: "Coding",
  flashcard_session: "Flashcards",
  teachback_session: "Teach-back",
  diagram_workspace: "Diagram",
  canvas_workspace: "Canvas",
};

const STORAGE_KEY = (taskId: string) => `orientation_seen:${taskId}`;

export function TaskOrientationBanner({
  taskId,
  surfaceRationale,
  steps,
  surfaceType,
}: TaskOrientationBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY(taskId));
    if (!seen) setVisible(true);
  }, [taskId]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY(taskId), "1");
    setVisible(false);
  };

  if (!visible) return null;

  const colors = SURFACE_COLORS[surfaceType ?? ""] ?? {
    bg: "bg-slate-50",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-700",
    icon: "text-slate-500",
  };

  return (
    <div
      className={cn(
        "shrink-0 rounded-2xl border p-5 animate-in fade-in slide-in-from-top-3 duration-500",
        colors.bg,
        colors.border,
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", colors.badge)}>
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Learning Mode
              </p>
              {surfaceType && (
                <Badge variant="outline" className={cn("text-[10px] border-0 px-2 py-0.5", colors.badge)}>
                  {SURFACE_LABEL[surfaceType] ?? surfaceType}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-slate-800 max-w-2xl leading-snug">
              {surfaceRationale}
            </p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/60 hover:text-slate-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step pipeline */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.id] ?? BookOpen;
          const desc = STEP_DESCRIPTIONS[step.id] ?? "";
          return (
            <div key={step.id} className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 rounded-lg bg-white/70 border border-white px-2.5 py-1.5 shadow-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                  {i + 1}
                </span>
                <Icon className={cn("h-3.5 w-3.5 shrink-0", colors.icon)} />
                <div>
                  <p className="text-xs font-semibold text-slate-800 leading-none">{step.label}</p>
                  <p className="text-[10px] text-slate-500 leading-snug mt-0.5 hidden sm:block">{desc}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="h-3 w-3 shrink-0 text-slate-300" />
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-4 flex justify-end">
        <Button
          size="sm"
          onClick={dismiss}
          className="h-8 gap-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold"
        >
          Let's go <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
