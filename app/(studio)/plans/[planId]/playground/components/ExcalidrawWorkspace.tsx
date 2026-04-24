"use client";

import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Brain, Clock3, Download, Loader2, Sparkles } from "lucide-react";
import type {
  AppState as ExcalidrawAppState,
  BinaryFiles as ExcalidrawBinaryFiles,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import { planningApi } from "@/lib/api";
import type {
  CanvasPresence,
  CanvasSceneData,
  CanvasSuggestion,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

interface ExcalidrawWorkspaceProps {
  taskId: string;
  taskTitle: string;
  surfaceType: "diagram_workspace" | "canvas_workspace";
  variant: "diagram" | "canvas";
  onExport?: (file: File) => void;
  onRequestMentorReview?: (content: string) => void;
  className?: string;
}

type SceneSelection = {
  ids: string[];
  labels: string[];
};

type ExcalidrawApiLike = {
  getSceneElements: () => readonly unknown[];
  getAppState: () => ExcalidrawAppState;
  getFiles: () => ExcalidrawBinaryFiles;
};

type ExcalidrawElementLike = {
  id?: string;
  text?: string;
  [key: string]: unknown;
};

const sanitizeAppState = (state: unknown) => {
  const next =
    state && typeof state === "object"
      ? ({ ...state } as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  // Excalidraw expects collaborators as a runtime map-like structure.
  // Serialized snapshots turn it into plain objects which crash on `.forEach`.
  delete next.collaborators;
  return next;
};

const getSceneSignature = (
  scene:
    | {
        elements?: unknown[];
        app_state?: Record<string, unknown>;
        files?: Record<string, unknown>;
      }
    | undefined
) =>
  JSON.stringify({
      elements: Array.isArray(scene?.elements) ? scene?.elements : [],
      app_state: sanitizeAppState(scene?.app_state),
      files: scene?.files || {},
  });

export function ExcalidrawWorkspace({
  taskId,
  taskTitle,
  surfaceType,
  variant,
  onExport,
  onRequestMentorReview,
  className,
}: ExcalidrawWorkspaceProps) {
  const apiRef = useRef<ExcalidrawApiLike | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSceneSignatureRef = useRef<string | null>(null);
  const lastSelectionSignatureRef = useRef<string>("");
  const hasBootHydratedRef = useRef(false);
  const sceneDataRef = useRef<CanvasSceneData | null>(null);
  const presenceSignatureRef = useRef<string>("");
  const suggestionsSignatureRef = useRef<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isRequestingSuggestion, setIsRequestingSuggestion] = useState(false);
  const [sceneData, setSceneData] = useState<CanvasSceneData | null>(null);
  const [suggestions, setSuggestions] = useState<CanvasSuggestion[]>([]);
  const [presenceState, setPresenceState] = useState<CanvasPresence>({});
  const [selection, setSelection] = useState<SceneSelection>({ ids: [], labels: [] });
  const [bootInitialData, setBootInitialData] = useState<ExcalidrawInitialDataState | undefined>(
    undefined
  );

  const localStorageKey = useMemo(
    () => `canvas:excalidraw:${surfaceType}:${taskId}`,
    [surfaceType, taskId]
  );

  const selectedSuggestion = suggestions.at(-1) ?? null;
  const mentorOnline = Boolean(presenceState?.mentor_online);
  const hasPointerRecalibratedRef = useRef(false);

  const recalibrateViewport = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("scroll"));
  }, []);

  const syncFromState = useCallback(
    (state: {
      scene_data?: CanvasSceneData;
      suggestions?: CanvasSuggestion[];
      presence_state?: CanvasPresence;
      budget_status?: Record<string, unknown>;
      session_state?: Record<string, unknown>;
    }) => {
      if (state.scene_data && typeof state.scene_data === "object") {
        const nextScene = state.scene_data;
        const nextSignature = getSceneSignature(nextScene);
        if (lastSceneSignatureRef.current !== nextSignature) {
          lastSceneSignatureRef.current = nextSignature;
          sceneDataRef.current = nextScene;
          setSceneData(nextScene);
        }
        if (typeof window !== "undefined") {
          localStorage.setItem(localStorageKey, JSON.stringify(state.scene_data));
        }
      }
      if (Array.isArray(state.suggestions)) {
        const next = JSON.stringify(state.suggestions);
        if (suggestionsSignatureRef.current !== next) {
          suggestionsSignatureRef.current = next;
          setSuggestions(state.suggestions);
        }
      }
      if (state.presence_state && typeof state.presence_state === "object") {
        const next = JSON.stringify(state.presence_state);
        if (presenceSignatureRef.current !== next) {
          presenceSignatureRef.current = next;
          setPresenceState(state.presence_state);
        }
      }
    },
    [localStorageKey]
  );

  const interact = useCallback(
    async (interactionPayload: Record<string, unknown>) => {
      if (!taskId || !sessionId) return;
      const response = await planningApi.interactSurfaceSession(taskId, sessionId, {
        interaction_payload: interactionPayload,
      });
      syncFromState(response);
    },
    [sessionId, syncFromState, taskId]
  );

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      if (!taskId) return;
      setIsHydrating(true);
      try {
        const started = await planningApi.startSurfaceSession(taskId, {
          surface_type: surfaceType,
          pack_ref: surfaceType,
          session_payload: { canvas_engine: "excalidraw_v1", variant },
        });
        if (cancelled) return;
        const nextSessionId = started.session?.id ?? null;
        setSessionId(nextSessionId);
        syncFromState(started);
        if (nextSessionId) {
          const state = await planningApi.getSurfaceSessionState(taskId, nextSessionId);
          if (!cancelled) syncFromState(state);
        }
      } catch {
        // best effort local mode
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [surfaceType, syncFromState, taskId, variant]);

  useEffect(() => {
    if (sceneData) return;
    if (typeof window === "undefined") return;
    const cached = window.localStorage.getItem(localStorageKey);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached) as CanvasSceneData;
      setSceneData(parsed);
    } catch {
      // ignore invalid cache
    }
  }, [localStorageKey, sceneData]);

  useEffect(() => {
    if (!sceneData || hasBootHydratedRef.current) return;
    setBootInitialData({
      elements: ((sceneData.elements || []) as unknown) as ExcalidrawInitialDataState["elements"],
      appState: sanitizeAppState(sceneData.app_state) as ExcalidrawInitialDataState["appState"],
      files: (sceneData.files || {}) as ExcalidrawInitialDataState["files"],
    });
    hasBootHydratedRef.current = true;
  }, [sceneData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    hasPointerRecalibratedRef.current = false;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      recalibrateViewport();
      raf2 = window.requestAnimationFrame(() => {
        recalibrateViewport();
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [bootInitialData, recalibrateViewport, variant]);

  useEffect(() => {
    if (!taskId || !sessionId) return;
    const poll = setInterval(() => {
      void planningApi
        .getSurfaceSessionState(taskId, sessionId)
        .then((state) => {
          syncFromState(state);
        })
        .catch(() => {
          // keep local-first UX if polling fails
        });
    }, 8000);
    return () => clearInterval(poll);
  }, [sessionId, syncFromState, taskId]);

  useEffect(() => {
    if (!taskId || !sessionId) return;
    const heartbeat = setInterval(() => {
      void interact({
        action_type: "update_presence",
        presence_state: {
          ...presenceState,
          learner_active_at: new Date().toISOString(),
          mentor_online: Boolean(presenceState?.mentor_online),
          session_id: sessionId,
        },
      });
    }, 18000);
    return () => clearInterval(heartbeat);
  }, [interact, presenceState, sessionId, taskId]);

  const pushSceneUpdate = useCallback(
    (nextScene: CanvasSceneData, nextSelection: SceneSelection) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void interact({
          action_type: "save_scene",
          scene_data: nextScene,
          selection: nextSelection,
          presence_state: {
            ...presenceState,
            learner_active_at: new Date().toISOString(),
            session_id: sessionId || undefined,
          },
        });
      }, 1200);
    },
    [interact, presenceState, sessionId]
  );

  const handleSceneChange = useCallback(
    (
      elements: readonly unknown[],
      appState: ExcalidrawAppState,
      files: ExcalidrawBinaryFiles
    ) => {
      const selectedIds = Object.keys(appState?.selectedElementIds || {});
      const selectedLabels = elements
        .map((element) => element as ExcalidrawElementLike)
        .filter((element) => selectedIds.includes(String(element?.id || "")))
        .map((element) => String(element?.text || element?.id || "element"))
        .filter(Boolean)
        .slice(0, 5);
      const nextSelection = { ids: selectedIds, labels: selectedLabels };
      const nextSelectionSignature = JSON.stringify(nextSelection);
      if (nextSelectionSignature !== lastSelectionSignatureRef.current) {
        lastSelectionSignatureRef.current = nextSelectionSignature;
        setSelection(nextSelection);
      }
      const nextScene: CanvasSceneData = {
        version: "excalidraw_v1",
        elements: elements as Array<Record<string, unknown>>,
        app_state: sanitizeAppState(appState),
        files: files as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      };
      const sceneSignature = getSceneSignature(nextScene);
      if (sceneSignature === lastSceneSignatureRef.current) {
        return;
      }
      sceneDataRef.current = nextScene;
      lastSceneSignatureRef.current = sceneSignature;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(localStorageKey, JSON.stringify(nextScene));
      }
      pushSceneUpdate(nextScene, nextSelection);
    },
    [localStorageKey, pushSceneUpdate]
  );

  const requestSuggestion = useCallback(
    async (actionType: "request_suggestion" | "review_selection" | "explain_tradeoff") => {
      if (!sessionId) return;
      setIsRequestingSuggestion(true);
      try {
        await interact({
          action_type: actionType,
          selection,
          summary: `Task: ${taskTitle}. Selection: ${selection.labels.join(", ") || "none selected"}`,
        });
      } finally {
        setIsRequestingSuggestion(false);
      }
    },
    [interact, selection, sessionId, taskTitle]
  );

  const handleResolveThread = useCallback(
    async (threadId: string) => {
      await interact({
        action_type: "resolve_thread",
        thread_id: threadId,
        status: "resolved",
      });
    },
    [interact]
  );

  const handleConvertSuggestion = useCallback(
    async (suggestionId: string) => {
      await interact({
        action_type: "convert_to_task",
        suggestion_id: suggestionId,
      });
    },
    [interact]
  );

  const handleSnapshot = useCallback(async () => {
    if (!apiRef.current) return;
    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const elements = apiRef.current.getSceneElements();
    const appState = apiRef.current.getAppState();
    const files = apiRef.current.getFiles();
    const blob = await exportToBlob({
      elements,
      appState: { ...appState, exportWithDarkMode: false },
      files,
      mimeType: "image/png",
      quality: 1,
      exportPadding: 16,
    });
    const file = new File([blob], `${variant}-${Date.now()}.png`, { type: "image/png" });
    onExport?.(file);
    await interact({
      action_type: "snapshot",
      snapshot_ref: {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        name: file.name,
      },
    });
  }, [interact, onExport, variant]);

  const handleMentorReview = useCallback(() => {
    const currentScene = sceneDataRef.current;
    if (!onRequestMentorReview || !currentScene) return;
    void (async () => {
      const { serializeAsJSON } = await import("@excalidraw/excalidraw");
      const serialized = serializeAsJSON(
        ((currentScene.elements || []) as unknown) as Parameters<typeof serializeAsJSON>[0],
        sanitizeAppState(currentScene.app_state) as Parameters<typeof serializeAsJSON>[1],
        ((currentScene.files || {}) as unknown) as Parameters<typeof serializeAsJSON>[2],
        "local"
      );
      onRequestMentorReview(
        `Review this ${variant} workspace for task "${taskTitle}". Selection: ${selection.labels.join(", ") || "none"}. Scene JSON:\n${serialized.slice(0, 3000)}`
      );
    })();
  }, [onRequestMentorReview, selection.labels, taskTitle, variant]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 max-w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm [&_.excalidraw]:h-full [&_.excalidraw]:w-full [&_.excalidraw]:overflow-hidden",
        className
      )}
      onPointerEnter={() => {
        if (hasPointerRecalibratedRef.current) return;
        hasPointerRecalibratedRef.current = true;
        recalibrateViewport();
      }}
    >
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <Excalidraw
          excalidrawAPI={(api: unknown) => {
            const candidate = api as Partial<ExcalidrawApiLike> | null;
            if (
              candidate &&
              typeof candidate.getSceneElements === "function" &&
              typeof candidate.getAppState === "function" &&
              typeof candidate.getFiles === "function"
            ) {
              apiRef.current = candidate as ExcalidrawApiLike;
            }
          }}
          initialData={bootInitialData}
          onChange={handleSceneChange}
          zenModeEnabled={variant === "diagram"}
          gridModeEnabled={variant === "diagram"}
          theme="light"
          detectScroll={false}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              saveAsImage: false,
            },
          }}
        />
      </div>

      <div className="shrink-0 border-t bg-slate-50/95 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-[0.12em]">
            {variant === "diagram" ? "Diagram" : "Canvas"}
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase tracking-[0.12em]">
            {mentorOnline ? "Mentor Online" : "Mentor Async"}
          </Badge>
          {isHydrating && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Syncing
            </span>
          )}
          <span className="truncate text-[11px] text-slate-600">
            Selection: {selection.labels.length ? selection.labels.join(", ") : "None"}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-7 bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => void requestSuggestion("request_suggestion")}
              disabled={isRequestingSuggestion}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Suggest
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              onClick={() => void requestSuggestion("review_selection")}
              disabled={isRequestingSuggestion}
            >
              <Brain className="mr-1.5 h-3.5 w-3.5" />
              Review
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              onClick={() => void requestSuggestion("explain_tradeoff")}
              disabled={isRequestingSuggestion}
            >
              <Clock3 className="mr-1.5 h-3.5 w-3.5" />
              Tradeoff
            </Button>
            <Button size="sm" variant="outline" className="h-7" onClick={handleMentorReview}>
              <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
              Ask Mentor
            </Button>
            <Button
              size="sm"
              className="h-7 bg-slate-900 text-white"
              onClick={() => void handleSnapshot()}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Use in Verification
            </Button>
          </div>
        </div>

        {selectedSuggestion && (
          <div className="mt-2 rounded-md border bg-white px-2.5 py-1.5 text-[11px]">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 truncate text-slate-700">
                {selectedSuggestion.title}: {selectedSuggestion.body}
              </p>
              <Button
                size="sm"
                className="h-6 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-700"
                onClick={() => void handleConvertSuggestion(selectedSuggestion.id)}
              >
                Convert
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px]"
                onClick={() => void handleResolveThread(selectedSuggestion.id)}
              >
                Resolve
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
