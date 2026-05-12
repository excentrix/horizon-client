"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ChevronRight, ChevronLeft, Lightbulb, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MCQOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  difficulty?: string;
  points?: number;
  question?: string;
  statement?: string;
  options?: MCQOption[];
  correct_option?: string;
  correct_answer?: boolean;
  explanation?: string;
  expected_answer?: string;
  key_concepts?: string[];
  concept_tested?: string;
  commentPrompt?: string;
}

interface QuizSceneProps {
  scene: {
    title?: string;
    questions?: QuizQuestion[];
    analysis?: string;
    estimated_seconds?: number;
  };
  onRequestMentorReview?: (content: string) => void;
}

type AnswerState =
  | { type: "mcq"; selected: string }
  | { type: "tf"; selected: boolean }
  | { type: "short"; text: string };

interface QuestionResult {
  answered: boolean;
  correct: boolean;
  answer: AnswerState | null;
  revealed: boolean;
}

const DIFFICULTY_BADGE: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

export function QuizScene({ scene, onRequestMentorReview }: QuizSceneProps) {
  const questions = scene.questions ?? [];
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<number, QuestionResult>>({});
  const [shortInput, setShortInput] = useState("");

  const q = questions[index] as QuizQuestion | undefined;
  const result = results[index];
  const totalPoints = questions.reduce((s, q) => s + (q.points ?? 10), 0);
  const earnedPoints = Object.entries(results).reduce((s, [i, r]) => {
    if (!r.correct) return s;
    return s + (questions[Number(i)]?.points ?? 10);
  }, 0);
  const answeredCount = Object.values(results).filter((r) => r.answered).length;

  function submitMCQ(optionId: string) {
    if (result?.revealed) return;
    const correct = optionId === q?.correct_option;
    setResults((prev) => ({
      ...prev,
      [index]: { answered: true, correct, answer: { type: "mcq", selected: optionId }, revealed: true },
    }));
  }

  function submitTF(value: boolean) {
    if (result?.revealed) return;
    const correct = value === q?.correct_answer;
    setResults((prev) => ({
      ...prev,
      [index]: { answered: true, correct, answer: { type: "tf", selected: value }, revealed: true },
    }));
  }

  function submitShort() {
    if (!shortInput.trim() || result?.revealed) return;
    setResults((prev) => ({
      ...prev,
      [index]: { answered: true, correct: true, answer: { type: "short", text: shortInput.trim() }, revealed: true },
    }));
    setShortInput("");
  }

  if (!questions.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        No quiz questions available.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Knowledge Check</p>
          <h3 className="text-sm font-semibold text-slate-900">{scene.title ?? "Quiz"}</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{answeredCount} / {questions.length} answered</span>
          <span className="font-semibold text-violet-600">{earnedPoints} / {totalPoints} pts</span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 px-5">
        {questions.map((_, i) => {
          const r = results[i];
          return (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === index
                  ? "bg-violet-600 scale-125"
                  : r?.correct
                  ? "bg-emerald-400"
                  : r?.answered
                  ? "bg-red-400"
                  : "bg-slate-300 hover:bg-slate-400"
              }`}
              aria-label={`Question ${i + 1}`}
            />
          );
        })}
      </div>

      {/* Question area */}
      {q && (
        <div className="px-5 pb-2">
          <div className="mb-3 flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`text-[10px] uppercase tracking-wide ${DIFFICULTY_BADGE[q.difficulty ?? "beginner"] ?? "bg-slate-100 text-slate-600"}`}
            >
              {q.type === "multiple_choice" ? "Multiple Choice" : q.type === "true_false" ? "True / False" : "Short Answer"}
            </Badge>
            {q.difficulty && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                {q.difficulty}
              </Badge>
            )}
            <span className="ml-auto text-[10px] font-semibold text-slate-400">{q.points ?? 10} pts</span>
          </div>

          <p className="mb-4 text-sm font-medium leading-relaxed text-slate-900">
            {q.question ?? q.statement ?? ""}
          </p>

          {/* Multiple choice */}
          {q.type === "multiple_choice" && q.options && (
            <div className="space-y-2">
              {q.options.map((opt) => {
                const selected = result?.answer?.type === "mcq" && (result.answer as { selected: string }).selected === opt.id;
                const isCorrect = opt.id === q.correct_option;
                let cls = "border-slate-200 bg-slate-50 text-slate-700 hover:border-violet-300 hover:bg-violet-50";
                if (result?.revealed) {
                  if (isCorrect) cls = "border-emerald-400 bg-emerald-50 text-emerald-800";
                  else if (selected) cls = "border-red-400 bg-red-50 text-red-800";
                  else cls = "border-slate-200 bg-slate-50 text-slate-400";
                }
                return (
                  <button
                    key={opt.id}
                    onClick={() => submitMCQ(opt.id)}
                    disabled={!!result?.revealed}
                    className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all ${cls} disabled:cursor-default`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-current text-[10px] font-bold uppercase">
                      {opt.id}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                    {result?.revealed && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                    {result?.revealed && selected && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* True / False */}
          {q.type === "true_false" && (
            <div className="flex gap-3">
              {([true, false] as const).map((val) => {
                const selected = result?.answer?.type === "tf" && (result.answer as { selected: boolean }).selected === val;
                const isCorrect = val === q.correct_answer;
                let cls = "border-slate-200 bg-slate-50 text-slate-700 hover:border-violet-300 hover:bg-violet-50";
                if (result?.revealed) {
                  if (isCorrect) cls = "border-emerald-400 bg-emerald-50 text-emerald-800";
                  else if (selected) cls = "border-red-400 bg-red-50 text-red-800";
                  else cls = "border-slate-200 bg-slate-50 text-slate-400";
                }
                return (
                  <button
                    key={String(val)}
                    onClick={() => submitTF(val)}
                    disabled={!!result?.revealed}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-all ${cls} disabled:cursor-default`}
                  >
                    {result?.revealed && isCorrect && <CheckCircle2 className="h-4 w-4" />}
                    {result?.revealed && selected && !isCorrect && <XCircle className="h-4 w-4" />}
                    {val ? "True" : "False"}
                  </button>
                );
              })}
            </div>
          )}

          {/* Short answer */}
          {q.type === "short_answer" && (
            <div className="space-y-2">
              <textarea
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
                rows={3}
                placeholder="Type your answer…"
                value={shortInput}
                onChange={(e) => setShortInput(e.target.value)}
                disabled={!!result?.revealed}
              />
              {!result?.revealed && (
                <Button size="sm" onClick={submitShort} disabled={!shortInput.trim()}>
                  Submit Answer
                </Button>
              )}
              {result?.revealed && q.expected_answer && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Model Answer</p>
                  <p className="text-sm text-emerald-900">{q.expected_answer}</p>
                </div>
              )}
            </div>
          )}

          {/* Explanation + mentor prompt */}
          {result?.revealed && q.explanation && (
            <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                <p className="text-xs leading-relaxed text-indigo-900">{q.explanation}</p>
              </div>
            </div>
          )}

          {result?.revealed && !result.correct && q.commentPrompt && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-xs text-amber-900">{q.commentPrompt}</p>
                {onRequestMentorReview && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 h-6 text-[11px] text-amber-700 hover:bg-amber-100"
                    onClick={() => onRequestMentorReview(`Quiz question: ${q.question ?? q.statement}\n\nMentor prompt: ${q.commentPrompt}`)}
                  >
                    Ask mentor
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          disabled={index === 0}
          onClick={() => setIndex((n) => n - 1)}
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
          Previous
        </Button>
        <span className="text-xs text-slate-400">{index + 1} / {questions.length}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={index >= questions.length - 1}
          onClick={() => setIndex((n) => n + 1)}
        >
          Next
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
