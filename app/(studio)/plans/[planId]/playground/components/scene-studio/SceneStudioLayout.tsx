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
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  PencilLine,
  Expand,
  RefreshCw,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { usePlaybackEngine } from "@/hooks/use-playback-engine";
import { InteractiveSimScene } from "../InteractiveSimScene";
import { AgentDialogueScene } from "../AgentDialogueScene";
import { CodeChallengeScene } from "../CodeChallengeScene";
import { ProjectBriefScene } from "../ProjectBriefScene";
import { ProjectCheckpointScene } from "../ProjectCheckpointScene";
import { VegaChartScene } from "../VegaChartScene";
import { MathMarkdown } from "@/components/markdown/MathMarkdown";
import { MermaidBlock } from "@/components/markdown/MermaidBlock";
import { CodeRunner } from "../CodeRunner";
import { SceneRail } from "./SceneRail";
import { SceneStage } from "./SceneStage";
import { RoundtableDock } from "./RoundtableDock";
import { MentorAssistant } from "../MentorAssistant";
import { PlaybackScene } from "./PlaybackScene";

interface SceneStudioLayoutProps {
  task: DailyTask;
  mentorName?: string | null;
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
  onOpenWorkspace?: (phase?: string) => void;
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
  challengeContract?: {
    problemStatement?: string;
    expectedOutput?: string;
    instructions?: string;
    requiredMethods?: string[];
    acceptanceCriteria?: string[];
    recommendedEnvironment?: string;
    sandboxSupported?: boolean;
  } | null;
}

export function SceneStudioLayout({
  task,
  mentorName,
  isRegenerating,
  regenerationLabel,
  onBackToPlan,
  onOpenWorkspace,
  onRequestMentorReview,
  onExecutionEvent,
  onHintRequested,
  onRegenerate,
  mentor,
  challengeContract,
}: SceneStudioLayoutProps) {
  const scenes = useMemo(() => task.lesson_blocks ?? [], [task.lesson_blocks]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [showFullChat, setShowFullChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [projectDrafts, setProjectDrafts] = useState<Record<string, Record<string, string>>>({});
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [directorMode, setDirectorMode] = useState(false);

  const SPEEDS = [0.5, 1, 1.5, 2];
  const cycleSpeed = () => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]);
  const speedLabel = speed === 1 ? "1x" : `${speed}x`;

  const engine = usePlaybackEngine({
    wordIntervalMs: Math.round(65 / speed),
  });

  // Reset engine and director mode when switching scenes
  useEffect(() => {
    engine.reset();
    setDirectorMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, task.id]);

  useEffect(() => {
    setActiveIndex(0);
    setProjectDrafts({});
  }, [task.id]);

  useEffect(() => {
    if (activeIndex <= scenes.length - 1) return;
    setActiveIndex(Math.max(0, scenes.length - 1));
  }, [activeIndex, scenes.length]);

  const activeScene = scenes[activeIndex] as
    | Record<string, unknown>
    | undefined;
  const activeType = String(activeScene?.type ?? "concept");
  const isChallengeScene = activeType === "code_challenge";

  useEffect(() => {
    if (isChallengeScene && showFullChat) {
      setShowFullChat(false);
    }
  }, [isChallengeScene, showFullChat]);

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

    if (activeType === "project_brief") {
      return (
        <ProjectBriefScene
          scene={activeScene as { title?: string; content?: string }}
          onOpenWorkspace={onOpenWorkspace}
        />
      );
    }

    if (activeType === "project_checkpoint") {
      return (
        <ProjectCheckpointScene
          scene={activeScene as { title?: string; content?: string }}
          onOpenWorkspace={onOpenWorkspace}
        />
      );
    }

    if (activeType === "code_challenge") {
      return (
        <div className="space-y-3">
          <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Challenge Mode
            </p>
            <p className="mt-1 text-sm text-amber-900">
              Mentor assistance is disabled for this challenge. Complete it independently in the sandbox.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Problem Statement</p>
                <p className="mt-1 text-sm text-slate-700">
                  {challengeContract?.problemStatement || "Solve the challenge using the task concepts and validate with tests."}
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Expected Output</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {challengeContract?.expectedOutput || "Match required outputs for provided test inputs."}
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Method Constraints</p>
                {challengeContract?.requiredMethods?.length ? (
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {challengeContract.requiredMethods.map((method) => (
                      <li key={method}>{method}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-slate-700">No special method constraints specified.</p>
                )}
              </div>
              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Environment</p>
                <p className="mt-1 text-sm text-slate-700">
                  {challengeContract?.sandboxSupported === false
                    ? `Use your own system (${challengeContract?.recommendedEnvironment || "local environment"}) and submit proof after execution.`
                    : `Use Horizon sandbox (${challengeContract?.recommendedEnvironment || "code runner"}) to implement and validate.`}
                </p>
              </div>
            </div>
            {challengeContract?.instructions ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Instructions</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {challengeContract.instructions}
                </p>
              </div>
            ) : null}
          </section>
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
            onExecutionEvent={onExecutionEvent}
          />
        </div>
      );
    }

    if (activeType === "vega_chart") {
      return (
        <VegaChartScene
          scene={
            activeScene as {
              title?: string;
              description?: string;
              vega_spec?: Record<string, unknown>;
            }
          }
        />
      );
    }

    if (activeType === "mermaid_diagram") {
      const mermaidSyntax = (activeScene as { mermaid_syntax?: string }).mermaid_syntax;
      return (
        <div className="space-y-3 p-4">
          {activeScene.title ? (
            <p className="text-sm font-semibold text-slate-700">{String(activeScene.title)}</p>
          ) : null}
          {mermaidSyntax ? (
            <MermaidBlock chart={mermaidSyntax} />
          ) : (
            <p className="text-sm text-slate-500">No diagram data available.</p>
          )}
          {activeScene.description ? (
            <p className="text-sm text-slate-600">{String(activeScene.description)}</p>
          ) : null}
        </div>
      );
    }

    // Feynman probe: inline teach-back assessment renderer
    if (activeType === "feynman_probe") {
      const fp = activeScene as import("@/types").LessonBlock;
      return (
        <div className="space-y-4 p-4">
          {fp.title && <p className="text-sm font-semibold text-slate-800">{fp.title}</p>}
          {fp.instructions && (
            <p className="text-sm text-slate-600 italic">{fp.instructions}</p>
          )}
          {(fp.probes ?? []).map((probe, i) => (
            <div key={probe.id ?? i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                  {probe.type ?? "explain"}
                </span>
                <span className="text-xs text-slate-400">{probe.target_concept}</span>
              </div>
              <p className="text-sm text-slate-700 font-medium">{probe.prompt}</p>
              {probe.reveal_hint && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-violet-600 hover:text-violet-800 select-none">
                    Show key insight
                  </summary>
                  <p className="mt-1 text-xs text-slate-600 bg-violet-50 rounded-lg px-3 py-2">{probe.reveal_hint}</p>
                </details>
              )}
              {probe.depth_question && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  💬 {probe.depth_question}
                </p>
              )}
            </div>
          ))}
        </div>
      );
    }

    // PlaybackScene for learnable blocks (concept, example, recap, objective, exercise, etc.)
    const PLAYBACK_TYPES = new Set([
      "concept", "example", "recap", "objective", "theory", "explanation",
      "case_study", "discussion", "review", "summary", "introduction",
    ]);
    const activeBlock = scenes[activeIndex] as import("@/types").LessonBlock | undefined;
    if (
      activeBlock &&
      (PLAYBACK_TYPES.has(activeType) || activeBlock.actions || activeBlock.actions_generated)
    ) {
      return (
        <PlaybackScene
          key={`${task.id}-${activeIndex}`}
          block={activeBlock}
          blockIndex={activeIndex}
          taskId={String(task.id)}
          engine={engine}
          directorMode={directorMode}
          muted={muted}
          className="p-4"
        />
      );
    }

    const sceneObj = activeScene as {
      content?: unknown;
      description?: unknown;
      title?: unknown;
    };
    const contentRaw = sceneObj.content;
    const content =
      typeof contentRaw === "string" && contentRaw.trim().length > 0
        ? contentRaw
        : typeof sceneObj.description === "string" && sceneObj.description.trim().length > 0
          ? sceneObj.description
          : `This scene is still being prepared for "${String(sceneObj.title ?? task.title)}".`;

    const segments = (() => {
      const output: Array<
        { kind: "markdown"; value: string } | { kind: "mermaid"; value: string }
      > = [];
      const regex = /```mermaid\s*([\s\S]*?)```/gi;
      let lastIndex = 0;
      let match: RegExpExecArray | null = regex.exec(content);
      while (match) {
        const before = content.slice(lastIndex, match.index).trim();
        if (before) output.push({ kind: "markdown", value: before });
        const diagram = (match[1] || "").trim();
        if (diagram) output.push({ kind: "mermaid", value: diagram });
        lastIndex = regex.lastIndex;
        match = regex.exec(content);
      }
      const trailing = content.slice(lastIndex).trim();
      if (trailing) output.push({ kind: "markdown", value: trailing });
      if (!output.length) output.push({ kind: "markdown", value: content });
      return output;
    })();

    const inferredLanguage = (() => {
      const markdownCodeFence = content.match(/```([a-zA-Z0-9_+-]+)\s*\n/);
      const lang = (markdownCodeFence?.[1] || "").toLowerCase();
      if (lang.includes("python")) return "python";
      if (lang.includes("javascript") || lang === "js" || lang.includes("typescript")) return "javascript";
      if (lang.includes("java")) return "java";
      if (lang.includes("cpp") || lang.includes("c++")) return "cpp";
      if (lang.includes("go")) return "go";
      if (lang.includes("rust")) return "rust";
      if (lang.includes("ruby")) return "ruby";
      if (lang.includes("php")) return "php";
      const taskText = `${task.title} ${task.description || ""}`.toLowerCase();
      if (taskText.includes("python")) return "python";
      if (taskText.includes("javascript") || taskText.includes("typescript")) return "javascript";
      return "python";
    })();

    const sceneId = String(sceneObj.title ?? `scene-${activeIndex}`);
    const placeholders = (() => {
      const matches = content.match(/\[[^\]\n]{8,220}\]/g) ?? [];
      const unique = Array.from(new Set(matches.map((m) => m.slice(1, -1).trim())));
      return unique.slice(0, 8);
    })();
    const hasProjectInputs =
      (activeType === "project_brief" || activeType === "project_checkpoint") &&
      placeholders.length > 0;

    return (
      <article className="space-y-4 border border-slate-200 bg-white p-4">
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
        <div className="space-y-4 border border-slate-200 bg-slate-50/80 p-4">
          <div className="prose prose-sm md:prose-base max-w-none prose-slate text-slate-800 leading-relaxed">
            {segments.map((segment, idx) =>
              segment.kind === "mermaid" ? (
                <MermaidBlock key={`mermaid-${idx}`} chart={segment.value} />
              ) : (
                <MathMarkdown key={`md-${idx}`}>{segment.value}</MathMarkdown>
              ),
            )}
          </div>
        </div>
        {hasProjectInputs ? (
          <section className="space-y-3 rounded-xl border border-[#EC5B13]/25 bg-[#EC5B13]/5 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#EC5B13]">
                Fill This Scene
              </p>
              <p className="text-xs text-slate-600">
                Complete these responses before moving to the checkpoint.
              </p>
            </div>
            <div className="grid gap-2">
              {placeholders.map((placeholder, index) => {
                const currentValue = projectDrafts[sceneId]?.[placeholder] ?? "";
                const useTextarea =
                  placeholder.length > 70 ||
                  /describe|explain|clearly state|value proposition|problem/i.test(placeholder);
                return (
                  <label key={`${sceneId}-${index}`} className="space-y-1">
                    <span className="block text-[11px] font-medium text-slate-700">
                      {index + 1}. {placeholder}
                    </span>
                    {useTextarea ? (
                      <textarea
                        value={currentValue}
                        onChange={(e) =>
                          setProjectDrafts((prev) => ({
                            ...prev,
                            [sceneId]: {
                              ...(prev[sceneId] ?? {}),
                              [placeholder]: e.target.value,
                            },
                          }))
                        }
                        rows={3}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none ring-0 focus:border-[#EC5B13]"
                        placeholder={`Enter: ${placeholder}`}
                      />
                    ) : (
                      <input
                        value={currentValue}
                        onChange={(e) =>
                          setProjectDrafts((prev) => ({
                            ...prev,
                            [sceneId]: {
                              ...(prev[sceneId] ?? {}),
                              [placeholder]: e.target.value,
                            },
                          }))
                        }
                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm outline-none ring-0 focus:border-[#EC5B13]"
                        placeholder={`Enter: ${placeholder}`}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </section>
        ) : null}
        {activeType === "exercise" ? (
          <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/30 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Hands-on Sandbox
              </p>
              <p className="text-xs text-amber-800/90">
                Implement and run your solution here before final challenge submission.
              </p>
            </div>
            <div className="h-[460px]">
              <CodeRunner
                defaultLanguage={inferredLanguage}
                onExecutionEvent={onExecutionEvent}
                onRequestMentorReview={onRequestMentorReview}
              />
            </div>
          </section>
        ) : null}
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
              {/* Live director toggle */}
              <button
                onClick={() => setDirectorMode((d) => !d)}
                title={directorMode ? "Disable live director mode" : "Enable live AI director (real-time)"}
                className={`min-w-[30px] rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  directorMode
                    ? "bg-[#EC5B13] text-white"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                Live
              </button>
              {/* Speed cycle */}
              <button
                onClick={cycleSpeed}
                className="min-w-[26px] px-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                title="Cycle playback speed"
              >
                {speedLabel}
              </button>

              {/* Prev scene */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((n) => Math.max(0, n - 1))}
                title="Previous scene"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>

              {/* Play / Pause / Resume */}
              {engine.frame.playbackState === "playing" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md"
                  onClick={engine.pause}
                  title="Pause"
                >
                  <Pause className="h-3 w-3" />
                </Button>
              ) : engine.frame.playbackState === "paused" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md"
                  onClick={engine.resume}
                  title="Resume"
                >
                  <Play className="h-3 w-3" />
                </Button>
              ) : engine.frame.playbackState === "completed" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md"
                  onClick={() => { engine.reset(); setTimeout(engine.play, 60); }}
                  title="Replay"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              ) : engine.frame.playbackState === "waiting_quiz" || engine.frame.playbackState === "waiting_pause" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md"
                  disabled
                  title="Waiting for response"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md"
                  onClick={engine.play}
                  title="Play"
                  disabled={engine.frame.playbackState !== "idle"}
                >
                  <Play className="h-3 w-3" />
                </Button>
              )}

              {/* Skip */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                onClick={engine.skip}
                title="Skip action"
                disabled={engine.frame.playbackState === "idle" || engine.frame.playbackState === "completed"}
              >
                <SkipForward className="h-3 w-3" />
              </Button>

              {/* Next scene */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                disabled={activeIndex >= scenes.length - 1}
                onClick={() => setActiveIndex((n) => Math.min(scenes.length - 1, n + 1))}
                title="Next scene"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>

              {/* Volume toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                onClick={() => setMuted((m) => !m)}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
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
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-lg text-xs"
                onClick={() => setShowFullChat((p) => !p)}
                disabled={isChallengeScene}
                title={isChallengeScene ? "Chat disabled during challenge mode" : "Open chat"}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {isChallengeScene ? (
            <div className="h-[92px] rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Mentor Locked
              </p>
              <p className="mt-1 text-sm text-amber-900">
                Challenge integrity mode is active. Mentor and hints will unlock after you leave this scene.
              </p>
            </div>
          ) : (
            <RoundtableDock
              messages={mentor.messages}
              streamingMessage={mentor.streamingMessage}
              socketStatus={mentor.socketStatus}
              playbackFrame={engine.frame}
              mentorName={mentorName}
              onQuickSend={(text) => {
                void mentor.onSendMessage(text);
              }}
            />
          )}
        </div>
        {showFullChat && !isChallengeScene ? (
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
