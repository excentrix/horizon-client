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
import { BookOpen, Code2, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";
import { generateEfficacyReportPDF } from "@/lib/generate-efficacy-report";

import { LearningPanel } from "./components/LearningPanel";
import { MicroPracticeLab, type QuizResults } from "./components/MicroPracticeLab";
import { OmniWorkspace, type EnvMode as OmniEnvMode } from "./components/OmniWorkspace";
import { VerificationEngine, type ArtifactVerifiedEvent } from "./components/VerificationEngine";
import { MentorAssistant } from "./components/MentorAssistant";

const STEPS = [
  { id: "ingest", label: "Knowledge Ingestion", icon: BookOpen },
  { id: "micro", label: "Micro-Practice", icon: RefreshCw },
  { id: "omni", label: "Omni-Environment", icon: Code2 },
  { id: "verify", label: "Neural Verification", icon: ShieldCheck },
];

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
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [stepEntryTime, setStepEntryTime] = useState<number>(Date.now());
  const [stepDurations, setStepDurations] = useState<Record<number, number>>({ 0: 0, 1: 0, 2: 0, 3: 0 });

  const changeStep = (newIndex: number) => {
    const elapsed = Date.now() - stepEntryTime;
    setStepDurations(prev => ({ ...prev, [activeStepIndex]: (prev[activeStepIndex] || 0) + elapsed }));
    setStepEntryTime(Date.now());
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

  // Generate challenge lazily when the user enters the Verification step
  const challengeRequestRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (activeStepIndex !== 3 || !activeTask?.id) return;
    // Already have rich verification data
    const v = activeTask.verification || {};
    if (challengeVerification || (v.problem_statement && String(v.problem_statement).length > 40)) return;
    if (challengeRequestRef.current[activeTask.id]) return;

    challengeRequestRef.current[activeTask.id] = true;
    setChallengeLoading(true);
    planningApi.generateChallenge(activeTask.id)
      .then((res) => setChallengeVerification(res.verification))
      .catch(() => { challengeRequestRef.current[activeTask.id] = false; })
      .finally(() => setChallengeLoading(false));
  }, [activeStepIndex, activeTask, challengeVerification]);

  // Load starter code lazily when the user enters the Omni-Environment step
  const starterCodeRequestRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (activeStepIndex !== 2 || !activeTask?.id) return;
    // Already have code from plan generation
    if (getInitialCode(activeTask)) return;
    if (starterCode !== undefined) return;
    if (starterCodeRequestRef.current[activeTask.id]) return;

    starterCodeRequestRef.current[activeTask.id] = true;
    setStarterCodeLoading(true);
    planningApi.generateStarterCode(activeTask.id)
      .then((res) => setStarterCode(res.starter_code))
      .catch(() => { starterCodeRequestRef.current[activeTask.id] = false; })
      .finally(() => setStarterCodeLoading(false));
  }, [activeStepIndex, activeTask, starterCode]);

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

      await planningApi.submitTaskProof(activeTask.id, payload);
      
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
    if (activeStepIndex === 2) {
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

  const currentStep = STEPS[activeStepIndex];
  const progressPercent = ((activeStepIndex + 1) / STEPS.length) * 100;
  const envReqs = activeTask?.environment_requirements as Record<string, unknown> | undefined;
  const recommendedEnvRaw = envReqs?.recommended_environment as EnvMode | undefined;
  const subjectCategory = envReqs?.subject_category as string | undefined;
  const recommendedEnv = recommendedEnvRaw ?? "code_runner";
  const defaultLanguage = inferDefaultLanguage(activeTask, recommendedEnv);
  const visibleEnvModes = computeVisibleEnvs(subjectCategory, recommendedEnv);
  const quizFailed = quizResults && (quizResults.correct / quizResults.total) < 0.6;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:p-6 bg-slate-50">
      {/* Header Pipeline */}
      <div className="flex shrink-0 items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{activeTask?.title || "Loading Task..."}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <currentStep.icon className="h-4 w-4 text-violet-600" />
              {currentStep.label} Phase
            </span>
            <span>·</span>
            <span>{activeTask?.estimated_duration_minutes} min estimated</span>
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

      <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden md:grid-cols-3">
        {/* Main Workspace Area (Left 2/3) */}
        <div className="flex flex-col gap-4 md:col-span-2 overflow-y-auto pr-2 custom-scrollbar">
          {activeStepIndex === 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <LearningPanel
                activeTask={activeTask}
                lessonLoading={lessonLoading}
                blockFeedback={blockFeedback}
                onFeedbackChange={setBlockFeedback}
                onRegenerateLesson={() => {
                  if (!activeTask?.id) return;
                  lessonRequestRef.current[activeTask.id] = false;
                  setLessonLoading(true);
                  planningApi.generateTaskLesson(activeTask.id, { scope: "task", force: true })
                    .then(() => refetchPlan())
                    .catch(() => {})
                    .finally(() => setLessonLoading(false));
                }}
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
                  changeStep(2);
                }}
              />
            </div>
          )}

          {activeStepIndex === 2 && (
            <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both flex flex-col gap-3">
              {quizFailed && !quizBannerDismissed && (
                <div className="shrink-0 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <span className="text-amber-600 text-sm font-medium flex-1">
                    ⚠ You scored {quizResults!.correct}/{quizResults!.total} on the practice quiz.
                    {quizResults!.weakTopics.length > 0 && (
                      <> Consider reviewing: {quizResults!.weakTopics.slice(0, 3).map((t) => `"${t}"`).join(" · ")}</>
                    )}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setActiveStepIndex(0); }}>
                      ← Review Lesson
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setQuizBannerDismissed(true)}>
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
                onSaveNotes={() => telemetry.toastSuccess("Notes saved locally.")}
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

          {activeStepIndex === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both h-full">
              <VerificationEngine
                taskId={activeTask?.id || ""}
                verificationMethod={
                  (challengeVerification?.method as string)
                  || activeTask?.verification?.method
                  || "manual_rubric"
                }
                verificationCriteria={
                  (challengeVerification?.criteria as string)
                  || activeTask?.verification?.criteria
                  || activeTask?.check_in_question
                  || ""
                }
                taskDescription={activeTask?.description || ""}
                verificationDetailedInstructions={
                  (challengeVerification?.detailed_instructions as string)
                  || activeTask?.verification?.detailed_instructions
                }
                problemStatement={
                  (challengeVerification?.problem_statement as string)
                  || undefined
                }
                acceptanceCriteria={
                  (challengeVerification?.acceptance_criteria as string[])
                  || undefined
                }
                exampleInputsOutputs={
                  (challengeVerification?.example_inputs_outputs as string)
                  || undefined
                }
                submissionNote={
                  (challengeVerification?.submission_note as string)
                  || undefined
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
                onClick={() => changeStep(Math.min(activeStepIndex + 1, STEPS.length - 1))}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                Proceed to {STEPS[activeStepIndex + 1].label} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Complete the proof above to finish.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar Space (Right 1/3) */}
        <div className="flex h-full flex-col">
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
