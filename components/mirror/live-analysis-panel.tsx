"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Loader2,
  FileSearch,
  Brain,
  Briefcase,
  FolderGit2,
  Target,
  Eye,
  Scan,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = "idle" | "running" | "complete";

interface StepDef {
  key: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

interface ProgressMap {
  parsing?: "running" | "complete";
  mirror?: "running" | "complete";
  ats?: "running" | "complete";
  experience?: "running" | "complete";
  projects_gaps?: "running" | "complete";
  role_matching?: "running" | "complete";
  employer_view?: "running" | "complete";
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: StepDef[] = [
  {
    key: "parsing",
    label: "Parsing resume",
    sublabel: "Extracting structured data from your PDF",
    icon: <FileSearch className="h-4 w-4" />,
  },
  {
    key: "mirror",
    label: "Building your mirror",
    sublabel: "Mapping skills, experience & readiness baseline",
    icon: <Scan className="h-4 w-4" />,
  },
  {
    key: "ats",
    label: "ATS compatibility",
    sublabel: "Scoring keywords, impact bullets & format signals",
    icon: <Brain className="h-4 w-4" />,
  },
  {
    key: "experience",
    label: "Experience review",
    sublabel: "Analysing each role for impact and relevance",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    key: "projects_gaps",
    label: "Projects & skill gaps",
    sublabel: "Rating technical depth and prioritising gaps",
    icon: <FolderGit2 className="h-4 w-4" />,
  },
  {
    key: "role_matching",
    label: "Career fit mapping",
    sublabel: "Finding your best-match roles and skill mastery",
    icon: <Target className="h-4 w-4" />,
  },
  {
    key: "employer_view",
    label: "Employer perspective",
    sublabel: "Simulating a hiring manager's first read",
    icon: <Eye className="h-4 w-4" />,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveStatus(key: string, progress: ProgressMap): StepStatus {
  const val = progress[key as keyof ProgressMap];
  if (val === "complete") return "complete";
  if (val === "running") return "running";
  return "idle";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveAnalysisPanel({ progress }: { progress?: ProgressMap }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const elapsedLabel = minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  const completedCount = STEPS.filter(
    (s) => resolveStatus(s.key, progress ?? {}) === "complete"
  ).length;

  const runningStep = STEPS.find(
    (s) => resolveStatus(s.key, progress ?? {}) === "running"
  );

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-8 md:px-0">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30">
          <Scan className="h-5 w-5 animate-pulse text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-base font-semibold">VELO is analysing your resume</h2>
        {runningStep ? (
          <p className="text-sm text-muted-foreground">{runningStep.sublabel}…</p>
        ) : (
          <p className="text-sm text-muted-foreground">Starting up…</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="overflow-hidden rounded-full bg-muted h-1.5">
        <div
          className="h-full bg-blue-500 transition-all duration-700 ease-out"
          style={{ width: `${Math.round((completedCount / STEPS.length) * 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground -mt-3">
        <span>{completedCount} of {STEPS.length} steps</span>
        <span>{elapsedLabel}</span>
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {STEPS.map((step, i) => {
          const status = resolveStatus(step.key, progress ?? {});
          return (
            <StepRow
              key={step.key}
              step={step}
              status={status}
              index={i}
            />
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-[11px] text-muted-foreground pt-2">
        This runs 5 AI models in parallel — usually under 30 seconds. The page updates automatically.
      </p>
    </div>
  );
}

// ─── Step row ─────────────────────────────────────────────────────────────────

function StepRow({
  step,
  status,
  index,
}: {
  step: StepDef;
  status: StepStatus;
  index: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300",
        status === "running" && "border border-blue-200 bg-blue-50/60 dark:border-blue-900/30 dark:bg-blue-950/20",
        status === "complete" && "opacity-60",
        status === "idle" && "opacity-35",
      )}
      style={{
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          status === "complete" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
          status === "running" && "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
          status === "idle" && "bg-muted text-muted-foreground",
        )}
      >
        {step.icon}
      </div>

      {/* Label */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-sm font-medium",
          status === "running" && "text-blue-700 dark:text-blue-300",
          status === "complete" && "text-foreground",
          status === "idle" && "text-muted-foreground",
        )}>
          {step.label}
        </p>
        {status === "running" && (
          <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 truncate">
            {step.sublabel}
          </p>
        )}
      </div>

      {/* Status indicator */}
      <div className="shrink-0">
        {status === "complete" && (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}
        {status === "running" && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        )}
        {status === "idle" && (
          <Circle className="h-4 w-4 text-muted-foreground/30" />
        )}
      </div>
    </div>
  );
}
