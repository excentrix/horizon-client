"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChatMessage, DailyTask } from "@/types";
import type { StepId } from "../surface-runtime-router";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  PanelLeft,
  Minimize2,
  Play,
  Volume2,
  PencilLine,
  Expand,
  RefreshCw,
} from "lucide-react";
import { InteractiveSimScene } from "../InteractiveSimScene";
import { AgentDialogueScene } from "../AgentDialogueScene";
import { CodeChallengeScene } from "../CodeChallengeScene";
import { MathMarkdown } from "@/components/markdown/MathMarkdown";
import { SceneRail } from "./SceneRail";
import { SceneStage } from "./SceneStage";
import { RoundtableDock } from "./RoundtableDock";
import { MentorAssistant } from "../MentorAssistant";

interface SceneStudioLayoutProps {
  task: DailyTask;
  isRegenerating?: boolean;
  regenerationLabel?: string | null;
  onBackToPlan: () => void;
  onRequestMentorReview?: (content: string) => void;
  onExecutionEvent?: (payload: {
    event_type:
      | "run_started"
      | "run_completed"
      | "runtime_error"
      | "compile_error"
      | "test_passed"
      | "test_failed";
    language?: string;
    run_id?: string;
    status?: string;
    error_type?: string;
    meta?: Record<string, unknown>;
  }) => void;
  onHintRequested?: () => void;
  onRegenerate?: () => void;
  mentor: {
    messages: ChatMessage[];
    isTyping: boolean;
    streamingMessage: string | { id: string; content: string } | null;
    onSendMessage: (message: string, actionType?: string) => Promise<void>;
    socketStatus: string;
    currentStep?: StepId;
  };
}

export function SceneStudioLayout({
  task,
  isRegenerating,
  regenerationLabel,
  onBackToPlan,
  onRequestMentorReview,
  onExecutionEvent,
  onHintRequested,
  onRegenerate,
  mentor,
}: SceneStudioLayoutProps) {
  const scenes = useMemo(() => task.lesson_blocks ?? [], [task.lesson_blocks]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [showFullChat, setShowFullChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [task.id]);

  useEffect(() => {
    if (activeIndex <= scenes.length - 1) return;
    setActiveIndex(Math.max(0, scenes.length - 1));
  }, [activeIndex, scenes.length]);

  const activeScene = scenes[activeIndex] as
    | Record<string, unknown>
    | undefined;
  const activeType = String(activeScene?.type ?? "concept");

  const toggleFullscreen = async () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const renderScene = () => {
    if (!activeScene)
      return <p className="text-sm text-slate-600">No scene available.</p>;

    if (activeType === "interactive_sim") {
      return (
        <InteractiveSimScene
          scene={
            activeScene as {
              title?: string;
              description?: string;
              html_content?: string;
              sim_subtype?: "simulation" | "code_lab" | "game" | "explorer";
              estimated_seconds?: number;
            }
          }
        />
      );
    }

    if (activeType === "agent_dialogue") {
      return (
        <AgentDialogueScene
          scene={
            activeScene as {
              title?: string;
              turns?: Array<{
                speaker?: string;
                persona_type?: string;
                text?: string;
              }>;
            }
          }
        />
      );
    }

    if (activeType === "code_challenge") {
      return (
        <CodeChallengeScene
          scene={
            activeScene as {
              title?: string;
              language?: string;
              starter_code?: string;
              test_cases?: Array<{ input?: string; expected_output?: string }>;
              hints?: string[];
            }
          }
          onRequestMentorReview={onRequestMentorReview}
          onExecutionEvent={onExecutionEvent}
        />
      );
    }

    const sceneObj = activeScene as { content?: unknown; description?: unknown; title?: unknown };
    const contentRaw = sceneObj.content;
    const content =
      typeof contentRaw === "string" && contentRaw.trim().length > 0
        ? contentRaw
        : typeof sceneObj.description === "string" && sceneObj.description.trim().length > 0
          ? sceneObj.description
          : `This scene is still being prepared for "${String(sceneObj.title ?? task.title)}".`;
    return (
      <article className="border border-slate-200 bg-white p-4">
        {onHintRequested ? (
          <div className="mb-2.5 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={onHintRequested}
            >
              Need explanation
            </Button>
          </div>
        ) : null}
        <div className="border border-slate-200 bg-slate-50/80 p-4">
          <div className="prose prose-sm md:prose-base max-w-none prose-slate text-slate-800 leading-relaxed">
            <MathMarkdown>{content}</MathMarkdown>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <div
        className={`flex shrink-0 items-center gap-3 px-1 ${
          showFullChat && !railCollapsed ? "h-9" : "h-12"
        }`}
      >
        <Button
          variant="ghost"
          size="sm"
          className={`border-slate-300 px-3 text-xs font-semibold text-slate-700 ${
            showFullChat && !railCollapsed ? "h-7" : "h-8"
          }`}
          onClick={onBackToPlan}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`truncate font-semibold text-slate-900 ${
                showFullChat && !railCollapsed ? "text-base" : "text-lg"
              }`}
            >
              {task.title}
            </p>
            {isRegenerating ? (
              <span className="inline-flex items-center rounded-full border border-[#EC5B13]/30 bg-[#EC5B13]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#EC5B13]">
                {regenerationLabel || "Regenerating"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div
        className="min-h-0 flex-1"
      >
        <div
        className={`grid h-full min-h-0 gap-2 ${
          showFullChat
            ? railCollapsed
              ? "lg:grid-cols-[minmax(0,1fr)_320px]"
              : "lg:grid-cols-[220px_minmax(0,1fr)_320px]"
            : railCollapsed
              ? "lg:grid-cols-[minmax(0,1fr)]"
              : "lg:grid-cols-[220px_minmax(0,1fr)]"
        }`}
      >
        {!railCollapsed ? (
          <SceneRail
            scenes={scenes}
            activeIndex={activeIndex}
            collapsed={false}
            onToggleCollapsed={() => setRailCollapsed(true)}
            onSelectScene={setActiveIndex}
          />
        ) : null}
        <div className="grid min-h-0 h-full grid-rows-[minmax(0,1fr)_auto_auto] gap-2">
          <SceneStage
            activeIndex={activeIndex}
            totalScenes={scenes.length}
            canPrev={activeIndex > 0}
            canNext={activeIndex < scenes.length - 1}
            hideFooter
            onPrev={() => setActiveIndex((n) => Math.max(0, n - 1))}
            onNext={() =>
              setActiveIndex((n) => Math.min(scenes.length - 1, n + 1))
            }
            onJump={setActiveIndex}
          >
            {renderScene()}
          </SceneStage>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2 py-1.5">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                title="Toggle scene previews"
                onClick={() => setRailCollapsed((p) => !p)}
              >
                <PanelLeft className="h-3 w-3" />
              </Button>
              <span>
                {activeIndex + 1} / {scenes.length}
              </span>
              <span className="h-3 w-px bg-slate-200" />
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100/80 px-1 py-0.5">
              <span className="px-1 text-[11px] text-slate-500">1x</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((n) => Math.max(0, n - 1))}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                title="Play"
              >
                <Play className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                disabled={activeIndex >= scenes.length - 1}
                onClick={() =>
                  setActiveIndex((n) => Math.min(scenes.length - 1, n + 1))
                }
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                title="Audio"
              >
                <Volume2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                title="Annotate"
              >
                <PencilLine className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={onRegenerate}
                title="Regenerate"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={toggleFullscreen}
                title="Fullscreen"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Expand className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs" onClick={() => setShowFullChat((p) => !p)}>
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <RoundtableDock
            messages={mentor.messages}
            streamingMessage={mentor.streamingMessage}
            socketStatus={mentor.socketStatus}
            onQuickSend={(text) => {
              void mentor.onSendMessage(text);
            }}
          />
        </div>
        {showFullChat ? (
          <div className="min-h-0 h-full overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-slate-50 px-3">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <button className="hover:text-slate-900">Notes</button>
                <button className="font-medium text-slate-900">Chat</button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setShowFullChat(false)}
                title="Close chat"
              >
                <PanelLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
            <MentorAssistant {...mentor} />
          </div>
        ) : null}
      </div>
      </div>
    </div>
  );
}
