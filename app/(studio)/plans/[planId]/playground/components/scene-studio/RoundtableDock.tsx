"use client";

import { useState } from "react";
import { Bot, BookOpen, Mic, MessageSquare, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

interface RoundtableDockProps {
  messages: ChatMessage[];
  streamingMessage: string | { id: string; content: string } | null;
  socketStatus: string;
  onQuickSend?: (text: string) => void;
}

export function RoundtableDock({
  messages,
  streamingMessage,
  socketStatus,
  onQuickSend,
}: RoundtableDockProps) {
  const [quickInputOpen, setQuickInputOpen] = useState(false);
  const [quickInputValue, setQuickInputValue] = useState("");

  const latestMentor = [...messages]
    .reverse()
    .find((m) => m.sender_type === "ai" || m.sender_type === "system");
  const mentorName = latestMentor?.sender_name?.trim() || "AI Teacher";

  const liveContent =
    typeof streamingMessage === "string"
      ? streamingMessage
      : streamingMessage?.content;

  const mentorText =
    liveContent ||
    latestMentor?.content ||
    "I am ready. Open chat if you want to ask follow-up questions.";

  const handleQuickSend = () => {
    const text = quickInputValue.trim();
    if (!text) return;
    onQuickSend?.(text);
    setQuickInputValue("");
    setQuickInputOpen(false);
  };

  const handleQuickInputToggle = () => {
    setQuickInputOpen((prev) => !prev);
  };

  return (
    <div className="h-[192px] w-full rounded-xl border border-gray-100 bg-white/60 backdrop-blur-md">
      <div className="flex h-full items-stretch min-h-0">
        <aside className="relative w-[90px] shrink-0 overflow-visible border-r border-gray-100/60 bg-white/40">
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#EC5B13]/12 to-transparent" />
          <div className="absolute inset-x-0 top-3 flex flex-col items-center gap-1 opacity-10">
            <BookOpen className="h-5 w-5 text-[#EC5B13]" />
            <div className="h-0.5 w-8 rounded-full bg-[#EC5B13]" />
          </div>
          <div className="flex h-full items-center justify-center pt-8">
            <button
              className="group relative flex flex-col items-center gap-1"
              title={mentorName}
            >
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full">
                <div className="absolute inset-0 rounded-full border-2 border-[#EC5B13] shadow-[0_0_12px_rgba(236,91,19,0.35)]" />
                <div className="relative z-10 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gray-50 bg-[#EC5B13]/10">
                  <Bot className="h-5 w-5 text-[#EC5B13]" />
                </div>
                <span
                  className={cn(
                    "absolute -right-0.5 top-0.5 z-20 h-4 w-4 rounded-full border-2 border-white",
                    socketStatus === "open" ? "bg-emerald-500" : "bg-amber-400",
                  )}
                />
              </div>
              <span className="max-w-[80px] truncate rounded-full border border-[#EC5B13]/30 bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#EC5B13] shadow-sm">
                {mentorName}
              </span>
            </button>
          </div>
        </aside>

        <div className="relative mx-3 mb-2 flex min-w-0 flex-1 items-center">
          <div className="relative flex h-full w-full items-center overflow-hidden rounded-[2.5rem] border border-white/50 bg-gradient-to-b from-white/40 to-white/80 px-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
            <article className="max-w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                {mentorName}
              </p>
              <p className="line-clamp-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                {mentorText}
              </p>
            </article>
          </div>
          {quickInputOpen ? (
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
                  if (e.key === "Escape") {
                    setQuickInputOpen(false);
                  }
                }}
                placeholder="Type your message..."
                className="h-8 w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
              <button
                onClick={handleQuickSend}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#EC5B13] text-white hover:bg-[#d55010]"
                title="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        <aside className="flex w-[92px] shrink-0 items-center justify-end gap-2 border-l border-gray-100/60 bg-white/40 px-2 py-3">
          {/* <div className="flex items-center gap-1">
            <div className="h-8 w-8 rounded-full border border-slate-200 bg-pink-100" />
            <div className="h-8 w-8 rounded-full border border-slate-200 bg-teal-100" />
          </div> */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleQuickInputToggle}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white text-slate-600 hover:bg-slate-100",
                quickInputOpen
                  ? "border-[#EC5B13] text-[#EC5B13] shadow-[0_0_0_2px_rgba(236,91,19,0.15)]"
                  : "border-slate-200",
              )}
              title="Open chat"
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
            onClick={handleQuickInputToggle}
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
