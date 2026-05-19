"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineQuizProps {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
  /** Called when the learner selects an answer. Pass index of selection. */
  onAnswer: (selectedIndex: number) => void;
  className?: string;
}

export function InlineQuiz({
  question,
  options,
  correct,
  explanation,
  onAnswer,
  className,
}: InlineQuizProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  const handleSelect = (i: number) => {
    if (answered) return;
    setSelected(i);
    onAnswer(i);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-indigo-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
          Quick Check
        </span>
      </div>

      {/* Question */}
      <p className="mb-4 text-[15px] font-medium leading-snug text-slate-800">{question}</p>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const isCorrect = i === correct;
          const isSelected = i === selected;
          const showResult = answered;

          let borderCls = "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50";
          let textCls = "text-slate-700";
          let iconEl: React.ReactNode = (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[11px] font-semibold text-slate-400">
              {String.fromCharCode(65 + i)}
            </span>
          );

          if (showResult) {
            if (isCorrect) {
              borderCls = "border-emerald-300 bg-emerald-50";
              textCls = "text-emerald-800 font-medium";
              iconEl = <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />;
            } else if (isSelected && !isCorrect) {
              borderCls = "border-red-200 bg-red-50";
              textCls = "text-red-700";
              iconEl = <XCircle className="h-5 w-5 shrink-0 text-red-400" />;
            } else {
              borderCls = "border-slate-100 bg-slate-50 opacity-60";
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-all duration-200",
                borderCls,
                textCls,
                !answered && "cursor-pointer",
                answered && "cursor-default"
              )}
            >
              {iconEl}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {answered && explanation && (
        <div className="mt-4 rounded-xl border border-indigo-100 bg-white px-4 py-3">
          <p className="text-[13px] leading-relaxed text-slate-600">
            <span className="font-semibold text-indigo-600">Explanation: </span>
            {explanation}
          </p>
        </div>
      )}

      {/* Continue hint */}
      {answered && (
        <p className="mt-3 text-center text-[11px] text-slate-400">
          Playback will continue automatically…
        </p>
      )}
    </div>
  );
}
