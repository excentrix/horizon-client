"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePlan, usePlanMutations } from "@/hooks/use-plans";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useConversationMessages, useConversations } from "@/hooks/use-conversations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { DailyTask } from "@/types";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { chatApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";

const defaultSteps = [
  "Review the objective and materials.",
  "Work through the main resource or example.",
  "Try the exercise and reflect.",
];

export default function PlanPlaygroundPage() {
  const params = useParams<{ planId: string }>();
  const searchParams = useSearchParams();
  const planId = params.planId;
  const { data: plan } = usePlan(planId);
  const { updateTaskStatus } = usePlanMutations(planId);
  const [focusMode, setFocusMode] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [reflection, setReflection] = useState("");
  const [effort, setEffort] = useState<number | null>(null);
  const [understanding, setUnderstanding] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [stepStates, setStepStates] = useState<Record<string, boolean[]>>({});
  const [showExample, setShowExample] = useState(false);
  const [mentorResponse, setMentorResponse] = useState<string | null>(null);
  const [mentorPrompt, setMentorPrompt] = useState<string>("");
  const [showRubric, setShowRubric] = useState(false);
  const [mentorInput, setMentorInput] = useState("");
  const { data: conversations = [] } = useConversations();
  const fallbackConversationId = useMemo(() => {
    if (!conversations.length) return undefined;
    if (plan?.title) {
      const match = conversations.find((conversation) =>
        conversation.title?.toLowerCase().includes(plan.title.toLowerCase()),
      );
      if (match) return match.id;
    }
    const sorted = [...conversations].sort((a, b) => {
      const aTime = a.last_activity ? new Date(a.last_activity).getTime() : 0;
      const bTime = b.last_activity ? new Date(b.last_activity).getTime() : 0;
      return bTime - aTime;
    });
    return sorted[0]?.id;
  }, [conversations, plan?.title]);

  const mentorConversationId =
    plan?.specialized_conversation_id ??
    plan?.conversation_id ??
    fallbackConversationId ??
    undefined;
  const mentorConversationSource = plan?.specialized_conversation_id
    ? "specialized"
    : plan?.conversation_id
      ? "plan"
      : fallbackConversationId
        ? "fallback"
        : "missing";
  const mentorConversationLabel = useMemo(() => {
    if (!mentorConversationId) return "Mentor chat";
    const match = conversations.find((conversation) => conversation.id === mentorConversationId);
    return match?.title ? `Mentor chat · ${match.title}` : "Mentor chat";
  }, [conversations, mentorConversationId]);
  const mentorConversationKey = mentorConversationId ?? null;
  const {
    messages: mentorMessages,
    refetch: refetchMentorMessages,
  } = useConversationMessages(mentorConversationKey);
  const { sendMessage, mentorTyping, streamingMessage, status: mentorSocketStatus } =
    useChatSocket(mentorConversationKey);

  const tasks = plan?.daily_tasks ?? [];
  const selectedTaskId = searchParams.get("task");

  const activeTask = useMemo(() => {
    if (selectedTaskId) {
      const found = tasks.find((task) => task.id === selectedTaskId);
      if (found) return found;
    }
    return (
      tasks.find((task) => task.status !== "completed") ??
      tasks.sort(
        (a, b) =>
          new Date(a.scheduled_date).getTime() -
          new Date(b.scheduled_date).getTime()
      )[0]
    );
  }, [selectedTaskId, tasks]);

  const milestoneCelebration = useMemo(() => {
    if (!activeTask?.milestone_id) return null;
    const milestone = plan?.milestones?.find(
      (item) => item.milestone_id === activeTask.milestone_id
    );
    if (!milestone) return null;
    const milestoneTasks = tasks.filter(
      (task) => task.milestone_id === milestone.milestone_id
    );
    const completedCount = milestoneTasks.filter(
      (task) => task.status === "completed"
    ).length;
    if (milestoneTasks.length && completedCount === milestoneTasks.length) {
      return {
        title: milestone.title,
        week: milestone.week,
      };
    }
    return null;
  }, [activeTask?.milestone_id, plan?.milestones, tasks]);

  const activeSteps = useMemo(() => {
    if (!activeTask) return defaultSteps;
    const hints = activeTask.ai_generated_hints ?? [];
    if (hints.length >= 2) {
      return hints.slice(0, 3);
    }
    return defaultSteps;
  }, [activeTask]);

  const stepState = stepStates[activeTask?.id ?? ""] ?? activeSteps.map(() => false);

  const toggleStep = (index: number) => {
    if (!activeTask) return;
    setStepStates((prev) => {
      const existing = prev[activeTask.id] ?? activeSteps.map(() => false);
      const highestCompleted = existing.findLastIndex((value) => value);
      if (index > highestCompleted + 1) {
        return prev;
      }
      const next = [...existing];
      next[index] = !next[index];
      return { ...prev, [activeTask.id]: next };
    });
  };

  const handleStartSession = () => {
    setSessionStarted(true);
    setSessionStartTime(Date.now());
    if (activeTask) {
      updateTaskStatus.mutate({
        taskId: activeTask.id,
        status: "in_progress",
      });
    }
  };

  const handleStartStep = () => {
    handleStartSession();
    if (!activeTask) return;
    setStepStates((prev) => {
      const existing = prev[activeTask.id] ?? activeSteps.map(() => false);
      if (existing[0]) return prev;
      const next = [...existing];
      next[0] = true;
      return { ...prev, [activeTask.id]: next };
    });
  };

  const handleMentorAction = (action: "explain" | "example" | "quiz") => {
    const actionMap = {
      explain: "Explain this task in simpler terms.",
      example: "Show me an example for this task.",
      quiz: "Quiz me on this task with 2 quick questions.",
    };
    const taskContext = activeTask
      ? [
          `Plan: ${plan?.title ?? "Learning plan"}`,
          `Current task: ${activeTask.title}`,
          activeTask.description ? `Task details: ${activeTask.description}` : null,
          activeTask.task_type ? `Task type: ${activeTask.task_type}` : null,
          activeTask.check_in_question
            ? `Reflection prompt: ${activeTask.check_in_question}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : `Plan: ${plan?.title ?? "Learning plan"}`;
    const prompt = `${actionMap[action]}\n\nContext:\n${taskContext}`;
    setMentorResponse(`Sent to mentor: ${prompt}`);
    setMentorPrompt(prompt);
    void handleMentorSend(prompt);
  };

  const handleMentorSend = async (overridePrompt?: string) => {
    if (!mentorConversationKey) {
      telemetry.toastError("Mentor chat is not ready for this plan yet.");
      return;
    }
    const nextMessage = (overridePrompt ?? mentorInput).trim();
    if (!nextMessage) return;
    try {
      if (mentorSocketStatus === "open") {
        await sendMessage(nextMessage);
      } else {
        await chatApi.sendMessage(mentorConversationKey, {
          content: nextMessage,
        });
        await refetchMentorMessages();
      }
      if (!overridePrompt) {
        setMentorInput("");
      }
    } catch {
      telemetry.toastError("Couldn't reach your mentor just now.");
    }
  };

  const handleCompleteTask = () => {
    if (!activeTask) return;
    const durationMinutes =
      sessionStartTime && sessionStarted
        ? Math.max(1, Math.round((Date.now() - sessionStartTime) / 60000))
        : undefined;

    updateTaskStatus.mutate({
      taskId: activeTask.id,
      status: "completed",
      actual_duration_minutes: durationMinutes,
      difficulty_rating: effort ?? undefined,
      effectiveness_rating: understanding ?? undefined,
      completion_notes: notes,
      check_in_response: reflection,
    });
    setSessionStarted(false);
    setSessionStartTime(null);
  };

  const resources = (activeTask?.online_resources ?? []) as Array<
    string | Record<string, unknown>
  >;
  const primaryResource = resources[0];
  const primaryResourceHref =
    typeof primaryResource === "string"
      ? primaryResource
      : (primaryResource as Record<string, unknown>)?.url ??
        (primaryResource as Record<string, unknown>)?.link ??
        (primaryResource as Record<string, unknown>)?.href;

  const markResource = (resourceKey: string, state: "opened" | "completed") => {
    if (!activeTask) return;
    const engagement = { ...(activeTask.resource_engagement ?? {}) };
    const existing = engagement[resourceKey] ?? {};
    engagement[resourceKey] = {
      ...existing,
      opened_at:
        state === "opened"
          ? existing.opened_at ?? new Date().toISOString()
          : existing.opened_at,
      completed_at:
        state === "completed" ? new Date().toISOString() : existing.completed_at,
    };
    updateTaskStatus.mutate({
      taskId: activeTask.id,
      resource_engagement: engagement,
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Learning Playground</h2>
          <p className="text-xs text-muted-foreground">
            Stay focused on the next step in your plan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/plans?plan=${planId}`}>Back to plan</Link>
          </Button>
          <Button variant={focusMode ? "default" : "outline"} onClick={() => setFocusMode((prev) => !prev)}>
            {focusMode ? "Exit Focus Mode" : "Focus Mode"}
          </Button>
        </div>
      </header>

      {!plan || !activeTask ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading your learning surface...
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            focusMode ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]"
          )}
        >
          {milestoneCelebration ? (
            <div className="col-span-full rounded-xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
              🎉 Milestone complete: {milestoneCelebration.title} (Week {milestoneCelebration.week})
            </div>
          ) : null}
          <main className="space-y-4">
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl">{activeTask.title}</CardTitle>
                <CardDescription>
                  {activeTask.description}
                </CardDescription>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{activeTask.task_type}</Badge>
                  <Badge variant="outline">
                    {activeTask.estimated_duration_minutes} min
                  </Badge>
                  <Badge variant="outline">
                    {format(parseISO(activeTask.scheduled_date), "EEE, MMM d")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Now Learning
                  </p>
                  <div className="mt-3 grid gap-3 rounded-lg border bg-background/70 p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        Mentor says
                      </span>
                      <p className="text-muted-foreground">
                        {activeTask.ai_generated_hints?.[0] ??
                          "Let’s make this concrete. Focus on the first section and capture two key takeaways."}
                      </p>
                    </div>
                    <div className="grid gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide">
                          Objective
                        </span>
                        <p className="mt-1 text-sm text-foreground">
                          {activeTask.description}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide">
                          Step prompt
                        </span>
                        <p className="mt-1 text-sm text-foreground">
                          {activeTask.check_in_question ??
                            "Summarize the key idea in two sentences."}
                        </p>
                      </div>
                      {resources[0] ? (
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wide">
                            First resource
                          </span>
                          <p className="mt-1 text-sm text-foreground">
                            {typeof resources[0] === "string"
                              ? resources[0]
                              : (resources[0].title as string) ||
                                (resources[0].name as string) ||
                                "Resource"}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={handleStartStep}>
                        Start this step
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowExample((prev) => !prev)}
                      >
                        {showExample ? "Hide example" : "Show an example"}
                      </Button>
                    </div>
                    {showExample ? (
                      <div className="rounded-lg border bg-background/80 p-3 text-xs text-muted-foreground">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Example
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {Array.isArray(activeTask.ai_generated_examples) &&
                          activeTask.ai_generated_examples.length
                            ? String(activeTask.ai_generated_examples[0])
                            : "Here’s a sample response outline you can follow. Keep it short, focus on two key takeaways, and end with a practical implication."}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Micro-steps
                  </p>
                  <div className="mt-2 space-y-2 text-sm">
                    {activeSteps.map((step, idx) => (
                      <label key={`${activeTask.id}-step-${idx}`} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={stepState[idx] ?? false}
                          onChange={() => toggleStep(idx)}
                          className="mt-1"
                        />
                        <span>{step}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Complete step {stepState.findLastIndex((value) => value) + 1} to unlock the next.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Try it
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Prompt: Summarize the main idea in 2 sentences, then add one real-world implication.
                    </p>
                    <Textarea
                      value={reflection}
                      onChange={(event) => setReflection(event.target.value)}
                      placeholder="Write your short answer or reflection..."
                      className="mt-2 min-h-[120px]"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowRubric((prev) => !prev)}>
                        {showRubric ? "Hide rubric" : "Check rubric"}
                      </Button>
                      <Button size="sm" variant="secondary">
                        Submit for feedback
                      </Button>
                    </div>
                    {showRubric ? (
                      <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                        <p className="text-[10px] font-semibold uppercase tracking-wide">
                          Rubric
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          <li>Clear summary of the concept (2 sentences)</li>
                          <li>Mentions one practical implication</li>
                          <li>Uses the correct terminology</li>
                        </ul>
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-lg border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Notes
                    </p>
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Capture your notes here..."
                      className="mt-2 min-h-[120px]"
                    />
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Session ritual
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={handleStartSession} disabled={sessionStarted}>
                      {sessionStarted ? "Session running" : "Start session"}
                    </Button>
                    <Button variant="outline" onClick={handleCompleteTask}>
                      Complete task
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
                    <RatingRow
                      label="Effort"
                      value={effort}
                      onChange={setEffort}
                    />
                    <RatingRow
                      label="Understanding"
                      value={understanding}
                      onChange={setUnderstanding}
                    />
                    <RatingRow
                      label="Confidence"
                      value={confidence}
                      onChange={setConfidence}
                    />
                  </div>
                  {effort && understanding && confidence ? (
                    <div className="mt-4 rounded-lg border bg-emerald-50 p-3 text-xs text-emerald-700">
                      🎉 Nice work! Your session wrap-up is recorded.
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {!focusMode ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resource Dock</CardTitle>
                  <CardDescription>Open learning material without leaving the playground.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {primaryResourceHref ? (
                    <div className="overflow-hidden rounded-lg border bg-background">
                      <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
                        <span className="truncate">
                          {typeof primaryResource === "string"
                            ? primaryResource
                            : (primaryResource as Record<string, unknown>)?.title ??
                              (primaryResource as Record<string, unknown>)?.name ??
                              "Resource"}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markResource("resource-0", "opened")}
                        >
                          Open full
                        </Button>
                      </div>
                      <iframe
                        title="resource-viewer"
                        src={String(primaryResourceHref)}
                        className="h-[260px] w-full"
                      />
                      <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                        <span>Embedded preview</span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => markResource("resource-0", "completed")}
                        >
                          Mark viewed
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {resources.length ? (
                    resources.slice(0, 5).map((resource, index) => {
                      const label =
                        typeof resource === "string"
                          ? resource
                          : (resource.title as string) ||
                            (resource.name as string) ||
                            "Resource";
                      const href =
                        typeof resource === "string"
                          ? resource
                          : (resource.url as string) ||
                            (resource.link as string) ||
                            undefined;
                      const resourceKey = `resource-${index}`;
                      const engagement = activeTask.resource_engagement?.[resourceKey];
                      return (
                        <div
                          key={`resource-${index}`}
                          className="flex flex-col gap-2 rounded-lg border bg-background px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{label}</span>
                            {href ? (
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                onClick={() => markResource(resourceKey, "opened")}
                              >
                                <a href={href} target="_blank" rel="noreferrer">
                                  Open
                                </a>
                              </Button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                Unavailable
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Button
                              size="sm"
                              variant={engagement?.completed_at ? "secondary" : "outline"}
                              onClick={() => markResource(resourceKey, "completed")}
                            >
                              {engagement?.completed_at ? "Viewed" : "Mark viewed"}
                            </Button>
                            {engagement?.opened_at ? (
                              <span>Opened</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Resources will appear here once added to the task.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </main>

          {!focusMode ? (
            <aside className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{mentorConversationLabel}</CardTitle>
                  <CardDescription>Live guidance tied to your current task.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleMentorAction("explain")}>
                      Explain
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleMentorAction("example")}>
                      Example
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleMentorAction("quiz")}>
                      Quiz me
                    </Button>
                  </div>
                  {mentorPrompt ? (
                    <p className="text-[11px] text-muted-foreground">
                      Last prompt: {mentorPrompt}
                    </p>
                  ) : null}
                  <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-lg border bg-background/70 p-3 text-xs text-muted-foreground">
                    {mentorMessages.length ? (
                      mentorMessages.slice(-8).map((msg) => (
                        <p key={msg.id} className="mb-2 last:mb-0">
                          <span className="font-semibold text-foreground">
                            {msg.sender_type === "user" ? "You:" : "Mentor:"}
                          </span>{" "}
                          {msg.content}
                        </p>
                      ))
                    ) : (
                      <p>No mentor messages yet.</p>
                    )}
                    {streamingMessage ? (
                      <p className="mt-2">
                        <span className="font-semibold text-foreground">Mentor:</span>{" "}
                        {streamingMessage}
                      </p>
                    ) : null}
                    {mentorTyping && !streamingMessage ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Mentor is typing...
                      </p>
                    ) : null}
                  </div>
                  <Input
                    value={mentorInput}
                    onChange={(event) => setMentorInput(event.target.value)}
                    placeholder="Ask your mentor..."
                    className="h-10 text-sm"
                    disabled={!mentorConversationKey}
                  />
                  <Button
                    className="w-full"
                    onClick={() => void handleMentorSend()}
                    disabled={!mentorConversationKey}
                  >
                    Send to mentor
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    {mentorConversationSource === "missing"
                      ? "Mentor chat will appear once the specialist conversation is available."
                      : mentorConversationSource === "fallback"
                        ? "Using your latest conversation for mentor replies."
                        : "Mentor replies appear here as the conversation updates."}
                  </p>
                </CardContent>
              </Card>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border bg-white px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide">{label}</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={`${label}-${score}`}
            type="button"
            onClick={() => onChange(score)}
            className={cn(
              "h-6 w-6 rounded-full border text-[10px]",
              value === score ? "border-primary bg-primary/10 text-primary" : "bg-white"
            )}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}
