import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as Message } from "@/types";
import type { StepId } from "./surface-runtime-router";

interface MentorAssistantProps {
  messages: Message[];
  isTyping: boolean;
  streamingMessage: string | { id: string; content: string } | null;
  onSendMessage: (message: string, actionType?: string) => Promise<void>;
  socketStatus: string;
  currentStep?: StepId;
}

interface Suggestion {
  id: string;
  label: string;
  prompt: string;
}

const STEP_SUGGESTIONS: Record<StepId, Suggestion[]> = {
  ingest: [
    { id: "simplify", label: "Simplify", prompt: "Explain this concept in the simplest possible terms, like I'm hearing it for the first time." },
    { id: "example", label: "Real example", prompt: "Give me a real-world example of this concept in action." },
    { id: "why", label: "Why it matters", prompt: "Why is this concept important? What breaks if I don't understand it?" },
  ],
  micro: [
    { id: "hint", label: "Give a hint", prompt: "I'm stuck on this question. Give me a hint without revealing the answer." },
    { id: "explain-wrong", label: "Why was I wrong?", prompt: "Explain why my last answer might have been incorrect and what I should have said instead." },
    { id: "relate", label: "Relate to lesson", prompt: "How does this practice question connect back to the lesson I just read?" },
  ],
  prove: [
    { id: "structure", label: "Help me structure", prompt: "Help me structure my teach-back explanation. What are the key points I need to cover?" },
    { id: "analogy", label: "Good analogy", prompt: "What's a good analogy I could use to explain this concept to a junior developer?" },
    { id: "gaps", label: "Check my gaps", prompt: "Based on my explanation so far, what gaps or misconceptions should I address?" },
  ],
  scenario: [
    { id: "clarify", label: "Clarify scenario", prompt: "I need clarification on the scenario. What constraints should I be aware of?" },
    { id: "approach", label: "Validate approach", prompt: "Here's my planned approach — can you spot any issues before I start?" },
    { id: "stuck", label: "I'm stuck", prompt: "I'm stuck on this simulation. What should I try next without giving me the full solution?" },
  ],
  omni: [
    { id: "debug", label: "Help debug", prompt: "I have an error in my code. Can you help me reason through what might be wrong?" },
    { id: "review", label: "Review my code", prompt: "Review my current implementation and tell me what could be improved before I submit." },
    { id: "pattern", label: "Suggest pattern", prompt: "What design pattern or approach would you recommend for this build task?" },
  ],
  verify: [
    { id: "criteria", label: "Explain criteria", prompt: "Can you explain each acceptance criterion and what a strong submission looks like?" },
    { id: "check", label: "Check my proof", prompt: "Here's my proof submission — does it address all the requirements?" },
    { id: "improve", label: "Improve my answer", prompt: "How can I strengthen my submission to meet the acceptance criteria more clearly?" },
  ],
};

const STEP_EMPTY_STATE: Record<StepId, string> = {
  ingest: "Ask me to simplify anything, give examples, or explain why a concept matters.",
  micro: "Stuck on a question? Ask for a hint or ask why your answer was wrong.",
  prove: "Need help structuring your teach-back? Ask me to help you explain the concept.",
  scenario: "Need clarification on the scenario? Ask me anything about the simulation.",
  omni: "Debugging or reviewing your code? I'm here to help without giving it all away.",
  verify: "Not sure if your submission is strong enough? Ask me to review it first.",
};

const createStreamingMessage = (id: string, content: string): Message => ({
  id,
  content,
  message_type: "text",
  sender_type: "ai",
  sequence_number: 0,
  is_edited: false,
  is_flagged: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export function MentorAssistant({
  messages,
  isTyping,
  streamingMessage,
  onSendMessage,
  socketStatus,
  currentStep,
}: MentorAssistantProps) {
  const [input, setInput] = useState("");
  const [pendingMessages, setPendingMessages] = useState<Array<{ id: string; content: string }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const stepSuggestions = currentStep ? STEP_SUGGESTIONS[currentStep] : STEP_SUGGESTIONS.ingest;
  const emptyStateText = currentStep ? STEP_EMPTY_STATE[currentStep] : "I'm tracking your progress. Ask me if you get stuck!";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  const handleSend = async () => {
    const message = input.trim();
    if (!message) return;
    const pendingId = `pending-${Date.now()}`;
    setPendingMessages((prev) => [...prev, { id: pendingId, content: message }]);
    setInput("");
    try {
      await onSendMessage(message);
    } finally {
      setPendingMessages((prev) => prev.filter((m) => m.id !== pendingId));
    }
  };

  const handleSuggestion = (suggestion: Suggestion) => {
    onSendMessage(suggestion.prompt, `mentor_action_${suggestion.id}`);
  };

  const allMessages = [...messages];
  if (pendingMessages.length) {
    allMessages.push(
      ...pendingMessages.map((m) => ({
        id: m.id,
        content: m.content,
        message_type: "text" as const,
        sender_type: "user" as const,
        sequence_number: 0,
        is_edited: false,
        is_flagged: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    );
  }
  if (streamingMessage) {
    const streamId = typeof streamingMessage === "string" ? "stream" : streamingMessage.id;
    const streamContent = typeof streamingMessage === "string" ? streamingMessage : streamingMessage.content;
    const existingIdx = allMessages.findIndex((m) => m.id === streamId);
    if (existingIdx >= 0) {
      allMessages[existingIdx] = { ...allMessages[existingIdx], content: streamContent };
    } else {
      // Only add the streaming overlay if the real message isn't already in the cache.
      // After stream_complete the message is appended to the cache; without this guard
      // the streamed content would appear twice (once from cache, once as overlay).
      const alreadyCached = allMessages.some(
        (m) => (m.sender_type === "ai" || m.sender_type === "system") && m.content === streamContent,
      );
      if (!alreadyCached) {
        allMessages.push(createStreamingMessage(streamId, streamContent));
      }
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-3">
        <Bot className="h-5 w-5 text-violet-500" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">Learning Mentor</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            {socketStatus === "open" ? "Connected" : "Syncing..."}
          </p>
        </div>
        <span
          className={cn(
            "h-2 w-2 rounded-full shrink-0",
            socketStatus === "open" ? "bg-emerald-400" : "bg-amber-400 animate-pulse",
          )}
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 space-y-4">
        {allMessages.length === 0 && !isTyping && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-2xl bg-violet-50 border border-violet-100 px-6 py-5 max-w-[240px]">
              <Sparkles className="h-7 w-7 mb-2 mx-auto text-violet-300" />
              <p className="text-xs text-slate-500 leading-relaxed">{emptyStateText}</p>
            </div>
          </div>
        )}

        {allMessages.map((msg) => {
          const isAssistant = msg.sender_type === "ai" || msg.sender_type === "system";
          return (
            <div
              key={msg.id}
              className={cn(
                "flex w-full",
                isAssistant ? "justify-start" : "justify-end",
              )}
            >
              <div
                className={cn(
                  "flex max-w-[85%] gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm",
                  isAssistant
                    ? "rounded-tl-none bg-white border border-slate-100 text-slate-700"
                    : "rounded-tr-none bg-primary text-primary-foreground",
                )}
              >
                {isAssistant && <Bot className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                <div className="prose prose-sm prose-slate max-w-none break-words break-all">
                  {isAssistant ? (
                     <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {isTyping && !streamingMessage && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-full bg-white border border-slate-100 px-4 py-2 shadow-sm">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="border-t bg-white p-3">
        {allMessages.length < 3 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {stepSuggestions.map((suggestion) => (
              <Button
                key={suggestion.id}
                variant="outline"
                size="sm"
                className="h-7 rounded-full text-[11px] bg-slate-50 text-slate-600 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 border-slate-200"
                onClick={() => handleSuggestion(suggestion)}
              >
                {suggestion.label}
              </Button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Need a hint?"
            className="min-h-[44px] max-h-32 resize-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg mb-0.5 mr-0.5"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
