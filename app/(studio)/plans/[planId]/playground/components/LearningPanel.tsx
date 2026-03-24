"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DailyTask } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Video,
  ExternalLink,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListChecks,
  Target,
} from "lucide-react";
import { MathMarkdown } from "@/components/markdown/MathMarkdown";
import { planningApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface LearningPanelProps {
  activeTask: DailyTask | undefined;
  lessonLoading: boolean;
  blockFeedback: FeedbackState;
  onFeedbackChange: (feedback: FeedbackState) => void;
  onRegenerateLesson?: () => void;
}

type LessonBlock = NonNullable<DailyTask["lesson_blocks"]>[number];
type FeedbackState = Record<string, "helpful" | "unhelpful" | null>;

const getStringProp = (value: Record<string, unknown>, key: string) => {
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : undefined;
};

function getVideoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (host.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (host.includes("vimeo.com")) {
      const videoId = parsed.pathname.split("/").filter(Boolean).at(-1);
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function splitIntoSegments(content?: string | null): string[] {
  if (!content) return [];
  const parts = content
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [content.trim()];
}

function toPlainText(markdown: string): string {
  return markdown
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[#>*_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeyTakeaways(segment?: string, max = 3): string[] {
  if (!segment) return [];
  const plain = toPlainText(segment);
  if (!plain) return [];
  const pieces = plain
    .split(/(?<=[.!?])\s+/)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 35);
  return pieces.slice(0, max);
}

function BlockFeedback({
  block,
  taskId,
  feedback,
  onFeedback,
  blockStartTime,
}: {
  block: LessonBlock;
  taskId: string;
  feedback: "helpful" | "unhelpful" | null;
  onFeedback: (blockId: string, helpful: boolean) => void;
  blockStartTime: number;
}) {
  const [submitting, setSubmitting] = useState(false);

  const handleClick = async (helpful: boolean) => {
    if (submitting || feedback !== null) return;
    setSubmitting(true);
    const timeSpent = Math.round((Date.now() - blockStartTime) / 1000);
    if (!block.id) return;
    
    try {
      await planningApi.submitBlockFeedback(taskId, [
        { block_id: block.id, helpful, time_spent_seconds: timeSpent },
      ]);
      onFeedback(block.id, helpful);
    } catch {
      // silent — preference inference is best-effort
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-100">
      <span className="text-[10px] text-slate-400 mr-1">Helpful?</span>
      <button
        onClick={() => handleClick(true)}
        disabled={submitting || feedback !== null}
        aria-label="Mark block helpful"
        className={cn(
          "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
          feedback === "helpful"
            ? "bg-emerald-100 text-emerald-700"
            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
        )}
      >
        <ThumbsUp className="w-3 h-3" />
        {feedback === "helpful" && <span>Yes</span>}
      </button>
      <button
        onClick={() => handleClick(false)}
        disabled={submitting || feedback !== null}
        aria-label="Mark block unhelpful"
        className={cn(
          "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
          feedback === "unhelpful"
            ? "bg-red-100 text-red-600"
            : "text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40"
        )}
      >
        <ThumbsDown className="w-3 h-3" />
        {feedback === "unhelpful" && <span>No</span>}
      </button>
    </div>
  );
}

export function LearningPanel({ activeTask, lessonLoading, blockFeedback, onFeedbackChange }: LearningPanelProps) {
  const panelMountTime = useRef(Date.now());
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [readingMode, setReadingMode] = useState<"focus" | "full">("focus");
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  const resources = (activeTask?.online_resources ?? []) as Array<
    string | Record<string, unknown>
  >;
  const resourceMetadata = (activeTask?.resource_metadata ?? {}) as Record<
    string,
    {
      url?: string;
      title?: string;
      content_type?: string;
      excerpt?: string | null;
      verified?: boolean;
    }
  >;

  const primaryResource = resources[0];
  const primaryResourceRecord =
    typeof primaryResource === "object" && primaryResource !== null
      ? (primaryResource as Record<string, unknown>)
      : null;
  const primaryResourceHref =
    typeof primaryResource === "string"
      ? primaryResource
      : primaryResourceRecord?.url ??
        primaryResourceRecord?.link ??
        primaryResourceRecord?.href;
  const primaryResourceTitle: string =
    typeof primaryResource === "string"
      ? primaryResource
      : primaryResourceRecord
        ? getStringProp(primaryResourceRecord, "title") ?? "Primary Resource"
        : "Primary Resource";

  const videoEmbed = primaryResourceHref
    ? getVideoEmbedUrl(String(primaryResourceHref))
    : null;

  const contentBlocks = useMemo<LessonBlock[]>(() => {
    if (activeTask?.lesson_blocks?.length) {
      return activeTask.lesson_blocks;
    }
    return [
      {
        id: "desc",
        type: "concept",
        title: "Overview",
        content: activeTask?.description || "No description provided.",
      },
    ];
  }, [activeTask]);

  const studyBlocks = useMemo(
    () => contentBlocks.filter((block) => block.type !== "exercise"),
    [contentBlocks]
  );

  const activeBlock = studyBlocks[activeBlockIndex] ?? studyBlocks[0];
  const activeSegments = useMemo(
    () => splitIntoSegments(activeBlock?.content),
    [activeBlock?.content]
  );
  const activeSegment = activeSegments[activeSegmentIndex] ?? activeSegments[0] ?? "";
  const segmentTakeaways = useMemo(
    () => extractKeyTakeaways(activeSegment, 3),
    [activeSegment]
  );

  useEffect(() => {
    setActiveBlockIndex(0);
  }, [activeTask?.id]);

  useEffect(() => {
    setActiveSegmentIndex(0);
  }, [activeBlockIndex, activeTask?.id]);

  const handleFeedback = (blockId: string, helpful: boolean) => {
    onFeedbackChange({
      ...blockFeedback,
      [blockId]: helpful ? "helpful" : "unhelpful",
    });
  };

  if (!activeTask) {
    return (
      <Card className="h-full border-dashed bg-slate-50/50">
        <CardContent className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Select a task to view learning material.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {/* <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{activeTask.estimated_duration_minutes} min</span>
            
          </div> */}
        </div>
        {/* <h2 className="text-2xl font-semibold tracking-tight">{activeTask.title}</h2>
        <p className="text-muted-foreground">{activeTask.description}</p> */}
      </div>

      {videoEmbed ? (
        <Card className="overflow-hidden border-none shadow-md ring-1 ring-black/5">
          <div className="aspect-video w-full bg-slate-950">
            <iframe
              src={videoEmbed}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Task Resource Video"
            />
          </div>
          <div className="bg-slate-50 p-3 text-xs text-slate-500 flex justify-between items-center border-t">
            <span className="flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5" /> Embedded Video Tutorial
            </span>
            <a
              href={String(primaryResourceHref)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-primary"
            >
              Open source <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </Card>
      ) : primaryResourceHref &&
        (!activeTask.lesson_blocks || activeTask.lesson_blocks.length === 0) ? (
        <Card className="bg-blue-50/30 border-blue-100">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-950">
                {primaryResourceTitle}
              </h4>
              <p className="text-sm text-blue-800/80 mt-1 line-clamp-2">
                {(() => {
                  const meta = resourceMetadata[String(primaryResourceHref)];
                  const excerpt =
                    meta && typeof meta.excerpt === "string"
                      ? meta.excerpt
                      : null;
                  return (
                    excerpt ||
                    "Click to read the recommended material for this concept."
                  );
                })()}
              </p>
              <a
                href={String(primaryResourceHref)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex mt-3 bg-white border border-blue-200 px-3 py-1.5 rounded-md items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 transition-colors shadow-sm"
              >
                Read Source Material <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {lessonLoading ? (
          <div className="space-y-3">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-20 w-full animate-pulse rounded bg-slate-100" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
              <Card className="border-slate-200 bg-slate-50/60">
                <CardContent className="p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Study path
                  </p>
                  <div className="space-y-2">
                    {studyBlocks.map((block, i) => (
                      <button
                        key={`nav-${block.id || i}`}
                        onClick={() => setActiveBlockIndex(i)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left text-sm transition",
                          i === activeBlockIndex
                            ? "border-violet-300 bg-violet-50 text-violet-800"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                        )}
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Section {i + 1}
                        </div>
                        <div className="line-clamp-2 font-medium">
                          {block.title || block.type}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* <div className="absolute top-0 left-0 h-full w-2 bg-gradient-to-b from-blue-400 to-indigo-500" /> */}
                {activeBlock ? (
                  <div className="px-8 py-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-lg font-bold capitalize text-slate-800">
                        <Lightbulb className="h-5 w-5 text-indigo-500" />
                        {activeBlock.title || activeBlock.type}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" />~
                          {Math.max(
                            2,
                            Math.round(
                              (activeBlock.content?.split(" ").length || 120) /
                                130,
                            ),
                          )}{" "}
                          min read
                        </div>
                        <div className="inline-flex gap-2 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                          <Button
                            variant={
                              readingMode === "focus" ? "default" : "ghost"
                            }
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => setReadingMode("focus")}
                          >
                            Focus mode
                          </Button>
                          <Button
                            variant={
                              readingMode === "full" ? "default" : "ghost"
                            }
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => setReadingMode("full")}
                          >
                            Full notes
                          </Button>
                        </div>
                      </div>
                    </div>

                    {readingMode === "focus" ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                          <div className="mb-2 flex items-center justify-between text-xs text-indigo-700">
                            <span className="font-semibold">Concept bite</span>
                            <span>
                              Segment {activeSegmentIndex + 1} of{" "}
                              {Math.max(1, activeSegments.length)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
                            <div
                              className="h-full rounded-full bg-indigo-500 transition-all"
                              style={{
                                width: `${((activeSegmentIndex + 1) / Math.max(1, activeSegments.length)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                          <div className="prose prose-sm md:prose-base max-w-none prose-slate leading-relaxed">
                            <MathMarkdown>{activeSegment}</MathMarkdown>
                          </div>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-900">
                              <ListChecks className="h-4 w-4" />
                              Key takeaways
                            </p>
                            <ul className="space-y-2 text-sm text-emerald-900/90">
                              {(segmentTakeaways.length
                                ? segmentTakeaways
                                : [
                                    "Summarize this concept in one sentence before moving on.",
                                  ]
                              ).map((takeaway, idx) => (
                                <li
                                  key={`takeaway-${idx}`}
                                  className="rounded-md bg-white/70 px-2.5 py-1.5"
                                >
                                  {takeaway}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
                              <Target className="h-4 w-4" />
                              Active recall
                            </p>
                            <div className="space-y-2 text-sm text-blue-900/90">
                              <p className="rounded-md bg-white/70 px-2.5 py-1.5">
                                Explain this segment aloud without looking at
                                the notes.
                              </p>
                              <p className="rounded-md bg-white/70 px-2.5 py-1.5">
                                Write one practical use-case from your current
                                project.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-5">
                        <div className="prose prose-sm md:prose-base max-w-none prose-slate leading-relaxed">
                          <MathMarkdown>
                            {activeBlock.content ?? ""}
                          </MathMarkdown>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (
                            readingMode === "focus" &&
                            activeSegmentIndex > 0
                          ) {
                            setActiveSegmentIndex((idx) =>
                              Math.max(0, idx - 1),
                            );
                            return;
                          }
                          setActiveBlockIndex((idx) => Math.max(0, idx - 1));
                        }}
                        disabled={
                          readingMode === "focus"
                            ? activeBlockIndex === 0 && activeSegmentIndex === 0
                            : activeBlockIndex === 0
                        }
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        {readingMode === "focus" && activeSegmentIndex > 0
                          ? "Previous bite"
                          : "Previous section"}
                      </Button>
                      {activeBlock.id && activeBlock.id !== "desc" ? (
                        <BlockFeedback
                          block={activeBlock}
                          taskId={activeTask.id}
                          feedback={blockFeedback[activeBlock.id] ?? null}
                          onFeedback={handleFeedback}
                          blockStartTime={panelMountTime.current}
                        />
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (
                            readingMode === "focus" &&
                            activeSegmentIndex < activeSegments.length - 1
                          ) {
                            setActiveSegmentIndex((idx) =>
                              Math.min(activeSegments.length - 1, idx + 1),
                            );
                            return;
                          }
                          setActiveBlockIndex((idx) =>
                            Math.min(studyBlocks.length - 1, idx + 1),
                          );
                        }}
                        disabled={
                          readingMode === "focus"
                            ? activeBlockIndex >= studyBlocks.length - 1 &&
                              activeSegmentIndex >= activeSegments.length - 1
                            : activeBlockIndex >= studyBlocks.length - 1
                        }
                      >
                        {readingMode === "focus" &&
                        activeSegmentIndex < activeSegments.length - 1
                          ? "Next bite"
                          : "Next section"}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {contentBlocks
              .filter((b) => b.type === "exercise")
              .map((block, i) => (
                <div
                  key={block.id || `exercise-${i}`}
                  className="rounded-2xl border border-violet-200 bg-violet-50/60 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-6 py-4 border-b border-violet-100">
                    <FlaskConical className="h-5 w-5 text-violet-600" />
                    <h3 className="text-base font-bold text-violet-900">
                      {block.title || "Try It"}
                    </h3>
                    <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold text-violet-500 bg-violet-100 rounded-full px-2 py-0.5">
                      Practice
                    </span>
                  </div>
                  <div className="px-6 py-5 prose prose-sm prose-violet md:prose-base max-w-none text-violet-900/80 leading-relaxed">
                    <MathMarkdown>{block.content ?? ""}</MathMarkdown>
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
