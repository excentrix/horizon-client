"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SceneAction, WbElement } from "@/types";

// ── Engine states ─────────────────────────────────────────────────────────────

export type PlaybackState =
  | "idle"
  | "playing"
  | "paused"
  | "waiting_quiz"
  | "waiting_pause"
  | "completed";

// ── Whiteboard canvas state ───────────────────────────────────────────────────

export interface WhiteboardState {
  elements: WbElement[];
  highlighted: Record<string, string>; // id → color
  /** IDs of elements currently in their entry animation window */
  enteringIds: Set<string>;
  /** Active spotlight overlay, cleared automatically after duration */
  spotlight: { x: number; y: number; r: number } | null;
  pointer: { x: number; y: number; color?: string; mode?: "spotlight" | "laser" } | null;
}

// ── Per-action runtime state exposed to UI ────────────────────────────────────

export interface PlaybackFrame {
  actionIndex: number;
  action: SceneAction | null;
  /** Accumulated text for the current speech/peer_challenge action (streamed word by word) */
  speechText: string;
  whiteboard: WhiteboardState;
  playbackState: PlaybackState;
}

// ── Engine options ────────────────────────────────────────────────────────────

export interface PlaybackEngineOptions {
  /** ms between words when simulating text streaming (default 40) */
  wordIntervalMs?: number;
  /** Auto-advance pause actions after their duration_ms (0 = wait for user) */
  autoPauseContinue?: boolean;
  /** Called whenever a new speech action starts (for TTS) */
  onSpeech?: (agent: string, text: string, tts: boolean) => void;
  /** Called when quiz action fires — host must call `answerQuiz()` to unblock */
  onQuiz?: (action: Extract<SceneAction, { type: "quiz" }>) => void;
  /** Called when engine reaches completed state */
  onComplete?: () => void;
  /** Fired for widget interaction actions so host can postMessage into iframe */
  onWidgetMessage?: (
    message:
      | { type: "widget_set_state"; payload: Record<string, unknown> }
      | { type: "widget_highlight"; selector?: string; label?: string; payload?: Record<string, unknown> }
      | { type: "widget_annotation"; text: string; x?: number; y?: number; payload?: Record<string, unknown> }
      | { type: "widget_reveal"; target?: string; payload?: Record<string, unknown> }
  ) => void;
}

// ── Public API returned by the hook ──────────────────────────────────────────

export interface PlaybackEngine {
  frame: PlaybackFrame;
  load: (actions: SceneAction[]) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  answerQuiz: (selectedIndex: number) => void;
  continuePause: () => void;
  reset: () => void;
  /** Jump to a specific action index (pauses first) */
  seek: (index: number) => void;
  /** Append a single action and start the run loop if idle (used by director stream) */
  appendAction: (action: SceneAction) => void;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function emptyWhiteboard(): WhiteboardState {
  return {
    elements: [],
    highlighted: {},
    enteringIds: new Set(),
    spotlight: null,
    pointer: null,
  };
}

function emptyFrame(wb: WhiteboardState = emptyWhiteboard()): PlaybackFrame {
  return {
    actionIndex: -1,
    action: null,
    speechText: "",
    whiteboard: wb,
    playbackState: "idle",
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePlaybackEngine(options: PlaybackEngineOptions = {}): PlaybackEngine {
  // Keep a ref to options so any change (wordIntervalMs, callbacks) takes effect
  // immediately inside async loops without restarting the engine.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [frame, setFrame] = useState<PlaybackFrame>(emptyFrame());

  // Use refs for mutable runtime state to avoid stale closures in async loops
  const actionsRef = useRef<SceneAction[]>([]);
  const stateRef = useRef<PlaybackState>("idle");
  const wbRef = useRef<WhiteboardState>(emptyWhiteboard());
  const actionIndexRef = useRef<number>(-1);
  const abortRef = useRef<boolean>(false);  // signals current action loop to stop

  // Keep frame in sync helper
  const pushFrame = useCallback(
    (
      index: number,
      action: SceneAction | null,
      speech: string,
      state: PlaybackState,
      wb: WhiteboardState
    ) => {
      stateRef.current = state;
      actionIndexRef.current = index;
      wbRef.current = wb;
      setFrame({ actionIndex: index, action, speechText: speech, whiteboard: { ...wb }, playbackState: state });
    },
    []
  );

  // ── Streaming speech ────────────────────────────────────────────────────────

  const streamSpeech = useCallback(
    async (
      text: string,
      agent: string,
      action: SceneAction,
      tts: boolean,
      index: number
    ): Promise<void> => {
      const words = text.split(" ");
      let accumulated = "";
      optionsRef.current.onSpeech?.(agent, text, tts);

      const wordIntervalMs = optionsRef.current.wordIntervalMs ?? 80;
      for (const word of words) {
        if (abortRef.current) return;
        accumulated += (accumulated ? " " : "") + word;
        setFrame((prev) => ({
          ...prev,
          speechText: accumulated,
          action,
          actionIndex: index,
          playbackState: "playing",
        }));
        await delay(wordIntervalMs);
      }

      // Wait for TTS to finish before advancing to the next action.
      // TTS plays at ~130 WPM = ~462ms/word. We've already spent wordIntervalMs/word
      // streaming the text. Wait the estimated remaining TTS duration so the
      // next wb_draw doesn't fire while the mentor is still mid-sentence.
      if (tts && !abortRef.current) {
        const estimatedTtsMsPerWord = 460; // ~130 WPM
        const alreadySpentMs = words.length * wordIntervalMs;
        const remainingMs = Math.max(0, words.length * estimatedTtsMsPerWord - alreadySpentMs);
        if (remainingMs > 0) await delay(remainingMs);
      }
    },
    [] // no deps — reads live from optionsRef
  );

  // ── Whiteboard element drawing with stagger ─────────────────────────────────

  const drawElements = useCallback(
    async (
      elements: WbElement[],
      animate: boolean,
      staggerMs: number,
      index: number,
      action: SceneAction
    ): Promise<void> => {
      if (!animate) {
        const newIds = elements.map((e) => e.id);
        const entering = new Set([...Array.from(wbRef.current.enteringIds), ...newIds]);
        const wb: WhiteboardState = {
          elements: [...wbRef.current.elements, ...elements],
          highlighted: { ...wbRef.current.highlighted },
          enteringIds: entering,
          spotlight: wbRef.current.spotlight,
          pointer: wbRef.current.pointer,
        };
        wbRef.current = wb;
        setFrame((prev) => ({ ...prev, whiteboard: { ...wb }, action, actionIndex: index }));
        // Clear entering flags after animation window
        setTimeout(() => {
          wbRef.current = {
            ...wbRef.current,
            enteringIds: new Set(Array.from(wbRef.current.enteringIds).filter((id) => !newIds.includes(id))),
          };
          setFrame((prev) => ({ ...prev, whiteboard: { ...wbRef.current } }));
        }, 450);
        return;
      }

      for (const el of elements) {
        if (abortRef.current) return;
        const entering = new Set([...Array.from(wbRef.current.enteringIds), el.id]);
        const wb: WhiteboardState = {
          elements: [...wbRef.current.elements, el],
          highlighted: { ...wbRef.current.highlighted },
          enteringIds: entering,
          spotlight: wbRef.current.spotlight,
          pointer: wbRef.current.pointer,
        };
        wbRef.current = wb;
        setFrame((prev) => ({ ...prev, whiteboard: { ...wb }, action, actionIndex: index }));
        // Clear this element's entering flag after animation completes
        const elId = el.id;
        setTimeout(() => {
          wbRef.current = {
            ...wbRef.current,
            enteringIds: new Set(Array.from(wbRef.current.enteringIds).filter((id) => id !== elId)),
          };
          setFrame((prev) => ({ ...prev, whiteboard: { ...wbRef.current } }));
        }, 450);
        await delay(staggerMs);
      }
    },
    []
  );

  // ── Execute a single action ─────────────────────────────────────────────────

  const executeAction = useCallback(
    async (action: SceneAction, index: number): Promise<void> => {
      switch (action.type) {
        case "speech": {
          await streamSpeech(action.text, action.agent, action, action.tts ?? true, index);
          break;
        }

        case "peer_challenge": {
          await streamSpeech(action.text, action.agent, action, action.tts ?? true, index);
          break;
        }

        case "wb_draw": {
          await drawElements(
            action.elements,
            action.animate ?? true,
            action.stagger_ms ?? 200,
            index,
            action
          );
          break;
        }

        case "wb_highlight": {
          const highlighted: Record<string, string> = { ...wbRef.current.highlighted };
          for (const id of action.ids) {
            highlighted[id] = action.color ?? "#f59e0b";
          }
          const wb: WhiteboardState = { ...wbRef.current, highlighted };
          wbRef.current = wb;
          setFrame((prev) => ({ ...prev, whiteboard: { ...wb }, action, actionIndex: index }));

          if (action.duration_ms && action.duration_ms > 0) {
            await delay(action.duration_ms);
            const clearedHighlights = { ...wbRef.current.highlighted };
            for (const id of action.ids) delete clearedHighlights[id];
            const wbCleared: WhiteboardState = { ...wbRef.current, highlighted: clearedHighlights };
            wbRef.current = wbCleared;
            setFrame((prev) => ({ ...prev, whiteboard: { ...wbCleared } }));
          }
          break;
        }

        case "wb_clear": {
          const wb = emptyWhiteboard();
          wbRef.current = wb;
          setFrame((prev) => ({ ...prev, whiteboard: { ...wb }, action, actionIndex: index }));
          if (action.fade) await delay(400);
          break;
        }

        case "spotlight": {
          const spot = { x: action.x, y: action.y, r: action.r ?? 60 };
          const wb: WhiteboardState = {
            ...wbRef.current,
            spotlight: spot,
            pointer: {
              x: action.x,
              y: action.y,
              color: action.color ?? "#EC5B13",
              mode: "spotlight",
            },
          };
          wbRef.current = wb;
          setFrame((prev) => ({ ...prev, whiteboard: { ...wb }, action, actionIndex: index }));
          if (action.duration_ms > 0) {
            await delay(action.duration_ms);
          }
          const wbCleared: WhiteboardState = { ...wbRef.current, spotlight: null, pointer: null };
          wbRef.current = wbCleared;
          setFrame((prev) => ({ ...prev, whiteboard: { ...wbCleared } }));
          break;
        }

        case "laser": {
          const wb: WhiteboardState = {
            ...wbRef.current,
            pointer: {
              x: action.x,
              y: action.y,
              color: action.color ?? "#EC5B13",
              mode: "laser",
            },
          };
          wbRef.current = wb;
          setFrame((prev) => ({ ...prev, whiteboard: { ...wb }, action, actionIndex: index }));
          if ((action.duration_ms ?? 850) > 0) {
            await delay(action.duration_ms ?? 850);
          }
          const wbCleared: WhiteboardState = { ...wbRef.current, pointer: null };
          wbRef.current = wbCleared;
          setFrame((prev) => ({ ...prev, whiteboard: { ...wbCleared } }));
          break;
        }

        case "pause": {
          pushFrame(index, action, "", "waiting_pause", wbRef.current);
          if (action.duration_ms > 0) {
            await delay(action.duration_ms);
            if (!abortRef.current && optionsRef.current.autoPauseContinue) {
              stateRef.current = "playing";
              setFrame((prev) => ({ ...prev, playbackState: "playing" }));
            } else if (!abortRef.current) {
              await waitForResume();
            }
          } else {
            await waitForResume();
          }
          break;
        }

        case "quiz": {
          pushFrame(index, action, "", "waiting_quiz", wbRef.current);
          optionsRef.current.onQuiz?.(action);
          if (action.blocking !== false) {
            await waitForResume();
          }
          break;
        }

        case "discussion": {
          pushFrame(index, action, "", "paused", wbRef.current);
          // Discussion prompts don't auto-advance — user drives
          await waitForResume();
          break;
        }

        case "widget": {
          // Widgets render via the frame — we just set state and wait for user to continue
          pushFrame(index, action, "", "paused", wbRef.current);
          await waitForResume();
          break;
        }

        case "widget_set_state": {
          optionsRef.current.onWidgetMessage?.({
            type: "widget_set_state",
            payload: action.payload,
          });
          pushFrame(index, action, "", "playing", wbRef.current);
          if ((action.wait_ms ?? 0) > 0) await delay(action.wait_ms ?? 0);
          break;
        }

        case "widget_highlight": {
          optionsRef.current.onWidgetMessage?.({
            type: "widget_highlight",
            selector: action.selector,
            label: action.label,
            payload: action.payload,
          });
          pushFrame(index, action, "", "playing", wbRef.current);
          if ((action.wait_ms ?? 0) > 0) await delay(action.wait_ms ?? 0);
          break;
        }

        case "widget_annotation": {
          optionsRef.current.onWidgetMessage?.({
            type: "widget_annotation",
            text: action.text,
            x: action.x,
            y: action.y,
            payload: action.payload,
          });
          pushFrame(index, action, "", "playing", wbRef.current);
          if ((action.wait_ms ?? 0) > 0) await delay(action.wait_ms ?? 0);
          break;
        }

        case "widget_reveal": {
          optionsRef.current.onWidgetMessage?.({
            type: "widget_reveal",
            target: action.target,
            payload: action.payload,
          });
          pushFrame(index, action, "", "playing", wbRef.current);
          if ((action.wait_ms ?? 0) > 0) await delay(action.wait_ms ?? 0);
          break;
        }

        default:
          break;
      }
    },
    [streamSpeech, drawElements, pushFrame]
  );

  // ── Resume signal (used to unblock waiting states) ──────────────────────────

  const resumeResolverRef = useRef<(() => void) | null>(null);

  const waitForResume = useCallback((): Promise<void> => {
    return new Promise<void>((resolve) => {
      resumeResolverRef.current = resolve;
    });
  }, []);

  const triggerResume = useCallback(() => {
    const resolver = resumeResolverRef.current;
    if (resolver) {
      resumeResolverRef.current = null;
      resolver();
    }
  }, []);

  // ── Main action loop ────────────────────────────────────────────────────────

  const runLoop = useCallback(
    async (startIndex: number): Promise<void> => {
      const actions = actionsRef.current;
      stateRef.current = "playing";

      for (let i = startIndex; i < actions.length; i++) {
        if (abortRef.current) return;
        const currentState = stateRef.current as PlaybackState;
        if (currentState === "paused") {
          await waitForResume();
        }
        if (abortRef.current) return;

        actionIndexRef.current = i;
        await executeAction(actions[i], i);
      }

      if (!abortRef.current) {
        pushFrame(actions.length, null, "", "completed", wbRef.current);
        optionsRef.current.onComplete?.();
      }
    },
    [executeAction, waitForResume, pushFrame]
  );

  // ── Public API ──────────────────────────────────────────────────────────────

  const load = useCallback((actions: SceneAction[]) => {
    abortRef.current = true;
    triggerResume(); // unblock any stuck waits
    actionsRef.current = actions;
    wbRef.current = emptyWhiteboard();
    actionIndexRef.current = -1;
    resumeResolverRef.current = null;
    setTimeout(() => {
      abortRef.current = false;
      pushFrame(-1, null, "", "idle", emptyWhiteboard());
    }, 50);
  }, [pushFrame, triggerResume]);

  const play = useCallback(() => {
    if (stateRef.current !== "idle" && stateRef.current !== "completed") return;
    abortRef.current = false;
    runLoop(0);
  }, [runLoop]);

  const pause = useCallback(() => {
    if (stateRef.current === "playing") {
      stateRef.current = "paused";
      setFrame((prev) => ({ ...prev, playbackState: "paused" }));
    }
  }, []);

  const resume = useCallback(() => {
    if (stateRef.current === "paused") {
      stateRef.current = "playing";
      setFrame((prev) => ({ ...prev, playbackState: "playing" }));
      triggerResume();
    }
  }, [triggerResume]);

  const skip = useCallback(() => {
    // Abort current action and jump to the next
    abortRef.current = true;
    triggerResume();
    const nextIndex = actionIndexRef.current + 1;
    const actions = actionsRef.current;
    if (nextIndex >= actions.length) {
      pushFrame(actions.length, null, "", "completed", wbRef.current);
      optionsRef.current.onComplete?.();
      return;
    }
    setTimeout(() => {
      abortRef.current = false;
      runLoop(nextIndex);
    }, 50);
  }, [runLoop, pushFrame, triggerResume]);

  const answerQuiz = useCallback(
    (_selectedIndex: number) => {
      if (stateRef.current === "waiting_quiz") {
        stateRef.current = "playing";
        setFrame((prev) => ({ ...prev, playbackState: "playing" }));
        triggerResume();
      }
    },
    [triggerResume]
  );

  const continuePause = useCallback(() => {
    if (stateRef.current === "waiting_pause" || stateRef.current === "paused") {
      stateRef.current = "playing";
      setFrame((prev) => ({ ...prev, playbackState: "playing" }));
      triggerResume();
    }
  }, [triggerResume]);

  const reset = useCallback(() => {
    abortRef.current = true;
    triggerResume();
    wbRef.current = emptyWhiteboard();
    actionIndexRef.current = -1;
    resumeResolverRef.current = null;
    setTimeout(() => {
      abortRef.current = false;
      pushFrame(-1, null, "", "idle", emptyWhiteboard());
    }, 50);
  }, [pushFrame, triggerResume]);

  const appendAction = useCallback(
    (action: SceneAction) => {
      actionsRef.current = [...actionsRef.current, action];
      // If the engine is idle or completed, kick off the loop from this new action
      const currentState = stateRef.current as PlaybackState;
      if (currentState === "idle" || currentState === "completed") {
        abortRef.current = false;
        runLoop(actionsRef.current.length - 1);
      }
    },
    [runLoop]
  );

  const seek = useCallback(
    (index: number) => {
      abortRef.current = true;
      triggerResume();
      const actions = actionsRef.current;
      if (index < 0 || index >= actions.length) return;
      setTimeout(() => {
        abortRef.current = false;
        pushFrame(index - 1, null, "", "paused", wbRef.current);
        stateRef.current = "paused";
      }, 50);
    },
    [pushFrame, triggerResume]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      triggerResume();
    };
  }, [triggerResume]);

  return { frame, load, play, pause, resume, skip, answerQuiz, continuePause, reset, seek, appendAction };
}

// ── Utility ───────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
