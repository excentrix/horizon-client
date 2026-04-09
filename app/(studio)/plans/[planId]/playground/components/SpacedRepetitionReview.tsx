"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { SpacedRepetitionCard } from "@/types";

interface SpacedRepetitionReviewProps {
  cards: SpacedRepetitionCard[];
  onReview: (cardId: string, quality: number) => void;
  isSubmitting?: boolean;
}

const QUALITY_ACTIONS = [
  { label: "Again", value: 1, className: "bg-red-50 text-red-700 border-red-200" },
  { label: "Hard", value: 3, className: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "Good", value: 4, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "Easy", value: 5, className: "bg-blue-50 text-blue-700 border-blue-200" },
];

export function SpacedRepetitionReview({ cards, onReview, isSubmitting }: SpacedRepetitionReviewProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [cards.length]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        setFlipped((prev) => !prev);
      }
      if (event.key === "ArrowRight") {
        setIndex((prev) => Math.min(prev + 1, cards.length - 1));
        setFlipped(false);
      }
      if (event.key === "ArrowLeft") {
        setIndex((prev) => Math.max(prev - 1, 0));
        setFlipped(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cards.length]);

  const card = useMemo(() => cards[index], [cards, index]);

  if (!cards.length) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        No reviews due right now. Great job staying on top of it.
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 bg-slate-50 px-5 py-3 border-b border-slate-200">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Spaced Repetition</span>
        <span className="ml-2 text-xs text-slate-500">{index + 1} / {cards.length}</span>
      </div>

      <div className="p-6 space-y-5">
        <div className="min-h-[180px] rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 flex flex-col justify-center text-center">
          <p className="text-sm text-slate-500 mb-3">{flipped ? "Answer" : "Prompt"}</p>
          <p className="text-lg font-semibold text-slate-900 whitespace-pre-wrap">
            {flipped ? card.back : card.front}
          </p>
          {!flipped && card.hint ? (
            <p className="mt-3 text-xs text-slate-400">Hint: {card.hint}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIndex((prev) => Math.max(prev - 1, 0));
              setFlipped(false);
            }}
            disabled={index === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setFlipped((prev) => !prev)}
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Flip
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIndex((prev) => Math.min(prev + 1, cards.length - 1));
              setFlipped(false);
            }}
            disabled={index === cards.length - 1}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUALITY_ACTIONS.map((action) => (
            <Button
              key={action.value}
              variant="outline"
              size="sm"
              className={action.className}
              onClick={() => onReview(card.id, action.value)}
              disabled={isSubmitting}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
