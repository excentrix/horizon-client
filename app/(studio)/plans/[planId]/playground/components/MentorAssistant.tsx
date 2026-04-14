import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as Message } from "@/types";

interface MentorAssistantProps {
  messages: Message[];
  isTyping: boolean;
  streamingMessage: string | { id: string; content: string } | null;
  onSendMessage: (message: string, actionType?: string) => Promise<void>;
  socketStatus: string;
}

const mentorSuggestions = [
  { id: "explain", label: "Explain" },
  { id: "example", label: "Example" },
  { id: "quiz", label: "Quiz me" },
] as const;

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
}: MentorAssistantProps) {
  const [input, setInput] = useState("");
  const [pendingMessages, setPendingMessages] = useState<Array<{ id: string; content: string }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const handleAction = (action: typeof mentorSuggestions[number]["id"]) => {
    const actionMap = {
      explain: "Explain this task in simpler terms.",
      example: "Show me an example for this task.",
      quiz: "Quiz me on this task with 2 quick questions.",
    };
    onSendMessage(actionMap[action], `mentor_action_${action}`);
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
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Learning Mentor</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            {socketStatus === "open" ? "Connected" : "Syncing..."}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 space-y-4">
        {allMessages.length === 0 && !isTyping && (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <Sparkles className="h-8 w-8 mb-3 opacity-20" />
            <p className="text-sm px-8">
              {"I'm tracking your progress. Ask me if you get stuck!"}
            </p>
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
          <div className="mb-3 flex flex-wrap gap-2">
            {mentorSuggestions.map((suggestion) => (
              <Button
                key={suggestion.id}
                variant="outline"
                size="sm"
                className="h-7 rounded-full text-[11px] bg-slate-50 text-slate-600 hover:text-primary border-slate-200"
                onClick={() => handleAction(suggestion.id)}
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
