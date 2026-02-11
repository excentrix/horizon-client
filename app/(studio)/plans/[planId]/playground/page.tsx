"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePlan, usePlanMutations } from "@/hooks/use-plans";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useConversationMessages, useConversations } from "@/hooks/use-conversations";
import { usePortfolioArtifacts } from "@/hooks/use-portfolio";
import { useBrainMap, useBrainMapSync, useLearnerModel } from "@/hooks/use-intelligence";
import { useGamificationSummary } from "@/hooks/use-gamification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { DailyTask, MentorEngagementNudge, GamificationEvent } from "@/types";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { chatApi, planningApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import { ArtifactDetailModal } from "@/components/portfolio/artifact-detail-modal";

const defaultSteps = [
  "Review the objective and materials.",
  "Work through the main resource or example.",
  "Try the exercise and reflect.",
];

const masteryBaseProgress: Record<string, number> = {
  in_progress: 35,
  competent: 70,
  mastery: 100,
};

const getMasteryProgress = (level?: string, confidence?: number | null) => {
  if (!level) return 0;
  const base = masteryBaseProgress[level] ?? 30;
  const conf = confidence ? Math.min(Math.max(confidence, 0.2), 1) : 0.7;
  return Math.round(base * conf);
};

interface GeneratedActivities {
  flashcards: Array<{ id: string; question: string; answer: string }>;
  quiz: Array<{
    id: string;
    question: string;
    options: string[];
    answer_index?: number;
    rationale?: string;
  }>;
}

function getVideoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (host.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (host.includes("vimeo.com")) {
      const videoId = parsed.pathname.split("/").filter(Boolean).at(-1);
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function getAudioEmbedUrl(url: string) {
  const lower = url.toLowerCase();
  if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".m4a")) {
    return url;
  }
  return null;
}

function getResourceLabel(resource: string | Record<string, unknown> | undefined) {
  if (!resource) return "Resource";
  if (typeof resource === "string") return resource;
  const title = (resource as { title?: string }).title;
  if (typeof title === "string" && title.trim()) return title;
  const name = (resource as { name?: string }).name;
  if (typeof name === "string" && name.trim()) return name;
  return "Resource";
}

function getQuizQuestions(task: DailyTask): Array<{
  id: string;
  question: string;
  options: string[];
  answer_index?: number;
  rationale?: string;
}> {
  const payload = task.quiz_payload;
  if (payload?.questions?.length) {
    return payload.questions.map((question, index) => ({
      id: question.id ?? `q-${index}`,
      question: question.question,
      options: question.options ?? [],
      answer_index: question.answer_index,
      rationale: question.rationale,
    }));
  }
  const taskLabel = task.title ? `"${task.title}"` : "this task";
  return [
    {
      id: "q-1",
      question: `Which statement best summarizes the core idea of ${taskLabel}?`,
      options: [
        "It focuses on identifying key terms only.",
        "It explains the main concept and its application.",
        "It ignores context to keep things simple.",
        "It repeats the task without adding insights.",
      ],
      answer_index: 1,
      rationale: "Strong answers connect the concept to its real-world use.",
    },
    {
      id: "q-2",
      question: `What should you do right after ${taskLabel}?`,
      options: [
        "Skip the reflection and move on immediately.",
        "Capture one takeaway and one open question.",
        "Wait for the mentor to provide the answer.",
        "Restart the task from scratch.",
      ],
      answer_index: 1,
      rationale: "Short reflections help lock in understanding.",
    },
  ];
}

function calculateQuizScore(task: DailyTask, answers: Record<string, number>) {
  const questions = getQuizQuestions(task);
  let score = 0;
  questions.forEach((question) => {
    if (
      question.answer_index !== undefined &&
      answers[question.id] === question.answer_index
    ) {
      score += 1;
    }
  });
  return score;
}

function buildActivitiesFromExcerpt(excerpt: string, title: string): GeneratedActivities {
  const sentences = excerpt
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const keyLine = sentences[0] ?? excerpt.trim();
  const secondary = sentences[1] ?? "Identify a supporting detail.";
  const flashcards = [
    {
      id: "fc-1",
      question: `What is the main takeaway from ${title}?`,
      answer: keyLine,
    },
    {
      id: "fc-2",
      question: "Which detail supports the main idea?",
      answer: secondary,
    },
  ];
  const distractors = [
    "It focuses on background context only.",
    "It ignores practical implications.",
    "It repeats terminology without explaining it.",
  ];
  const options = shuffle([keyLine, ...distractors]).slice(0, 4);
  const quiz = [
    {
      id: "qg-1",
      question: "Which statement best captures the excerpt?",
      options,
      answer_index: options.indexOf(keyLine),
      rationale: "Choose the option that reflects the excerpt's core idea.",
    },
    {
      id: "qg-2",
      question: "What should you do next after reading this?",
      options: [
        "Summarize the key idea in your own words.",
        "Skip reflection and move on immediately.",
        "Wait for the mentor to answer for you.",
        "Ignore the resource until later.",
      ],
      answer_index: 0,
      rationale: "A short recap helps retention and reveals gaps.",
    },
  ];
  return { flashcards, quiz };
}

function shuffle<T>(items: T[]) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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

export default function PlanPlaygroundPage() {
  const params = useParams<{ planId: string }>();
  const searchParams = useSearchParams();
  const planId = params.planId;
  const { data: plan, refetch: refetchPlan } = usePlan(planId);
  const { updateTaskStatus } = usePlanMutations(planId);
  const { data: artifacts } = usePortfolioArtifacts();
  const { data: brainMap } = useBrainMap({ plan_id: plan?.id });
  const brainMapSync = useBrainMapSync();
  const { data: learnerModel } = useLearnerModel();
  const { data: gamificationSummary } = useGamificationSummary();
  const queryClient = useQueryClient();
  const safeArtifacts = useMemo(() => Array.isArray(artifacts) ? artifacts : [], [artifacts]);
  const focusConcepts = useMemo(() => brainMap?.focus_concepts ?? [], [brainMap]);
  const masteryMap = useMemo(() => brainMap?.mastery_map ?? {}, [brainMap]);
  const unlockedConcepts = useMemo(() => {
    if (!brainMap) return 0;
    return focusConcepts.filter((concept) => {
      const missing = brainMap.missing_prerequisites?.[concept.name] ?? [];
      return missing.length === 0 && Boolean(masteryMap?.[concept.name]?.level);
    }).length;
  }, [brainMap, focusConcepts, masteryMap]);
  const [focusMode, setFocusMode] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [reflection, setReflection] = useState("");
  const [tryItFeedback, setTryItFeedback] = useState<{
    score: number;
    tips: string[];
  } | null>(null);
  const [effort, setEffort] = useState<number | null>(null);
  const [understanding, setUnderstanding] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [paceOverride, setPaceOverride] = useState<"short" | "deep" | null>(null);
  const [milestoneFeedbackSent, setMilestoneFeedbackSent] = useState<Record<string, boolean>>({});
  const [stepStates, setStepStates] = useState<Record<string, boolean[]>>({});
  const [showExample, setShowExample] = useState(false);
  const [mentorPrompt, setMentorPrompt] = useState<string>("");
  const [recentGamification, setRecentGamification] = useState<GamificationEvent | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const lessonRequestRef = useRef<Record<string, boolean>>({});
  
  const selectedTaskId = searchParams.get("task");
  const tasks = useMemo(() => plan?.daily_tasks ?? [], [plan?.daily_tasks]);

  const activeTask = useMemo(() => {
    if (!selectedTaskId) return tasks[0];
    return tasks.find((t) => t.id === selectedTaskId) ?? tasks[0];
  }, [tasks, selectedTaskId]);

  useEffect(() => {
    if (!activeTask?.id) return;
    if (activeTask.lesson_blocks?.length) return;
    if (lessonRequestRef.current[activeTask.id]) return;
    lessonRequestRef.current[activeTask.id] = true;
    setLessonLoading(true);
    const scope = activeTask.milestone_id ? "milestone" : "task";
    planningApi
      .generateTaskLesson(activeTask.id, { scope })
      .then(() => refetchPlan())
      .catch(() => {
        lessonRequestRef.current[activeTask.id] = false;
      })
      .finally(() => setLessonLoading(false));
  }, [activeTask?.id, activeTask?.lesson_blocks, activeTask?.milestone_id, refetchPlan]);

  const suggestedPracticeMode = useMemo(() => {
    if (!activeTask) return "code";
    const text = `${activeTask.title} ${activeTask.description}`.toLowerCase();
    if (activeTask.task_type === "hands_on" || activeTask.task_type === "practice") {
      if (text.includes("math") || text.includes("equation") || text.includes("formula")) {
        return "scratch";
      }
      return "code";
    }
    if (text.includes("proof") || text.includes("derive") || text.includes("calculate")) {
      return "scratch";
    }
    if (text.includes("code") || text.includes("python") || text.includes("algorithm")) {
      return "code";
    }
    return "code";
  }, [activeTask]);

  const [showRubric, setShowRubric] = useState(false);
  const [showSubmission, setShowSubmission] = useState(false);
  const [submissionProof, setSubmissionProof] = useState("");
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [proofType, setProofType] = useState<"link" | "text" | "file">("link");
  const [proofLink, setProofLink] = useState("");
  const [proofText, setProofText] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [lastArtifactId, setLastArtifactId] = useState<string | null>(null);
  const [proofView, setProofView] = useState<"proof" | "artifacts">("proof");
  const [artifactFilter, setArtifactFilter] = useState<
    "all" | "task" | "verified" | "draft"
  >("all");
  const [verificationPending, setVerificationPending] = useState(false);
  const [mentorInput, setMentorInput] = useState("");
  const [practiceMode, setPracticeMode] = useState<"code" | "scratch">("code");
  const [practiceNotes, setPracticeNotes] = useState("");
  const [learningMode, setLearningMode] = useState<"video" | "practice" | "quiz">("practice");
  const [learningModeOverride, setLearningModeOverride] = useState(false);
  const [activeTab, setActiveTab] = useState<"learn" | "challenge">("learn");
  const [showTryIt, setShowTryIt] = useState(true);
  const [showPracticeLab, setShowPracticeLab] = useState(true);
  const [showResourceDock, setShowResourceDock] = useState(true);
  const [resourceViewMode, setResourceViewMode] = useState<"embedded" | "curated">("embedded");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);
  const [milestoneQuizAnswers, setMilestoneQuizAnswers] = useState<Record<string, number>>({});
  const [milestoneCheckSubmitted, setMilestoneCheckSubmitted] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<(typeof safeArtifacts)[number] | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [extraSteps, setExtraSteps] = useState<Record<string, string[]>>({});
  const [generatedActivities, setGeneratedActivities] = useState<GeneratedActivities | null>(null);
  const [engagementNudge, setEngagementNudge] = useState<MentorEngagementNudge | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeRefresh, setNudgeRefresh] = useState(0);
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
  const lastContextSentRef = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const proofRef = useRef<HTMLDivElement | null>(null);
  const lastTaskFocusRef = useRef<string | null>(null);
  const lastEventSentRef = useRef<Record<string, number>>({});
  const mentorSuggestions = [
    { id: "explain", label: "Explain" },
    { id: "example", label: "Example" },
    { id: "quiz", label: "Quiz me" },
  ] as const;
  const emitPlaygroundEvent = (eventType: string, payload: Record<string, unknown>) => {
    telemetry.info("playground_event", { eventType, ...payload });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("playground:event", {
          detail: { eventType, ...payload },
        }),
      );
    }
  };
  const mentorConversationKey = mentorConversationId ?? null;
  const {
    messages: mentorMessages,
    refetch: refetchMentorMessages,
  } = useConversationMessages(mentorConversationKey);
  const { sendMessage, mentorTyping, streamingMessage, status: mentorSocketStatus } =
    useChatSocket(mentorConversationKey);

  useEffect(() => {
    if (!chatEndRef.current) return;
    chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mentorMessages, streamingMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let timeout: number | undefined;
    const handleGamificationUpdate = (event: Event) => {
      const detail = (event as CustomEvent<GamificationEvent>).detail;
      if (!detail) return;
      setRecentGamification(detail);
      if (timeout) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setRecentGamification(null), 5000);
    };
    window.addEventListener("gamification:update", handleGamificationUpdate);
    return () => {
      if (timeout) window.clearTimeout(timeout);
      window.removeEventListener("gamification:update", handleGamificationUpdate);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { eventType?: string; [key: string]: unknown }
        | undefined;
      if (!detail?.eventType || !mentorConversationKey) return;
      const now = Date.now();
      const lastSent = lastEventSentRef.current[detail.eventType] ?? 0;
      if (now - lastSent < 800) return;
      lastEventSentRef.current[detail.eventType] = now;
      void chatApi.recordPlaygroundEvent({
        conversation_id: mentorConversationKey,
        event_type: detail.eventType,
        payload: detail,
      });
      if (
        [
          "task_focus",
          "step_toggle",
          "session_start",
          "task_complete",
          "resource_update",
        ].includes(detail.eventType)
      ) {
        setNudgeRefresh((prev) => prev + 1);
      }
    };
    window.addEventListener("playground:event", handler);
    return () => window.removeEventListener("playground:event", handler);
  }, [mentorConversationKey]);




  useEffect(() => {
    if (!mentorConversationKey) {
      setEngagementNudge(null);
      return;
    }
    let active = true;
    setNudgeLoading(true);
    chatApi
      .getEngagementNudge(mentorConversationKey)
      .then((response) => {
        if (active) {
          setEngagementNudge(response.nudge ?? null);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setNudgeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mentorConversationKey, activeTask?.id, nudgeRefresh]);

  const suggestedLearningMode = useMemo(() => {
    const learnerPrefs =
      (learnerModel?.learner_profile?.core?.preferences ?? {}) as Record<string, unknown>;
    const prefs =
      Object.keys(learnerPrefs).length > 0
        ? learnerPrefs
        : ((plan?.user_preferences_snapshot ?? {}) as Record<string, unknown>);
    const learningStyle = String(prefs.primary_learning_style ?? "").toLowerCase();
    const preferencesDetail = (prefs.preferences_detail ?? {}) as Record<string, unknown>;
    const practiceStyle = String(preferencesDetail.practice_style ?? "").toLowerCase();
    const explanationPref = String(preferencesDetail.explanation_preference ?? "").toLowerCase();

    const resources = activeTask?.online_resources ?? [];
    const resourceText = resources
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((resource: any) =>
        typeof resource === "string"
          ? resource
          : (resource.url as string) ||
            (resource.link as string) ||
            (resource.title as string) ||
            ""
      )
      .join(" ")
      .toLowerCase();

    if (resourceText.includes("youtube") || resourceText.includes("video") || learningStyle === "visual") {
      return "video";
    }
    if (practiceStyle === "project_based" || practiceStyle === "varied") {
      return "practice";
    }
    if (explanationPref === "example_based") {
      return "practice";
    }
    if (learningStyle === "auditory") {
      return "video";
    }
    return "practice";
  }, [activeTask?.online_resources, plan?.user_preferences_snapshot, learnerModel]);

  useEffect(() => {
    if (!activeTask?.id) return;
    if (lastTaskFocusRef.current === activeTask.id) return;
    lastTaskFocusRef.current = activeTask.id;
    lastContextSentRef.current = null;
    setPracticeMode(suggestedPracticeMode);
    setPracticeNotes("");
    setGeneratedActivities(null);
    if (!learningModeOverride) {
      setLearningMode(suggestedLearningMode);
    }
    emitPlaygroundEvent("task_focus", {
      planId,
      taskId: activeTask.id,
      taskTitle: activeTask.title,
    });
  }, [activeTask?.id, activeTask?.title, planId, learningModeOverride, suggestedLearningMode, suggestedPracticeMode]);

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

  const milestoneProgress = useMemo(() => {
    if (!activeTask?.milestone_id) return null;
    const milestone = plan?.milestones?.find(
      (item) => item.milestone_id === activeTask.milestone_id
    );
    if (!milestone) return null;
    const milestoneTasks = tasks.filter(
      (task) => task.milestone_id === milestone.milestone_id
    );
    if (!milestoneTasks.length) return null;
    const completedCount = milestoneTasks.filter(
      (task) => task.status === "completed"
    ).length;
    return {
      milestone,
      total: milestoneTasks.length,
      completed: completedCount,
      isComplete: completedCount === milestoneTasks.length,
    };
  }, [activeTask?.milestone_id, plan?.milestones, tasks]);

  const learningDepth = useMemo(() => {
    const prefs =
      learnerModel?.learner_profile?.core?.preferences ??
      learnerModel?.learner_profile?.sections?.preferences ??
      {};
    const raw = String(
      (prefs as Record<string, unknown>)?.detail_level ??
        (prefs as Record<string, unknown>)?.learning_depth ??
        (prefs as Record<string, unknown>)?.cognitive_load_preference ??
        ""
    ).toLowerCase();
    if (raw.includes("quick") || raw.includes("light") || raw.includes("low")) {
      return "light";
    }
    if (raw.includes("deep") || raw.includes("high") || raw.includes("detailed")) {
      return "deep";
    }
    return "standard";
  }, [learnerModel]);

  const missingPrereqs = useMemo(() => {
    if (!brainMap?.missing_prerequisites) return [];
    const focus = focusConcepts[0]?.name;
    if (!focus) return [];
    return brainMap.missing_prerequisites[focus] ?? [];
  }, [brainMap, focusConcepts]);

  const milestoneQuestions = useMemo(() => {
    if (!milestoneProgress?.isComplete) return [];
    const milestoneTasks = tasks.filter(
      (task) => task.milestone_id === milestoneProgress.milestone.milestone_id
    );
    const collected = milestoneTasks.flatMap((task) =>
      getQuizQuestions(task).map((question) => ({
        ...question,
        id: `${task.id}-${question.id}`,
      }))
    );
    return collected.slice(0, 3);
  }, [milestoneProgress, tasks]);

  const milestoneScore = useMemo(() => {
    if (!milestoneQuestions.length) return 0;
    let score = 0;
    milestoneQuestions.forEach((question) => {
      if (
        question.answer_index !== undefined &&
        milestoneQuizAnswers[question.id] === question.answer_index
      ) {
        score += 1;
      }
    });
    return score;
  }, [milestoneQuestions, milestoneQuizAnswers]);

  const handleTryItFeedback = () => {
    const text = reflection.trim();
    if (!text) {
      telemetry.toastError("Add a short response first.");
      return;
    }
    let score = 0;
    const tips: string[] = [];
    const sentenceCount = text.split(/[.!?]+/).filter(Boolean).length;
    if (sentenceCount >= 2) {
      score += 1;
    } else {
      tips.push("Aim for at least two sentences to show depth.");
    }
    if (text.length >= 120) {
      score += 1;
    } else {
      tips.push("Add one more detail or example to strengthen the answer.");
    }
    if (tryItKeywords.length) {
      const hit = tryItKeywords.some((keyword) => text.toLowerCase().includes(keyword));
      if (hit) {
        score += 1;
      } else {
        tips.push("Mention one key concept from the lesson.");
      }
    }
    setTryItFeedback({ score, tips });
  };

  useEffect(() => {
    if (learningMode === "video") {
      setShowResourceDock(true);
      setShowTryIt(true);
      setShowPracticeLab(false);
      return;
    }
    if (learningMode === "quiz") {
      setShowResourceDock(false);
      setShowTryIt(true);
      setShowPracticeLab(false);
      return;
    }
    setShowResourceDock(false);
    setShowTryIt(false);
    setShowPracticeLab(true);
  }, [learningMode]);

  const quizQuestions = useMemo(() => {
    return activeTask ? getQuizQuestions(activeTask) : [];
  }, [activeTask]);
  const quizAnsweredAll = useMemo(() => {
    if (!quizQuestions.length) return true;
    return quizQuestions.every((question) => quizAnswers[question.id] !== undefined);
  }, [quizQuestions, quizAnswers]);
  const quizScorePct = useMemo(() => {
    if (!activeTask) return null;
    if (!quizQuestions.length) return null;
    const score = calculateQuizScore(activeTask, quizAnswers);
    return score / Math.max(quizQuestions.length, 1);
  }, [activeTask, quizAnswers, quizQuestions.length]);

  const milestoneScorePct = useMemo(() => {
    if (!milestoneQuestions.length) return null;
    return milestoneScore / Math.max(milestoneQuestions.length, 1);
  }, [milestoneQuestions.length, milestoneScore]);

  const paceMode = useMemo(() => {
    if (paceOverride) return paceOverride;
    if (quizScorePct !== null) {
      if (quizScorePct <= 0.5) return "short";
      if (quizScorePct >= 0.85) return "deep";
    }
    if (milestoneScorePct !== null) {
      if (milestoneScorePct <= 0.5) return "short";
      if (milestoneScorePct >= 0.85) return "deep";
    }
    if (confidence !== null) {
      if (confidence <= 2) return "short";
      if (confidence >= 4) return "deep";
    }
    if (understanding !== null) {
      if (understanding <= 2) return "short";
      if (understanding >= 4) return "deep";
    }
    return "standard";
  }, [confidence, understanding, milestoneScorePct, paceOverride, quizScorePct]);

  const lessonBlocks = useMemo(() => {
    if (!activeTask) return [];
    if (activeTask.lesson_blocks?.length) {
      const blocks = activeTask.lesson_blocks;
      if (learningDepth === "light" || paceMode === "short") {
        return blocks.filter((block) => block.type !== "example").slice(0, 3);
      }
      if (learningDepth === "deep" || paceMode === "deep") {
        return blocks;
      }
      return blocks.slice(0, 4);
    }
    const hints = activeTask.ai_generated_hints ?? [];
    const examples = activeTask.ai_generated_examples ?? [];
    const resources = activeTask.online_resources ?? [];
    const resourceMetadata = (activeTask.resource_metadata ?? {}) as Record<
      string,
      { excerpt?: string; url?: string; title?: string; verified?: boolean }
    >;
    const firstResource = resources[0];
    const resourceId =
      typeof firstResource === "string"
        ? firstResource
        : (firstResource as Record<string, unknown>)?.url ??
          (firstResource as Record<string, unknown>)?.link ??
          undefined;
    const resourceKey = resourceId ? String(resourceId) : null;
    const resourceMeta = resourceKey ? resourceMetadata[resourceKey] : undefined;
    const excerpt = resourceMeta?.excerpt;
    const blocks = [
      {
        id: "objective",
        type: "objective",
        title: "Objective",
        content:
          activeTask.description ||
          `Understand the core idea behind ${activeTask.title}.`,
        verified: undefined,
        source_url: undefined,
      },
      {
        id: "concept",
        type: "concept",
        title: "Core concept",
        content:
          hints[0] ||
          `Focus on the primary concept in ${activeTask.title} and why it matters.`,
        verified: undefined,
        source_url: undefined,
      },
      ...(resourceId
        ? [
            {
              id: "resource",
              type: "concept",
              title: "Key resource",
              content: excerpt || String(resourceId),
              resource_id: String(resourceId),
              verified: resourceMeta?.verified,
              source_url: resourceMeta?.url,
            },
          ]
        : []),
      {
        id: "example",
        type: "example",
        title: "Worked example",
        content:
          examples.length > 0
            ? String(examples[0])
            : "Write a short example that applies the concept.",
        verified: undefined,
        source_url: undefined,
      },
      {
        id: "recap",
        type: "recap",
        title: "Quick recap",
        content:
          activeTask.check_in_question ||
          "Summarize the key idea and add one practical implication.",
        verified: undefined,
        source_url: undefined,
      },
      {
        id: "exercise",
        type: "exercise",
        title: "Try it",
        content:
          activeTask.check_in_question ||
          "Summarize the key idea and add one practical implication.",
        verified: undefined,
        source_url: undefined,
      },
    ];
    if (learningDepth === "light" || paceMode === "short") {
      return blocks.filter((block) => block.type !== "example").slice(0, 3);
    }
    if (learningDepth === "deep" || paceMode === "deep") {
      return blocks;
    }
    return blocks.slice(0, 4);
  }, [activeTask, learningDepth, paceMode]);

  const exercisePrompt = useMemo(() => {
    const block = lessonBlocks.find((item) => item.type === "exercise");
    return (
      block?.content ??
      activeTask?.check_in_question ??
      "Summarize the main idea in 2 sentences, then add one real-world implication."
    );
  }, [lessonBlocks, activeTask?.check_in_question]);

  const tryItKeywords = useMemo(() => {
    const base = [
      activeTask?.title ?? "",
      activeTask?.description ?? "",
      lessonBlocks.map((block) => block.content ?? "").join(" "),
    ]
      .join(" ")
      .toLowerCase();
    const words = base
      .split(/[^a-z0-9]+/g)
      .filter((word) => word.length > 4);
    const unique = Array.from(new Set(words));
    return unique.slice(0, 4);
  }, [activeTask?.title, activeTask?.description, lessonBlocks]);

  const activeSteps = useMemo(() => {
    if (!activeTask) return defaultSteps;
    if (lessonBlocks.length) {
      const base = lessonBlocks
        .filter((block) => block.type !== "exercise")
        .slice(0, 4)
        .map((block) => block.title || block.content || "Learning step");
      const bonus = extraSteps[activeTask.id] ?? [];
      return [...base, ...bonus];
    }
    const hints = activeTask.ai_generated_hints ?? [];
    if (hints.length >= 2) {
      return hints.slice(0, 3);
    }
    const bonus = extraSteps[activeTask.id] ?? [];
    return [...defaultSteps, ...bonus];
  }, [activeTask, lessonBlocks, extraSteps]);
  const stepState = stepStates[activeTask?.id ?? ""] ?? activeSteps.map(() => false);
  const stepsComplete = useMemo(() => stepState.every(Boolean), [stepState]);
  const learningState = useMemo(() => {
    if (activeTab === "challenge") {
      return { label: "Verifying", detail: "Complete the challenge to lock in mastery." };
    }
    if (focusMode) {
      return { label: "Focused", detail: "Everything here is tuned to the next step." };
    }
    if (stepsComplete && quizAnsweredAll) {
      return { label: "Ready", detail: "You’ve done the work. Submit when you’re ready." };
    }
    if (stepsComplete) {
      return { label: "Checkpoint", detail: "One quick check to finish this task." };
    }
    return { label: "Learning", detail: "Stay with the flow. Small steps, real progress." };
  }, [activeTab, focusMode, quizAnsweredAll, stepsComplete]);
  const canCompleteTask = stepsComplete && quizAnsweredAll;
  const gamificationProfile = gamificationSummary?.profile;

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
      emitPlaygroundEvent("step_toggle", {
        planId,
        taskId: activeTask.id,
        stepIndex: index,
        completed: next[index],
      });
      return { ...prev, [activeTask.id]: next };
    });
  };

  const handleStartSession = () => {
    setSessionStarted(true);
    setSessionStartTime(Date.now());
    emitPlaygroundEvent("session_start", {
      planId,
      taskId: activeTask?.id,
    });
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

  const handleSaveProof = async () => {
    if (!activeTask) {
      telemetry.toastError("Select a task before submitting proof.");
      return;
    }
    let content = "";
    const metadata: Record<string, unknown> = {
      source: "playground",
      task_id: activeTask.id,
    };
    if (proofType === "link") {
      content = proofLink.trim();
    } else if (proofType === "text") {
      content = proofText.trim();
      if (content) {
        metadata.word_count = content.split(/\s+/).length;
      }
    } else if (proofType === "file") {
      content = proofFile?.name ?? "";
      if (proofFile) {
        metadata.file_name = proofFile.name;
        metadata.file_size = proofFile.size;
      }
    }
    if (!content) {
      telemetry.toastError("Add a proof link, summary, or file name first.");
      return;
    }
    try {
      const payload =
        proofType === "file" && proofFile
          ? (() => {
              const formData = new FormData();
              formData.append("submission_type", proofType);
              formData.append("content", content);
              formData.append("metadata", JSON.stringify(metadata));
              formData.append("file", proofFile);
              return formData;
            })()
          : {
              submission_type: proofType,
              content,
              metadata,
            };
      const response = await planningApi.submitTaskProof(activeTask.id, payload);
      if (response.artifact_id) {
        setLastArtifactId(response.artifact_id);
        setVerificationPending(true);
      }
      queryClient.invalidateQueries({ queryKey: ["portfolio-artifacts"] });
      const summary =
        proofType === "text" ? `Proof summary:\n${content}` : `Proof ${proofType}: ${content}`;
      setNotes((prev) => (prev ? `${prev}\n\n${summary}` : summary));
      telemetry.toastSuccess("Proof saved to your task.");
      setProofLink("");
      setProofText("");
      setProofFile(null);
    } catch {
      telemetry.toastError("Unable to save proof right now.");
    }
  };

  useEffect(() => {
    if (!verificationPending || !lastArtifactId) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-artifacts"] });
    }, 5000);
    return () => clearInterval(interval);
  }, [verificationPending, lastArtifactId, queryClient]);


  const buildMentorContext = () => {
    const stepProgress = stepState.length
      ? `${stepState.filter(Boolean).length}/${stepState.length} steps complete`
      : "No steps yet";
    const resourceLabel = resources[0]
      ? typeof resources[0] === "string"
        ? resources[0]
        : (resources[0].title as string) ||
          (resources[0].name as string) ||
          "Primary resource"
      : "No resource yet";
    const noteSnippet = notes.trim()
    ? `Field notes: ${notes.trim().slice(0, 140)}`
    : "Field notes: none";
    const reflectionSnippet = reflection.trim()
      ? `Reflection: ${reflection.trim().slice(0, 140)}`
      : "Reflection: none";
    const quizScore = activeTask ? calculateQuizScore(activeTask, quizAnswers) : 0;
    const quizTotal = quizQuestions.length;
    const quizSummary =
      quizTotal > 0
        ? `Checkpoint quiz: ${quizScore}/${quizTotal} answered (${quizAnsweredAll ? "complete" : "in progress"})`
        : "Checkpoint quiz: not required";

    return [
      `Plan: ${plan?.title ?? "Learning plan"}`,
      `Current task: ${activeTask?.title ?? "Unknown task"}`,
      activeTask?.description ? `Task details: ${activeTask.description}` : null,
      activeTask?.task_type ? `Task type: ${activeTask.task_type}` : null,
      `Progress: ${stepProgress}`,
      quizSummary,
      `Resource: ${resourceLabel}`,
      noteSnippet,
      reflectionSnippet,
    ]
      .filter(Boolean)
      .join("\n");
  };
  const buildMentorContextShort = () => {
    const stepSummary = stepState.length
      ? `${stepState.filter(Boolean).length}/${stepState.length} steps complete`
      : "No steps yet";
    const quizScore = activeTask ? calculateQuizScore(activeTask, quizAnswers) : 0;
    const quizSummary = quizQuestions.length
      ? `Quiz ${quizScore}/${quizQuestions.length}`
      : "Quiz N/A";
    return `Current task: ${activeTask?.title ?? "Unknown"} · ${stepSummary} · ${quizSummary}`;
  };

  const challengeRequirement =
    activeTask?.verification?.criteria ||
    activeTask?.verification?.method ||
    (activeTask?.kpis?.length
      ? activeTask.kpis
          .map((kpi) => kpi.target || kpi.metric)
          .filter(Boolean)
          .slice(0, 2)
          .join(" · ")
      : null) ||
    "Show one concrete takeaway from this task.";

  const allowedProofTypes = useMemo(() => {
    const method = activeTask?.verification?.method?.toLowerCase() ?? "";
    if (method.includes("link") || method.includes("repo") || method.includes("url")) {
      return ["link"] as const;
    }
    if (method.includes("summary") || method.includes("reflection") || method.includes("write")) {
      return ["text"] as const;
    }
    if (method.includes("file") || method.includes("upload") || method.includes("artifact")) {
      return ["file"] as const;
    }
    return ["link", "text", "file"] as const;
  }, [activeTask?.verification?.method]);

  const proofInstruction =
    activeTask?.verification?.criteria ||
    activeTask?.verification?.method ||
    "Submit a short proof that shows you completed the task.";

  useEffect(() => {
    if (!(allowedProofTypes as readonly string[]).includes(proofType)) {
      setProofType(allowedProofTypes[0]);
    }
  }, [allowedProofTypes, proofType]);

  const planTaskIds = useMemo(() => {
    return new Set((plan?.daily_tasks ?? []).map((task) => task.id));
  }, [plan?.daily_tasks]);

  const taskMilestoneMap = useMemo(() => {
    const map = new Map<string, string>();
    (plan?.daily_tasks ?? []).forEach((task) => {
      if (task.milestone_title) {
        map.set(task.id, task.milestone_title);
      }
    });
    return map;
  }, [plan?.daily_tasks]);

  const planArtifacts = useMemo(() => {
    const planIdValue = plan?.id;
    return safeArtifacts.filter((artifact) => {
      if (artifact.source_task && planTaskIds.has(artifact.source_task)) {
        return true;
      }
      const metadataPlanId =
        (artifact.metadata as { plan_id?: string } | undefined)?.plan_id;
      return Boolean(planIdValue && metadataPlanId === planIdValue);
    });
  }, [safeArtifacts, plan?.id, planTaskIds]);

  const taskArtifacts = useMemo(() => {
    if (!activeTask) return [];
    return safeArtifacts.filter(
      (artifact) =>
        artifact.source_task === activeTask.id ||
        artifact.proof_submission === lastArtifactId,
    );
  }, [activeTask, lastArtifactId, safeArtifacts]);

  const lastArtifactStatus = useMemo(() => {
    if (!lastArtifactId) return null;
    return safeArtifacts.find((artifact) => artifact.id === lastArtifactId) ?? null;
  }, [lastArtifactId, safeArtifacts]);

  useEffect(() => {
    if (!verificationPending || !lastArtifactStatus) return;
    const status = lastArtifactStatus.verification_status;
    if (status && status !== "pending") {
      setVerificationPending(false);
    }
  }, [verificationPending, lastArtifactStatus]);

  const filteredPlanArtifacts = useMemo(() => {
    return planArtifacts.filter((artifact) => {
      const verification = artifact.verification_status;
      if (artifactFilter === "verified") {
        return verification === "verified" || verification === "human_verified";
      }
      if (artifactFilter === "draft") {
        return artifact.status === "draft" || verification === "pending";
      }
      if (artifactFilter === "task") {
        return Boolean(activeTask && artifact.source_task === activeTask.id);
      }
      return true;
    });
  }, [planArtifacts, artifactFilter, activeTask]);

  const artifactGroups = useMemo(() => {
    const groups = new Map<string, typeof filteredPlanArtifacts>();
    filteredPlanArtifacts.forEach((artifact) => {
      const milestoneTitle =
        (artifact.source_task && taskMilestoneMap.get(artifact.source_task)) ||
        "Ungrouped";
      if (!groups.has(milestoneTitle)) {
        groups.set(milestoneTitle, []);
      }
      groups.get(milestoneTitle)?.push(artifact);
    });
    return Array.from(groups.entries());
  }, [filteredPlanArtifacts, taskMilestoneMap]);

  const getArtifactStatusLabel = (artifact: (typeof safeArtifacts)[number]) => {
    const verification = artifact.verification_status;
    if (verification === "human_verified") return "verified";
    if (verification === "verified") return "verified";
    if (verification === "needs_revision") return "needs revision";
    if (verification === "rejected") return "rejected";
    if (verification === "pending") return "pending";
    return artifact.status ?? "draft";
  };

  const getArtifactBadgeVariant = (artifact: (typeof safeArtifacts)[number]) => {
    const label = getArtifactStatusLabel(artifact);
    if (label === "verified") return "default";
    if (label === "needs revision" || label === "rejected") return "destructive";
    return "secondary";
  };

  const handleMentorAction = (action: "explain" | "example" | "quiz") => {
    if (mentorSocketStatus !== "open") {
      telemetry.toastError("Mentor is reconnecting. Try again in a moment.");
      return;
    }
    const actionMap = {
      explain: "Explain this task in simpler terms.",
      example: "Show me an example for this task.",
      quiz: "Quiz me on this task with 2 quick questions.",
    };
    const prompt = actionMap[action];
    // setMentorResponse removed
    setMentorPrompt(prompt);
    void handleMentorSend(prompt, buildMentorContext(), `mentor_action_${action}`);
  };

  const handleMentorSend = async (
    overridePrompt?: string,
    contextOverride?: string,
    actionType: string = "mentor_chat",
  ) => {
    if (!mentorConversationKey) {
      telemetry.toastError("Mentor chat is not ready for this plan yet.");
      return;
    }
    const rawMessage = (overridePrompt ?? mentorInput).trim();
    if (!rawMessage) return;
    const fullContext = contextOverride ?? buildMentorContext();
    const shouldSendFullContext =
      Boolean(overridePrompt) ||
      lastContextSentRef.current !== fullContext ||
      rawMessage.length > 120;
    const contextToSend = shouldSendFullContext
      ? fullContext
      : buildMentorContextShort();
    try {
      if (shouldSendFullContext) {
        lastContextSentRef.current = fullContext;
      }
      if (mentorSocketStatus === "open") {
        await sendMessage(rawMessage, {
          context: contextToSend,
          metadata: {
            skip_intelligence: true,
            action_type: actionType,
          },
        });
      } else {
        await chatApi.sendMessage(mentorConversationKey, {
          content: rawMessage,
          context: contextToSend,
          metadata: {
            skip_intelligence: true,
            action_type: actionType,
          },
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
    if (!canCompleteTask) {
      telemetry.toastInfo(
        "Finish the learning steps",
        "Complete the steps and answer the checkpoint before finishing."
      );
      return;
    }
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
      milestone_feedback:
        milestoneProgress?.isComplete && activeTask.milestone_id
          ? {
              milestone_id: activeTask.milestone_id,
              effort,
              understanding,
              confidence,
              reflection: reflection.trim() || null,
            }
          : undefined,
      quiz_response: {
        answers: quizAnswers,
        score: calculateQuizScore(activeTask, quizAnswers),
        completed_at: new Date().toISOString(),
      },
    });
    emitPlaygroundEvent("task_complete", {
      planId,
      taskId: activeTask.id,
      durationMinutes,
      effort,
      understanding,
      confidence,
    });
    setSessionStarted(false);
    setSessionStartTime(null);
    if (milestoneProgress?.isComplete && activeTask.milestone_id) {
      setMilestoneFeedbackSent((prev) => ({
        ...prev,
        [activeTask.milestone_id as string]: true,
      }));
    }
  };

  const resources = (activeTask?.online_resources ?? []) as Array<
    string | Record<string, unknown>
  >;
  const resourceMetadata = (activeTask?.resource_metadata ?? {}) as Record<
    string,
    {
      url?: string;
      title?: string;
      content_type?: string;
      excerpt?: string | null;
      verified?: boolean;
      status?: string;
    }
  >;
  const primaryResource = resources[0];
  const primaryResourceHref =
    typeof primaryResource === "string"
      ? primaryResource
      : (primaryResource as Record<string, unknown>)?.url ??
        (primaryResource as Record<string, unknown>)?.link ??
        (primaryResource as Record<string, unknown>)?.href;
  const primaryVideoEmbed = primaryResourceHref
    ? getVideoEmbedUrl(String(primaryResourceHref))
    : null;
  const primaryAudioEmbed = primaryResourceHref
    ? getAudioEmbedUrl(String(primaryResourceHref))
    : null;

  const summaryCards = useMemo(() => {
    if (lessonBlocks.length) {
      return lessonBlocks.slice(0, 3).map((block, index) => ({
        id: block.id ?? `${block.type}-${index}`,
        title: block.title ?? block.type ?? `Insight ${index + 1}`,
        content: block.content ?? "",
      }));
    }
    if (!activeTask) return [];
    const fallback = [activeTask.description, exercisePrompt, activeTask.check_in_question]
      .filter(Boolean)
      .slice(0, 3) as string[];
    return fallback.map((content, index) => ({
      id: `fallback-${index}`,
      title: index === 0 ? "Task focus" : index === 1 ? "Try it prompt" : "Reflection cue",
      content,
    }));
  }, [lessonBlocks, activeTask, exercisePrompt]);

  const flashcardDeck = useMemo(() => {
    if (generatedActivities?.flashcards?.length) {
      return generatedActivities.flashcards.map((card) => ({
        id: card.id,
        question: card.question,
        answer: card.answer,
      }));
    }
    return lessonBlocks.slice(0, 3).map((block, index) => ({
      id: block.id ?? `flash-${index}`,
      question: block.title
        ? `Explain: ${block.title}`
        : `Key idea #${index + 1}`,
      answer: block.content ?? "Summarize this concept in your own words.",
    }));
  }, [generatedActivities, lessonBlocks]);

  const [activeFlashcard, setActiveFlashcard] = useState(0);
  const [showFlashAnswer, setShowFlashAnswer] = useState(false);

  useEffect(() => {
    setActiveFlashcard(0);
    setShowFlashAnswer(false);
  }, [flashcardDeck.length]);

  useEffect(() => {
    if (!activeTask) return;
    if (primaryVideoEmbed) {
      setLearningMode("video");
      return;
    }
    if (activeTask.task_type === "assessment") {
      setLearningMode("quiz");
      return;
    }
    setLearningMode("practice");
  }, [activeTask, primaryVideoEmbed]);

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
    emitPlaygroundEvent("resource_update", {
      planId,
      taskId: activeTask.id,
      resourceKey,
      state,
    });
  };

  const handleGenerateActivities = () => {
    const excerpt = resourceMetadata["resource-0"]?.excerpt;
    if (!excerpt) {
      telemetry.toastError("No resource excerpt available yet.");
      return;
    }
    const activities = buildActivitiesFromExcerpt(
      excerpt,
      getResourceLabel(primaryResource),
    );
    setGeneratedActivities(activities);
  };

  const handleSaveQuiz = () => {
    if (!generatedActivities || !activeTask) return;
    updateTaskStatus.mutate({
      taskId: activeTask.id,
      quiz_payload: { questions: generatedActivities.quiz },
    });
    telemetry.toastInfo("Quiz saved to this task");
  };

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] bg-[radial-gradient(1200px_600px_at_0%_0%,rgba(56,189,248,0.08),transparent),radial-gradient(900px_500px_at_100%_10%,rgba(249,115,22,0.08),transparent)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-white/85 px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
              Learning Playground
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">Stay in flow</h2>
              <span className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm">
                {learningState.label}
              </span>
              <span className="text-xs text-muted-foreground">{learningState.detail}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-2xl border bg-white/85 px-3 py-2 text-xs shadow-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Level {gamificationProfile?.level ?? 1}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {gamificationProfile?.total_points ?? 0} XP
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="min-w-[120px]">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Progress
                </p>
                <div className="mt-1 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                    style={{
                      width: `${Math.min(
                        100,
                        gamificationProfile?.level_progress_percentage ?? 0,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Streak
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {gamificationProfile?.current_streak ?? 0} days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="mr-2 flex items-center gap-1 rounded-full border bg-white/90 px-1 py-1 text-xs shadow-sm">
                <Button
                  size="sm"
                  variant={activeTab === "learn" ? "default" : "ghost"}
                  onClick={() => setActiveTab("learn")}
                  className="rounded-l-2xl rounded-r-md active:bg-black active:text-white"
                >
                  Learn
                </Button>
                <Button
                  size="sm"
                  variant={activeTab === "challenge" ? "default" : "ghost"}
                  onClick={() => setActiveTab("challenge")}
                  className="rounded-r-2xl rounded-l-md active:bg-black active:text-white"
                >
                  Challenge
                </Button>
              </div>
              <Button variant="outline" asChild>
                <Link href={`/plans?plan=${planId}`}>Back to plan</Link>
              </Button>
              <Button
                variant={focusMode ? "default" : "outline"}
                onClick={() => setFocusMode((prev) => !prev)}
              >
                {focusMode ? "Exit Focus Mode" : "Focus Mode"}
              </Button>
            </div>
          </div>
        </header>

        {recentGamification ? (
          <div className="rounded-2xl border bg-white/90 px-4 py-3 text-sm shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Achievement unlocked
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {recentGamification.event_type === "points_earned"
                    ? `+${recentGamification.points} XP`
                    : recentGamification.event_type === "level_up"
                      ? `Level ${recentGamification.new_level}`
                      : recentGamification.event_type === "badge_earned"
                        ? recentGamification.badge_name ?? "New badge"
                        : `${recentGamification.current_streak ?? 0} day streak`}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {recentGamification.reason ??
                  recentGamification.badge_description ??
                  "Keep up the momentum."}
              </p>
            </div>
          </div>
        ) : null}

        {!plan || !activeTask ? (
          <Card className="border-dashed bg-background/70">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Loading your learning surface...
            </CardContent>
          </Card>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              focusMode || activeTab === "challenge"
                ? "grid-cols-1"
                : "lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]"
            )}
          >
          {milestoneCelebration ? (
            <div className="col-span-full rounded-xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
              🎉 Milestone complete: {milestoneCelebration.title} (Week {milestoneCelebration.week})
            </div>
          ) : null}
          <main className="space-y-4">
            <Card className="rounded-3xl border bg-white/90 shadow-[0_22px_60px_rgba(15,23,42,0.10)] backdrop-blur">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">{activeTask.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {activeTask.description}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge className="rounded-full" variant="secondary">
                      {activeTask.task_type}
                    </Badge>
                    <Badge className="rounded-full" variant="outline">
                      {activeTask.estimated_duration_minutes} min
                    </Badge>
                    <Badge className="rounded-full" variant="outline">
                      {format(parseISO(activeTask.scheduled_date), "EEE, MMM d")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border bg-white/80 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        Learning state
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {learningState.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {learningState.detail}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 font-semibold uppercase tracking-wide",
                          activeTab === "challenge"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700",
                        )}
                      >
                        {activeTab === "challenge" ? "Verify" : "Learn"}
                      </span>
                      <span className="rounded-full border bg-white px-3 py-1 font-semibold text-muted-foreground">
                        Steps {stepState.filter(Boolean).length}/{stepState.length}
                      </span>
                      <span className="rounded-full border bg-white px-3 py-1 font-semibold text-muted-foreground">
                        {quizAnsweredAll ? "Checkpoint ready" : "Checkpoint pending"}
                      </span>
                      <span className="rounded-full border bg-white px-3 py-1 font-semibold text-muted-foreground">
                        {sessionStarted ? "Session live" : "Session idle"}
                      </span>
                    </div>
                  </div>
                </div>
                {activeTab === "learn" ? (
                <div className="rounded-3xl border bg-gradient-to-br from-white via-white to-emerald-50/40 p-5 shadow-[0_18px_45px_rgba(16,185,129,0.14)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        Now learning
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        A guided surface built from verified resources and your current context.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                  </div>
                  <div className="mt-4 grid gap-3 rounded-2xl border bg-white/70 p-4 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        Mentor signal
                      </span>
                      <p className="text-muted-foreground">
                        {activeTask.ai_generated_hints?.[0] ??
                          "Let’s make this concrete. Focus on the first section and capture two key takeaways."}
                      </p>
                    </div>
                    <div className="grid gap-2 text-xs text-muted-foreground">
                      {lessonLoading ? (
                        <p className="text-[11px] text-muted-foreground">
                          Generating lesson blocks for this milestone...
                        </p>
                      ) : null}
                      {lessonBlocks.length ? (
                        lessonBlocks.map((block) => {
                          const meta =
                            block.resource_id && resourceMetadata[block.resource_id]
                              ? resourceMetadata[block.resource_id]
                              : null;
                          const sourceUrl = block.source_url ?? meta?.url;
                          return (
                            <div
                              key={block.id ?? block.title}
                              className={cn(
                                "rounded-2xl border bg-white/90 p-4",
                                block.resource_id ? "border-amber-200 bg-amber-50/40" : ""
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {block.title ?? block.type ?? "Lesson block"}
                                </span>
                                {block.resource_id ? (
                                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    {block.verified ?? meta?.verified ? "Verified source" : "Source excerpt"}
                                  </span>
                                ) : null}
                              </div>
                                <p className="mt-1 text-sm text-foreground">
                                  {block.content}
                                </p>
                              {sourceUrl ? (
                                <a
                                  href={String(sourceUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center text-[11px] font-semibold text-primary underline"
                                >
                                  Open source
                                </a>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-2xl border bg-white/90 p-4">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Objective
                          </span>
                          <p className="mt-1 text-sm text-foreground">
                            {activeTask.description}
                          </p>
                        </div>
                      )}
                    </div>
                    {showExample ? (
                      <div className="rounded-2xl border bg-white/90 p-4 text-xs text-muted-foreground">
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
                ) : null}

                {activeTab === "learn" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-3xl border bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                            Quick summary
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Two-minute recap to anchor the session.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setNotes((prev) =>
                              prev
                                ? `${prev}\n\nKey takeaways:\n${summaryCards
                                    .map((card) => `• ${card.title}: ${card.content}`)
                                    .join("\n")}`
                                : `Key takeaways:\n${summaryCards
                                    .map((card) => `• ${card.title}: ${card.content}`)
                                    .join("\n")}`,
                            )
                          }
                        >
                          Save to notes
                        </Button>
                      </div>
                      <div className="mt-4 space-y-3 text-sm">
                        {summaryCards.map((card) => (
                          <div
                            key={card.id}
                            className="rounded-2xl border bg-white/80 px-4 py-3"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {card.title}
                            </p>
                            <p className="mt-1 text-sm text-foreground">{card.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-3xl border bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                            Flashcards
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Tap through key prompts and lock them in.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveFlashcard((prev) =>
                                flashcardDeck.length
                                  ? (prev - 1 + flashcardDeck.length) % flashcardDeck.length
                                  : 0,
                              );
                              setShowFlashAnswer(false);
                            }}
                          >
                            Prev
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveFlashcard((prev) =>
                                flashcardDeck.length
                                  ? (prev + 1) % flashcardDeck.length
                                  : 0,
                              );
                              setShowFlashAnswer(false);
                            }}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 rounded-2xl border bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)]">
                        <p className="text-[10px] uppercase tracking-wide text-slate-300">
                          Card {flashcardDeck.length ? activeFlashcard + 1 : 0} of{" "}
                          {flashcardDeck.length}
                        </p>
                        <p className="mt-3 text-base font-semibold">
                          {flashcardDeck[activeFlashcard]?.question ??
                            "Generate activities to unlock flashcards."}
                        </p>
                        {showFlashAnswer ? (
                          <p className="mt-4 text-sm text-slate-200">
                            {flashcardDeck[activeFlashcard]?.answer}
                          </p>
                        ) : (
                          <p className="mt-4 text-sm text-slate-400">
                            Tap reveal to check your understanding.
                          </p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowFlashAnswer((prev) => !prev)}
                          >
                            {showFlashAnswer ? "Hide answer" : "Reveal answer"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-white border-white/40"
                            onClick={handleGenerateActivities}
                          >
                            Refresh deck
                          </Button>
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Cards adapt from verified excerpts or your lesson blocks.
                      </p>
                    </div>
                  </div>
                ) : null}

                {activeTab === "learn" ? (
                <div className="rounded-3xl border bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Learning mode
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Choose how you want to learn this task right now.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={learningMode === "video" ? "default" : "outline"}
                          onClick={() => {
                            setLearningMode("video");
                            setLearningModeOverride(true);
                          }}
                        >
                          Video-first
                        </Button>
                        <Button
                          size="sm"
                          variant={learningMode === "practice" ? "default" : "outline"}
                          onClick={() => {
                            setLearningMode("practice");
                            setLearningModeOverride(true);
                          }}
                        >
                          Practice-first
                        </Button>
                        <Button
                          size="sm"
                          variant={learningMode === "quiz" ? "default" : "outline"}
                          onClick={() => {
                            setLearningMode("quiz");
                            setLearningModeOverride(true);
                          }}
                        >
                          Quiz-first
                        </Button>
                    </div>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Learning steps
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    {activeSteps.map((step, idx) => (
                      <label key={`${activeTask.id}-step-${idx}`} className="flex items-start gap-2 rounded-2xl border bg-white/80 px-3 py-2 shadow-sm">
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
                  {missingPrereqs.length ? (
                    <div className="mt-4 rounded-2xl border bg-amber-50 px-3 py-3 text-xs text-amber-700">
                      <p className="text-[10px] font-semibold uppercase tracking-wide">
                        Prerequisite boosters
                      </p>
                      <p className="mt-1 text-[11px] text-amber-700">
                        These concepts will make the next steps smoother:
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        {missingPrereqs.slice(0, 3).map((prereq) => (
                          <li key={prereq}>{prereq}</li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        className="mt-2"
                        variant="secondary"
                        onClick={() => {
                          if (!activeTask) return;
                          setExtraSteps((prev) => ({
                            ...prev,
                            [activeTask.id]: missingPrereqs
                              .slice(0, 3)
                              .map((prereq) => `Primer: ${prereq}`),
                          }));
                        }}
                      >
                        Add to steps
                      </Button>
                    </div>
                  ) : null}
                </div>
                ) : null}

                {activeTab === "learn" && showTryIt ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border bg-background p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Challenge check
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Prompt: {exercisePrompt}
                      </p>
                      <Textarea
                        value={reflection}
                        onChange={(event) => setReflection(event.target.value)}
                        placeholder="Write your short answer or reflection..."
                        className="mt-2 min-h-[120px]"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowRubric((prev) => !prev)}
                        >
                          {showRubric ? "Hide rubric" : "Check rubric"}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleTryItFeedback}>
                          Submit for feedback
                        </Button>
                      </div>
                      {tryItFeedback ? (
                        <div className="mt-3 rounded-lg border bg-emerald-50 p-3 text-xs text-emerald-700">
                          <p className="font-semibold text-emerald-800">
                            Feedback score: {tryItFeedback.score}/3
                          </p>
                          {tryItFeedback.tips.length ? (
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-emerald-700">
                              {tryItFeedback.tips.map((tip) => (
                                <li key={tip}>{tip}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2">Strong response. Ready for the checkpoint.</p>
                          )}
                        </div>
                      ) : null}
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
                        Field notes
                      </p>
                      <Textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Capture your field notes here..."
                        className="mt-2 min-h-[120px]"
                      />
                    </div>
                  </div>
                ) : null}

                {activeTab === "learn" && learningMode === "quiz" ? (
                  <div className="rounded-lg border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Checkpoint quiz
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Check your understanding before moving on.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowQuizFeedback(true)}
                        >
                          Check answers
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setQuizAnswers({});
                            setShowQuizFeedback(false);
                          }}
                        >
                          {showQuizFeedback ? "Try again" : "Reset"}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-4 text-sm">
                      {quizQuestions.map((question) => (
                        <div key={question.id} className="rounded-lg border bg-muted/20 p-3">
                          <p className="text-sm font-medium">{question.question}</p>
                          <div className="mt-2 space-y-2">
                            {question.options.map((option, idx) => {
                              const selected = quizAnswers[question.id] === idx;
                              const correct = question.answer_index === idx;
                              const showFeedback = showQuizFeedback && question.answer_index !== undefined;
                              return (
                                <button
                                  key={`${question.id}-${idx}`}
                                  type="button"
                                  onClick={() =>
                                    setQuizAnswers((prev) => ({
                                      ...prev,
                                      [question.id]: idx,
                                    }))
                                  }
                                  className={cn(
                                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                                    selected ? "border-primary bg-primary/10" : "bg-background",
                                    showFeedback && correct ? "border-emerald-500 bg-emerald-50" : "",
                                    showFeedback && selected && !correct
                                      ? "border-rose-400 bg-rose-50"
                                      : "",
                                  )}
                                >
                                  <span>{option}</span>
                                  {selected ? (
                                    <span className="text-xs font-semibold text-primary">
                                      Selected
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                          {showQuizFeedback && question.rationale ? (
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              {question.rationale}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {showQuizFeedback ? (
                      <div className="mt-3 rounded-lg border bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        Score: {calculateQuizScore(activeTask, quizAnswers)} /{" "}
                        {quizQuestions.length}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activeTab === "learn" && showPracticeLab ? (
                  <div className="rounded-lg border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Practice lab
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Work through an example without leaving the playground.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={practiceMode === "code" ? "default" : "outline"}
                        onClick={() => setPracticeMode("code")}
                      >
                        Code pad
                      </Button>
                      <Button
                        size="sm"
                        variant={practiceMode === "scratch" ? "default" : "outline"}
                        onClick={() => setPracticeMode("scratch")}
                      >
                        Scratchpad
                      </Button>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "mt-3 overflow-hidden rounded-xl border",
                      practiceMode === "code"
                        ? "bg-slate-950/90 text-slate-100"
                        : "bg-amber-50 text-slate-800",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between border-b px-3 py-2 text-[11px]",
                        practiceMode === "code"
                          ? "border-slate-800 text-slate-300"
                          : "border-amber-200 text-amber-700",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span>
                          {practiceMode === "code" ? "Live code pad" : "Scratchpad notes"}
                        </span>
                      </div>
                      <span className="uppercase tracking-wide">
                        {practiceMode === "code" ? "sandbox" : "workbench"}
                      </span>
                    </div>
                    <div className="flex">
                      <div
                        className={cn(
                          "select-none px-3 py-3 text-[11px] leading-6",
                          practiceMode === "code"
                            ? "text-slate-500"
                            : "text-amber-400",
                        )}
                      >
                        {Array.from({ length: 10 }).map((_, idx) => (
                          <div key={`line-${idx}`}>{idx + 1}</div>
                        ))}
                      </div>
                      <Textarea
                        value={practiceNotes}
                        onChange={(event) => setPracticeNotes(event.target.value)}
                        placeholder={
                          practiceMode === "code"
                            ? "Draft a solution or outline your logic..."
                            : "Sketch steps, formulas, or reasoning..."
                        }
                        className={cn(
                          "min-h-[180px] resize-none border-0 bg-transparent px-3 py-3 text-xs shadow-none focus-visible:ring-0",
                          practiceMode === "code" ? "font-mono text-slate-100" : "text-sm",
                        )}
                      />
                    </div>
                    <div
                      className={cn(
                        "flex flex-wrap items-center gap-2 border-t px-3 py-2 text-[11px]",
                        practiceMode === "code"
                          ? "border-slate-800 text-slate-300"
                          : "border-amber-200 text-amber-700",
                      )}
                    >
                      <span className="rounded-full border px-2 py-0.5">
                        {practiceMode === "code" ? "No execution yet" : "Freeform notes"}
                      </span>
                      <span className="rounded-full border px-2 py-0.5">
                        {practiceMode === "code" ? "Pseudocode OK" : "Show your steps"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setNotes((prev) =>
                          prev
                            ? `${prev}\n\nField notes:\n${practiceNotes}`
                            : `Field notes:\n${practiceNotes}`,
                        )
                      }
                    >
                      Save to notes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPracticeNotes("")}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                ) : null}

                {activeTab === "challenge" ? (
                  <div className="rounded-lg border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Challenge assignment
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {proofInstruction}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        Required to advance
                      </Badge>
                    </div>
                    <div className="mt-3 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Proof required
                      </p>
                      <p className="mt-1 text-sm text-foreground">{challengeRequirement}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={handleStartStep}>
                        Start challenge
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setProofView("proof")}>
                        Submit proof
                      </Button>
                    </div>
                  </div>
                ) : null}

                {activeTab === "challenge" ? (
                <div ref={proofRef} className="rounded-lg border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Proof of work
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Submit the proof in the format required for this task.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={proofView === "proof" ? "default" : "outline"}
                        onClick={() => setProofView("proof")}
                      >
                        Submit proof
                      </Button>
                      <Button
                        size="sm"
                        variant={proofView === "artifacts" ? "default" : "outline"}
                        onClick={() => setProofView("artifacts")}
                      >
                        My artifacts
                      </Button>
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {allowedProofTypes.length === 1 ? "Format locked" : "Choose format"}
                      </Badge>
                    </div>
                  </div>
                  {proofView === "proof" ? (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(allowedProofTypes as unknown as string[]).includes("link") ? (
                          <Button
                            size="sm"
                            variant={proofType === "link" ? "default" : "outline"}
                            onClick={() => setProofType("link")}
                          >
                            Link
                          </Button>
                        ) : null}
                        {(allowedProofTypes as unknown as string[]).includes("text") ? (
                          <Button
                            size="sm"
                            variant={proofType === "text" ? "default" : "outline"}
                            onClick={() => setProofType("text")}
                          >
                            Summary
                          </Button>
                        ) : null}
                        {(allowedProofTypes as unknown as string[]).includes("file") ? (
                          <Button
                            size="sm"
                            variant={proofType === "file" ? "default" : "outline"}
                            onClick={() => setProofType("file")}
                          >
                            File
                          </Button>
                        ) : null}
                      </div>
                      <div className="mt-3">
                        {(proofType as string) === "link" ? (
                          <Input
                            type="url"
                            value={proofLink}
                            onChange={(event) => setProofLink(event.target.value)}
                            placeholder="Paste a link to your proof (doc, repo, submission)"
                          />
                        ) : null}
                        {(proofType as string) === "text" ? (
                          <Textarea
                            value={proofText}
                            onChange={(event) => setProofText(event.target.value)}
                            placeholder="Write a short summary of what you produced."
                            className="min-h-[120px]"
                          />
                        ) : null}
                        {(proofType as string) === "file" ? (
                          <div className="space-y-2">
                            <Input
                              type="file"
                              onChange={(event) =>
                                setProofFile(event.target.files?.[0] ?? null)
                              }
                            />
                            {proofFile ? (
                              <p className="text-xs text-muted-foreground">
                                Selected: {proofFile.name}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={handleSaveProof}>
                          Submit proof
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setProofLink("");
                            setProofText("");
                            setProofFile(null);
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                      {lastArtifactId ? (
                        <div className="mt-3 flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                          <span>
                            {verificationPending
                              ? "Artifact submitted — verification in progress."
                              : "Artifact added to your Trophy Room."}
                          </span>
                          <Link href="/progress" className="text-primary underline">
                            View in Trophy Room
                          </Link>
                        </div>
                      ) : null}
                      {taskArtifacts.length ? (
                        <div className="mt-3 rounded-lg border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Artifact status
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {taskArtifacts.slice(0, 2).map((artifact) => (
                              <button
                                key={artifact.id}
                                type="button"
                                onClick={() => {
                                  setSelectedArtifact(artifact);
                                  setDetailModalOpen(true);
                                }}
                                className="text-left"
                              >
                                <Badge
                                  variant={getArtifactBadgeVariant(artifact)}
                                >
                                  {artifact.title} · {getArtifactStatusLabel(artifact)}
                                </Badge>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Proof is queued for AI verification and portfolio entry.
                      </p>
                    </>
                  ) : (
                    <div className="mt-3 space-y-3 text-xs text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant={artifactFilter === "all" ? "default" : "outline"}
                          onClick={() => setArtifactFilter("all")}
                        >
                          All
                        </Button>
                        <Button
                          size="sm"
                          variant={artifactFilter === "task" ? "default" : "outline"}
                          onClick={() => setArtifactFilter("task")}
                        >
                          This task
                        </Button>
                        <Button
                          size="sm"
                          variant={artifactFilter === "verified" ? "default" : "outline"}
                          onClick={() => setArtifactFilter("verified")}
                        >
                          Verified
                        </Button>
                        <Button
                          size="sm"
                          variant={artifactFilter === "draft" ? "default" : "outline"}
                          onClick={() => setArtifactFilter("draft")}
                        >
                          Drafts
                        </Button>
                      </div>
                      {artifactGroups.length ? (
                        artifactGroups.map(([groupTitle, items]) => (
                          <div key={groupTitle} className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {groupTitle}
                            </p>
                            {items.map((artifact) => (
                              <div
                                key={artifact.id}
                                className="rounded-lg border bg-muted/20 px-3 py-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-foreground">
                                    {artifact.title}
                                  </span>
                                  <Badge
                                    variant={getArtifactBadgeVariant(artifact)}
                                  >
                                    {getArtifactStatusLabel(artifact)}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {artifact.artifact_type.replace(/_/g, " ")}
                                </p>
                                {artifact.url ? (
                                  <a
                                    href={artifact.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-block text-primary underline"
                                  >
                                    View artifact
                                  </a>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        <p>No artifacts for this plan yet.</p>
                      )}
                      <Link href="/progress" className="text-primary underline">
                        Open Trophy Room
                      </Link>
                    </div>
                  )}
                </div>
                ) : null}

                {activeTab === "challenge" ? (
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Checkpoint
                  </p>
                  {milestoneProgress?.isComplete && milestoneQuestions.length ? (
                    <div className="mt-3 rounded-lg border bg-background p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Milestone check
                        </p>
                        <Badge variant="outline">
                          {milestoneProgress.milestone.title}
                        </Badge>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Quick check across the milestone. Answer all questions to lock in progress.
                      </p>
                      <div className="mt-3 space-y-3">
                        {milestoneQuestions.map((question) => (
                          <div key={question.id} className="rounded-md border bg-muted/10 px-3 py-2">
                            <p className="text-sm font-medium">{question.question}</p>
                            <div className="mt-2 space-y-2">
                              {question.options.map((option, idx) => {
                                const selected = milestoneQuizAnswers[question.id] === idx;
                                return (
                                  <button
                                    key={`${question.id}-${idx}`}
                                    type="button"
                                    onClick={() =>
                                      setMilestoneQuizAnswers((prev) => ({
                                        ...prev,
                                        [question.id]: idx,
                                      }))
                                    }
                                    className={cn(
                                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                                      selected ? "border-primary bg-primary/10" : "bg-background",
                                    )}
                                  >
                                    <span>{option}</span>
                                    {selected ? (
                                      <span className="text-xs font-semibold text-primary">
                                        Selected
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!plan?.id || !milestoneProgress?.milestone?.milestone_id) return;
                            await planningApi.submitMilestoneCheck(
                              plan.id,
                              milestoneProgress.milestone.milestone_id,
                              {
                                score: milestoneScore,
                                total: milestoneQuestions.length,
                                summary: reflection.trim() || undefined,
                              }
                            );
                            setMilestoneCheckSubmitted(true);
                          }}
                        >
                          Submit milestone check
                        </Button>
                        <span className="text-[11px] text-muted-foreground">
                          Score: {milestoneScore}/{milestoneQuestions.length}
                        </span>
                      </div>
                      {milestoneCheckSubmitted ? (
                        <div className="mt-2 rounded-lg border bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                          Milestone check saved. Keep going!
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={handleStartSession} disabled={sessionStarted}>
                      {sessionStarted ? "Session running" : "Start session"}
                    </Button>
                    {activeTask?.assessment_config ? (
                      <Button 
                        onClick={() => setShowSubmission(true)}
                        className="bg-violet-600 hover:bg-violet-700 text-white border-0"
                      >
                        Submit Proof (+{activeTask.assessment_config.xp_reward || 50} XP)
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={handleCompleteTask} disabled={!canCompleteTask}>
                        Complete task
                      </Button>
                    )}
                  </div>
                  {!canCompleteTask && !activeTask?.assessment_config ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Complete all learning steps and answer the checkpoint to finish this task.
                    </p>
                  ) : null}
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
                ) : null}
              </CardContent>
            </Card>

            {!focusMode && activeTab === "learn" && showResourceDock ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Verified resources</CardTitle>
                  <CardDescription>Open learning material without leaving the playground.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {primaryResourceHref ? (
                    <div className="overflow-hidden rounded-lg border bg-background">
                      <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
                        <span className="truncate">
                          {getResourceLabel(primaryResource)}
                        </span>
                        {resourceMetadata["resource-0"]?.verified ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Verified
                          </span>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markResource("resource-0", "opened")}
                        >
                          Open full
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-[11px] text-muted-foreground">
                        <span className="rounded-full border px-2 py-0.5">
                          {primaryVideoEmbed ? "Video" : primaryAudioEmbed ? "Audio" : "Doc"}
                        </span>
                        <span className="rounded-full border px-2 py-0.5">
                          {resourceMetadata["resource-0"]?.verified ? "Verified source" : "External source"}
                        </span>
                        <div className="ml-auto flex gap-2">
                          <Button
                            size="sm"
                            variant={resourceViewMode === "embedded" ? "default" : "outline"}
                            onClick={() => setResourceViewMode("embedded")}
                          >
                            Embedded
                          </Button>
                          <Button
                            size="sm"
                            variant={resourceViewMode === "curated" ? "default" : "outline"}
                            onClick={() => setResourceViewMode("curated")}
                          >
                            Curated view
                          </Button>
                        </div>
                      </div>
                      {resourceMetadata["resource-0"]?.excerpt ? (
                        <div className="border-b px-3 py-2 text-xs text-muted-foreground">
                          {resourceMetadata["resource-0"].excerpt}
                        </div>
                      ) : null}
                      {resourceViewMode === "curated" ? (
                        <div className="space-y-3 px-3 py-4 text-sm">
                          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                            <p className="font-semibold text-foreground">Curated highlights</p>
                            <p className="mt-1">
                              Avoid scrolling. Focus on the highlighted excerpt and summarize it in your own words.
                            </p>
                            {resourceMetadata["resource-0"]?.excerpt ? (
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                <mark className="rounded bg-amber-100 px-1">
                                  {resourceMetadata["resource-0"].excerpt.split(".")[0]}.
                                </mark>
                              </p>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Source: seen in Verified resources (Open full for the complete material).
                          </div>
                          <div className="rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-foreground">
                                Activity generator
                              </span>
                              <Button size="sm" variant="secondary" onClick={handleGenerateActivities}>
                                Generate activities
                              </Button>
                            </div>
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              Creates flashcards + a quick quiz from the highlighted excerpt.
                            </p>
                          </div>
                          {generatedActivities ? (
                            <div className="space-y-3">
                              <div className="rounded-lg border bg-muted/10 px-3 py-2 text-xs">
                                <p className="font-semibold text-foreground">Flashcards</p>
                                <div className="mt-2 space-y-2">
                                  {generatedActivities.flashcards.map((card) => (
                                    <div key={card.id} className="rounded-md border bg-background px-3 py-2">
                                      <p className="text-[11px] uppercase text-muted-foreground">Q</p>
                                      <p className="text-sm">{card.question}</p>
                                      <p className="mt-2 text-[11px] uppercase text-muted-foreground">A</p>
                                      <p className="text-sm text-muted-foreground">{card.answer}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="rounded-lg border bg-muted/10 px-3 py-2 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-foreground">Quiz draft</p>
                                  <Button size="sm" onClick={handleSaveQuiz}>
                                    Use as quiz
                                  </Button>
                                </div>
                                <div className="mt-2 space-y-2">
                                  {generatedActivities.quiz.map((item) => (
                                    <div key={item.id} className="rounded-md border bg-background px-3 py-2">
                                      <p className="text-sm">{item.question}</p>
                                      <ul className="mt-1 list-disc pl-4 text-[11px] text-muted-foreground">
                                        {item.options.map((option) => (
                                          <li key={option}>{option}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : primaryVideoEmbed ? (
                        <div className="space-y-3 p-3">
                          <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
                            <iframe
                              title="resource-video"
                              src={primaryVideoEmbed}
                              className="h-full w-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                            <p className="font-semibold text-foreground">Video quick check</p>
                            <p className="mt-1">
                              Capture one key idea and one question while the video is fresh.
                            </p>
                            <Button
                              size="sm"
                              className="mt-2"
                              variant="secondary"
                              onClick={() =>
                                setReflection(
                                  "Key idea: \\nQuestion I still have: ",
                                )
                              }
                            >
                              Add quick check
                            </Button>
                          </div>
                        </div>
                      ) : primaryAudioEmbed ? (
                        <div className="space-y-3 p-3">
                          <audio controls className="w-full">
                            <source src={primaryAudioEmbed} />
                          </audio>
                          <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                            <p className="font-semibold text-foreground">Listening notes</p>
                            <p className="mt-1">
                              Jot down one insight and one example you can apply.
                            </p>
                            <Button
                              size="sm"
                              className="mt-2"
                              variant="secondary"
                              onClick={() =>
                                setNotes(
                                  "Insight: \\nExample I can apply: ",
                                )
                              }
                            >
                              Add listening notes
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <iframe
                          title="resource-viewer"
                          src={String(primaryResourceHref)}
                          className="h-[260px] w-full"
                        />
                      )}
                      <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                        <span>Embedded preview</span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => markResource("resource-0", "completed")}
                        >
                          Mark explored
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {resources.length ? (
                    resources.slice(0, 5).map((resource, index) => {
                      const label = getResourceLabel(resource);
                      const href =
                        typeof resource === "string"
                          ? resource
                          : (resource.url as string) ||
                            (resource.link as string) ||
                            undefined;
                      const resourceKey = `resource-${index}`;
                      const engagement = activeTask.resource_engagement?.[resourceKey];
                      const meta = resourceMetadata[resourceKey];
                      return (
                        <div
                          key={`resource-${index}`}
                          className="flex flex-col gap-2 rounded-lg border bg-background px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{label}</span>
                            {meta?.verified ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Verified
                              </span>
                            ) : null}
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
                          {meta?.content_type ? (
                            <div className="text-[11px] text-muted-foreground">
                              Type: {meta.content_type}
                            </div>
                          ) : null}
                          {meta?.excerpt ? (
                            <div className="text-[11px] text-muted-foreground">
                              {meta.excerpt}
                            </div>
                          ) : null}
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Button
                              size="sm"
                              variant={engagement?.completed_at ? "secondary" : "outline"}
                              onClick={() => markResource(resourceKey, "completed")}
                            >
                              {engagement?.completed_at ? "Explored" : "Mark explored"}
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

          {!focusMode && activeTab === "learn" ? (
            <aside className="sticky top-20 h-[calc(100vh-7.5rem)]">
              <Card className="flex h-full flex-col overflow-hidden rounded-2xl border bg-gradient-to-br from-white via-white to-slate-50/70 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{mentorConversationLabel}</CardTitle>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        mentorSocketStatus === "open"
                          ? "bg-emerald-100 text-emerald-700"
                          : mentorSocketStatus === "connecting"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {mentorSocketStatus === "open"
                        ? "Live"
                        : mentorSocketStatus === "connecting"
                          ? "Reconnecting"
                          : "Offline"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col gap-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap gap-2">
                    {mentorSuggestions.map((suggestion) => (
                      <Button
                        key={suggestion.id}
                        size="sm"
                        variant="outline"
                        onClick={() => handleMentorAction(suggestion.id)}
                      >
                        {suggestion.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex-1 min-h-0 space-y-3 overflow-y-auto rounded-xl border bg-white/80 p-3 text-xs text-muted-foreground">
                    {mentorMessages.length ? (
                      mentorMessages.slice(-10).map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "rounded-2xl px-3 py-2 text-xs shadow-sm",
                            msg.sender_type === "user"
                              ? "ml-auto bg-slate-900 text-white"
                              : "bg-white text-slate-900 border",
                          )}
                        >
                          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                            {msg.sender_type === "user" ? "You" : "Mentor"}
                          </span>
                          <p className="mt-1 text-xs leading-relaxed">{msg.content}</p>
                        </div>
                      ))
                    ) : (
                      <p>No mentor messages yet.</p>
                    )}
                    {streamingMessage ? (
                      <div className="rounded-2xl border bg-white px-3 py-2 text-xs">
                        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                          Mentor
                        </span>
                        <p className="mt-1 text-xs leading-relaxed">{streamingMessage}</p>
                      </div>
                    ) : null}
                    {mentorTyping && !streamingMessage ? (
                      <p className="mt-2 text-[11px] text-muted-foreground animate-pulse">
                        Mentor is typing...
                      </p>
                    ) : null}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={mentorInput}
                      onChange={(event) => setMentorInput(event.target.value)}
                      placeholder="Ask your mentor..."
                      className="h-10 text-sm rounded-xl"
                      disabled={!mentorConversationKey}
                    />
                    <Button
                      className="w-full rounded-xl"
                      onClick={() => void handleMentorSend()}
                      disabled={!mentorConversationKey}
                    >
                      Send to mentor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </aside>
          ) : null}
        </div>
      )}
      
      <Dialog open={showSubmission} onOpenChange={setShowSubmission}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim Your Rewards</DialogTitle>
            <DialogDescription>
              Verify your work to earn {activeTask?.assessment_config?.xp_reward || 50} XP and unlock the next step.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
             {activeTask?.assessment_config?.verification_type === "github_repo" ? (
                <div className="grid gap-2">
                   <Label>Github Repository URL</Label>
                   <Input 
                     placeholder="https://github.com/username/project" 
                     value={submissionProof}
                     onChange={(e) => setSubmissionProof(e.target.value)}
                   />
                </div>
             ) : (
                <div className="grid gap-2">
                   <Label>Proof of Work</Label>
                   <Textarea 
                     placeholder="Describe what you did or paste a link..."
                     value={submissionProof}
                     onChange={(e) => setSubmissionProof(e.target.value)}
                   />
                </div>
             )}
          </div>
          
          <DialogFooter>
             <Button variant="outline" onClick={() => setShowSubmission(false)}>Cancel</Button>
             <Button 
               onClick={async () => {
                  setSubmissionLoading(true);
                  try {
                      // Fallback to simple completion for now until API is ready
                      await updateTaskStatus.mutateAsync({ 
                          taskId: activeTask?.id ?? "", 
                          status: "completed",
                          completion_notes: submissionProof 
                      });
                      setShowSubmission(false);
                      telemetry.info("Quest completed", { xp: activeTask?.assessment_config?.xp_reward });
                  } catch(e) {
                      console.error(e);
                  } finally {
                      setSubmissionLoading(false);
                  }
               }} 
               disabled={!submissionProof || submissionLoading}
             >
               {submissionLoading ? "Verifying..." : "Submit & Claim"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ArtifactDetailModal
        artifact={
          selectedArtifact
            ? {
                ...selectedArtifact,
                verification_status: selectedArtifact.verification_status ?? "pending",
                visibility: selectedArtifact.visibility ?? "private",
                featured: selectedArtifact.featured ?? false,
              }
            : null
        }
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
      </div>
    </div>                                                                                                                      
  );
}
