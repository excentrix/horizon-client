"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { ChatMessage, Conversation, MentorAction } from "@/types";
import type { SocketStatus } from "@/hooks/use-chat-socket";
import type { PersonaTheme } from "@/lib/persona-theme";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";

interface MessageFeedProps {
  conversation?: Conversation;
  messages: ChatMessage[];
  isLoading?: boolean;
  connectionStatus?: SocketStatus;
  connectionError?: string | null;
  hasMore?: boolean;
  onLoadMore?: () => Promise<void> | void;
  isLoadingMore?: boolean;
  mentorTyping?: boolean;
  streamingMessage?: string | null;
  streamingMessageId?: string;
  theme?: PersonaTheme;
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
  hasMore,
  onLoadMore,
  isLoadingMore,
  mentorTyping,
  streamingMessage,
  streamingMessageId,
  theme,
}: MessageFeedProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const initialScrollRef = useRef(true);
  const lastConversationIdRef = useRef<string | null>(null);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const setMentorActions = useMentorLoungeStore((state) => state.setMentorActions);

  const scrollToLatest = useCallback(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    setShowScrollToLatest(false);
  }, []);

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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
  }, [hasMore, onLoadMore]);

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
  }, [hasMore, isLoadingMore, triggerLoadMore, messages.length]);

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

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const conversationId = conversation?.id ?? null;
    const conversationChanged =
      conversationId !== lastConversationIdRef.current;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 160;

    if (initialScrollRef.current || conversationChanged) {
      container.scrollTop = container.scrollHeight;
      initialScrollRef.current = false;
      setShowScrollToLatest(false);
    } else if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
      setShowScrollToLatest(false);
    } else {
      setShowScrollToLatest(distanceFromBottom > 240);
    }

    lastConversationIdRef.current = conversationId;
  }, [conversation?.id, displayMessages.length, streamingMessage]);

  useEffect(() => {
    initialScrollRef.current = true;
  }, [conversation?.id]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollToLatest(distanceFromBottom > 240);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [conversation?.id]);

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
        "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background",
        theme?.containerBorder,
      )}
    >
      <header className="border-b px-6 py-4">
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
                      : `${theme?.statusBadgeBg ?? "bg-muted"} ${theme?.statusBadgeText ?? "text-muted-foreground"}`
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
          </div>
        </div>
        {connectionError ? (
          <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {connectionError}
          </p>
        ) : null}
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-6 py-4 scrollbar"
      >
        <div ref={topSentinelRef} />
        {hasMore ? (
          <div className="mb-2 flex items-center justify-center">
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
          {displayMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              className={cn("flex", {
                "justify-end": message.sender_type === "user",
                "justify-start": message.sender_type !== "user",
              })}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                  message.sender_type === "user"
                    ? "bg-primary text-primary-foreground"
                    : `${theme?.bubbleBg ?? "bg-muted"} ${theme?.bubbleText ?? "text-foreground"}`
                )}
              >
                {message.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>



        {mentorTyping && !streamingMessage ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
              Mentor is typing...
            </div>
          </div>
        ) : null}

        {!messages.length && !isLoading ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No messages yet — break the ice!
          </div>
        ) : null}
      </div>

      {showScrollToLatest ? (
        <button
          type="button"
          onClick={scrollToLatest}
          className="absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg transition hover:bg-primary/90"
        >
          Jump to latest
        </button>
      ) : null}
    </div>
  );
}
