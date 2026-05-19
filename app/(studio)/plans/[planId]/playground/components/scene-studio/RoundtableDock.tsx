"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, BookOpen, MessageSquare, Mic, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import type { PlaybackFrame } from "@/hooks/use-playback-engine";
import { AgentSpeechBubble } from "./AgentSpeechBubble";

// Single-mentor model — teacher is the only agent
const MENTOR_COLOR = "#EC5B13";

const INTERNAL_NOISE_PATTERNS = [
  /i[' ]?m about to build a lesson/i,
  /what language should i use for code examples/i,
  /lesson preflight/i,
  /generation queued/i,
];

function isRenderableMentorMessage(text: string): boolean {
  const cleaned = (text || "").trim();
  if (!cleaned || cleaned.length < 6) return false;
  return !INTERNAL_NOISE_PATTERNS.some((p) => p.test(cleaned));
}

interface RoundtableDockProps {
  messages: ChatMessage[];
  streamingMessage: string | { id: string; content: string } | null;
  socketStatus: string;
  onQuickSend?: (text: string) => void;
  playbackFrame?: PlaybackFrame | null;
  /** Specialized mentor name from the learning plan — replaces "Aria" */
  mentorName?: string | null;
}

export function RoundtableDock({
  messages,
  streamingMessage,
  socketStatus,
  onQuickSend,
  playbackFrame,
  mentorName: specializedMentorName,
}: RoundtableDockProps) {
  const [quickInputOpen, setQuickInputOpen] = useState(false);
  const [quickInputValue, setQuickInputValue] = useState("");
  const lastNarrationRef = useRef<string>("");

  const isPlaybackSpeaking =
    playbackFrame?.playbackState === "playing" &&
    playbackFrame.action?.type === "speech";

  const mentorDisplayName = specializedMentorName ?? "Aria";

  const latestMentor = [...messages]
    .reverse()
    .find(
      (m) =>
        (m.sender_type === "ai" || m.sender_type === "system") &&
        isRenderableMentorMessage(m.content || ""),
    );

  const liveContent =
    typeof streamingMessage === "string"
      ? streamingMessage
      : streamingMessage?.content;

  const playbackText = playbackFrame?.speechText ?? null;
  useEffect(() => {
    const trimmed = (playbackText || "").trim();
    if (trimmed.length > 0) lastNarrationRef.current = trimmed;
  }, [playbackText]);

  const fallbackText =
    liveContent ||
    lastNarrationRef.current ||
    latestMentor?.content ||
    "I'm here as your mentor. Press Play to start the scene, then ask me anything.";

  const handleQuickSend = () => {
    const text = quickInputValue.trim();
    if (!text) return;
    onQuickSend?.(text);
    setQuickInputValue("");
    setQuickInputOpen(false);
  };

  const toggleQuickInput = () => setQuickInputOpen((prev) => !prev);

  return (
    <div className="h-[192px] w-full rounded-xl border border-gray-100 bg-white/60 backdrop-blur-md">
      <div className="flex h-full items-stretch min-h-0">
        {/* ── Mentor avatar ───────────────────────────────────────────────── */}
        <aside className="relative w-[90px] shrink-0 overflow-visible border-r border-gray-100/60 bg-white/40">
          <div
            className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent"
            style={{
              backgroundImage: `linear-gradient(${MENTOR_COLOR}1f, transparent)`,
            }}
          />
          <div className="absolute inset-x-0 top-3 flex flex-col items-center gap-1 opacity-10">
            <BookOpen className="h-5 w-5" style={{ color: MENTOR_COLOR }} />
            <div
              className="h-0.5 w-8 rounded-full"
              style={{ backgroundColor: MENTOR_COLOR }}
            />
          </div>
          <div className="flex h-full items-center justify-center pt-8">
            <div className="flex flex-col items-center gap-1">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full">
                <div
                  className="absolute inset-0 rounded-full border-2 transition-all duration-300"
                  style={{
                    borderColor: MENTOR_COLOR,
                    boxShadow: isPlaybackSpeaking
                      ? `0 0 16px ${MENTOR_COLOR}80`
                      : `0 0 8px ${MENTOR_COLOR}40`,
                  }}
                />
                <div
                  className="relative z-10 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gray-50"
                  style={{ backgroundColor: `${MENTOR_COLOR}1a` }}
                >
                  <Bot className="h-5 w-5" style={{ color: MENTOR_COLOR }} />
                </div>
                <span
                  className={cn(
                    "absolute -right-0.5 top-0.5 z-20 h-4 w-4 rounded-full border-2 border-white",
                    socketStatus === "open" ? "bg-emerald-500" : "bg-amber-400",
                  )}
                />
              </div>
              <span
                className="max-w-[80px] truncate rounded-full border bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm"
                style={{
                  borderColor: `${MENTOR_COLOR}4d`,
                  color: MENTOR_COLOR,
                }}
              >
                {mentorDisplayName}
              </span>
            </div>
          </div>
        </aside>

        {/* ── Speech / chat area ──────────────────────────────────────────── */}
        <div className="relative mx-3 mb-2 flex min-w-0 flex-1 items-center">
          <div className="relative flex h-full w-full items-center overflow-hidden rounded-[2.5rem] border border-white/50 bg-gradient-to-b from-white/40 to-white/80 px-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
            {isPlaybackSpeaking ? (
              <AgentSpeechBubble
                agent="teacher"
                text={playbackText ?? ""}
                streaming
                className="w-full"
              />
            ) : (
              <article className="max-w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 w-full">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {mentorDisplayName}
                </p>
                <p className="line-clamp-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                  {fallbackText}
                </p>
              </article>
            )}
          </div>

          {quickInputOpen && (
            <div className="absolute bottom-4 right-4 z-20 flex w-[340px] items-center gap-2 rounded-2xl border border-[#EC5B13] bg-slate-900 px-3 py-2 shadow-2xl">
              <input
                autoFocus
                value={quickInputValue}
                onChange={(e) => setQuickInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickSend();
                  }
                  if (e.key === "Escape") setQuickInputOpen(false);
                }}
                placeholder="Ask your mentor..."
                className="h-8 w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
              <button
                onClick={handleQuickSend}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#EC5B13] text-white hover:bg-[#d55010]"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Student controls ────────────────────────────────────────────── */}
        <aside className="flex w-[92px] shrink-0 items-center justify-end gap-2 border-l border-gray-100/60 bg-white/40 px-2 py-3">
          <div className="flex flex-col gap-2">
            <button
              onClick={toggleQuickInput}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white text-slate-600 hover:bg-slate-100",
                quickInputOpen
                  ? "border-[#EC5B13] text-[#EC5B13] shadow-[0_0_0_2px_rgba(236,91,19,0.15)]"
                  : "border-slate-200",
              )}
              title="Ask your mentor"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              title="Voice mode"
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={toggleQuickInput}
            className="group relative bg-transparent p-0"
            title="You"
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full">
              <div
                className={cn(
                  "absolute inset-0 rounded-full border-2 transition-colors",
                  quickInputOpen
                    ? "border-[#EC5B13] shadow-[0_0_10px_rgba(236,91,19,0.35)]"
                    : "border-gray-300/50 group-hover:border-[#EC5B13]/70",
                )}
              />
              <div className="relative z-10 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-gray-700">
                <User className="h-4 w-4" />
              </div>
            </div>
          </button>
        </aside>
      </div>
    </div>
  );
}
