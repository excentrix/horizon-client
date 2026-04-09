"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string | null;
}

interface FlashcardDeckProps {
  cards: Flashcard[];
}

export function FlashcardDeck({ cards }: FlashcardDeckProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

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

  if (!cards.length) {
    return null;
  }

  const card = cards[index];

  return (
    <div className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 bg-slate-50 px-5 py-3 border-b border-slate-200">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Flashcards</span>
        <span className="ml-2 text-xs text-slate-500">{index + 1} / {cards.length}</span>
      </div>

      <div className="p-6">
        <div className="min-h-[180px] rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 flex flex-col justify-center text-center">
          <p className="text-sm text-slate-500 mb-3">{flipped ? "Back" : "Front"}</p>
          <p className="text-lg font-semibold text-slate-900 whitespace-pre-wrap">{flipped ? card.back : card.front}</p>
          {!flipped && card.hint ? (
            <p className="mt-3 text-xs text-slate-400">Hint: {card.hint}</p>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between">
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
      </div>
    </div>
  );
}
