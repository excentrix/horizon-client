"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { usePlan, usePlanMutations } from "@/hooks/use-plans";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useConversationMessages } from "@/hooks/use-conversations";
import { chatApi, planningApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import type { ExecutionDescriptor, ExecutionDiagnostics, PlaygroundEventPayload } from "@/types";
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
import { SimulationScenarioSurface } from "./components/SimulationScenarioSurface";
import { FlashcardSessionSurface } from "./components/FlashcardSessionSurface";
import { TaskMissionBrief } from "./components/TaskMissionBrief";
import { TaskOrientationBanner } from "./components/TaskOrientationBanner";
import { Badge } from "@/components/ui/badge";
import {
  computeSurfaceSteps,
  computeVisibleEnvs,
  recommendedEnvForSurface,
  resolveSurfaceTypeFromDescriptor,
  type StepId,
} from "./components/surface-runtime-router";
import type { SurfaceRuntimeState } from "@/types";

const ALL_STEPS_DEF: Record<StepId, { label: string; icon: React.ElementType }> = {
  ingest: { label: "Learn",          icon: BookOpen   },
  micro:  { label: "Practice",       icon: RefreshCw  },
  prove:  { label: "Teach It Back",  icon: Brain      },
  scenario:{ label: "Simulate",      icon: Brain      },
  omni:   { label: "Build",          icon: Code2      },
  verify: { label: "Submit Proof",   icon: ShieldCheck },
};


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

type PlaygroundEnvMode = OmniEnvMode;

function resolveExecutionDescriptor(
  task: {
    execution_descriptor?: ExecutionDescriptor | Record<string, unknown> | null;
    environment_requirements?: Record<string, unknown>;
    verification?: Record<string, unknown>;
  } | undefined,
): ExecutionDescriptor | null {
  if (!task) return null;
  const direct = task.execution_descriptor;
  if (direct && typeof direct === "object") return direct as ExecutionDescriptor;
  const verification = task.verification;
  if (verification && typeof verification === "object" && verification.execution_descriptor && typeof verification.execution_descriptor === "object") {
    return verification.execution_descriptor as ExecutionDescriptor;
  }
  const env = task.environment_requirements;
  if (env && typeof env === "object" && env.execution_descriptor && typeof env.execution_descriptor === "object") {
    return env.execution_descriptor as ExecutionDescriptor;
  }
  return null;
}

function parseCriteriaList(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((v) => String(v).trim()).filter((v) => v.length > 4);
  }
  if (typeof input === "string") {
    return input
      .split(/\.\s+|\n/)
      .map((v) => v.trim())
      .filter((v) => v.length > 4);
  }
  return [];
}

function cleanMissionText(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw
    .replace(/^task\s*:\s*/i, "")
    .replace(/^objective\s*:\s*/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  const [feynmanConversationId, setFeynmanConversationId] = useState<string | null>(null);
  const feynmanConvRequestRef = useRef<Record<string, boolean>>({});

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
  const [scaffoldingLevel, setScaffoldingLevel] = useState(3);
  const [challengeVerification, setChallengeVerification] = useState<Record<string, unknown> | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const lastActivityAtRef = useRef<number>(Date.now());
  const idleReportedRef = useRef<boolean>(false);

  // -- Quiz & Block Feedback State (lifted for mentor context) --
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [quizBannerDismissed, setQuizBannerDismissed] = useState(false);
  const [blockFeedback, setBlockFeedback] = useState<Record<string, "helpful" | "unhelpful" | null>>({});

  const executionDescriptor = useMemo(() => resolveExecutionDescriptor(activeTask), [activeTask]);
  const taskSurfaceType = resolveSurfaceTypeFromDescriptor(executionDescriptor);

  const steps = useMemo(() => {
    const ids = computeSurfaceSteps(activeTask, executionDescriptor);
    return ids.map((id) => ({ id, ...ALL_STEPS_DEF[id] }));
  }, [activeTask, executionDescriptor]);

  const currentStepId = steps[activeStepIndex]?.id as StepId | undefined;

  useEffect(() => {
    if (activeStepIndex >= steps.length) {
      setActiveStepIndex(Math.max(0, steps.length - 1));
    }
  }, [activeStepIndex, steps.length]);

  // -- Verification Result State --
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ArtifactVerifiedEvent | null>(null);
  const [executionDiagnostics, setExecutionDiagnostics] = useState<ExecutionDiagnostics | null>(null);
  const [efficacyMetrics, setEfficacyMetrics] = useState<{
    attempt_count: number;
    time_to_verify_seconds: number | null;
    error_pattern_count: number;
    nudge_count: number;
    self_check_pass_rate: number;
  } | null>(null);
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

  // Create Feynman conversation lazily when entering the "prove" step
  useEffect(() => {
    if (currentStepId !== "prove" || !activeTask?.id) return;
    if (feynmanConversationId) return;
    if (feynmanConvRequestRef.current[activeTask.id]) return;

    feynmanConvRequestRef.current[activeTask.id] = true;
    planningApi.getOrCreateFeynmanConversation(activeTask.id)
      .then((res) => setFeynmanConversationId(res.conversation_id))
      .catch(() => {/* non-fatal — FeynmanCheck shows loading state */});
  }, [currentStepId, activeTask?.id, feynmanConversationId]);

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
    setExecutionDiagnostics(null);
    setEfficacyMetrics(null);
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
    if (currentStepId !== "verify" || !activeTask?.id) return;
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
  }, [currentStepId, activeTask, challengeVerification, refetchPlan]);

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
    if (currentStepId !== "omni" || !activeTask?.id) return;
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
  }, [currentStepId, activeTask, starterCode, refetchPlan]);

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

  const handleScaffoldingLevelChange = async (level: number) => {
    if (!activeTask?.id) return;
    setScaffoldingLevel(level);
    setStarterCodeLoading(true);
    try {
      const res = await planningApi.generateStarterCode(activeTask.id, level);
      if (res.starter_code) setStarterCode(res.starter_code);
    } catch {
      // best-effort; keep existing code on error
    } finally {
      setStarterCodeLoading(false);
    }
  };

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

  // Load Lessons — generate if missing OR if existing content is thin/fallback.
  // generateTaskLesson only enqueues a Celery job; it does NOT return the blocks.
  // We must poll refetchPlan until isLessonThin() returns false, then clear loading.
  const lessonRequestRef = useRef<Record<string, boolean>>({});
  const lessonPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lessonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeTask?.id) return;
    const thin = isLessonThin(activeTask);
    if (!thin) return;
    if (lessonRequestRef.current[activeTask.id]) return;

    lessonRequestRef.current[activeTask.id] = true;
    setLessonLoading(true);
    planningApi.generateTaskLesson(activeTask.id, { scope: "task", force: thin && (activeTask.lesson_blocks?.length ?? 0) > 0 })
      .then(() => {
        // Enqueue succeeded — start polling every 3s until blocks arrive
        lessonPollRef.current = setInterval(() => refetchPlan(), 3000);
        // Hard timeout after 45s: stop loading even if blocks are still thin
        lessonTimeoutRef.current = setTimeout(() => {
          if (lessonPollRef.current) {
            clearInterval(lessonPollRef.current);
            lessonPollRef.current = null;
          }
          setLessonLoading(false);
        }, 45_000);
      })
      .catch(() => {
        lessonRequestRef.current[activeTask.id] = false;
        setLessonLoading(false);
      });
  }, [activeTask?.id, activeTask?.lesson_blocks, refetchPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop lesson polling as soon as the lesson blocks arrive and are no longer thin
  useEffect(() => {
    if (!lessonPollRef.current) return;
    if (!activeTask || isLessonThin(activeTask)) return;
    clearInterval(lessonPollRef.current);
    lessonPollRef.current = null;
    if (lessonTimeoutRef.current) {
      clearTimeout(lessonTimeoutRef.current);
      lessonTimeoutRef.current = null;
    }
    setLessonLoading(false);
  }, [activeTask?.lesson_blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up lesson poll on unmount
  useEffect(() => () => {
    if (lessonPollRef.current) clearInterval(lessonPollRef.current);
    if (lessonTimeoutRef.current) clearTimeout(lessonTimeoutRef.current);
  }, []);

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
      const diagnostics = proofResponse.execution_diagnostics as ExecutionDiagnostics | undefined;
      const primaryFailure = diagnostics?.dominant_failure || undefined;
      setExecutionDiagnostics(diagnostics ?? null);
      setEfficacyMetrics(proofResponse.efficacy_metrics ?? null);

      if (executionReport?.ran) {
        if (executionReport.passed) {
          void emitPlaygroundEvent({
            event_type: "test_passed",
            language: defaultLanguage,
            error_type: undefined,
            meta: { scope: "hidden", source: "submit-proof" },
          });
          telemetry.toastSuccess(
            executionReport.summary || "Auto-tests passed for your submission."
          );
        } else {
          void emitPlaygroundEvent({
            event_type: "test_failed",
            language: defaultLanguage,
            error_type: primaryFailure || "assertion",
            meta: { scope: "hidden", source: "submit-proof" },
          });
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
      setCompletedSteps(prev => new Set([...prev, activeStepIndex]));
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
      `Phase: ${steps[activeStepIndex]?.label ?? ""}`,
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
    if (currentStepId === "omni") {
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

  const emitPlaygroundEvent = useCallback(
    async (payload: PlaygroundEventPayload) => {
      if (!activeTask?.id) return;
      lastActivityAtRef.current = Date.now();
      idleReportedRef.current = false;
      try {
        const response = await planningApi.emitPlaygroundEvent(activeTask.id, {
          ...payload,
          timestamp: payload.timestamp ?? new Date().toISOString(),
        });
        if (response?.nudge?.message) {
          telemetry.toastInfo("Mentor nudge", response.nudge.message);
          // Fallback when WS delivery is delayed/missed: pull latest messages explicitly.
          refetchMentorMessages();
        }
      } catch {
        // best-effort analytics path; ignore on UI
      }
    },
    [activeTask?.id, refetchMentorMessages]
  );

  useEffect(() => {
    if (!activeTask?.id || currentStepId !== "omni") return;
    const idleLanguage = inferDefaultLanguage(activeTask);
    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivityAtRef.current;
      if (idleMs >= 10 * 60 * 1000 && !idleReportedRef.current) {
        idleReportedRef.current = true;
        void emitPlaygroundEvent({
          event_type: "idle_detected",
          language: idleLanguage,
          status: "idle_10m",
          meta: { idle_ms: idleMs },
        });
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTask, activeTask?.id, activeTask?.title, activeTask?.description, currentStepId, emitPlaygroundEvent]);

  if (!plan) return null;

  // Progress = steps genuinely completed (not just visited). The current step
  // counts as half-done so the bar always moves when switching tabs.
  const progressPercent = Math.min(
    100,
    (completedSteps.size / steps.length) * 100
  );
  const envReqs = activeTask?.environment_requirements as Record<string, unknown> | undefined;
  const recommendedEnvRaw = envReqs?.recommended_environment as PlaygroundEnvMode | undefined;
  const subjectCategory = envReqs?.subject_category as string | undefined;
  const recommendedEnv = recommendedEnvForSurface(executionDescriptor, recommendedEnvRaw);
  const defaultLanguage = inferDefaultLanguage(activeTask, recommendedEnv);
  const visibleEnvModes = computeVisibleEnvs(subjectCategory, recommendedEnv, executionDescriptor);
  const quizFailed = quizResults && (quizResults.correct / quizResults.total) < 0.6;
  const missionObjective = cleanMissionText(
    (challengeVerification?.problem_statement as string) ||
      activeTask?.verification?.problem_statement ||
      activeTask?.verification?.criteria ||
      activeTask?.check_in_question ||
      activeTask?.description ||
      "Complete this task and submit proof against the rubric.",
  );
  const missionCriteria = (() => {
    const fromChallenge = parseCriteriaList(challengeVerification?.acceptance_criteria).map(cleanMissionText).filter(Boolean);
    if (fromChallenge.length) return fromChallenge;
    const fromTaskVerification = parseCriteriaList(activeTask?.verification?.criteria).map(cleanMissionText).filter(Boolean);
    if (fromTaskVerification.length) return fromTaskVerification;
    const fromCheckin = parseCriteriaList(activeTask?.check_in_question).map(cleanMissionText).filter(Boolean);
    return fromCheckin.length ? fromCheckin : ["Demonstrate a complete, testable solution for this task."];
  })();
  const missionSandboxGuidance = (() => {
    if (taskSurfaceType === "simulation_scenario") {
      return [
        "Work in the Simulation tab and progress through round feedback.",
        "Apply mentor interventions to improve weakest rubric criteria each round.",
        "After verification or round-limit, submit final proof.",
      ];
    }
    if (taskSurfaceType === "teachback_session") {
      return [
        "Use Teach It Back to explain core ideas clearly.",
        "Fix conceptual gaps surfaced by the evaluator.",
        "Submit your final explanation/proof in Submit Proof.",
      ];
    }
    if (taskSurfaceType === "flashcard_session") {
      return [
        "Use Practice cards to improve weak topics.",
        "Reach the session review threshold before final proof.",
        "Submit your final artifact/reflection in Submit Proof.",
      ];
    }
    return [
      "Use Learn for concepts, Build for implementation, and mentor review when blocked.",
      "Validate your work against the acceptance criteria before submitting.",
      "Submit final code/artifact/explanation in Submit Proof.",
    ];
  })();
  const missionSubmissionExpectation = cleanMissionText(
    (challengeVerification?.submission_note as string) ||
      activeTask?.verification?.detailed_instructions ||
      "Provide final evidence that directly satisfies the acceptance criteria.",
  );

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

  const surfaceRuntimeState: SurfaceRuntimeState | null = (() => {
    if (currentStepId === "ingest" && lessonLoading) {
      return {
        phase: "initializing",
        readiness: "degraded",
        metadata: {
          title: "Curating lesson content",
          detail: "Horizon is tailoring your Learn tab with examples and guidance.",
        },
      };
    }
    if (currentStepId === "omni" && starterCodeLoading) {
      return {
        phase: "initializing",
        readiness: "degraded",
        metadata: {
          title: "Curating build workspace",
          detail: "Starter code and scaffolding are being prepared for this task.",
        },
      };
    }
    if (currentStepId === "verify" && challengeLoading) {
      return {
        phase: "initializing",
        readiness: "degraded",
        metadata: {
          title: "Curating verification challenge",
          detail: "Acceptance criteria and challenge checks are being generated.",
        },
      };
    }
    return null;
  })();

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-4 overflow-hidden bg-slate-50 p-4 lg:p-6">
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

      <div className="flex shrink-0 items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((step, index) => {
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
        <div className="flex items-center gap-2">
          {activeStepIndex > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changeStep(Math.max(activeStepIndex - 1, 0))}
              className="h-8 text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Previous
            </Button>
          )}

          {activeStepIndex < steps.length - 1 ? (
            <Button
              size="sm"
              onClick={() =>
                changeStep(Math.min(activeStepIndex + 1, steps.length - 1))
              }
              className="h-8 bg-slate-900 text-white hover:bg-slate-800"
            >
              Next
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <p className="text-xs font-medium text-muted-foreground">
              Complete proof to finish
            </p>
          )}

          {onRegenerateLesson && !lessonLoading && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[11px] text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
              onClick={onRegenerateLesson}
              title="Regenerate lesson with AI"
            >
              <RefreshCw className="mr-1 h-3 w-3" /> Regenerate
            </Button>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden md:grid-cols-12">
        {/* Main Workspace Area (Left 2/3) */}
        <div className="flex min-h-0 flex-col gap-4 md:col-span-8">
          {activeTask && (
            <TaskOrientationBanner
              taskId={activeTask.id}
              surfaceRationale={activeTask.surface_rationale ?? `Complete the ${activeTask.title} task using the steps below.`}
              steps={steps}
              surfaceType={taskSurfaceType ?? undefined}
            />
          )}

          <TaskMissionBrief
            title={activeTask?.title || "Task Mission"}
            objective={missionObjective}
            acceptanceCriteria={missionCriteria}
            sandboxGuidance={missionSandboxGuidance}
            submissionExpectation={missionSubmissionExpectation}
            currentStep={currentStepId}
            lessonBlockTitles={
              activeTask?.lesson_blocks
                ?.filter((b) => b.type === "concept" || b.type === "objective")
                .slice(0, 2)
                .map((b) => b.title)
                .filter((t): t is string => Boolean(t)) ?? []
            }
            practiceTopics={
              activeTask?.lesson_blocks
                ?.filter((b) => b.type === "concept")
                .slice(0, 3)
                .map((b) => b.title)
                .filter((t): t is string => Boolean(t)) ?? []
            }
          />

          {surfaceRuntimeState ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-900">
              <p className="font-semibold">{String(surfaceRuntimeState.metadata?.title || "Preparing your workspace")}</p>
              <p className="text-xs text-blue-700">{String(surfaceRuntimeState.metadata?.detail || "Please wait a moment.")}</p>
            </div>
          ) : null}

          {currentStepId === "ingest" && (
            <div className="min-h-0 flex-1 overflow-y-auto pr-2 custom-scrollbar animate-in fill-mode-both fade-in slide-in-from-bottom-4 duration-500">
              <LearningPanel
                activeTask={activeTask}
                lessonLoading={lessonLoading}
                blockFeedback={blockFeedback}
                onFeedbackChange={setBlockFeedback}
                onHintRequested={() => {
                  void emitPlaygroundEvent({
                    event_type: "hint_requested",
                    language: defaultLanguage,
                    meta: { source: "learning_panel" },
                  });
                }}
                onComplete={
                  activeStepIndex < steps.length - 1
                    ? () => changeStep(activeStepIndex + 1)
                    : undefined
                }
              />
            </div>
          )}

          {currentStepId === "micro" && (
            <div className="min-h-0 flex-1 animate-in fill-mode-both fade-in slide-in-from-bottom-4 duration-500">
              {taskSurfaceType === "flashcard_session" ? (
                <FlashcardSessionSurface
                  taskId={activeTask?.id || ""}
                  taskTitle={activeTask?.title || "Flashcard Session"}
                  executionDescriptor={executionDescriptor ?? null}
                  onComplete={() => {
                    setCompletedSteps((prev) => new Set([...prev, activeStepIndex]));
                    changeStep(activeStepIndex + 1);
                  }}
                />
              ) : (
                <MicroPracticeLab
                  taskId={activeTask?.id || ""}
                  planId={planId}
                  lessonBlocks={activeTask?.lesson_blocks || []}
                  onComplete={(results) => {
                    setQuizResults(results);
                    setQuizBannerDismissed(false);
                    setCompletedSteps(prev => new Set([...prev, activeStepIndex]));
                    changeStep(activeStepIndex + 1);
                  }}
                />
              )}
            </div>
          )}

          {currentStepId === "prove" && (
            <div className="min-h-0 flex-1 animate-in fill-mode-both fade-in slide-in-from-bottom-4 duration-500">
              <FeynmanCheck
                task={activeTask}
                feynmanConversationId={feynmanConversationId}
                onComplete={(gaps) => {
                  setFeynmanGaps(gaps);
                  setCompletedSteps(prev => new Set([...prev, activeStepIndex]));
                  changeStep(activeStepIndex + 1);
                }}
              />
            </div>
          )}

          {currentStepId === "scenario" && taskSurfaceType === "simulation_scenario" && (
            <div className="min-h-0 flex-1 overflow-y-auto pr-2 custom-scrollbar animate-in fill-mode-both fade-in slide-in-from-bottom-4 duration-500">
              <SimulationScenarioSurface
                taskId={activeTask?.id || ""}
                taskTitle={activeTask?.title || "Simulation scenario"}
                taskDescription={activeTask?.description || ""}
                executionDescriptor={executionDescriptor ?? null}
                verificationCriteria={activeTask?.verification?.criteria || activeTask?.check_in_question || ""}
              />
            </div>
          )}

          {currentStepId === "omni" && (
            <div className="flex min-h-0 flex-1 animate-in flex-col gap-3 fill-mode-both fade-in slide-in-from-bottom-4 duration-500">
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
                taskId={activeTask?.id}
                notes={workspaceNotes}
                initialCode={getInitialCode(activeTask) ?? starterCode}
                starterCodeLoading={starterCodeLoading}
                scaffoldingLevel={scaffoldingLevel}
                onScaffoldingLevelChange={handleScaffoldingLevelChange}
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
                onExecutionEvent={(event) => {
                  void emitPlaygroundEvent({
                    ...event,
                    language: event.language || defaultLanguage,
                  });
                }}
              />
            </div>
          )}

          {currentStepId === "verify" && (
            <div className="min-h-0 flex-1 animate-in fill-mode-both fade-in slide-in-from-bottom-4 duration-500">
              <VerificationEngine
                taskId={activeTask?.id || ""}
                taskTitle={activeTask?.title}
                taskType={activeTask?.task_type}
                onStepChange={(stepId) => {
                  const idx = steps.findIndex(s => s.id === stepId);
                  if (idx !== -1) changeStep(idx);
                }}
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
                executionDiagnostics={executionDiagnostics}
                efficacyMetrics={efficacyMetrics}
                onNextTask={() => router.push(`/plans/${planId}`)}
              />
            </div>
          )}
        </div>

        {/* Sidebar Space (Right 1/3) */}
        <div className="flex h-full min-h-0 flex-col md:col-span-4">
          <MentorAssistant
            messages={mentorMessages ?? []}
            isTyping={mentorTyping}
            streamingMessage={streamingMessage}
            onSendMessage={handleMentorSend}
            socketStatus={mentorSocketStatus}
            currentStep={currentStepId}
          />
        </div>
      </div>
    </div>
  );
}
