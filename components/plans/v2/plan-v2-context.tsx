"use client";

import { BarChart3, Milestone, Route, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { LearningPlan } from "@/types";

interface PlanV2ContextProps {
  plan: LearningPlan;
}

export function PlanV2Context({ plan }: PlanV2ContextProps) {
  const planTypeLabel =
    typeof plan.plan_type === "string" && plan.plan_type.length
      ? plan.plan_type.replace("_", " ")
      : "learning plan";
  const mentorPersona = plan.specialized_mentor ?? plan.specialized_mentor_data ?? null;
  const mentorName =
    mentorPersona?.name ??
    "Horizon mentor";
  const mentorType = mentorPersona?.type ?? "specialized";
  const mentorDescription =
    mentorPersona?.description ??
    "Assigned based on your plan goals, context, and learning pace.";
  const mentorConversationId =
    plan.specialized_conversation_id ?? plan.conversation_id ?? null;

  const milestoneCount = plan.milestones?.length ?? 0;
  const completedMilestones = (plan.milestones ?? []).filter((milestone) => {
    const relatedTasks = (plan.daily_tasks ?? []).filter(
      (task) => task.milestone_id === milestone.milestone_id,
    );
    return relatedTasks.length > 0 && relatedTasks.every((task) => task.status === "completed");
  }).length;

  return (
    <section className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-[var(--shadow-1)]">
        <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#5858CC]" />
          <h3 className="text-sm font-semibold text-[#414141]">Plan context</h3>
        </div>
        <Badge variant="outline" className="rounded-full border-black/15 bg-white text-[10px] uppercase tracking-[0.12em]">
          {planTypeLabel}
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-black/10 bg-[#FAEDCD]/45 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#414141]/65">Description</p>
          <p className="line-clamp-3 text-sm text-[#414141]/85">{plan.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge className="rounded-full border border-black/15 bg-white text-[10px] text-[#414141]">
              Difficulty · {plan.difficulty_level}
            </Badge>
            <Badge className="rounded-full border border-black/15 bg-white text-[10px] text-[#414141]">
              {plan.estimated_duration_weeks} weeks
            </Badge>
          </div>
        </article>

        <article className="rounded-2xl border border-black/10 bg-[#5858CC]/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#414141]/70">Mentor persona</p>
            <Badge className="rounded-full border border-[#5858CC]/25 bg-white text-[10px] text-[#5858CC]">Active</Badge>
          </div>
          <p className="text-sm font-semibold text-[#414141]">{mentorName}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge className="rounded-full border border-black/15 bg-white text-[10px] text-[#414141]">
              Archetype · {mentorType}
            </Badge>
            {plan.primary_domain_name ? (
              <Badge className="rounded-full border border-black/15 bg-white text-[10px] text-[#414141]">
                Domain · {plan.primary_domain_name}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-[#414141]/70">
            {mentorDescription}
          </p>
          <div className="mt-2 flex gap-2">
            <Button asChild size="sm" className="h-7 rounded-full bg-[#5858CC] px-3 text-xs text-white hover:bg-[#4d4db3]">
              <Link href={mentorConversationId ? `/chat?conversation=${mentorConversationId}` : "/chat"}>
                Speak to mentor
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-7 rounded-full border-black/15 px-3 text-xs">
              <Link href="/chat">Open lounge</Link>
            </Button>
          </div>
        </article>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-black/10 bg-white/85 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Milestone className="h-4 w-4 text-[#EC5B13]" />
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#414141]/70">Milestones</p>
            </div>
            <Badge className="rounded-full border border-black/15 bg-[#FAEDCD] text-[10px] text-[#414141]">
              {completedMilestones}/{milestoneCount || 0}
            </Badge>
          </div>
          <Progress value={milestoneCount ? (completedMilestones / milestoneCount) * 100 : 0} className="h-2 bg-[#FAEDCD]" />
          <p className="mt-2 text-xs text-[#414141]/70">
            {milestoneCount
              ? `${milestoneCount - completedMilestones} milestone(s) pending`
              : "Milestones will appear after plan refinement."}
          </p>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white/85 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#5858CC]" />
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#414141]/70">Plan progress</p>
            </div>
            <Badge className="rounded-full border border-black/15 bg-[#FAEDCD] text-[10px] text-[#414141]">
              {Math.round(plan.progress_percentage)}%
            </Badge>
          </div>
          <Progress value={plan.progress_percentage} className="h-2 bg-[#FAEDCD]" />
          <div className="mt-2 flex items-center justify-between text-xs text-[#414141]/70">
            <span>{plan.total_estimated_hours}h target</span>
            <Button asChild size="sm" variant="ghost" className="h-6 rounded-full px-2 text-xs">
              <Link href="/roadmap">
                <Route className="mr-1 h-3.5 w-3.5" />
                View roadmap stage
              </Link>
            </Button>
          </div>
        </article>
      </div>
    </section>
  );
}
