"use client";

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { usePlan, usePlanMutations } from "@/hooks/use-plans";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useConversationMessages } from "@/hooks/use-conversations";
import { chatApi, planningApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Code2, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, Brain } from "lucide-react";
import { generateEfficacyReportPDF } from "@/lib/generate-efficacy-report";

import { LearningPanel } from "./components/LearningPanel";
import { MicroPracticeLab, type QuizResults } from "./components/MicroPracticeLab";
import { FeynmanCheck } from "./components/FeynmanCheck";
import { OmniWorkspace, type EnvMode as OmniEnvMode } from "./components/OmniWorkspace";
import { VerificationEngine, type ArtifactVerifiedEvent } from "./components/VerificationEngine";
import { MentorAssistant } from "./components/MentorAssistant";
import { Badge } from "@/components/ui/badge";

type StepId = "ingest" | "micro" | "prove" | "omni" | "verify";

const ALL_STEPS_DEF: Record<StepId, { label: string; icon: React.ElementType }> = {
  ingest: { label: "Learn",          icon: BookOpen   },
  micro:  { label: "Practice",       icon: RefreshCw  },
  prove:  { label: "Teach It Back",  icon: Brain      },
  omni:   { label: "Build",          icon: Code2      },
  verify: { label: "Submit Proof",   icon: ShieldCheck },
};

/**
 * Decide which steps are relevant for a given task.
 * Rules:
 *  - "Learn"  : always, when lesson blocks exist
 *  - "Practice": when there are lesson blocks to quiz on (skip for pure code tasks with no lesson)
 *  - "Teach It Back": always — explaining is valuable regardless of task type
 *  - "Build"  : only for tasks that involve coding / STEM / project work
 *  - "Submit Proof": always
 */
function computeSteps(task: { task_type?: string; lesson_blocks?: unknown[]; environment_requirements?: unknown } | undefined): StepId[] {
  const taskType = (task?.task_type || "").toLowerCase();
  const envReqs = task?.environment_requirements as Record<string, unknown> | undefined;
  const subject  = ((envReqs?.subject_category as string) || "").toLowerCase();
  const hasLesson = (task?.lesson_blocks?.length || 0) > 0;

  const isCoding     = /coding|implement|build|develop|program|project/.test(taskType);
  const isConceptual = /reading|concept|study|research|theory|overview|understand/.test(taskType);
  const needsWorkspace = isCoding || subject === "stem";
  // Show practice quiz only when there's lesson content to quiz on
  const needsPractice = hasLesson || isConceptual;

  const steps: StepId[] = [];
  if (hasLesson || isConceptual) steps.push("ingest");
  if (needsPractice)              steps.push("micro");
                                  steps.push("prove");   // always
  if (needsWorkspace)             steps.push("omni");
                                  steps.push("verify");  // always
  return steps;
}

const getInitialCode = (task: { ai_generated_examples?: unknown[] } | undefined) => {
  const examples = task?.ai_generated_examples;
  if (!Array.isArray(examples) || examples.length === 0) {
    return undefined;
  }
  const first = examples[0];
  if (typeof first === "string") {
    return first;
  }
  if (
    typeof first === "object" &&
    first !== null &&
    "content" in first &&
    typeof (first as { content?: unknown }).content === "string"
  ) {
    return (first as { content: string }).content;
  }
  return undefined;
};

const inferDefaultLanguage = (task: { title?: string; description?: string } | undefined, recommendedEnv?: string) => {
  const text = `${task?.title ?? ""} ${task?.description ?? ""}`.toLowerCase();
  if (text.includes("python") || recommendedEnv === "colab") return "python";
  if (text.includes("javascript") || text.includes("typescript") || recommendedEnv === "web") return "javascript";
  if (text.includes("java ")) return "java";
  if (text.includes("c++") || text.includes("cpp")) return "cpp";
  if (text.includes("rust")) return "rust";
  if (text.includes("ruby")) return "ruby";
  if (text.includes("php")) return "php";
  if (text.includes("go ") || text.includes("golang")) return "go";
  return "python";
};

type EnvMode = OmniEnvMode;

const ALL_ENV_MODES: EnvMode[] = ["web", "colab", "local", "code_runner", "diagram", "canvas"];

function computeVisibleEnvs(category: string | undefined, recommended: EnvMode | undefined): EnvMode[] {
  if (!category || category === "stem") return ALL_ENV_MODES;
  const base = new Set<EnvMode>(["canvas", "diagram"]);
  if (recommended) base.add(recommended);
  if (category === "health" || category === "general") base.add("code_runner");
  return ALL_ENV_MODES.filter((m) => base.has(m));
}

export default function PlanPlaygroundPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-muted-foreground">Preparing your playground...</p>
        </div>
      </div>
    }>
      <PlaygroundFlow />
    </Suspense>
  );
}

function PlaygroundFlow() {
  const router = useRouter();
  const params = useParams<{ planId: string }>();
  const searchParams = useSearchParams();
  const planId = params.planId;
  
  const { data: plan, refetch: refetchPlan } = usePlan(planId);
  const { updateTaskStatus } = usePlanMutations(planId);
  const queryClient = useQueryClient();

  const selectedTaskId = searchParams.get("task");
  const tasks = useMemo(() => plan?.daily_tasks ?? [], [plan?.daily_tasks]);

  const activeTask = useMemo(() => {
    if (!selectedTaskId) return tasks[0];
    return tasks.find((t) => t.id === selectedTaskId) ?? tasks[0];
  }, [tasks, selectedTaskId]);


  // -- Flow State --
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  // Track which steps have been genuinely completed (not just visited)
  // Step 1 (micro) completes when quiz is submitted, step 2 (feynman) when the check passes,
  // step 3 (omni) when user advances past it, step 4 (verify) when proof is submitted.
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [stepEntryTime, setStepEntryTime] = useState<number>(Date.now());
  const [stepDurations, setStepDurations] = useState<Record<number, number>>({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
  const [feynmanGaps, setFeynmanGaps] = useState<string[]>([]);

  const changeStep = (newIndex: number) => {
    const elapsed = Date.now() - stepEntryTime;
    setStepDurations(prev => ({ ...prev, [activeStepIndex]: (prev[activeStepIndex] || 0) + elapsed }));
    setStepEntryTime(Date.now());
    // Mark the current step as completed when moving forward past it
    if (newIndex > activeStepIndex) {
      setCompletedSteps(prev => new Set([...prev, activeStepIndex]));
    }
    setActiveStepIndex(newIndex);
  };
  
  // -- Workspace State --
  const [workspaceNotes, setWorkspaceNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [diagramAttachment, setDiagramAttachment] = useState<File | null>(null);
  const [starterCode, setStarterCode] = useState<string | undefined>(undefined);
  const [starterCodeLoading, setStarterCodeLoading] = useState(false);
  const [challengeVerification, setChallengeVerification] = useState<Record<string, unknown> | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);

  // -- Quiz & Block Feedback State (lifted for mentor context) --
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [quizBannerDismissed, setQuizBannerDismissed] = useState(false);
  const [blockFeedback, setBlockFeedback] = useState<Record<string, "helpful" | "unhelpful" | null>>({});

  // Adaptive step list — recomputed when task type / lesson blocks change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const steps = useMemo(() => {
    const ids = computeSteps(activeTask);
    return ids.map((id) => ({ id, ...ALL_STEPS_DEF[id] }));
  }, [activeTask?.task_type, activeTask?.lesson_blocks, activeTask?.environment_requirements]);

  const currentStepId = steps[activeStepIndex]?.id as StepId | undefined;

  // -- Verification Result State --
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ArtifactVerifiedEvent | null>(null);
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- Chat & Mentor State --
  // Use a dedicated per-task playground conversation so playground messages don't
  // pollute the learner's main plan conversation history.
  const [playgroundConversationId, setPlaygroundConversationId] = useState<string | null>(
    activeTask?.playground_conversation_id ?? null
  );

  // Sync from task data (in case it was already set from a previous session)
  useEffect(() => {
    if (activeTask?.playground_conversation_id && !playgroundConversationId) {
      setPlaygroundConversationId(activeTask.playground_conversation_id);
    }
  }, [activeTask?.playground_conversation_id, playgroundConversationId]);

  // Create the playground conversation on first load if not yet created
  const playgroundConvRequestRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (!activeTask?.id) return;
    if (playgroundConversationId) return;
    if (playgroundConvRequestRef.current[activeTask.id]) return;

    playgroundConvRequestRef.current[activeTask.id] = true;
    planningApi.getOrCreatePlaygroundConversation(activeTask.id)
      .then((res) => setPlaygroundConversationId(res.conversation_id))
      .catch(() => {
        // Fall back to the plan's main conversation
        setPlaygroundConversationId(plan?.specialized_conversation_id ?? plan?.conversation_id ?? null);
      });
  }, [activeTask?.id, playgroundConversationId, plan]);

  const mentorConversationId = playgroundConversationId;

  const {
    messages: mentorMessages,
    refetch: refetchMentorMessages,
  } = useConversationMessages(mentorConversationId);

  const { sendMessage, mentorTyping, streamingMessage, status: mentorSocketStatus } =
    useChatSocket(mentorConversationId);

  // Initialize Session
  useEffect(() => {
    if (activeTask && !sessionStartTime) {
      setSessionStartTime(Date.now());
      if (activeTask.status === "scheduled") {
        updateTaskStatus.mutate({ taskId: activeTask.id, status: "in_progress" });
      }
    }
  }, [activeTask, sessionStartTime, updateTaskStatus]);

  useEffect(() => {
    setDiagramAttachment(null);
    setQuizResults(null);
    setQuizBannerDismissed(false);
    setBlockFeedback({});
    setIsVerifying(false);
    setVerificationResult(null);
  }, [activeTask?.id]);

  // Listen for artifact_verified WebSocket event dispatched by use-chat-socket.ts
  useEffect(() => {
    const handleArtifactVerified = (e: Event) => {
      const event = (e as CustomEvent<ArtifactVerifiedEvent>).detail;
      if (event?.task_id === activeTask?.id) {
        setVerificationResult(event);
        setIsVerifying(false);
        if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current);
      }
    };
    window.addEventListener("artifact_verified", handleArtifactVerified);
    return () => window.removeEventListener("artifact_verified", handleArtifactVerified);
  }, [activeTask?.id]);

  // Generate challenge lazily when the user enters the Verification step.
  // The endpoint returns immediately (Celery does the work); we poll refetchPlan
  // every 3s until task.verification has a real problem_set.
  const challengeRequestRef = useRef<Record<string, boolean>>({});
  const challengePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const challengeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeStepIndex !== 4 || !activeTask?.id) return;
    const v = activeTask.verification || {};
    const isComplete = Array.isArray(v.problem_set) && v.problem_set.length >= 2;
    if (challengeVerification || isComplete) return;
    if (challengeRequestRef.current[activeTask.id]) return;

    challengeRequestRef.current[activeTask.id] = true;
    setChallengeLoading(true);
    planningApi.generateChallenge(activeTask.id)
      .then((res) => {
        if (res.verification) {
          setChallengeVerification(res.verification);
          setChallengeLoading(false);
        } else {
          // Generating async — poll until task data updates
          challengePollRef.current = setInterval(() => refetchPlan(), 3000);
          // Hard timeout: stop polling after 45s and fall back to task criteria
          challengeTimeoutRef.current = setTimeout(() => {
            if (challengePollRef.current) {
              clearInterval(challengePollRef.current);
              challengePollRef.current = null;
            }
            setChallengeLoading(false);
          }, 45_000);
        }
      })
      .catch(() => {
        challengeRequestRef.current[activeTask.id] = false;
        setChallengeLoading(false);
      });
  }, [activeStepIndex, activeTask, challengeVerification, refetchPlan]);

  // Stop challenge polling when task.verification arrives
  useEffect(() => {
    const v = activeTask?.verification || {};
    const isComplete = Array.isArray(v.problem_set) && v.problem_set.length >= 2;
    if (isComplete && challengePollRef.current) {
      clearInterval(challengePollRef.current);
      challengePollRef.current = null;
      if (challengeTimeoutRef.current) {
        clearTimeout(challengeTimeoutRef.current);
        challengeTimeoutRef.current = null;
      }
      setChallengeVerification(v as unknown as Record<string, unknown>);
      setChallengeLoading(false);
    }
  }, [activeTask?.verification]);

  // Clean up challenge poll and timeout on unmount
  useEffect(() => () => {
    if (challengePollRef.current) clearInterval(challengePollRef.current);
    if (challengeTimeoutRef.current) clearTimeout(challengeTimeoutRef.current);
  }, []);

  // Load starter code lazily when the user enters the Omni-Environment step.
  // Same async pattern: endpoint enqueues, we poll until ai_generated_examples appears.
  const starterCodeRequestRef = useRef<Record<string, boolean>>({});
  const starterCodePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeStepIndex !== 3 || !activeTask?.id) return;
    if (getInitialCode(activeTask)) return;
    if (starterCode !== undefined) return;
    if (starterCodeRequestRef.current[activeTask.id]) return;

    starterCodeRequestRef.current[activeTask.id] = true;
    setStarterCodeLoading(true);
    planningApi.generateStarterCode(activeTask.id)
      .then((res) => {
        if (res.starter_code) {
          setStarterCode(res.starter_code);
          setStarterCodeLoading(false);
        } else {
          starterCodePollRef.current = setInterval(() => refetchPlan(), 3000);
        }
      })
      .catch(() => {
        starterCodeRequestRef.current[activeTask.id] = false;
        setStarterCodeLoading(false);
      });
  }, [activeStepIndex, activeTask, starterCode, refetchPlan]);

  // Stop starter code polling when ai_generated_examples arrives
  useEffect(() => {
    const code = getInitialCode(activeTask);
    if (code && starterCodePollRef.current) {
      clearInterval(starterCodePollRef.current);
      starterCodePollRef.current = null;
      setStarterCode(code);
      setStarterCodeLoading(false);
    }
  }, [activeTask?.ai_generated_examples]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up starter code poll on unmount
  useEffect(() => () => {
    if (starterCodePollRef.current) clearInterval(starterCodePollRef.current);
  }, []);

  // Detect thin/fallback lesson blocks that should be regenerated.
  // Thin = ≤3 blocks (real LLM output is 4-6) OR the only concept block content
  // is just a copy of the task description (the old static fallback pattern).
  const isLessonThin = (task: typeof activeTask): boolean => {
    const blocks = task?.lesson_blocks;
    if (!blocks || blocks.length === 0) return true;
    if (blocks.length <= 3) return true;
    const description = (task?.description || "").trim().toLowerCase().slice(0, 80);
    const conceptBlock = blocks.find((b) => b.type === "concept");
    if (
      description &&
      conceptBlock &&
      (conceptBlock.content || "").trim().toLowerCase().startsWith(description.slice(0, 60))
    ) return true;
    return false;
  };

  // Load Lessons — generate if missing OR if existing content is thin/fallback
  const lessonRequestRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeTask?.id) return;
    const thin = isLessonThin(activeTask);
    if (!thin) return;
    if (lessonRequestRef.current[activeTask.id]) return;

    lessonRequestRef.current[activeTask.id] = true;
    setLessonLoading(true);
    // force=true so the backend regenerates even if lesson_blocks is non-empty
    planningApi.generateTaskLesson(activeTask.id, { scope: "task", force: thin && (activeTask.lesson_blocks?.length ?? 0) > 0 })
      .then(() => refetchPlan())
      .catch(() => { lessonRequestRef.current[activeTask.id] = false; })
      .finally(() => setLessonLoading(false));
  }, [activeTask?.id, activeTask?.lesson_blocks, refetchPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProofSubmit = async (type: "link" | "text" | "file", content: string | File) => {
    if (!activeTask) return;
    setIsSubmitting(true);
    try {
      // Capture final duration for the current step
      const finalElapsed = Date.now() - stepEntryTime;
      const finalDurations = {
        ...stepDurations,
        [activeStepIndex]: (stepDurations[activeStepIndex] || 0) + finalElapsed
      };
      
      const metadata = { source: "playground_alpp", task_id: activeTask.id };
      const payload = type === "file" && content instanceof File
        ? (() => {
            const formData = new FormData();
            formData.append("submission_type", type);
            formData.append("content", content.name);
            formData.append("metadata", JSON.stringify({ ...metadata, file_name: content.name }));
            formData.append("file", content);
            return formData;
          })()
        : { submission_type: type, content: content as string, metadata };

      const proofResponse = await planningApi.submitTaskProof(activeTask.id, payload);
      const executionReport = proofResponse.execution_report as
        | { ran?: boolean; passed?: boolean; summary?: string }
        | undefined;

      if (executionReport?.ran) {
        if (executionReport.passed) {
          telemetry.toastSuccess(
            executionReport.summary || "Auto-tests passed for your submission."
          );
        } else {
          telemetry.toastError(
            executionReport.summary || "Auto-tests failed. Review your code and resubmit."
          );
          setIsSubmitting(false);
          return;
        }
      }
      
      const totalDurationMs = Date.now() - (sessionStartTime ?? Date.now());
      const durationMinutes = Math.max(1, Math.round(totalDurationMs / 60000));
      updateTaskStatus.mutate({
        taskId: activeTask.id,
        status: "completed",
        actual_duration_minutes: durationMinutes,
      });

      // Generate Efficacy Report PDF
      generateEfficacyReportPDF({
        task: activeTask,
        totalDurationMs,
        phaseDurationsMs: finalDurations,
        proofType: type
      });

      queryClient.invalidateQueries({ queryKey: ["portfolio-artifacts"] });
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });

      // Show verifying state — WS will fire artifact_verified when done
      setCompletedSteps(prev => new Set([...prev, 3, 4]));
      setIsVerifying(true);
      telemetry.toastSuccess("Submitted! AI is reviewing your proof…");

      // 30s fallback: redirect if WS never arrives
      verifyTimeoutRef.current = setTimeout(() => {
        setIsVerifying(false);
        telemetry.toastSuccess("Submission received. Check your portfolio for results.");
        router.push(`/plans/${planId}`);
      }, 30_000);
    } catch {
      telemetry.toastError("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildMentorContext = (): string => {
    const parts: string[] = [
      `Task: ${activeTask?.title ?? ""}`,
      `Phase: ${STEPS[activeStepIndex]?.label ?? ""}`,
    ];
    if (quizResults) {
      parts.push(`Quiz score: ${quizResults.correct}/${quizResults.total}`);
      if (quizResults.weakTopics.length)
        parts.push(`Struggling with: ${quizResults.weakTopics.slice(0, 3).join(", ")}`);
    }
    const unhelpful = Object.entries(blockFeedback)
      .filter(([, v]) => v === "unhelpful")
      .map(([k]) => k);
    if (unhelpful.length) parts.push(`Found confusing: lesson blocks ${unhelpful.join(", ")}`);
    if (feynmanGaps.length) parts.push(`Feynman gaps: ${feynmanGaps.slice(0, 3).join(", ")}`);
    if (activeStepIndex === 3) {
      const envReqs = activeTask?.environment_requirements as Record<string, unknown> | undefined;
      const env = envReqs?.recommended_environment as string | undefined;
      if (env) parts.push(`Working in: ${env} environment`);
    }
    return parts.join(". ");
  };

  const handleMentorSend = async (message: string, actionType: string = "mentor_chat") => {
    if (!mentorConversationId) return;
    const context = buildMentorContext();
    if (mentorSocketStatus === "open") {
      await sendMessage(message, {
        context,
        metadata: { skip_intelligence: true, action_type: actionType },
      });
    } else {
      await chatApi.sendMessage(mentorConversationId, {
        content: message,
        context,
        metadata: { skip_intelligence: true, action_type: actionType },
      });
      refetchMentorMessages();
    }
  };

  const handleMentorReviewRequest = (content: string) => {
    const criteria = activeTask?.check_in_question || activeTask?.description || "";
    handleMentorSend(
      `Please review this work against the task criteria: "${criteria.slice(0, 200)}"\n\nHere is what I have done so far:\n\n${content.slice(0, 2000)}`
    );
  };

  if (!plan) return null;

  // Progress = steps genuinely completed (not just visited). The current step
  // counts as half-done so the bar always moves when switching tabs.
  const progressPercent = Math.min(
    100,
    ((completedSteps.size + 0.5) / STEPS.length) * 100
  );
  const envReqs = activeTask?.environment_requirements as Record<string, unknown> | undefined;
  const recommendedEnvRaw = envReqs?.recommended_environment as EnvMode | undefined;
  const subjectCategory = envReqs?.subject_category as string | undefined;
  const recommendedEnv = recommendedEnvRaw ?? "code_runner";
  const defaultLanguage = inferDefaultLanguage(activeTask, recommendedEnv);
  const visibleEnvModes = computeVisibleEnvs(subjectCategory, recommendedEnv);
  const quizFailed = quizResults && (quizResults.correct / quizResults.total) < 0.6;

  const onRegenerateLesson = () => {
    if (!activeTask?.id) return;
    lessonRequestRef.current[activeTask.id] = false;
    setLessonLoading(true);
    planningApi
      .generateTaskLesson(activeTask.id, {
                      scope: "task",
                      force: true,
                    })
                    .then(() => refetchPlan())
                    .catch(() => {})
                    .finally(() => setLessonLoading(false));
                }

  return (
    <div className="flex h-[100vh] flex-col gap-4 p-4 lg:p-6 bg-slate-50">
    {/* <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6 bg-slate-50"> */}
      {/* Header Pipeline */}
      <div className="flex shrink-0 items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {activeTask?.title || "Loading Task..."}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            {/* <span className="flex items-center gap-1 font-medium text-slate-700">
              <currentStep.icon className="h-4 w-4 text-violet-600" />
              {currentStep.label} Phase
            </span> */}
            {/* <span>·</span> */}
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              {activeTask.task_type.replace("_", " ")}
            </Badge>
            <span>{activeTask?.estimated_duration_minutes} min</span>
          </p>
        </div>
        <div className="w-64">
          <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-slate-100" />
        </div>
      </div>

      <div className="flex items-center justify-between shrink-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((step, index) => {
            const isActive = index === activeStepIndex;
            const isDone = completedSteps.has(index);
            return (
              <button
                key={step.id}
                onClick={() => changeStep(index)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : isDone
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <step.icon className="h-3.5 w-3.5" />
                )}
                {step.label}
              </button>
            );
          })}
        </div>
        {onRegenerateLesson && !lessonLoading && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={onRegenerateLesson}
            title="Regenerate lesson with AI"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
          </Button>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden md:grid-cols-12">
        {/* Main Workspace Area (Left 2/3) */}
        <div className="flex flex-col gap-4 md:col-span-8 overflow-y-auto pr-2 custom-scrollbar">
          {activeStepIndex === 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <LearningPanel
                activeTask={activeTask}
                lessonLoading={lessonLoading}
                blockFeedback={blockFeedback}
                onFeedbackChange={setBlockFeedback}
              />
            </div>
          )}

          {activeStepIndex === 1 && (
            <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <MicroPracticeLab
                taskId={activeTask?.id || ""}
                planId={planId}
                lessonBlocks={activeTask?.lesson_blocks || []}
                onComplete={(results) => {
                  setQuizResults(results);
                  setQuizBannerDismissed(false);
                  setCompletedSteps(prev => new Set([...prev, 1]));
                  changeStep(2);
                }}
              />
            </div>
          )}

          {activeStepIndex === 2 && (
            <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <FeynmanCheck
                task={activeTask}
                messages={mentorMessages ?? []}
                streamingMessage={streamingMessage ?? ""}
                isTyping={mentorTyping}
                onSendMessage={handleMentorSend}
                onComplete={(gaps) => {
                  setFeynmanGaps(gaps);
                  setCompletedSteps(prev => new Set([...prev, 2]));
                  changeStep(3);
                }}
              />
            </div>
          )}

          {activeStepIndex === 3 && (
            <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both flex flex-col gap-3">
              {quizFailed && !quizBannerDismissed && (
                <div className="shrink-0 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <span className="text-amber-600 text-sm font-medium flex-1">
                    ⚠ You scored {quizResults!.correct}/{quizResults!.total} on
                    the practice quiz.
                    {quizResults!.weakTopics.length > 0 && (
                      <>
                        {" "}
                        Consider reviewing:{" "}
                        {quizResults!.weakTopics
                          .slice(0, 3)
                          .map((t) => `"${t}"`)
                          .join(" · ")}
                      </>
                    )}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        setActiveStepIndex(0);
                      }}
                    >
                      ← Review Lesson
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setQuizBannerDismissed(true)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}
              <OmniWorkspace
                notes={workspaceNotes}
                initialCode={getInitialCode(activeTask) ?? starterCode}
                starterCodeLoading={starterCodeLoading}
                onNotesChange={setWorkspaceNotes}
                onSaveNotes={() =>
                  telemetry.toastSuccess("Notes saved locally.")
                }
                taskTitle={activeTask?.title || "Coding Challenge"}
                initialEnvMode={recommendedEnv}
                defaultCodeLanguage={defaultLanguage}
                visibleEnvModes={visibleEnvModes}
                onDiagramExport={(file) => {
                  setDiagramAttachment(file);
                  telemetry.toastSuccess("Diagram attached for verification.");
                }}
                onRequestMentorReview={handleMentorReviewRequest}
              />
            </div>
          )}

          {activeStepIndex === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both h-full">
              <VerificationEngine
                taskId={activeTask?.id || ""}
                verificationMethod={
                  (challengeVerification?.method as string) ||
                  activeTask?.verification?.method ||
                  "manual_rubric"
                }
                verificationCriteria={
                  (challengeVerification?.criteria as string) ||
                  activeTask?.verification?.criteria ||
                  activeTask?.check_in_question ||
                  ""
                }
                taskDescription={activeTask?.description || ""}
                verificationDetailedInstructions={
                  (challengeVerification?.detailed_instructions as string) ||
                  activeTask?.verification?.detailed_instructions
                }
                problemStatement={
                  (challengeVerification?.problem_statement as string) ||
                  undefined
                }
                acceptanceCriteria={
                  (challengeVerification?.acceptance_criteria as string[]) ||
                  undefined
                }
                exampleInputsOutputs={
                  (challengeVerification?.example_inputs_outputs as string) ||
                  undefined
                }
                submissionNote={
                  (challengeVerification?.submission_note as string) ||
                  undefined
                }
                problemSet={
                  (challengeVerification?.problem_set as Array<Record<string, unknown>>) ||
                  undefined
                }
                hiddenTestIntent={
                  (challengeVerification?.hidden_test_intent as string[]) ||
                  undefined
                }
                integrityNotice={
                  (challengeVerification?.integrity_notice as string) ||
                  undefined
                }
                challengeLoading={challengeLoading}
                isSubmitting={isSubmitting}
                onProofSubmit={handleProofSubmit}
                prefilledFile={diagramAttachment}
                isVerifying={isVerifying}
                verificationResult={verificationResult}
                onNextTask={() => router.push(`/plans/${planId}`)}
              />
            </div>
          )}

          <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-200">
            <Button
              variant="ghost"
              disabled={activeStepIndex === 0}
              onClick={() => changeStep(Math.max(activeStepIndex - 1, 0))}
              className="text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous Step
            </Button>

            {activeStepIndex < STEPS.length - 1 ? (
              <Button
                onClick={() =>
                  changeStep(Math.min(activeStepIndex + 1, STEPS.length - 1))
                }
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                Proceed to {STEPS[activeStepIndex + 1].label}{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Complete the proof above to
                finish.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar Space (Right 1/3) */}
        <div className="flex h-full min-h-0 flex-col md:col-span-4">
          <MentorAssistant
            messages={mentorMessages ?? []}
            isTyping={mentorTyping}
            streamingMessage={streamingMessage}
            onSendMessage={handleMentorSend}
            socketStatus={mentorSocketStatus}
          />
        </div>
      </div>
    </div>
  );
}
