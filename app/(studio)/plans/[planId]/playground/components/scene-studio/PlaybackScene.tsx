"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LessonBlock, SceneAction } from "@/types";
import type { PlaybackEngine } from "@/hooks/use-playback-engine";
import { AgentWhiteboard } from "./AgentWhiteboard";
import { InlineQuiz } from "./InlineQuiz";
import { InteractiveSimScene } from "../InteractiveSimScene";
import { planningApi } from "@/lib/api";
import { useDirectorStream } from "@/hooks/use-director-stream";

interface PlaybackSceneProps {
  block: LessonBlock;
  blockIndex: number;
  taskId: string;
  engine: PlaybackEngine;
  /** When true, use the real-time director SSE stream instead of pre-generated actions */
  directorMode?: boolean;
  muted?: boolean;
  className?: string;
}

export function PlaybackScene({
  block,
  blockIndex,
  taskId,
  engine,
  directorMode = false,
  className,
}: PlaybackSceneProps) {
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "polling" | "done" | "error">("idle");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const hasFetched = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bridgeRef = useRef<((msg: object) => void) | null>(null);

  const { frame, load, answerQuiz, continuePause, appendAction } = engine;
  const blockType = String(block.type ?? "concept").replace(/_/g, " ");

  // ── Director stream mode ────────────────────────────────────────────────────
  const director = useDirectorStream({
    onAction: (action) => {
      appendAction(action);
    },
    onComplete: () => {
      setFetchStatus("done");
    },
  });

  // Start director stream when directorMode is active
  useEffect(() => {
    if (!directorMode) return;
    if (hasFetched.current) return;
    hasFetched.current = true;
    setFetchStatus("loading");
    director.start(taskId, blockIndex);
  }, [directorMode, taskId, blockIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (directorMode && director.status === "streaming") {
      setFetchStatus("polling");
    }
  }, [directorMode, director.status]);

  // ── Action fetching + polling ───────────────────────────────────────────────

  const pollForActions = useCallback(async (force = false) => {
    try {
      const res = await planningApi.generateSceneActions(taskId, {
        block_index: blockIndex,
        force,
      });

      if (res.status === "cached" || res.status === "generated") {
        load(res.actions ?? []);
        setFetchStatus("done");
        return;
      }

      if (res.status === "error") {
        setFetchError((res as { error?: string }).error ?? "Generation failed");
        setFetchStatus("error");
        return;
      }

      // "queued" or "pending" — keep polling
      setFetchStatus("polling");
      pollTimerRef.current = setTimeout(() => void pollForActions(), 2500);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load scene");
      setFetchStatus("error");
    }
  }, [taskId, blockIndex, load]);

  const fetchActions = useCallback(async (force = false) => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setFetchStatus("loading");
    setFetchError(null);
    await pollForActions(force);
  }, [pollForActions]);

  useEffect(() => {
    if (directorMode) return; // director mode handles its own fetching
    if (hasFetched.current) return;
    if (block.actions && block.actions.length > 0) {
      load(block.actions as SceneAction[]);
      setFetchStatus("done");
      hasFetched.current = true;
      return;
    }
    hasFetched.current = true;
    void fetchActions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      bridgeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const action = frame.action;
    if (!action || !bridgeRef.current) return;
    const send = bridgeRef.current;
    if (action.type === "widget_set_state") {
      send({ type: "widget_setState", ...(action.payload || {}) });
    } else if (action.type === "widget_highlight") {
      send({
        type: "widget_highlight",
        selector: action.selector,
        label: action.label,
        ...(action.payload || {}),
      });
    } else if (action.type === "widget_annotation") {
      send({
        type: "widget_annotation",
        text: action.text,
        x: action.x,
        y: action.y,
        ...(action.payload || {}),
      });
    } else if (action.type === "widget_reveal") {
      send({
        type: "widget_reveal",
        target: action.target,
        ...(action.payload || {}),
      });
    }
  }, [frame.actionIndex, frame.action]);

  // ── Derived render state ────────────────────────────────────────────────────

  const currentAction = frame.action;
  const isQuiz = frame.playbackState === "waiting_quiz" && currentAction?.type === "quiz";
  const isPauseWait = frame.playbackState === "waiting_pause" && currentAction?.type === "pause";
  const isWidget = frame.playbackState === "paused" && currentAction?.type === "widget";
  const isCompleted = frame.playbackState === "completed";
  const hasWhiteboard = frame.whiteboard.elements.length > 0;
  const speechOnly =
    (currentAction?.type === "speech" || currentAction?.type === "peer_challenge") &&
    !hasWhiteboard;

  // ── Loading / error ─────────────────────────────────────────────────────────

  if (fetchStatus === "loading" || fetchStatus === "polling") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 py-14", className)}>
        <Loader2 className="h-7 w-7 animate-spin text-[#EC5B13]" />
        <p className="text-sm text-slate-500">
          {fetchStatus === "polling"
            ? "Generating your learning scene… ~15 s"
            : "Preparing scene…"}
        </p>
        {fetchStatus === "polling" && (
          <div className="flex gap-1 pt-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#EC5B13]"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (fetchStatus === "error") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 py-12", className)}>
        <p className="text-sm text-red-500">{fetchError}</p>
        <Button size="sm" variant="outline" onClick={() => fetchActions(true)}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  // ── Idle — waiting for Play ─────────────────────────────────────────────────

  if (frame.playbackState === "idle" && fetchStatus === "done") {
    const preview = typeof (block as Record<string, unknown>).content === "string"
      ? ((block as Record<string, unknown>).content as string).trim()
      : null;
    const cleaned = (preview || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[|]{2,}/g, " | ")
      .replace(/\s+/g, " ")
      .trim();
    const summary = cleaned.slice(0, 220);
    const bullets = cleaned
      .split(/[.;]\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 35)
      .slice(0, 3);
    return (
      <div className={cn("flex h-full flex-col p-4", className)}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-orange-50/50 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {blockType}
            </span>
            <span className="text-[11px] text-slate-400">Preview</span>
          </div>
          <h3 className="text-xl font-semibold text-slate-900">
            {block.title ?? "Scene ready"}
          </h3>
          {summary ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
              {summary}{cleaned.length > summary.length ? "…" : ""}
            </p>
          ) : null}
          {bullets.length ? (
            <ul className="mt-4 space-y-2">
              {bullets.map((item, idx) => (
                <li key={`${idx}-${item.slice(0, 18)}`} className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="mt-4 flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">Press Play to start this scene</p>
            <p className="mt-1 text-xs text-slate-500">The whiteboard and mentor narration will appear here.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main scene ──────────────────────────────────────────────────────────────

  return (
    <div className={cn("flex h-full flex-col gap-3", className)}>
      {/* Widget — full-stage iframe takes priority over whiteboard */}
      {isWidget && currentAction?.type === "widget" ? (
        <div className="flex-1 min-h-0">
          <InteractiveSimScene
            scene={{
              title: (currentAction.config?.title as string | undefined),
              description: (currentAction.config?.description as string | undefined),
              html_content: (currentAction.config?.html_content as string | undefined),
              sim_subtype: currentAction.widget_type as "simulation" | "code_lab" | "game" | "explorer",
              estimated_seconds: (currentAction.config?.estimated_seconds as number | undefined),
            }}
            onMountBridge={(send) => {
              bridgeRef.current = send;
            }}
          />
        </div>
      ) : (
        <>
          {/* Whiteboard — flex-1 so it fills the available stage */}
          {hasWhiteboard && (
            <AgentWhiteboard
              elements={frame.whiteboard.elements}
              highlighted={frame.whiteboard.highlighted}
              enteringIds={frame.whiteboard.enteringIds}
              spotlight={frame.whiteboard.spotlight}
              pointer={frame.whiteboard.pointer}
              className="w-full flex-1 min-h-[220px]"
              empty
            />
          )}

          {/* Spacer while agent speaks before first wb_draw */}
          {speechOnly && <div className="flex-1 min-h-[180px]" />}
        </>
      )}

      {/* Inline quiz */}
      {isQuiz && currentAction?.type === "quiz" && (
        <InlineQuiz
          question={currentAction.question}
          options={currentAction.options}
          correct={currentAction.correct}
          explanation={currentAction.explanation}
          onAnswer={(i) => answerQuiz(i)}
        />
      )}

      {/* Pause prompt */}
      {isPauseWait && currentAction?.type === "pause" && (
        <div className="flex shrink-0 flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-center">
          {currentAction.prompt && (
            <p className="text-[15px] text-slate-600">{currentAction.prompt}</p>
          )}
          <Button
            size="sm"
            className="bg-[#EC5B13] text-white hover:bg-[#d55010]"
            onClick={continuePause}
          >
            Continue
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Completed */}
      {isCompleted && (
        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
          <p className="text-sm font-medium text-emerald-700">Scene complete — press Next or replay in the toolbar.</p>
        </div>
      )}

      {/* Progress bar */}
      {frame.playbackState !== "idle" && (
        <div className="h-1 w-full shrink-0 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#EC5B13] transition-all duration-300"
            style={{
              width: `${Math.min(100, ((frame.actionIndex + 1) / Math.max(1, frame.actionIndex + 2)) * 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
