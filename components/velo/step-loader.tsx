"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepLoaderItem {
  key: string;
  label: string;
}

interface StepLoaderProps {
  steps: StepLoaderItem[];
  currentStep: string;
}

export function StepLoader({ steps, currentStep }: StepLoaderProps) {
  const currentIndex = Math.max(steps.findIndex((step) => step.key === currentStep), 0);
  return (
    <ol className="grid grid-cols-2 gap-y-4 md:grid-cols-3 lg:grid-cols-6">
      {steps.map((step, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;
        return (
          <li key={step.key} className="relative flex flex-col items-center gap-2 px-1 text-center">
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  "absolute left-1/2 top-4 hidden h-[2px] w-[calc(100%-1.5rem)] md:block",
                  isDone ? "bg-emerald-500" : "bg-border"
                )}
                style={{ transform: "translateX(1.5rem)" }}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium",
                isDone
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : isActive
                    ? "border-emerald-500 bg-white text-emerald-600"
                    : "border-border bg-white text-muted-foreground"
              )}
            >
              {isDone ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span
              className={cn(
                "line-clamp-1 text-xs",
                isDone || isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
