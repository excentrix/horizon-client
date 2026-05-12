"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { planningApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import type { DomainScenarioPayload, ExecutionDescriptor } from "@/types";
import { Loader2, RotateCcw } from "lucide-react";

type SessionState = "idle" | "starting" | "ready" | "syncing";

interface FlashcardSessionSurfaceProps {
  taskId: string;
  taskTitle: string;
  executionDescriptor?: ExecutionDescriptor | null;
  onComplete?: () => void;
}

interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  hint?: string | null;
}

function extractCards(session: DomainScenarioPayload | null): FlashcardItem[] {
  const payload = (session?.scenario_payload ?? {}) as Record<string, unknown>;
  const cards = payload.cards;
  if (!Array.isArray(cards)) return [];
  return cards
    .map((card, i): FlashcardItem | null => {
      if (!card || typeof card !== "object") return null;
      const c = card as Record<string, unknown>;
      return {
        id: String(c.id ?? `card-${i}`),
        front: String(c.front ?? c.question ?? ""),
        back: String(c.back ?? c.answer ?? ""),
        hint: typeof c.hint === "string" ? c.hint : null,
      };
    })
    .filter((item): item is FlashcardItem => Boolean(item?.front && item?.back));
}

export function FlashcardSessionSurface({
  taskId,
  taskTitle,
  executionDescriptor,
  onComplete,
}: FlashcardSessionSurfaceProps) {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [session, setSession] = useState<DomainScenarioPayload | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);

  useEffect(() => {
    setSessionState("idle");
    setSession(null);
    setSessionId(null);
    setIndex(0);
    setRevealed(false);
    setCorrect(0);
    setAttempted(0);
  }, [taskId]);

  useEffect(() => {
    if (!taskId || sessionState !== "idle") return;
    if ((executionDescriptor?.surface_type || "flashcard_session") !== "flashcard_session") return;

    let cancelled = false;
    setSessionState("starting");

    planningApi
      .startSurfaceSession(taskId, {
        surface_type: "flashcard_session",
        pack_ref:
          executionDescriptor?.pack_ref ||
          executionDescriptor?.simulation_type_or_pack_ref ||
          "flashcard_session",
      })
      .then((response) => {
        if (cancelled) return;
        setSession(response.session);
        setSessionId(response.session.id);
        setSessionState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        telemetry.toastError("Could not start flashcard session.");
        setSessionState("idle");
      });

    return () => {
      cancelled = true;
    };
  }, [executionDescriptor, sessionState, taskId]);

  const cards = useMemo(() => extractCards(session), [session]);
  const activeCard = cards[index] ?? null;
  const progress = cards.length ? Math.round((attempted / cards.length) * 100) : 0;
  const mastery = attempted > 0 ? correct / attempted : 0;

  const finishSession = async () => {
    if (!sessionId) return;
    setSessionState("syncing");
    try {
      await planningApi.interactSurfaceSession(taskId, sessionId, {
        interaction_payload: {
          action_type: "flashcard_submit",
          attempted,
          correct,
          confidence_alignment: mastery,
          completion_signal: attempted >= Math.max(3, Math.ceil(cards.length * 0.7)),
        },
      });
      telemetry.toastSuccess("Flashcard session synced.");
      onComplete?.();
    } catch {
      telemetry.toastError("Could not save flashcard progress.");
    } finally {
      setSessionState("ready");
    }
  };

  const gradeCard = (isCorrect: boolean) => {
    const nextAttempted = attempted + 1;
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    setAttempted(nextAttempted);
    setCorrect(nextCorrect);
    setRevealed(false);
    if (index < cards.length - 1) {
      setIndex((prev) => prev + 1);
      return;
    }
    void finishSession();
  };

  if (sessionState === "starting" || !session) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Curating your flashcard session…</p>
        </div>
      </div>
    );
  }

  if (!activeCard) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-white p-8">
        <div className="max-w-md text-center">
          <p className="text-base font-semibold text-slate-900">No cards available yet</p>
          <p className="mt-2 text-sm text-slate-500">
            This session pack did not include cards. Regenerate the task content and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Flashcard session</p>
            <p className="text-sm font-semibold text-slate-900">{taskTitle}</p>
          </div>
          <Badge variant="outline" className="text-slate-600">
            mastery {Math.round(mastery * 100)}%
          </Badge>
        </div>
        <div className="mt-3">
          <Progress value={progress} className="h-2" />
          <p className="mt-1 text-xs text-slate-500">
            {attempted}/{cards.length} reviewed · stop threshold: {Math.max(3, Math.ceil(cards.length * 0.7))}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Card {index + 1}</p>
        <div className="mt-3 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-base font-medium text-slate-900">{activeCard.front}</p>
          {revealed ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-700">{activeCard.back}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Think first, then reveal answer.</p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {!revealed ? (
            <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => setRevealed(true)}>
              Reveal answer
            </Button>
          ) : (
            <>
              <Button variant="outline" className="border-rose-200 text-rose-700" onClick={() => gradeCard(false)}>
                Need review
              </Button>
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => gradeCard(true)}>
                I got this
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            className="ml-auto"
            disabled={sessionState === "syncing"}
            onClick={() => {
              setIndex(0);
              setAttempted(0);
              setCorrect(0);
              setRevealed(false);
            }}
          >
            <RotateCcw className="mr-1 h-4 w-4" /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
