"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { DailyTask, ChatMessage } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Send, CheckCircle2, ChevronRight, Lightbulb } from "lucide-react";
import { MathMarkdown } from "@/components/markdown/MathMarkdown";
import { cn } from "@/lib/utils";

interface FeynmanCheckProps {
  task: DailyTask | undefined;
  messages: ChatMessage[];
  streamingMessage: string;
  isTyping: boolean;
  onSendMessage: (message: string, actionType: string) => Promise<void>;
  onComplete: (gaps: string[]) => void;
}

interface FeynmanResult {
  feynman_complete: boolean;
  gaps: string[];
  strengths: string[];
}

function parseFeynmanResult(text: string): FeynmanResult | null {
  // Try to find a JSON block in the AI response
  const jsonMatch = text.match(/\{[\s\S]*"feynman_complete"[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.feynman_complete === true) {
      return {
        feynman_complete: true,
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      };
    }
  } catch {
    // not valid JSON
  }
  return null;
}

function ExchangeBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender_type === "user";
  const isAI = message.sender_type === "ai";
  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isUser
            ? "bg-violet-100 text-violet-700"
            : "bg-amber-100 text-amber-700",
        )}
      >
        {isUser ? "You" : isAI ? "Jr" : "·"}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-violet-600 text-white rounded-tr-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm",
        )}
      >
        <MathMarkdown>{message.content}</MathMarkdown>
      </div>
    </div>
  );
}

export function FeynmanCheck({
  task,
  messages,
  streamingMessage,
  isTyping,
  onSendMessage,
  onComplete,
}: FeynmanCheckProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [feynmanResult, setFeynmanResult] = useState<FeynmanResult | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Capture the time this component mounted so we only show messages sent
  // during this Feynman session — not the mentor's earlier playground greeting.
  const sessionStartedAt = useRef(new Date().toISOString());

  // Filter to only show messages sent after this Feynman session began
  const feynmanMessages = messages.filter(
    (m) =>
      (m.sender_type === "user" || m.sender_type === "ai") &&
      m.created_at >= sessionStartedAt.current,
  );

  // Detect feynman_complete in the latest AI message
  useEffect(() => {
    if (feynmanResult) return;
    const lastAI = [...feynmanMessages]
      .reverse()
      .find((m) => m.sender_type === "ai");
    if (!lastAI) return;
    const result = parseFeynmanResult(lastAI.content);
    if (result) {
      setFeynmanResult(result);
    }
  }, [feynmanMessages, feynmanResult]);

  // Also check streaming message for early detection
  useEffect(() => {
    if (feynmanResult || !streamingMessage) return;
    const result = parseFeynmanResult(streamingMessage);
    if (result) {
      setFeynmanResult(result);
    }
  }, [streamingMessage, feynmanResult]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feynmanMessages.length, isTyping]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setHasStarted(true);
    setInput("");
    try {
      await onSendMessage(trimmed, "feynman_check");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [input, sending, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const conceptTitle = task?.title ?? "this concept";

  // Completion state
  if (feynmanResult) {
    return (
      <Card className="h-full border-emerald-200 bg-emerald-50/30 shadow-sm">
        <CardContent className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <Badge className="mb-3 bg-emerald-600 text-white">
              Understanding Verified
            </Badge>
            <h3 className="text-xl font-bold text-slate-900">
              Feynman Check Complete
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              You successfully explained{" "}
              <span className="font-semibold">{conceptTitle}</span> to a
              confused junior developer.
            </p>
          </div>

          {feynmanResult.strengths.length > 0 && (
            <div className="w-full max-w-md rounded-xl border border-emerald-200 bg-white p-4 text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Strengths identified
              </p>
              <ul className="space-y-1.5">
                {feynmanResult.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feynmanResult.gaps.length > 0 && (
            <div className="w-full max-w-md rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                Areas to reinforce
              </p>
              <ul className="space-y-1.5">
                {feynmanResult.gaps.map((g, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            className="mt-2 bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => onComplete(feynmanResult.gaps)}
          >
            Continue to Apply <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <Card className="shrink-0 border-violet-200 bg-violet-50/40">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <Brain className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">Feynman Check</h3>
                <Badge
                  variant="outline"
                  className="border-violet-300 text-violet-700 text-[10px]"
                >
                  Teach to Learn
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-slate-600">
                A junior developer needs to understand{" "}
                <span className="font-semibold text-slate-800">
                  {conceptTitle}
                </span>
                . Explain it in your own words — no jargon, as if teaching
                someone new. The AI will ask follow-up questions to probe your
                understanding.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex flex-1 flex-col overflow-hidden border-slate-200 shadow-sm">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {!hasStarted && feynmanMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Brain className="h-6 w-6 text-amber-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Ready when you are
              </p>
              <p className="text-xs text-slate-500 max-w-xs">
                Start explaining <span className="font-medium">{conceptTitle}</span>{" "}
                below. Imagine you&apos;re talking to a junior developer who has
                never heard of it.
              </p>
            </div>
          )}

          {feynmanMessages.map((msg) => (
            <ExchangeBubble key={msg.id} message={msg} />
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                Jr
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {streamingMessage && !feynmanResult && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                Jr
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm">
                <MathMarkdown>{streamingMessage}</MathMarkdown>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-slate-100 p-3">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Explain ${conceptTitle} in your own words…`}
              className="min-h-[60px] max-h-[160px] resize-none text-sm"
              disabled={sending}
            />
            <Button
              size="icon"
              className="h-auto w-10 shrink-0 bg-violet-600 hover:bg-violet-700"
              onClick={handleSend}
              disabled={!input.trim() || sending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
}
