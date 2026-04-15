"use client";

import { BrainCircuit, ChevronDown, Lightbulb, WandSparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DailyTask, LearningPlan } from "@/types";

interface PlanV2InsightsRailProps {
  plan: LearningPlan;
  tasks: DailyTask[];
  onSwitchMentor?: (mentorId: string) => void;
  switchMentorLoading?: boolean;
}

function InsightsRailBody({
  plan,
  tasks,
  onSwitchMentor,
  switchMentorLoading,
}: PlanV2InsightsRailProps) {
  const mentorId = plan.specialized_mentor?.id ?? plan.specialized_mentor_data?.id;
  const mentorName =
    plan.specialized_mentor?.name ??
    plan.specialized_mentor_data?.name ??
    "Horizon mentor";

  const inProgress = tasks.filter((task) => task.status === "in_progress").length;
  const overdue = tasks.filter((task) => task.status === "overdue").length;
  const next = tasks.find((task) => task.status === "in_progress") ?? tasks.find((task) => task.status === "scheduled");

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-black/10 bg-[#5858CC]/10 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-[#5858CC]" />
            <p className="text-sm font-semibold text-[#414141]">Focus signals</p>
          </div>
          <Badge variant="outline" className="rounded-full border-black/15 bg-white text-[10px] uppercase">Live</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-black/10 bg-white/80 p-2">
            <p className="text-[#414141]/65">In progress</p>
            <p className="text-lg font-semibold text-[#414141]">{inProgress}</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white/80 p-2">
            <p className="text-[#414141]/65">Needs attention</p>
            <p className="text-lg font-semibold text-[#EC5B13]">{overdue}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white/90 p-3">
        <div className="mb-2 flex items-center gap-2">
          <WandSparkles className="h-4 w-4 text-[#5858CC]" />
          <p className="text-sm font-semibold text-[#414141]">Mentor recommendation</p>
        </div>
        <p className="text-xs text-[#414141]/75">
          {next
            ? `Run “${next.title}” now and close with a short reflection.`
            : "No immediate task. Ask your mentor to generate the next move."}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {next ? (
            <Button asChild size="sm" className="h-7 rounded-full bg-[#5858CC] px-3 text-xs text-white hover:bg-[#4d4db3]">
              <Link href={`/plans/${plan.id}/playground?task=${next.id}`}>Open next task</Link>
            </Button>
          ) : null}
          {mentorId ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full border-black/15 px-3 text-xs"
              onClick={() => onSwitchMentor?.(mentorId)}
              disabled={switchMentorLoading}
            >
              {switchMentorLoading ? "Switching…" : `Sync ${mentorName}`}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-[#FAEDCD]/45 p-3">
        <div className="mb-1 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[#EC5B13]" />
          <p className="text-sm font-semibold text-[#414141]">Session helper</p>
        </div>
        <p className="text-xs text-[#414141]/75">Keep sessions under 45 minutes. Complete one task, then review what changed.</p>
      </section>
    </div>
  );
}

export function PlanV2InsightsRail(props: PlanV2InsightsRailProps) {
  return (
    <>
      <aside className="hidden lg:block rounded-3xl border border-black/10 bg-white/80 p-4 shadow-[var(--shadow-1)]">
        <InsightsRailBody {...props} />
      </aside>

      <Collapsible className="lg:hidden rounded-3xl border border-black/10 bg-white/80 p-4 shadow-[var(--shadow-1)]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#414141]">Plan intelligence</h3>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 rounded-full border-black/15 px-3 text-xs">
              Expand
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-3">
          <InsightsRailBody {...props} />
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
