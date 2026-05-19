"use client";

import { useCallback, useRef, useState } from "react";
import type { SceneAction } from "@/types";

// ── Event types ───────────────────────────────────────────────────────────────

export type DirectorEvent =
  | { event: "thinking";   data: { text: string } }
  | { event: "agent_start"; data: { agent: string } }
  | { event: "agent_end";  data: { agent: string } }
  | { event: "action";     data: SceneAction }
  | { event: "cue_user";   data: { prompt: string } }
  | { event: "done";       data: Record<string, never> }
  | { event: "error";      data: { message: string } }
  | { event: "heartbeat";  data: Record<string, never> };

export type DirectorStatus = "idle" | "connecting" | "streaming" | "done" | "error";

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseDirectorStreamOptions {
  /** Called for every action event received */
  onAction?: (action: SceneAction) => void;
  /** Called when the director requests student input */
  onCueUser?: (prompt: string) => void;
  /** Called when the stream ends (done or error) */
  onComplete?: () => void;
}

export interface DirectorStream {
  status: DirectorStatus;
  activeAgent: string | null;
  isThinking: boolean;
  start: (taskId: string, blockIndex: number, maxTurns?: number) => void;
  stop: () => void;
}

export function useDirectorStream(options: UseDirectorStreamOptions = {}): DirectorStream {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [status, setStatus] = useState<DirectorStatus>("idle");
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setActiveAgent(null);
    setIsThinking(false);
  }, []);

  const start = useCallback(
    async (taskId: string, blockIndex: number, maxTurns = 12) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("connecting");
      setActiveAgent(null);
      setIsThinking(false);

      try {
        const res = await fetch(`/api/planning/tasks/${taskId}/scene-director/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            block_index: blockIndex,
            session_id: crypto.randomUUID(),
            max_turns: maxTurns,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          setStatus("error");
          return;
        }

        setStatus("streaming");

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE frames are delimited by double newlines
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            if (!frame.trim()) continue;
            const lines = frame.split("\n");
            const eventLine = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
            const dataLine  = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();

            if (!eventLine || !dataLine) continue;

            let parsed: DirectorEvent["data"];
            try {
              parsed = JSON.parse(dataLine);
            } catch {
              continue;
            }

            switch (eventLine) {
              case "thinking":
                setIsThinking(true);
                break;
              case "agent_start":
                setIsThinking(false);
                setActiveAgent((parsed as { agent: string }).agent);
                break;
              case "agent_end":
                setActiveAgent(null);
                break;
              case "action":
                optionsRef.current.onAction?.(parsed as SceneAction);
                break;
              case "cue_user":
                optionsRef.current.onCueUser?.((parsed as { prompt: string }).prompt);
                break;
              case "done":
                setStatus("done");
                optionsRef.current.onComplete?.();
                return;
              case "error":
                setStatus("error");
                optionsRef.current.onComplete?.();
                return;
              case "heartbeat":
                // keep alive — no-op
                break;
            }
          }
        }

        setStatus("done");
        optionsRef.current.onComplete?.();
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setStatus("error");
          optionsRef.current.onComplete?.();
        }
      }
    },
    []
  );

  return { status, activeAgent, isThinking, start, stop };
}
