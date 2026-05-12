"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CheckCircle2,
  ClipboardList,
  Flag,
  Target,
  UploadCloud,
  Wrench,
} from "lucide-react";
import type { StepId } from "./surface-runtime-router";

interface TaskMissionBriefProps {
  title: string;
  objective: string;
  acceptanceCriteria: string[];
  sandboxGuidance: string[];
  submissionExpectation: string;
  currentStep?: StepId;
  lessonBlockTitles?: string[];
  practiceTopics?: string[];
  isVerificationView?: boolean;
}

function FullBriefSheet({
  title,
  objective,
  acceptanceCriteria,
  sandboxGuidance,
  submissionExpectation,
}: Omit<TaskMissionBriefProps, "currentStep" | "lessonBlockTitles" | "practiceTopics" | "isVerificationView">) {
  return (
    <SheetContent side="right" className="w-[420px] overflow-y-auto">
      <SheetHeader className="mb-4">
        <SheetTitle className="text-base">Task Mission Brief</SheetTitle>
      </SheetHeader>
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Task</p>
        <p className="text-sm font-semibold text-slate-900 -mt-2">{title}</p>

        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 flex items-center gap-1.5 mb-1">
            <Flag className="h-3.5 w-3.5" /> Objective
          </p>
          <p className="text-sm text-slate-800">{objective}</p>
        </div>

        {acceptanceCriteria.length > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="h-3.5 w-3.5" /> Acceptance Criteria
            </p>
            <ul className="space-y-1.5">
              {acceptanceCriteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sandboxGuidance.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 flex items-center gap-1.5 mb-2">
              <Wrench className="h-3.5 w-3.5" /> How To Use Sandboxes
            </p>
            <ul className="space-y-1">
              {sandboxGuidance.map((g, i) => (
                <li key={i} className="text-xs text-amber-900">• {g}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5 mb-1">
            <UploadCloud className="h-3.5 w-3.5" /> Submission Expectation
          </p>
          <p className="text-sm text-slate-700">{submissionExpectation}</p>
        </div>
      </div>
    </SheetContent>
  );
}

export function TaskMissionBrief({
  title,
  objective,
  acceptanceCriteria,
  sandboxGuidance,
  submissionExpectation,
  currentStep,
  lessonBlockTitles = [],
  practiceTopics = [],
  isVerificationView = false,
}: TaskMissionBriefProps) {
  // Verify step: full inline card
  if (isVerificationView || currentStep === "verify") {
    return (
      <Card className="shrink-0 border-indigo-200 bg-indigo-50/50">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" />
              <p className="text-sm font-semibold text-slate-900">{title}</p>
            </div>
            <Badge variant="outline" className="border-indigo-300 bg-white text-indigo-700 text-[10px]">
              Final proof target
            </Badge>
          </div>

          <div className="rounded-lg border border-indigo-100 bg-white/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 flex items-center gap-1.5 mb-1">
              <Flag className="h-3.5 w-3.5" /> Objective
            </p>
            <p className="text-sm text-slate-800">{objective}</p>
          </div>

          {acceptanceCriteria.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5" /> Acceptance Criteria
              </p>
              <ul className="space-y-1.5">
                {acceptanceCriteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {sandboxGuidance.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 flex items-center gap-1.5 mb-1">
                  <Wrench className="h-3.5 w-3.5" /> Sandbox Guidance
                </p>
                <ul className="space-y-0.5">
                  {sandboxGuidance.map((g, i) => (
                    <li key={i} className="text-xs text-amber-900">• {g}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5 mb-1">
                <UploadCloud className="h-3.5 w-3.5" /> Submission
              </p>
              <p className="text-xs text-slate-700">{submissionExpectation}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // All other steps: compact single-line bar + Sheet trigger
  const stepContent = getStepContent({ currentStep, title, objective, lessonBlockTitles, practiceTopics });

  return (
    <Sheet>
      <div className="shrink-0 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <stepContent.Icon className="h-4 w-4 shrink-0 text-indigo-500" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
            {stepContent.label}
          </p>
          <p className="text-sm text-slate-800 truncate">{stepContent.text}</p>
        </div>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1.5 px-2 text-[11px] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Full brief</span>
          </Button>
        </SheetTrigger>
      </div>
      <FullBriefSheet
        title={title}
        objective={objective}
        acceptanceCriteria={acceptanceCriteria}
        sandboxGuidance={sandboxGuidance}
        submissionExpectation={submissionExpectation}
      />
    </Sheet>
  );
}

function getStepContent({
  currentStep,
  title,
  objective,
  lessonBlockTitles,
  practiceTopics,
}: {
  currentStep?: StepId;
  title: string;
  objective: string;
  lessonBlockTitles: string[];
  practiceTopics: string[];
}): { Icon: React.ElementType; label: string; text: string } {
  switch (currentStep) {
    case "ingest":
      return { Icon: Flag, label: "Learning goal", text: objective };
    case "micro":
      return {
        Icon: Target,
        label: "Practice goal",
        text:
          practiceTopics.length > 0
            ? `Practice: ${practiceTopics.slice(0, 3).join(" · ")}`
            : `Answer questions to confirm your understanding of ${title}`,
      };
    case "prove":
      return {
        Icon: Flag,
        label: "Teach-back goal",
        text: `Explain ${title} as if teaching a junior developer — then get evaluated`,
      };
    case "scenario":
      return { Icon: Target, label: "Simulation goal", text: objective };
    case "omni":
      return { Icon: Wrench, label: "Build goal", text: objective };
    default:
      return { Icon: Flag, label: "Task goal", text: objective };
  }
}
