"use client";

import { BarChart3, Milestone, Route, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LearningPlan } from "@/types";

interface PlanV2ContextProps {
  plan: LearningPlan;
  onRegenerateMentor?: () => void;
  regeneratingMentor?: boolean;
}

function resolveMentorState(plan: LearningPlan) {
  const mentorPersona = plan.specialized_mentor ?? plan.specialized_mentor_data ?? null;
  const mentorStatus = plan.specialized_mentor_status ?? null;

  if (mentorStatus?.has_persona || mentorPersona) {
    return {
      label: "Active",
      summary: "Your tailored mentor is ready for this plan.",
      tone: "text-[#5858CC]",
    };
  }

  if (mentorStatus?.status === "attach_failed") {
    return {
      label: "Generated",
      summary: "The mentor persona was generated, but the mentor chat is still being attached.",
      tone: "text-[#EC5B13]",
    };
  }

  if (mentorStatus?.status === "failed") {
    return {
      label: "Unavailable",
      summary: "The mentor persona did not finish generating for this plan.",
      tone: "text-[#EC5B13]",
    };
  }

  if (mentorStatus?.status === "missing") {
    return {
      label: "Not generated",
      summary: "This plan does not have a generated mentor persona yet.",
      tone: "text-[#414141]/70",
    };
  }

  return {
    label: "Syncing",
    summary: "The mentor persona is still being prepared.",
    tone: "text-[#5858CC]",
  };
}

function mentorInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PlanV2Context({
  plan,
  onRegenerateMentor,
  regeneratingMentor = false,
}: PlanV2ContextProps) {
  const [aboutMentorOpen, setAboutMentorOpen] = useState(false);
  const planTypeLabel =
    typeof plan.plan_type === "string" && plan.plan_type.length
      ? plan.plan_type.replace("_", " ")
      : "learning plan";
  const mentorPersona = plan.specialized_mentor ?? plan.specialized_mentor_data ?? null;
  const mentorStatus = plan.specialized_mentor_status ?? null;
  const mentorState = resolveMentorState(plan);
  const mentorName =
    mentorPersona?.name ??
    mentorStatus?.mentor_name ??
    "Mentor persona unavailable";
  const mentorArchetype =
    mentorPersona?.archetype?.trim() || mentorStatus?.archetype?.trim() || null;
  const mentorTypeLabel = mentorPersona?.type === "plan_generated" ? "Specialized mentor" : "Tailored mentor";
  const mentorDescription =
    mentorPersona?.persona_preview?.trim() ||
    mentorPersona?.description?.trim() ||
    (mentorStatus?.status === "attach_failed"
      ? "A tailored mentor was generated for this plan, but the chat connection is still syncing."
      : mentorStatus?.status === "failed"
        ? "Mentor persona generation did not finish for this plan. You can still continue with the plan."
      : "A tailored mentor is being prepared for this plan.");
  const mentorProfile = mentorPersona?.mentor_profile ?? null;
  const adaptationOverlay = mentorProfile?.adaptation_overlay ?? null;
  const relevantWasterIdxs: number[] = adaptationOverlay?.relevant_waster_indices ?? [];
  const relevantWorkedIdxs: number[] = adaptationOverlay?.relevant_worked_indices ?? [];
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
            <Badge className="rounded-full border border-[#5858CC]/25 bg-white text-[10px] text-[#5858CC]">{mentorState.label}</Badge>
          </div>
          <p className="text-sm font-semibold text-[#414141]">{mentorName}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge className="rounded-full border border-black/15 bg-white text-[10px] text-[#414141]">
              {mentorTypeLabel}
            </Badge>
            {mentorArchetype ? (
              <Badge className="rounded-full border border-black/15 bg-white text-[10px] text-[#414141]">
                Archetype · {mentorArchetype}
              </Badge>
            ) : null}
            {plan.primary_domain_name ? (
              <Badge className="rounded-full border border-black/15 bg-white text-[10px] text-[#414141]">
                Domain · {plan.primary_domain_name}
              </Badge>
            ) : null}
          </div>
          <p className={`mt-1 text-[11px] font-medium ${mentorState.tone}`}>
            {mentorState.summary}
          </p>
          <p className="mt-1 text-xs text-[#414141]/70">
            {mentorDescription}
          </p>
          <div className="mt-2 flex gap-2">
            <Button asChild size="sm" className="h-7 rounded-full bg-[#5858CC] px-3 text-xs text-white hover:bg-[#4d4db3]">
              <Link href={mentorConversationId ? `/chat?conversation=${mentorConversationId}` : "/chat"}>
                Speak to mentor
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full border-black/15 px-3 text-xs"
              onClick={() => setAboutMentorOpen(true)}
            >
              About mentor
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

      <Dialog open={aboutMentorOpen} onOpenChange={setAboutMentorOpen}>
        <DialogContent className="h-[min(88vh,860px)] w-[min(96vw,1180px)] max-w-[96vw] overflow-hidden border-[#E7D8AF] bg-[#FFF9EA] p-0 shadow-2xl sm:max-w-[min(96vw,1180px)]">
          <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="min-w-0 overflow-y-auto border-b border-[#E7D8AF] bg-[linear-gradient(180deg,rgba(88,88,204,0.12),rgba(250,237,205,0.7))] p-6 xl:min-h-0 xl:border-r xl:border-b-0">
              <DialogHeader className="text-left">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#5858CC]/20 bg-white text-lg font-semibold text-[#5858CC] shadow-sm">
                    {mentorInitials(mentorName)}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-2xl text-[#2F2A24]">{mentorName}</DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-[#5E5548]">
                      {mentorProfile?.current_role || mentorDescription}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-5 flex flex-wrap gap-2">
                <Badge className="rounded-full border border-[#5858CC]/20 bg-white text-[10px] text-[#414141]">
                  Status · {mentorState.label}
                </Badge>
                <Badge className="rounded-full border border-[#5858CC]/20 bg-white text-[10px] text-[#414141]">
                  {mentorTypeLabel}
                </Badge>
                {mentorArchetype ? (
                  <Badge className="rounded-full border border-[#5858CC]/20 bg-white text-[10px] text-[#414141]">
                    Archetype · {mentorArchetype}
                  </Badge>
                ) : null}
                {plan.primary_domain_name ? (
                  <Badge className="rounded-full border border-[#5858CC]/20 bg-white text-[10px] text-[#414141]">
                    Domain · {plan.primary_domain_name}
                  </Badge>
                ) : null}
                {mentorStatus?.mentor_origin ? (
                  <Badge className="rounded-full border border-[#5858CC]/20 bg-white text-[10px] text-[#414141]">
                    Source · {mentorStatus.mentor_origin}
                  </Badge>
                ) : null}
                {mentorPersona?.formality_level ? (
                  <Badge className="rounded-full border border-[#5858CC]/20 bg-white text-[10px] text-[#414141]">
                    Tone · {mentorPersona.formality_level}
                  </Badge>
                ) : null}
              </div>

              <section className="mt-5 rounded-3xl border border-[#E7D8AF] bg-white/90 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#76684A]">Availability</p>
                <p className={`mt-2 text-sm font-medium ${mentorState.tone}`}>{mentorState.summary}</p>
                <p className="mt-3 text-sm leading-6 text-[#5E5548]">{mentorDescription}</p>
              </section>

              {(mentorProfile?.current_role || mentorProfile?.years_in_domain || mentorProfile?.age) ? (
                <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  {mentorProfile?.current_role ? (
                    <div className="rounded-2xl border border-[#E7D8AF] bg-white/85 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#8A7C5E]">Current role</p>
                      <p className="mt-2 text-sm font-medium text-[#2F2A24]">{mentorProfile.current_role}</p>
                    </div>
                  ) : null}
                  {mentorProfile?.years_in_domain ? (
                    <div className="rounded-2xl border border-[#E7D8AF] bg-white/85 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#8A7C5E]">Experience</p>
                      <p className="mt-2 text-sm font-medium text-[#2F2A24]">{mentorProfile.years_in_domain} years in domain</p>
                    </div>
                  ) : null}
                  {mentorProfile?.age ? (
                    <div className="rounded-2xl border border-[#E7D8AF] bg-white/85 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#8A7C5E]">Age</p>
                      <p className="mt-2 text-sm font-medium text-[#2F2A24]">{mentorProfile.age}</p>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {(mentorStatus?.mode || mentorStatus?.error || mentorState.label !== "Active" || mentorStatus?.allow_regenerate || mentorStatus?.mentor_origin) ? (
                <section className="mt-4 rounded-3xl border border-[#E7D8AF] bg-white/90 p-4">
                  {mentorStatus?.mentor_origin ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#8A7C5E]">Mentor source</p>
                      <p className="mt-2 text-sm text-[#2F2A24]">{mentorStatus.mentor_origin}</p>
                    </div>
                  ) : null}
                  {mentorStatus?.mode ? (
                    <div className={mentorStatus?.mentor_origin ? "mt-4 border-t border-[#E7D8AF] pt-4" : ""}>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#8A7C5E]">Generation path</p>
                      <p className="mt-2 text-sm text-[#2F2A24]">{mentorStatus.mode.replaceAll("_", " ")}</p>
                      {mentorStatus?.mentor_origin_detail ? (
                        <p className="mt-1 text-xs text-[#6B6355]">{mentorStatus.mentor_origin_detail.replaceAll("_", " ")}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {mentorStatus?.error ? (
                    <div className={mentorStatus?.mode ? "mt-4 border-t border-[#E7D8AF] pt-4" : ""}>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#C35A21]">Issue</p>
                      <p className="mt-2 text-sm leading-6 text-[#5E5548]">{mentorStatus.error}</p>
                    </div>
                  ) : null}
                  {(mentorStatus?.allow_regenerate || mentorState.label !== "Active") && onRegenerateMentor ? (
                    <div className="mt-4">
                      <Button
                        type="button"
                        onClick={onRegenerateMentor}
                        disabled={regeneratingMentor}
                        className="w-full rounded-full bg-[#5858CC] text-sm text-white hover:bg-[#4d4db3]"
                      >
                        {regeneratingMentor
                          ? "Regenerating…"
                          : mentorState.label === "Generated"
                            ? "Reconnect mentor"
                            : "Regenerate mentor"}
                      </Button>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </aside>

            <div className="min-h-0 min-w-0 overflow-y-auto p-6">
              <div className="mx-auto flex min-w-0 max-w-3xl flex-col gap-5">
                {mentorProfile?.career_entry_story ? (
                  <section className="rounded-3xl border border-[#E7D8AF] bg-white/90 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#76684A]">How they got here</p>
                    <p className="mt-3 text-[15px] leading-7 text-[#3D372D]">{mentorProfile.career_entry_story}</p>
                  </section>
                ) : null}

                {mentorProfile?.how_i_got_in ? (
                  <section className="rounded-3xl border border-[#E7D8AF] bg-white/90 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#76684A]">What helped them break in</p>
                    <p className="mt-3 text-[15px] leading-7 text-[#3D372D]">{mentorProfile.how_i_got_in}</p>
                  </section>
                ) : null}

                {(mentorProfile?.communication_texture || mentorProfile?.teaching_philosophy) ? (
                  <section className="rounded-3xl border border-[#E7D8AF] bg-white/90 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#76684A]">How they mentor</p>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      {mentorProfile.communication_texture ? (
                        <div className="rounded-2xl bg-[#FFF9EA] p-4">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[#8A7C5E]">Communication style</p>
                          <p className="mt-2 text-sm leading-6 text-[#3D372D]">{mentorProfile.communication_texture}</p>
                        </div>
                      ) : null}
                      {mentorProfile.teaching_philosophy ? (
                        <div className="rounded-2xl bg-[#FFF9EA] p-4">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[#8A7C5E]">Teaching philosophy</p>
                          <p className="mt-2 text-sm leading-6 text-[#3D372D]">{mentorProfile.teaching_philosophy}</p>
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {(adaptationOverlay?.bridging_paragraph || adaptationOverlay?.priority_gap_framing || adaptationOverlay?.tone_adjustment) ? (
                  <section className="rounded-3xl border border-[#5858CC]/20 bg-[linear-gradient(135deg,rgba(88,88,204,0.06),rgba(250,237,205,0.5))] p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[#5858CC]" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5858CC]">Tailored to you</p>
                    </div>
                    <div className="mt-4 flex flex-col gap-4">
                      {adaptationOverlay.bridging_paragraph ? (
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-[#6B6355]">Personal connection</p>
                          <p className="mt-1.5 text-sm leading-6 text-[#2F2A24] italic">&ldquo;{adaptationOverlay.bridging_paragraph}&rdquo;</p>
                        </div>
                      ) : null}
                      {adaptationOverlay.priority_gap_framing ? (
                        <div className={adaptationOverlay.bridging_paragraph ? "border-t border-[#5858CC]/10 pt-4" : ""}>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-[#6B6355]">What {mentorName} is watching for</p>
                          <p className="mt-1.5 text-sm leading-6 text-[#2F2A24]">{adaptationOverlay.priority_gap_framing}</p>
                        </div>
                      ) : null}
                      {adaptationOverlay.tone_adjustment ? (
                        <div className={(adaptationOverlay.bridging_paragraph || adaptationOverlay.priority_gap_framing) ? "border-t border-[#5858CC]/10 pt-4" : ""}>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-[#6B6355]">How they&rsquo;ll communicate with you</p>
                          <p className="mt-1.5 text-sm leading-6 text-[#2F2A24]">{adaptationOverlay.tone_adjustment}</p>
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {(mentorProfile?.what_actually_worked?.length || mentorProfile?.biggest_time_wasters?.length || mentorProfile?.current_honest_gaps?.length) ? (
                  <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                    {mentorProfile.what_actually_worked?.length ? (
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">What worked for them</p>
                        <ul className="mt-3 space-y-3 text-sm leading-6 text-[#2F2A24]">
                          {mentorProfile.what_actually_worked.map((item, i) => (
                            <li key={item} className={`flex gap-2 ${relevantWorkedIdxs.includes(i) ? "font-medium" : "opacity-75"}`}>
                              <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${relevantWorkedIdxs.includes(i) ? "bg-emerald-600" : "bg-emerald-300"}`} />
                              <span>{item}</span>
                              {relevantWorkedIdxs.includes(i) && relevantWorkedIdxs.length < (mentorProfile.what_actually_worked?.length ?? 0) ? (
                                <span className="ml-auto self-start shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">relevant</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {mentorProfile.biggest_time_wasters?.length ? (
                      <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">Time-wasters they warn against</p>
                        <ul className="mt-3 space-y-3 text-sm leading-6 text-[#2F2A24]">
                          {mentorProfile.biggest_time_wasters.map((item, i) => (
                            <li key={item} className={`flex gap-2 ${relevantWasterIdxs.includes(i) ? "font-medium" : "opacity-75"}`}>
                              <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${relevantWasterIdxs.includes(i) ? "bg-amber-600" : "bg-amber-300"}`} />
                              <span>{item}</span>
                              {relevantWasterIdxs.includes(i) && relevantWasterIdxs.length < (mentorProfile.biggest_time_wasters?.length ?? 0) ? (
                                <span className="ml-auto self-start shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">watch out</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {mentorProfile.current_honest_gaps?.length ? (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50/85 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">Their honest gaps</p>
                        <ul className="mt-3 space-y-3 text-sm leading-6 text-[#2F2A24]">
                          {mentorProfile.current_honest_gaps.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-600" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
