"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { planningApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import Link from "next/link";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

interface PreAssessmentQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number | null;
  explanation: string;
  competency_name: string;
  question_type?: string | null;
}

interface CompetencyResult {
  competency_name: string;
  score_pct: number;
  correct: number;
  total: number;
  proficiency_level: string;
  self_rating?: boolean;
}

const LEVEL_COLORS: Record<string, string> = {
  developing: "text-red-600 bg-red-50 border-red-200",
  emerging: "text-orange-600 bg-orange-50 border-orange-200",
  proficient: "text-blue-600 bg-blue-50 border-blue-200",
  advanced: "text-emerald-600 bg-emerald-50 border-emerald-200",
  expert: "text-violet-600 bg-violet-50 border-violet-200",
};

const LEVEL_NUMERIC: Record<string, number> = {
  developing: 20,
  emerging: 45,
  proficient: 65,
  advanced: 82,
  expert: 100,
};

export default function PreAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const planId = params.planId as string;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"quiz" | "results">("quiz");
  const [results, setResults] = useState<{
    competency_results: CompetencyResult[];
    tasks_marked_skippable: number;
  } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["pre-assessment", planId],
    queryFn: () => planningApi.getPreAssessment(planId),
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });

  const submitMutation = useMutation({
    mutationFn: (answersPayload: Record<string, number>) =>
      planningApi.submitPreAssessment(planId, answersPayload),
    onSuccess: (result) => {
      setResults(result);
      setPhase("results");
      // Invalidate plan cache so pre_assessed flag updates
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: () => {
      telemetry.toastError("Could not submit your answers. Please try again.");
    },
  });

  const startPlanMutation = useMutation({
    mutationFn: () => planningApi.startPlan(planId),
    onSuccess: () => {
      telemetry.toastSuccess("Plan started");
      router.push(`/plans?plan=${planId}`);
    },
    onError: () => {
      telemetry.toastError("Unable to start plan right now.");
    },
  });

  const questions: PreAssessmentQuestion[] = data?.questions ?? [];
  const isSelfAssessmentOnly = questions.length > 0 && questions.every((q) => q.correct_index === null);
  const currentQ = questions[currentIndex];

  const handleSelect = useCallback(
    (idx: number) => {
      if (showExplanation) return;
      setSelectedAnswer(idx);
    },
    [showExplanation],
  );

  const handleCheck = useCallback(() => {
    if (selectedAnswer === null || !currentQ) return;
    setShowExplanation(true);
    setAnswers((prev) => ({ ...prev, [currentQ.id]: selectedAnswer }));
  }, [selectedAnswer, currentQ]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Last question — submit
      const finalAnswers = { ...answers };
      if (currentQ) {
        finalAnswers[currentQ.id] = selectedAnswer ?? -1;
      }
      submitMutation.mutate(finalAnswers);
    }
  }, [currentIndex, questions.length, answers, currentQ, selectedAnswer, submitMutation]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-muted-foreground">Generating your personalised quiz…</p>
          <div className="w-full space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (isError || questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-orange-100 bg-orange-50 p-8">
          <AlertTriangle className="h-10 w-10 text-orange-400" />
          <p className="text-sm font-medium text-orange-700">
            Could not generate the quiz right now.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
            <Button variant="ghost" asChild>
              <Link href={`/plans?plan=${planId}`}>Skip for now</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────
  if (phase === "results" && results) {
    const radarData = results.competency_results.map((r) => ({
      competency: r.competency_name.length > 18
        ? r.competency_name.slice(0, 16) + "…"
        : r.competency_name,
      value: LEVEL_NUMERIC[r.proficiency_level] ?? r.score_pct,
    }));

    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" asChild className="h-7 px-2">
            <Link href={`/plans?plan=${planId}`}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to Plan
            </Link>
          </Button>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Your Prior Knowledge Profile</h1>
              <p className="text-xs text-muted-foreground">
                {results.tasks_marked_skippable > 0
                  ? `${results.tasks_marked_skippable} task${results.tasks_marked_skippable > 1 ? "s" : ""} marked as skippable based on your results.`
                  : "Plan personalised based on your current knowledge."}
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
            <div className="font-semibold">Personalization applied</div>
            <div className="mt-1">
              {results.tasks_marked_skippable > 0
                ? `You can skip ${results.tasks_marked_skippable} task${results.tasks_marked_skippable > 1 ? "s" : ""} you already know.`
                : "No tasks were skipped, but the difficulty and lesson depth will be tuned to your level."}
            </div>
          </div>

          {radarData.length >= 3 && (
            <div className="h-56 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="competency"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                  />
                  <Radar
                    dataKey="value"
                    stroke="#7c3aed"
                    fill="#7c3aed"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2">
            {results.competency_results.map((result) => (
              <div
                key={result.competency_name}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${LEVEL_COLORS[result.proficiency_level] ?? "bg-slate-50 border-slate-200 text-slate-700"}`}
              >
                <span className="font-medium truncate mr-2">{result.competency_name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {result.self_rating ? (
                    <span className="opacity-75">Self rating</span>
                  ) : (
                    <span className="opacity-75">{result.correct}/{result.total} correct</span>
                  )}
                  <span className="capitalize font-semibold">{result.proficiency_level}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/plans?plan=${planId}`)}
            >
              View plan details
            </Button>
            <Button
              className="bg-violet-600 text-white hover:bg-violet-700"
              onClick={() => startPlanMutation.mutate()}
              disabled={startPlanMutation.isPending}
            >
              {startPlanMutation.isPending ? "Starting…" : "Start plan"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  const isSelfRating = currentQ.correct_index === null || currentQ.correct_index === undefined;
  const isCorrect = !isSelfRating && showExplanation && selectedAnswer === currentQ.correct_index;
  const progressPct = Math.round((currentIndex / questions.length) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-muted-foreground">
          <Link href={`/plans?plan=${planId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-violet-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium text-violet-700">
            {currentQ.competency_name || "General"}
          </span>
          {/* Progress dots */}
          <div className="ml-auto flex gap-1">
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  idx < currentIndex
                    ? questions[idx].correct_index === null
                      ? "bg-violet-400"
                      : answers[questions[idx].id] === questions[idx].correct_index
                      ? "bg-emerald-500"
                      : "bg-red-400"
                    : idx === currentIndex
                    ? "bg-violet-500 ring-2 ring-violet-200"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        <h2 className="text-base font-medium text-slate-800">{currentQ.question}</h2>

        {isSelfAssessmentOnly && (
          <div className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-xs text-violet-700">
            This is a self-assessment (no right or wrong). It helps tailor your plan when we don’t yet have
            detailed competency data.
          </div>
        )}

        <div className="space-y-2">
          {currentQ.options.map((opt, idx) => {
            let cls =
              "w-full justify-start text-left h-auto py-3 px-4 border text-sm font-normal ";
            const isSelfRating = currentQ.correct_index === null || currentQ.correct_index === undefined;
            if (showExplanation && !isSelfRating) {
              if (idx === currentQ.correct_index) {
                cls += "bg-emerald-50 border-emerald-200 text-emerald-800";
              } else if (idx === selectedAnswer) {
                cls += "bg-red-50 border-red-200 text-red-800 opacity-70";
              } else {
                cls += "bg-slate-50 border-slate-200 text-slate-400 opacity-50";
              }
            } else if (selectedAnswer === idx) {
              cls += "bg-violet-50 border-violet-300 text-violet-800 shadow-sm";
            } else {
              cls += "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300";
            }
            return (
              <Button
                key={idx}
                variant="outline"
                className={cls}
                onClick={() => handleSelect(idx)}
                disabled={showExplanation}
              >
                <span className="flex-1">{opt}</span>
                {!isSelfRating && showExplanation && idx === currentQ.correct_index && (
                  <CheckCircle2 className="ml-2 h-4 w-4 shrink-0 text-emerald-600" />
                )}
                {!isSelfRating && showExplanation && idx === selectedAnswer && idx !== currentQ.correct_index && (
                  <XCircle className="ml-2 h-4 w-4 shrink-0 text-red-500" />
                )}
              </Button>
            );
          })}
        </div>

        {showExplanation && (
          <div
            className={`rounded-lg border p-4 text-sm ${
              (currentQ.correct_index === null || currentQ.correct_index === undefined)
                ? "border-slate-200 bg-slate-50 text-slate-700"
                : isCorrect
                ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                : "border-orange-100 bg-orange-50 text-orange-800"
            }`}
          >
            <p className="font-medium mb-1">
              {(currentQ.correct_index === null || currentQ.correct_index === undefined)
                ? "Self-assessment"
                : isCorrect
                ? "Correct!"
                : "Review concept:"}
            </p>
            <p className="opacity-90">{currentQ.explanation}</p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          {!showExplanation ? (
            <Button
              onClick={handleCheck}
              disabled={selectedAnswer === null}
              className="bg-violet-600 text-white hover:bg-violet-700"
            >
              {isSelfRating ? "Continue" : "Check Answer"}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={submitMutation.isPending}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              {submitMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Scoring…
                </>
              ) : currentIndex < questions.length - 1 ? (
                <>
                  Next Question
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  See My Results
                  <Sparkles className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
