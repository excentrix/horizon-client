"use client";

import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { Loader2 } from "lucide-react";

export function PlanBuildHeaderBadge() {
  const { planBuildStatus } = useMentorLoungeStore();

  if (planBuildStatus !== "queued" && planBuildStatus !== "in_progress") {
    return null;
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
      <Loader2 className="h-3 w-3 animate-spin" />
      Building Plan...
    </span>
  );
}
