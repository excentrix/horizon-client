"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // Merge streaming message into the list to prevent blinking
  const displayMessages = useMemo<ChatMessage[]>(() => {
    if (!streamingMessage || !streamingMessageId) return messages;

    // Create a temporary message object for the streaming content
    const streamingObj: ChatMessage = {
      id: streamingMessageId,
      conversation: conversation?.id ?? "",
      content: streamingMessage,
      sender_type: "ai",
      message_type: "text",
      created_at: streamingTimestampRef.current,
      updated_at: streamingTimestampRef.current,
      sequence_number: Number.MAX_SAFE_INTEGER, // Ensure it's at the end
      is_edited: false,
      is_flagged: false,
      attachments: [],
    };

    // If the message is already in the list (e.g. race condition), don't add it
    if (messages.some(m => m.id === streamingMessageId)) {
      return messages;
    }

    return [...messages, streamingObj];
  }, [messages, streamingMessage, streamingMessageId, conversation?.id]);

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
        className="flex-1 overflow-hidden"
        key={conversation.id}
      >
        <ConversationContent className="gap-4 px-5 pt-4 pb-2">
          <MessageFeedContent
            displayMessages={displayMessages}
            hasMore={hasMore}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            mentorTyping={mentorTyping}
            messages={messages}
            onLoadMore={onLoadMore}
            streamingMessage={streamingMessage}
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
  displayMessages,
  hasMore,
  isLoading,
  isLoadingMore,
  mentorTyping,
  messages,
  onLoadMore,
  streamingMessage,
  theme,
}: {
  displayMessages: ChatMessage[];
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  mentorTyping?: boolean;
  messages: ChatMessage[];
  onLoadMore?: () => Promise<void> | void;
  streamingMessage?: string | null;
  theme?: PersonaTheme;
}) {
  // Fetch chat-context flow suggestion (only when not streaming)
  const { data: flowData } = useFlowSuggestion('chat');
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [suggestionShownAt] = useState(() => new Date());
  
  // Determine if we should show the flow chip
  // Show after the last AI message, not during streaming, and only once per session
  const lastMessage = displayMessages[displayMessages.length - 1];
  const showFlowChip = 
    flowData?.suggestion &&
    !suggestionDismissed &&
    !streamingMessage &&
    !mentorTyping &&
    lastMessage?.sender_type === 'ai' &&
    displayMessages.length > 1; // Don't show on first message
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
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {displayMessages.map((message, index) => {
          const isUser = message.sender_type === "user";
          const prevSender = displayMessages[index - 1]?.sender_type;
          const isNewAssistantTurn =
            !isUser && prevSender !== "ai";
          const metadata = message.metadata as
            | { missing_info_id?: string; missing_info_field?: string; missing_info_context?: string }
            | undefined;
          const missingInfoId = metadata?.missing_info_id;
          const missingInfoField = metadata?.missing_info_field;
          const missingInfoContext = metadata?.missing_info_context;
          return (
            <motion.div
              key={message.id}
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
              <Message from={isUser ? "user" : "assistant"}>
                <MessageContent
                  className={cn(
                    "max-w-[72%] rounded-2xl px-4 py-3 text-sm shadow-[var(--shadow-1)]",
                    "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground",
                    !isUser &&
                      `${theme?.bubbleBg ?? "bg-white/80"} ${theme?.bubbleText ?? "text-foreground"} border border-white/70`,
                  )}
                >
                  <MessageResponse>{message.content}</MessageResponse>

                  {message.metadata?.graph_learning_snapshot && (
                    <LearningGraphPill snapshot={message.metadata.graph_learning_snapshot} />
                  )}
                  {message.metadata?.graph_career_snapshot && (
                    <CareerGoalsPill snapshot={message.metadata.graph_career_snapshot} />
                  )}

                  <AgentInsightsCard
                    agentTools={message.metadata?.agent_tools}
                    toolInvocations={message.metadata?.tool_invocations}
                    toolRuntimeInvocations={message.metadata?.tool_runtime_invocations}
                    guardrails={message.metadata?.guardrails}
                    safety={message.metadata?.safety}
                    agentName={message.cortex?.agent}
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
                      {message.metadata?.missing_info_unblocks ? (
                        <p className="mb-2 text-[11px] text-muted-foreground">
                          {String(message.metadata.missing_info_unblocks)}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <Input
                          value={quickReplies[missingInfoId] ?? ""}
                          onChange={(event) =>
                            setQuickReplies((prev) => ({
                              ...prev,
                              [missingInfoId]: event.target.value,
                            }))
                          }
                          placeholder="Type your answer…"
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          className="h-8 px-3"
                          disabled={
                            !planSessionId ||
                            !quickReplies[missingInfoId]?.trim() ||
                            submitting[missingInfoId]
                          }
                          onClick={async () => {
                            if (!planSessionId) {
                              telemetry.toastError(
                                "Unable to submit info",
                                "Missing plan session."
                              );
                              return;
                            }
                            const reply = quickReplies[missingInfoId]?.trim();
                            if (!reply) return;
                            setSubmitting((prev) => ({ ...prev, [missingInfoId]: true }));
                            try {
                              await planningApi.submitMissingInfo(planSessionId, {
                                field: missingInfoField,
                                value: reply,
                              });
                              resolveMissingInfo(missingInfoId);
                              setQuickReplies((prev) => ({ ...prev, [missingInfoId]: "" }));
                              telemetry.toastInfo("Information updated", "Thanks! Updated.");
                            } catch {
                              telemetry.toastError("Failed to update information.");
                            } finally {
                              setSubmitting((prev) => ({ ...prev, [missingInfoId]: false }));
                            }
                          }}
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
        })}
        </div>
      </AnimatePresence>

      {mentorTyping && !streamingMessage ? (
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

      {!displayMessages.length && !isLoading ? (
        <ConversationEmptyState
          title="No messages yet"
          description="Break the ice and ask your mentor anything."
        />
      ) : null}
    </>
  );
}
