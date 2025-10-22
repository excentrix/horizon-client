"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import {
  InfiniteData,
  QueryClient,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  ChatMessage,
  Conversation,
  PaginatedResponse,
} from "@/types";
import { telemetry } from "@/lib/telemetry";

export type SocketStatus = "idle" | "connecting" | "open" | "closed" | "error";

const HEARTBEAT_INTERVAL = 20000;
const HEARTBEAT_TIMEOUT = 10000;
const MENTOR_TYPING_TIMEOUT = 4000;
const MAX_RECONNECT_DELAY = 30000;

interface StreamState {
  messageId?: string;
  content: string | null;
}

const getWebSocketBase = () => {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "") ?? null;
  }

  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = process.env.NEXT_PUBLIC_WS_HOST ?? window.location.host;
  return `${protocol}//${host}`;
};

const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

const appendMessageToCache = (
  queryClient: QueryClient,
  conversationId: string,
  message: ChatMessage,
) => {
  queryClient.setQueryData<
    InfiniteData<PaginatedResponse<ChatMessage>> | undefined
  >(
    ["conversations", conversationId, "messages"],
    (previous) => {
      if (!previous) {
        return previous;
      }

      const pages = previous.pages.map((page, index) => {
        if (index !== 0) {
          return page;
        }

        const results = page.results ?? [];
        if (results.some((existing) => existing.id === message.id)) {
          return page;
        }

        const updatedResults = sortMessages([...results, message]);

        return {
          ...page,
          count: page.count ?? updatedResults.length,
          results: updatedResults,
        };
      });

      return {
        ...previous,
        pages,
      };
    },
  );
};

const updateConversationSnapshot = (
  queryClient: QueryClient,
  conversationId: string,
  message: ChatMessage,
) => {
  queryClient.setQueryData<Conversation[] | undefined>(
    ["conversations"],
    (previous) => {
      if (!previous) {
        return previous;
      }

      return previous.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        return {
          ...conversation,
          message_count: (conversation.message_count ?? 0) + 1,
          last_activity: message.created_at ?? conversation.last_activity,
          last_message: {
            id: message.id,
            content: message.content,
            sender_type: message.sender_type,
            created_at: message.created_at,
          },
        };
      });
    },
  );
};

export function useChatSocket(conversationId: string | null) {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const heartbeatTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mentorTypingTimeoutRef = useRef<number | null>(null);
  const activeConversationRef = useRef<string | null>(null);
  const manualCloseRef = useRef(false);
  const lastPongRef = useRef<number>(Date.now());
  const connectRef = useRef<() => void>(() => {});

  const [status, setStatus] = useState<SocketStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [mentorTyping, setMentorTypingState] = useState(false);
  const [streamState, setStreamState] = useState<StreamState>({
    content: null,
  });

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      window.clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const resetSocket = useCallback(() => {
    stopHeartbeat();
    clearReconnectTimer();
    if (socketRef.current) {
      manualCloseRef.current = true;
      try {
        socketRef.current.close();
      } catch (closeError) {
        telemetry.warn("Error closing chat socket", { closeError });
      }
      socketRef.current = null;
    }
    activeConversationRef.current = null;
  }, [clearReconnectTimer, stopHeartbeat]);

  const updateMentorTyping = useCallback(
    (value: boolean) => {
      if (mentorTypingTimeoutRef.current) {
        window.clearTimeout(mentorTypingTimeoutRef.current);
        mentorTypingTimeoutRef.current = null;
      }

      setMentorTypingState(value);

      if (value) {
        mentorTypingTimeoutRef.current = window.setTimeout(() => {
          setMentorTypingState(false);
          mentorTypingTimeoutRef.current = null;
        }, MENTOR_TYPING_TIMEOUT);
      }
    },
    [],
  );

  const scheduleReconnect = useCallback(() => {
    if (!conversationId) {
      return;
    }

    const attempt = (reconnectAttemptsRef.current += 1);
    const delay = Math.min(MAX_RECONNECT_DELAY, 1000 * 2 ** (attempt - 1));

    clearReconnectTimer();
    reconnectTimerRef.current = window.setTimeout(() => {
      setStatus("connecting");
      setError("Reconnecting...");
      connectRef.current();
    }, delay);
  }, [conversationId, clearReconnectTimer]);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    if (!socketRef.current) {
      return;
    }

    heartbeatIntervalRef.current = window.setInterval(() => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        socket.send(JSON.stringify({ type: "ping" }));
        if (heartbeatTimeoutRef.current) {
          window.clearTimeout(heartbeatTimeoutRef.current);
        }
        heartbeatTimeoutRef.current = window.setTimeout(() => {
          const elapsed = Date.now() - lastPongRef.current;
          if (elapsed >= HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT) {
            socket.close();
          }
        }, HEARTBEAT_TIMEOUT);
      } catch (err) {
        telemetry.warn("Failed to send heartbeat", { err });
      }
    }, HEARTBEAT_INTERVAL);
  }, [stopHeartbeat]);

  const connect = useCallback(() => {
    if (!conversationId) {
      return;
    }

    const base = getWebSocketBase();
    if (!base) {
      setStatus("error");
      setError("WebSocket endpoint unavailable");
      telemetry.warn("WebSocket endpoint unavailable");
      return;
    }

    const token = Cookies.get("accessToken");
    if (!token) {
      setStatus("error");
      setError("Missing authentication token");
      telemetry.warn("Missing authentication token for chat socket");
      return;
    }

    resetSocket();

    const wsUrl = `${base}/ws/chat/${conversationId}/?token=${encodeURIComponent(
      token,
    )}`;

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      activeConversationRef.current = conversationId;
      reconnectAttemptsRef.current = 0;
      setStatus("connecting");
      setError(null);
      setStreamState({ content: null });
      updateMentorTyping(false);

      socket.onopen = () => {
        if (activeConversationRef.current !== conversationId) {
          socket.close();
          return;
        }
        lastPongRef.current = Date.now();
        setStatus("open");
        setError(null);
        startHeartbeat();
      };

      socket.onclose = (event) => {
        stopHeartbeat();

        if (manualCloseRef.current) {
          manualCloseRef.current = false;
          return;
        }

        if (activeConversationRef.current !== conversationId) {
          return;
        }

        if (event.code === 4001 || event.code === 4003) {
          setStatus("error");
          setError("You no longer have access to this conversation.");
          reconnectAttemptsRef.current = 0;
          return;
        }

        setStatus("closed");
        telemetry.warn("Chat socket closed", { code: event.code, reason: event.reason });
        scheduleReconnect();
      };

      socket.onerror = (socketError) => {
        telemetry.warn("Chat socket error", { socketError });
        setStatus("error");
        setError("Chat connection error");
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data ?? "{}");
          const type = payload?.type;

          switch (type) {
            case "connection_established": {
              lastPongRef.current = Date.now();
              setStatus("open");
              setError(null);
              break;
            }
            case "pong": {
              lastPongRef.current = Date.now();
              if (heartbeatTimeoutRef.current) {
                window.clearTimeout(heartbeatTimeoutRef.current);
                heartbeatTimeoutRef.current = null;
              }
              break;
            }
            case "chat_message":
            case "ai_response_broadcast": {
              const message = payload?.message as ChatMessage | undefined;
              if (message) {
                message.conversation ??= conversationId;
                appendMessageToCache(queryClient, conversationId, message);
                updateConversationSnapshot(queryClient, conversationId, message);
                updateMentorTyping(false);
              }
              break;
            }
            case "stream_start": {
              setStreamState({
                messageId: payload?.message_id,
                content: "",
              });
              updateMentorTyping(true);
              break;
            }
            case "stream_chunk": {
              setStreamState((previous) => {
                if (
                  previous.messageId &&
                  payload?.message_id &&
                  previous.messageId !== payload.message_id
                ) {
                  return previous;
                }
                return {
                  messageId: payload?.message_id ?? previous.messageId,
                  content: `${previous.content ?? ""}${payload?.content ?? ""}`,
                };
              });
              updateMentorTyping(true);
              break;
            }
            case "stream_complete": {
              const message = payload?.message as ChatMessage | undefined;
              if (message) {
                message.conversation ??= conversationId;
                appendMessageToCache(queryClient, conversationId, message);
                updateConversationSnapshot(queryClient, conversationId, message);
              }
              setStreamState({ messageId: undefined, content: null });
              updateMentorTyping(false);
              break;
            }
            case "stream_error": {
              setStreamState({ messageId: undefined, content: null });
              updateMentorTyping(false);
              if (payload?.error) {
                telemetry.toastError(payload.error);
              }
              break;
            }
            case "typing_status": {
              const isTyping = Boolean(payload?.is_typing);
              updateMentorTyping(isTyping);
              break;
            }
            default:
              telemetry.info("Unhandled chat socket event", { type });
              break;
        }
      } catch (parseError) {
        telemetry.warn("Failed to parse chat socket message", { parseError });
      }
    };
  } catch (socketError) {
    telemetry.error("Unable to open chat WebSocket", { socketError });
    setStatus("error");
    setError("Unable to open chat connection");
    scheduleReconnect();
  }
  }, [conversationId, queryClient, resetSocket, scheduleReconnect, startHeartbeat, stopHeartbeat, updateMentorTyping]);

  connectRef.current = connect;

  const sendMessage = useCallback(
    async (content: string) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        telemetry.toastError("Chat connection is not ready yet.");
        throw new Error("Chat socket is not open");
      }

      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      socket.send(
        JSON.stringify({
          type: "chat_message",
          message: { content: trimmed },
        }),
      );

      updateMentorTyping(false);
    },
    [updateMentorTyping],
  );

  useEffect(() => {
    reconnectAttemptsRef.current = 0;
    setStreamState({ content: null });
    updateMentorTyping(false);

    if (!conversationId) {
      resetSocket();
      setStatus("idle");
      setError(null);
      return () => {
        resetSocket();
      };
    }

    connect();

    return () => {
      resetSocket();
      setStatus("idle");
      setError(null);
    };
  }, [conversationId, connect, resetSocket, updateMentorTyping]);

  useEffect(() => {
    return () => {
      if (mentorTypingTimeoutRef.current) {
        window.clearTimeout(mentorTypingTimeoutRef.current);
        mentorTypingTimeoutRef.current = null;
      }
    };
  }, []);

  const streamingMessage = useMemo(() => streamState.content, [streamState]);

  return {
    status,
    error,
    sendMessage,
    mentorTyping,
    streamingMessage,
  };
}
