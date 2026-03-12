import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { planningApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import type { DailyTask } from "@/types";
import { FlashcardDeck, type Flashcard } from "./FlashcardDeck";
import { SpacedRepetitionReview } from "./SpacedRepetitionReview";

type LessonBlock = NonNullable<DailyTask["lesson_blocks"]>[number];

interface MicroPracticeQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface QuizResults {
  correct: number;
  total: number;
  weakTopics: string[];
}

interface MicroPracticeLabProps {
  taskId: string;
  planId?: string;
  lessonBlocks: LessonBlock[];
  onComplete: (results: QuizResults) => void;
}

export function MicroPracticeLab({
  taskId,
  planId,
  lessonBlocks,
  onComplete,
}: MicroPracticeLabProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [scores, setScores] = useState<boolean[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [mode, setMode] = useState<"quiz" | "flashcards" | "review">("quiz");
  const queryClient = useQueryClient();

  // Fetch questions from the AI endpoint.
  // Enabled only when lessonBlocks are available so we have content to generate from.
  // Cached by TanStack Query for the session (staleTime 10min).
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["micro-practice", taskId],
    queryFn: () => planningApi.generateMicroPractice(taskId),
    enabled: !!taskId,
    staleTime: 10 * 60 * 1000, // 10 minutes — matches server-side cache
    retry: 2,
  });

  const questions: MicroPracticeQuestion[] = data?.questions ?? [];

  const {
    data: flashcardData,
    isLoading: flashcardLoading,
    isError: flashcardError,
    refetch: refetchFlashcards,
  } = useQuery({
    queryKey: ["flashcards", taskId],
    queryFn: () => planningApi.generateFlashcards(taskId),
    enabled: !!taskId && mode === "flashcards",
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  const flashcards: Flashcard[] = flashcardData?.cards ?? [];

  const {
    data: reviewData,
    isLoading: reviewLoading,
    isError: reviewError,
    refetch: refetchReview,
  } = useQuery({
    queryKey: ["spaced-repetition", "due", taskId],
    queryFn: () =>
      planningApi.getSpacedRepetitionDue(
        planId ? { plan_id: planId } : { task_id: taskId }
      ),
    enabled: !!taskId && mode === "review",
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { card_id: string; quality: number }) =>
      planningApi.reviewSpacedRepetitionCard(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaced-repetition", "due", taskId] });
    },
    onError: () => {
      telemetry.toastError("Couldn't save your review. Try again.");
    },
  });

  const dueCards = reviewData?.cards ?? [];

  const handleSelect = useCallback((index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
  }, [showExplanation]);

  const handleCheck = useCallback(() => {
    if (selectedAnswer === null || questions.length === 0) return;
    const isCorrect = selectedAnswer === questions[currentIndex].correct_index;

    setShowExplanation(true);
    setScores((prev) => {
      const next = [...prev];
      next[currentIndex] = isCorrect;
      return next;
    });

    if (isCorrect) {
      telemetry.toastSuccess("Correct!");
    } else {
      const questionText = questions[currentIndex]?.question?.slice(0, 60) ?? "";
      if (questionText) {
        setWeakTopics((prev) => prev.includes(questionText) ? prev : [...prev, questionText]);
      }
      telemetry.toastError("Not quite — review the explanation.");
    }
  }, [selectedAnswer, currentIndex, questions]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      const finalScores = [...scores];
      if (selectedAnswer !== null) {
        finalScores[currentIndex] = selectedAnswer === questions[currentIndex]?.correct_index;
      }
      onComplete({
        correct: finalScores.filter(Boolean).length,
        total: questions.length,
        weakTopics,
      });
    }
  }, [currentIndex, questions, scores, selectedAnswer, weakTopics, onComplete]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading && mode === "quiz") {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-xl bg-slate-50 border-slate-200">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">
          Synthesizing Micro-Practice…
        </h3>
        <p className="text-sm text-slate-500 text-center max-w-sm mt-2">
          The Horizon AI is reading your lesson blocks and generating
          hyper-specific concept checks.
        </p>
        <div className="mt-4 w-64 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if ((isError || questions.length === 0) && mode === "quiz") {
    return (
      <div className="flex flex-col items-center justify-center h-48 border border-orange-100 rounded-xl bg-orange-50 gap-3">
        <AlertTriangle className="w-8 h-8 text-orange-400" />
        <p className="text-sm text-orange-700 font-medium text-center max-w-xs">
          Couldn't generate practice questions right now.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-orange-200 text-orange-700 hover:bg-orange-100"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onComplete({ correct: 0, total: 0, weakTopics: [] })}
            className="text-slate-500"
          >
            Skip for now
          </Button>
        </div>
      </div>
    );
  }

  if (flashcardLoading && mode === "flashcards") {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-xl bg-slate-50 border-slate-200">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">
          Crafting Flashcards…
        </h3>
        <p className="text-sm text-slate-500 text-center max-w-sm mt-2">
          Turning your lesson blocks into rapid recall cards.
        </p>
        <div className="mt-4 w-64 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if ((flashcardError || flashcards.length === 0) && mode === "flashcards") {
    return (
      <div className="flex flex-col items-center justify-center h-48 border border-orange-100 rounded-xl bg-orange-50 gap-3">
        <AlertTriangle className="w-8 h-8 text-orange-400" />
        <p className="text-sm text-orange-700 font-medium text-center max-w-xs">
          Couldn't generate flashcards right now.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchFlashcards()}
            className="border-orange-200 text-orange-700 hover:bg-orange-100"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode("quiz")}
            className="text-slate-500"
          >
            Back to quiz
          </Button>
        </div>
      </div>
    );
  }

  if (reviewLoading && mode === "review") {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-xl bg-slate-50 border-slate-200">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">
          Checking due reviews…
        </h3>
        <p className="text-sm text-slate-500 text-center max-w-sm mt-2">
          Loading your spaced repetition queue.
        </p>
      </div>
    );
  }

  if (reviewError && mode === "review") {
    return (
      <div className="flex flex-col items-center justify-center h-48 border border-orange-100 rounded-xl bg-orange-50 gap-3">
        <AlertTriangle className="w-8 h-8 text-orange-400" />
        <p className="text-sm text-orange-700 font-medium text-center max-w-xs">
          Couldn't load review cards right now.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchReview()}
            className="border-orange-200 text-orange-700 hover:bg-orange-100"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode("quiz")}
            className="text-slate-500"
          >
            Back to quiz
          </Button>
        </div>
      </div>
    );
  }

  // ── Quiz UI ────────────────────────────────────────────────────────────────
  const currentQ = questions[currentIndex] ?? {
    id: "",
    question: "",
    options: [],
    correct_index: 0,
    explanation: "",
  };
  const isCorrect = selectedAnswer === currentQ.correct_index;

  return (
    <div className="border border-indigo-100 bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 bg-indigo-50/50 px-5 py-3 border-b border-indigo-100">
        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md">
          <BrainCircuit className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-indigo-900 text-sm">
          Micro-Practice Lab
        </h3>
        <div className="ml-3 flex items-center gap-2">
          <Button
            variant={mode === "quiz" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMode("quiz")}
          >
            Quiz
          </Button>
          <Button
            variant={mode === "flashcards" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMode("flashcards")}
          >
            Flashcards
          </Button>
          <Button
            variant={mode === "review" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMode("review")}
          >
            Review
          </Button>
        </div>
        <span className="ml-1 text-xs text-indigo-400">
          {mode === "quiz"
            ? `${currentIndex + 1} / ${questions.length}`
            : mode === "flashcards"
            ? `${flashcards.length} cards`
            : `${dueCards.length} due`}
        </span>
        {/* Progress dots */}
        <div className="ml-auto flex gap-1">
          {mode === "quiz" ? questions.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex
                  ? "bg-indigo-500 ring-2 ring-indigo-200"
                  : idx < currentIndex
                  ? scores[idx]
                    ? "bg-emerald-500"
                    : "bg-red-400"
                  : "bg-slate-200"
              }`}
            />
          )) : null}
        </div>
      </div>

      <div className="p-6">
        {mode === "flashcards" ? (
          <FlashcardDeck cards={flashcards} />
        ) : mode === "review" ? (
          <SpacedRepetitionReview
            cards={dueCards}
            onReview={(cardId, quality) => reviewMutation.mutate({ card_id: cardId, quality })}
            isSubmitting={reviewMutation.isPending}
          />
        ) : (
          <>
            <h4 className="text-base font-medium text-slate-800 mb-4">
              {currentQ.question}
            </h4>

            <div className="space-y-2">
              {currentQ.options.map((opt, idx) => {
                let btnClass =
                  "w-full justify-start text-left h-auto py-3 px-4 border text-sm font-normal ";

                if (showExplanation) {
                  if (idx === currentQ.correct_index) {
                    btnClass += "bg-emerald-50 border-emerald-200 text-emerald-800";
                  } else if (idx === selectedAnswer) {
                    btnClass +=
                      "bg-red-50 border-red-200 text-red-800 opacity-70";
                  } else {
                    btnClass +=
                      "bg-slate-50 border-slate-200 text-slate-400 opacity-50";
                  }
                } else if (selectedAnswer === idx) {
                  btnClass +=
                    "bg-indigo-50 border-indigo-300 text-indigo-800 shadow-sm";
                } else {
                  btnClass +=
                    "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300";
                }

                return (
                  <Button
                    key={idx}
                    variant="outline"
                    className={btnClass}
                    onClick={() => handleSelect(idx)}
                    disabled={showExplanation}
                  >
                    <span className="flex-1">{opt}</span>
                    {showExplanation && idx === currentQ.correct_index && (
                      <CheckCircle2 className="w-4 h-4 ml-2 shrink-0 text-emerald-600" />
                    )}
                    {showExplanation &&
                      idx === selectedAnswer &&
                      idx !== currentQ.correct_index && (
                        <XCircle className="w-4 h-4 ml-2 shrink-0 text-red-500" />
                      )}
                  </Button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  isCorrect
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                    : "bg-orange-50 border-orange-100 text-orange-800"
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {isCorrect ? "Excellent!" : "Review concept:"}
                </p>
                <p className="text-sm opacity-90">{currentQ.explanation}</p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex justify-end">
              {!showExplanation ? (
                <Button
                  onClick={handleCheck}
                  disabled={selectedAnswer === null}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Check Answer
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {currentIndex < questions.length - 1
                    ? "Next Question"
                    : "Complete Lab"}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
