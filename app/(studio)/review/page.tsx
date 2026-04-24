"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, ChevronLeft, RefreshCw, X } from "lucide-react";
import { planningApi } from "@/lib/api";
import type { SpacedRepetitionCard } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SESSION_SIZE = 10;

type Quality = 0 | 2 | 4 | 5;

const QUALITY_BUTTONS: { label: string; quality: Quality; color: string; description: string }[] = [
  { label: "Again", quality: 0, color: "bg-rose-500 hover:bg-rose-600 text-white", description: "Didn't recall" },
  { label: "Hard",  quality: 2, color: "bg-amber-500 hover:bg-amber-600 text-white", description: "Recalled with effort" },
  { label: "Good",  quality: 4, color: "bg-emerald-500 hover:bg-emerald-600 text-white", description: "Recalled correctly" },
  { label: "Easy",  quality: 5, color: "bg-sky-500 hover:bg-sky-600 text-white", description: "Instantly recalled" },
];

function intervalLabel(days: number): string {
  if (days === 0) return "again soon";
  if (days === 1) return "tomorrow";
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.round(days / 7)} week${days < 14 ? "" : "s"}`;
  return `${Math.round(days / 30)} month${days < 60 ? "" : "s"}`;
}

export default function ReviewPage() {
  const router = useRouter();
  const [cards, setCards] = useState<SpacedRepetitionCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Array<{ card: SpacedRepetitionCard; quality: Quality; nextInterval: number }>>([]);
  const [done, setDone] = useState(false);
  const [totalDue, setTotalDue] = useState(0);
  const flipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    planningApi
      .getSpacedRepetitionDue({ limit: SESSION_SIZE })
      .then(({ cards: due, count }) => {
        setCards(due);
        setTotalDue(count);
      })
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, []);

  const currentCard = cards[currentIndex];
  const total = cards.length;
  const progress = total > 0 ? Math.round((currentIndex / total) * 100) : 0;

  const handleFlip = useCallback(() => {
    if (!submitting) setFlipped((f) => !f);
  }, [submitting]);

  const handleQuality = useCallback(
    async (quality: Quality) => {
      if (!currentCard || submitting) return;
      setSubmitting(true);
      try {
        const { card: updated } = await planningApi.reviewSpacedRepetitionCard({
          card_id: currentCard.id,
          quality,
        });
        setResults((prev) => [...prev, { card: currentCard, quality, nextInterval: updated.interval_days }]);
      } catch {
        setResults((prev) => [...prev, { card: currentCard, quality, nextInterval: 1 }]);
      }

      if (currentIndex + 1 >= total) {
        setDone(true);
      } else {
        setFlipped(false);
        setCurrentIndex((i) => i + 1);
      }
      setSubmitting(false);
    },
    [currentCard, currentIndex, total, submitting],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!flipped) { handleFlip(); return; }
      }
      if (flipped) {
        if (e.key === "1") handleQuality(0);
        if (e.key === "2") handleQuality(2);
        if (e.key === "3") handleQuality(4);
        if (e.key === "4") handleQuality(5);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, handleFlip, handleQuality]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
        <h1 className="text-xl font-semibold">No cards due today</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          You&apos;re all caught up! Cards appear here when it&apos;s time to review them based on the SM-2 schedule.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Go back
        </Button>
      </div>
    );
  }

  if (done) {
    const avgQuality = results.reduce((s, r) => s + r.quality, 0) / results.length;
    const again = results.filter((r) => r.quality === 0).length;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <Check className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Session complete</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You reviewed {total} card{total !== 1 ? "s" : ""}
            {totalDue > total && ` · ${totalDue - total} more due`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          <div className="rounded-xl border bg-card p-4 text-center">
            <div className="text-2xl font-bold">{Math.round(avgQuality * 20)}%</div>
            <div className="mt-1 text-xs text-muted-foreground">Recall rate</div>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-rose-500">{again}</div>
            <div className="mt-1 text-xs text-muted-foreground">To review again</div>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-1.5">
          {results.map(({ card, quality, nextInterval }, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border bg-card/50 px-3 py-2 text-sm">
              <span className="truncate text-muted-foreground max-w-[180px]">{card.front}</span>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-xs",
                  quality === 0 && "border-rose-300 text-rose-600",
                  quality === 2 && "border-amber-300 text-amber-600",
                  quality >= 4 && "border-emerald-300 text-emerald-600",
                )}
              >
                {intervalLabel(nextInterval)}
              </Badge>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Dashboard
          </Button>
          {totalDue > total && (
            <Button
              size="sm"
              onClick={() => {
                setResults([]);
                setCurrentIndex(0);
                setFlipped(false);
                setDone(false);
                planningApi
                  .getSpacedRepetitionDue({ limit: SESSION_SIZE })
                  .then(({ cards: due, count }) => {
                    setCards(due);
                    setTotalDue(count);
                  });
              }}
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Review {Math.min(SESSION_SIZE, totalDue - total)} more
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8 md:py-16">
      {/* Header */}
      <div className="w-full max-w-lg">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <button onClick={() => router.back()} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Exit
          </button>
          <span>{currentIndex + 1} / {total}</span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[color:var(--brand-indigo)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="mt-10 w-full max-w-lg">
        <div
          ref={flipRef}
          className="relative cursor-pointer select-none"
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.45s ease",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
          onClick={handleFlip}
        >
          {/* Front */}
          <div
            className="backface-hidden rounded-2xl border bg-card shadow-sm p-8 min-h-[260px] flex flex-col items-center justify-center gap-4"
            style={{ backfaceVisibility: "hidden" }}
          >
            <Badge variant="secondary" className="text-xs">Question</Badge>
            <p className="text-center text-lg font-medium leading-relaxed">{currentCard.front}</p>
            {!flipped && (
              <p className="mt-2 text-xs text-muted-foreground">
                Tap to reveal · <kbd className="font-mono">Space</kbd>
              </p>
            )}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 backface-hidden rounded-2xl border bg-card shadow-sm p-8 min-h-[260px] flex flex-col items-center justify-center gap-4"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <Badge className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-200">Answer</Badge>
            <p className="text-center text-base leading-relaxed">{currentCard.back}</p>
            {currentCard.hint && (
              <p className="text-xs text-muted-foreground italic border-t pt-3 w-full text-center">
                Hint: {currentCard.hint}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons (shown after flip) */}
      {flipped && (
        <div className="mt-8 w-full max-w-lg">
          <p className="mb-3 text-center text-xs text-muted-foreground">
            How well did you remember? · <kbd className="font-mono">1</kbd>–<kbd className="font-mono">4</kbd>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {QUALITY_BUTTONS.map(({ label, quality, color, description }) => (
              <button
                key={quality}
                onClick={() => handleQuality(quality)}
                disabled={submitting}
                className={cn(
                  "flex flex-col items-center rounded-xl px-2 py-3 text-sm font-medium transition-opacity",
                  color,
                  submitting && "opacity-50 cursor-not-allowed",
                )}
              >
                <span>{label}</span>
                <span className="mt-0.5 text-xs font-normal opacity-80">{description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!flipped && (
        <Button
          className="mt-8"
          onClick={handleFlip}
          disabled={submitting}
        >
          Reveal answer
        </Button>
      )}
    </div>
  );
}
