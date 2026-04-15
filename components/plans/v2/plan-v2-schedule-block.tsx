"use client";

import { ChevronDown, CalendarDays } from "lucide-react";
import { format, isAfter, parseISO, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DailyTask } from "@/types";
import { sortTasksByDate } from "./utils";

interface PlanV2ScheduleBlockProps {
  tasks: DailyTask[];
}

export function PlanV2ScheduleBlock({ tasks }: PlanV2ScheduleBlockProps) {
  const today = startOfDay(new Date());
  const upcoming = sortTasksByDate(tasks).filter(
    (task) => isAfter(parseISO(task.scheduled_date), today) && task.status !== "completed",
  );

  return (
    <Collapsible className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#5858CC]" />
          <h3 className="text-sm font-semibold text-[#414141]">Schedule context</h3>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 rounded-full border-black/15 px-3 text-xs">
            Expand
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="mt-3">
        <div className="space-y-2">
          {upcoming.slice(0, 6).map((task) => (
            <div key={task.id} className="rounded-xl border border-black/10 bg-[#FAEDCD]/45 px-3 py-2">
              <p className="text-sm font-medium text-[#414141]">{task.title}</p>
              <p className="text-xs text-[#414141]/70">
                {format(parseISO(task.scheduled_date), "EEE, MMM d")} · {task.status.replace("_", " ")}
              </p>
            </div>
          ))}
          {!upcoming.length ? (
            <p className="rounded-xl border border-dashed border-black/15 bg-white/70 px-3 py-2 text-xs text-[#414141]/70">
              No upcoming schedule items.
            </p>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
