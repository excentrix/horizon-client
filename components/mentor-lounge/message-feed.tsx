"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { ChatMessage, Conversation, MentorAction } from "@/types";
import type { SocketStatus } from "@/hooks/use-chat-socket";
import type { PersonaTheme } from "@/lib/persona-theme";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { Bot, Send } from "lucide-react";
import { planningApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import {
  Conversation as ConversationContainer,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LearningGraphPill } from "./learning-graph-pill";
import { CareerGoalsPill } from "./career-goals-pill";
import { AgentInsightsCard } from "./agent-insights-card";
import { PlanStatusBanner } from "./plan-status-banner";
import { PlanBuildHeaderBadge } from "./plan-build-header-badge";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { FlowSuggestionChip } from "@/components/chat/flow-suggestion-chip";
import { useFlowSuggestion } from "@/hooks/use-flow-suggestion";

const normalizeMessageContent = (raw: string) => {
  if (!raw) return raw;
  let cleaned = raw;
  // Some model outputs use backticks in contractions (e.g., I`m), which can
  // break markdown rendering and make messages appear truncated.
  cleaned = cleaned.replace(/([A-Za-z])`([A-Za-z])/g, "$1'$2");
  if (!cleaned.includes("```")) {
    const tickCount = (cleaned.match(/`/g) || []).length;
    if (tickCount % 2 === 1) {
      cleaned = cleaned.replace(/`/g, "'");
    }
  }

  const trimmed = cleaned.trim();

  // Only normalize strict JSON payloads like {"text":"..."}.
  // Avoid fragile regex extraction that can truncate natural text.
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as { text?: unknown };
      if (typeof parsed?.text === "string" && parsed.text.trim()) {
        return parsed.text;
      }
    } catch {
      // Keep original raw message when payload is not strict JSON.
    }
  }

  return cleaned;
};

interface MessageFeedProps {
  conversation?: Conversation;
  messages: ChatMessage[];
  isLoading?: boolean;
  connectionStatus?: SocketStatus;
  connectionError?: string | null;
  showHeader?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => Promise<void> | void;
  isLoadingMore?: boolean;
  mentorTyping?: boolean;
  streamingMessage?: string | null;
  streamingMessageId?: string;
  theme?: PersonaTheme;
  variant?: "card" | "plain";
}

const statusLabels: Record<SocketStatus, string> = {
  idle: "Idle",
  connecting: "Connecting",
  open: "Live",
  closed: "Closed",
  error: "Offline",
};

export function MessageFeed({
  conversation,
  messages = [],
  isLoading,
  connectionStatus = "idle",
  connectionError,
  showHeader = true,
  hasMore,
  onLoadMore,
  isLoadingMore,
  mentorTyping,
  streamingMessage,
  streamingMessageId,
  theme,
  variant = "card",
}: MessageFeedProps) {
  const setMentorActions = useMentorLoungeStore((state) => state.setMentorActions);
  const streamingTimestampRef = useRef<string>(new Date().toISOString());

  // Update timestamp ref only when streaming message ID changes
  useEffect(() => {
    if (streamingMessageId) {
      streamingTimestampRef.current = new Date().toISOString();
    }
  }, [streamingMessageId]);

  const activeStreamingMessage = useMemo<ChatMessage | null>(() => {
    if (!streamingMessage || !streamingMessageId) {
      return null;
    }

    if (messages.some((message) => message.id === streamingMessageId)) {
      return null;
    }

    return {
      id: streamingMessageId,
      conversation: conversation?.id ?? "",
      content: streamingMessage,
      sender_type: "ai",
      message_type: "text",
      created_at: streamingTimestampRef.current,
      updated_at: streamingTimestampRef.current,
      sequence_number: Number.MAX_SAFE_INTEGER,
      is_edited: false,
      is_flagged: false,
      attachments: [],
    };
  }, [conversation?.id, messages, streamingMessage, streamingMessageId]);

  useEffect(() => {
    const latestWithActions = [...messages]
      .reverse()
      .find((message) => {
        const metadata = message.metadata as { ui_actions?: unknown[] } | null | undefined;
        return (
          message.sender_type === "ai" &&
          Array.isArray(metadata?.ui_actions) &&
          (metadata?.ui_actions?.length ?? 0) > 0
        );
      });

    if (latestWithActions && latestWithActions.metadata) {
      const metadata = latestWithActions.metadata as { ui_actions?: MentorAction[] };
      setMentorActions(metadata.ui_actions ?? []);
    } else if (!streamingMessage) {
      setMentorActions([]);
    }
  }, [messages, setMentorActions, streamingMessage]);

  useEffect(() => {
    if (!conversation) {
      setMentorActions([]);
    }
  }, [conversation, setMentorActions]);

  if (!conversation) {
    return (
      <div className="grid flex-1 place-items-center rounded-xl border border-dashed bg-muted/30 p-8 text-sm text-muted-foreground">
        Select a mentor thread to continue the conversation.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        variant === "card"
          ? "rounded-2xl border bg-white/80 shadow-[var(--shadow-1)]"
          : "rounded-none border-0 bg-transparent shadow-none",
        theme?.containerBorder,
      )}
    >
      {showHeader ? (
        <header className="border-b bg-white/70 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{conversation.title}</h2>
              <p className="text-xs text-muted-foreground">
                {conversation.topic}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "rounded-full px-3 py-1 font-medium",
                  connectionStatus === "open"
                    ? "bg-emerald-100 text-emerald-700"
                    : connectionStatus === "connecting"
                      ? "bg-amber-100 text-amber-700"
                      : connectionStatus === "error"
                        ? "bg-rose-100 text-rose-700"
                        : `${theme?.statusBadgeBg ?? "bg-muted"} ${theme?.statusBadgeText ?? "text-muted-foreground"}`,
                )}
              >
                {statusLabels[connectionStatus]}
              </span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 font-medium",
                  theme?.accentBadgeBg ?? "bg-primary/10",
                  theme?.accentBadgeText ?? "text-primary",
                )}
              >
                {conversation.ai_personality?.name ?? "Adaptive Mentor"}
              </span>
              <PlanBuildHeaderBadge />
            </div>
          </div>
          {connectionError ? (
            <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {connectionError}
            </p>
          ) : null}
        </header>
      ) : null}

      <ConversationContainer
        className="flex-1 overflow-y-auto"
        key={conversation.id}
      >
        <ConversationContent className="gap-4 px-5 pt-4 pb-2">
          <MessageFeedContent
            hasMore={hasMore}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            mentorTyping={mentorTyping}
            messages={messages}
            onLoadMore={onLoadMore}
            streamingMessage={activeStreamingMessage}
            theme={theme}
          />
        </ConversationContent>
        <ConversationScrollButton className="bottom-6" />
      </ConversationContainer>

      <PlanStatusBanner />
    </div>
  );
}

function MessageFeedContent({
  hasMore,
  isLoading,
  isLoadingMore,
  mentorTyping,
  messages,
  onLoadMore,
  streamingMessage,
  theme,
}: {
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  mentorTyping?: boolean;
  messages: ChatMessage[];
  onLoadMore?: () => Promise<void> | void;
  streamingMessage?: ChatMessage | null;
  theme?: PersonaTheme;
}) {
  const toolThinking = useMentorLoungeStore((state) => state.toolThinking);

  // Fetch chat-context flow suggestion (only when not streaming)
  const { data: flowData } = useFlowSuggestion('chat');
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [suggestionShownAt] = useState(() => new Date());
  
  // Determine if we should show the flow chip
  // Show after the last AI message, not during streaming, and only once per session
  const lastMessage = streamingMessage ?? messages[messages.length - 1];
  const showFlowChip = 
    flowData?.suggestion &&
    !suggestionDismissed &&
    !streamingMessage &&
    !mentorTyping &&
    lastMessage?.sender_type === 'ai' &&
    (streamingMessage ? messages.length + 1 : messages.length) > 1; // Don't show on first message
  const { scrollRef } = useStickToBottomContext();
  const planSessionId = useMentorLoungeStore((state) => state.planSessionId);
  const resolveMissingInfo = useMentorLoungeStore((state) => state.resolveMissingInfo);
  const [quickReplies, setQuickReplies] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  const triggerLoadMore = useCallback(() => {
    if (!onLoadMore || loadingMoreRef.current || !hasMore) {
      return;
    }

    const container = scrollRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    const previousTop = container?.scrollTop ?? 0;

    loadingMoreRef.current = true;

    Promise.resolve(onLoadMore()).finally(() => {
      loadingMoreRef.current = false;
      if (container) {
        const heightDelta = container.scrollHeight - previousHeight;
        container.scrollTop = previousTop + heightDelta;
      }
    });
  }, [hasMore, onLoadMore, scrollRef]);

  useEffect(() => {
    const container = scrollRef.current;
    const sentinel = topSentinelRef.current;

    if (!container || !sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !isLoadingMore) {
            triggerLoadMore();
          }
        });
      },
      {
        root: container,
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, triggerLoadMore, messages.length, scrollRef]);

  return (
    <>
      <div ref={topSentinelRef} />
      {hasMore ? (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={triggerLoadMore}
            className="rounded-full border px-4 py-1 text-xs text-muted-foreground transition hover:border-foreground"
            disabled={isLoadingMore}
          >
            {isLoadingMore
              ? "Loading earlier messages..."
              : "Load previous messages"}
          </button>
        </div>
      ) : null}

      {isLoading && !messages.length ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Syncing latest messages with your mentor...
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        <div className="mx-auto flex w-full flex-col gap-4 px-4 lg:px-8">
          {messages.map((message, index) => (
            <MessageRow
              key={message.id}
              message={message}
              previousSender={messages[index - 1]?.sender_type}
              theme={theme}
              planSessionId={planSessionId}
              quickReplyValue={quickReplies[String((message.metadata as { missing_info_id?: string } | undefined)?.missing_info_id ?? "")] ?? ""}
              isSubmitting={Boolean(submitting[String((message.metadata as { missing_info_id?: string } | undefined)?.missing_info_id ?? "")])}
              onQuickReplyChange={(messageId, value) =>
                setQuickReplies((previous) => ({
                  ...previous,
                  [messageId]: value,
                }))
              }
              onQuickReplySubmit={async (messageId, field, value) => {
                if (!planSessionId) {
                  telemetry.toastError(
                    "Unable to submit info",
                    "Missing plan session.",
                  );
                  return;
                }

                setSubmitting((previous) => ({ ...previous, [messageId]: true }));
                try {
                  await planningApi.submitMissingInfo(planSessionId, {
                    field,
                    value,
                  });
                  resolveMissingInfo(messageId);
                  setQuickReplies((previous) => ({ ...previous, [messageId]: "" }));
                  telemetry.toastInfo("Information updated", "Thanks! Updated.");
                } catch {
                  telemetry.toastError("Failed to update information.");
                } finally {
                  setSubmitting((previous) => ({ ...previous, [messageId]: false }));
                }
              }}
            />
          ))}
          {streamingMessage ? (
            <StreamingMessageRow
              previousSender={messages[messages.length - 1]?.sender_type}
              streamingMessage={streamingMessage}
              theme={theme}
            />
          ) : null}
        </div>
      </AnimatePresence>

      {/* Tool thinking indicator — shown when mentor is calling a tool before streaming */}
      <AnimatePresence>
        {toolThinking && (
          <motion.div
            key="tool-thinking"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <Message from="assistant">
              <MessageContent className="rounded-2xl border border-blue-200/60 bg-blue-50/60 px-4 py-3 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                <span className="inline-flex items-center gap-2">
                  <Loader size={14} className="text-blue-500" />
                  <span className="font-medium">{toolThinking.label}</span>
                  {toolThinking.query && (
                    <span className="max-w-[240px] truncate opacity-60">
                      &quot;{toolThinking.query}&quot;
                    </span>
                  )}
                </span>
              </MessageContent>
            </Message>
          </motion.div>
        )}
      </AnimatePresence>

      {mentorTyping && !streamingMessage && !toolThinking ? (
        <Message from="assistant">
          <MessageContent className="rounded-2xl border border-dashed bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Loader size={14} />
              Mentor is typing...
            </span>
          </MessageContent>
        </Message>
      ) : null}

      {/* Flow suggestion chip after last AI message */}
      {showFlowChip && flowData?.suggestion && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <FlowSuggestionChip
            suggestion={flowData.suggestion}
            shownAt={suggestionShownAt}
            onDismiss={() => setSuggestionDismissed(true)}
          />
        </motion.div>
      )}

      {!messages.length && !streamingMessage && !isLoading ? (
        <ConversationEmptyState
          title="No messages yet"
          description="Break the ice and ask your mentor anything."
        />
      ) : null}
    </>
  );
}

interface MessageRowProps {
  message: ChatMessage;
  previousSender?: ChatMessage["sender_type"];
  theme?: PersonaTheme;
  planSessionId: string | null;
  quickReplyValue: string;
  isSubmitting: boolean;
  onQuickReplyChange: (messageId: string, value: string) => void;
  onQuickReplySubmit: (messageId: string, field: string, value: string) => Promise<void>;
}

const MessageRow = memo(function MessageRow({
  message,
  previousSender,
  theme,
  planSessionId,
  quickReplyValue,
  isSubmitting,
  onQuickReplyChange,
  onQuickReplySubmit,
}: MessageRowProps) {
  const isUser = message.sender_type === "user";
  const isNewAssistantTurn = !isUser && previousSender !== "ai";
  const metadata = message.metadata as
    | {
        missing_info_id?: string;
        missing_info_field?: string;
        missing_info_context?: string;
        proactive?: boolean;
        trigger_type?: string;
        missing_info_unblocks?: string;
      }
    | undefined;
  const missingInfoId = metadata?.missing_info_id;
  const missingInfoField = metadata?.missing_info_field;
  const missingInfoContext = metadata?.missing_info_context;
  const isProactive = !isUser && metadata?.proactive === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18 }}
    >
      {isNewAssistantTurn ? (
        <div className="flex items-center gap-3 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Mentor
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-muted/60 via-muted/30 to-transparent" />
        </div>
      ) : null}
      {isProactive ? (
        <div className="mb-1 ml-1 flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Your mentor checked in
          </span>
        </div>
      ) : null}
      <Message from={isUser ? "user" : "assistant"}>
        <MessageContent
          className={cn(
            "max-w-[72%] rounded-2xl px-4 py-3 text-sm shadow-[var(--shadow-1)]",
            "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground",
            !isUser &&
              `${theme?.bubbleBg ?? "bg-white/80"} ${theme?.bubbleText ?? "text-foreground"} border border-white/70`,
          )}
        >
          <MessageResponse>{normalizeMessageContent(message.content)}</MessageResponse>

          {message.metadata?.graph_learning_snapshot ? (
            <LearningGraphPill snapshot={message.metadata.graph_learning_snapshot} />
          ) : null}
          {message.metadata?.graph_career_snapshot ? (
            <CareerGoalsPill snapshot={message.metadata.graph_career_snapshot} />
          ) : null}

          <AgentInsightsCard
            agentTools={message.metadata?.agent_tools}
            toolInvocations={message.metadata?.tool_invocations}
            toolRuntimeInvocations={message.metadata?.tool_runtime_invocations}
            guardrails={message.metadata?.guardrails}
            safety={message.metadata?.safety}
            agentName={message.cortex?.agent}
            reason={message.cortex?.reason}
          />

          {message.cortex ? (
            <div className="mt-2 flex justify-end">
              <div
                className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-medium text-foreground/70"
                title={`${message.cortex.reason} • Confidence: ${(
                  message.cortex.confidence * 100
                ).toFixed(0)}%`}
              >
                <Bot className="h-3 w-3" />
                {message.cortex.agent}
              </div>
            </div>
          ) : null}

          {!isUser && missingInfoId && missingInfoField ? (
            <div className="mt-3 rounded-xl border bg-background/70 p-3 text-xs">
              {missingInfoContext ? (
                <p className="mb-2 text-[11px] text-muted-foreground">
                  {missingInfoContext}
                </p>
              ) : null}
              {metadata?.missing_info_unblocks ? (
                <p className="mb-2 text-[11px] text-muted-foreground">
                  {String(metadata.missing_info_unblocks)}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <Input
                  value={quickReplyValue}
                  onChange={(event) =>
                    onQuickReplyChange(missingInfoId, event.target.value)
                  }
                  placeholder="Type your answer..."
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  className="h-8 px-3"
                  disabled={!planSessionId || !quickReplyValue.trim() || isSubmitting}
                  onClick={() => onQuickReplySubmit(missingInfoId, missingInfoField, quickReplyValue.trim())}
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
              {!planSessionId ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Open the plan builder to submit this info.
                </p>
              ) : null}
            </div>
          ) : null}
        </MessageContent>
      </Message>
    </motion.div>
  );
}, (previous, next) =>
  previous.message === next.message &&
  previous.previousSender === next.previousSender &&
  previous.theme === next.theme &&
  previous.planSessionId === next.planSessionId &&
  previous.quickReplyValue === next.quickReplyValue &&
  previous.isSubmitting === next.isSubmitting,
);

interface StreamingMessageRowProps {
  previousSender?: ChatMessage["sender_type"];
  streamingMessage: ChatMessage;
  theme?: PersonaTheme;
}

const StreamingMessageRow = memo(function StreamingMessageRow({
  previousSender,
  streamingMessage,
  theme,
}: StreamingMessageRowProps) {
  const isNewAssistantTurn = previousSender !== "ai";

  return (
    <motion.div
      key={streamingMessage.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18 }}
    >
      {isNewAssistantTurn ? (
        <div className="flex items-center gap-3 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Mentor
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-muted/60 via-muted/30 to-transparent" />
        </div>
      ) : null}
      <Message from="assistant">
        <MessageContent
          className={cn(
            "max-w-[72%] rounded-2xl border border-white/70 px-4 py-3 text-sm shadow-[var(--shadow-1)]",
            theme?.bubbleBg ?? "bg-white/80",
            theme?.bubbleText ?? "text-foreground",
          )}
        >
          <div
            aria-live="polite"
            className="whitespace-pre-wrap break-words leading-6"
          >
            {normalizeMessageContent(streamingMessage.content)}
          </div>
        </MessageContent>
      </Message>
    </motion.div>
  );
});
