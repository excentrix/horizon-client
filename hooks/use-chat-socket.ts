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
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";

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
      // If the cache is empty, initialize it with the new message.
      if (!previous) {
        return {
          pages: [
            {
              results: [message],
              count: 1,
              next: null,
              previous: null,
            },
          ],
          pageParams: [null],
        };
      }

      // Otherwise, add the new message to the first page.
      const newPages = [...previous.pages];
      const firstPage = { ...newPages[0] };

      // Avoid adding duplicates if the message is already in the cache
      if (firstPage.results.some((existing) => existing.id === message.id)) {
        return previous;
      }

      firstPage.results = sortMessages([...firstPage.results, message]);
      firstPage.count = firstPage.results.length;
      newPages[0] = firstPage;

      return {
        ...previous,
        pages: newPages,
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
  const {
    pushPlanUpdate,
    setActiveAgent,
    pushRoutingDecision,
    setPlanBuildStatus,
    updateLastPlanActivity,
    pushRuntimeStep,
    pushInsight,
    pushMissingInfo,
  } = useMentorLoungeStore();
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
      setActiveAgent(null);

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
              const tempId = payload?.temp_id as string | undefined;

              if (message) {
                message.conversation ??= conversationId;

                if (tempId && conversationId) {
                  // This is a confirmed user message, replace the optimistic one.
                  queryClient.setQueryData<
                    InfiniteData<PaginatedResponse<ChatMessage>> | undefined
                  >(
                    ["conversations", conversationId, "messages"],
                    (previous) => {
                      if (!previous) return previous;

                      const newPages = previous.pages.map((page) => ({
                        ...page,
                        results: page.results.map((m) =>
                          m.id === tempId ? message : m,
                        ),
                      }));

                      return { ...previous, pages: newPages };
                    },
                  );
                } else if (conversationId) {
                  // This is a new message from AI or another user.
                  appendMessageToCache(queryClient, conversationId, message);
                }

                if (conversationId) {
                  updateConversationSnapshot(
                    queryClient,
                    conversationId,
                    message,
                  );
                }
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
              const toolRuntime = payload?.tool_runtime_invocations || payload?.tool_invocations;

              if (message) {
                message.conversation ??= conversationId;
                
                // Merge tool runtime logs if provided separately in the event
                if (toolRuntime && Array.isArray(toolRuntime)) {
                  message.metadata = {
                    ...message.metadata,
                    tool_runtime_invocations: toolRuntime,
                  };
                }

                if (conversationId) {
                  appendMessageToCache(queryClient, conversationId, message);
                  updateConversationSnapshot(
                    queryClient,
                    conversationId,
                    message,
                  );
                }
              }
              setStreamState({ messageId: undefined, content: null });
              updateMentorTyping(false);
              setActiveAgent(null);
              break;
            }
            case "stream_error": {
              setStreamState({ messageId: undefined, content: null });
              updateMentorTyping(false);
              setActiveAgent(null);
              if (payload?.error) {
                telemetry.toastError(payload.error);
              }
              break;
            }
            case "agent_start": {
              const agentName = (payload?.agent as string) || "General Mentor";
              const reason = (payload?.reason as string) || "Routing...";
              // "confidence" might be in payload if the backend sends it early, otherwise optional.
              
              setActiveAgent({ name: agentName });
              updateMentorTyping(true);

              // Log routing decision if present
              if (payload?.agent) {
                 pushRoutingDecision({
                     agent: agentName,
                     reason: reason,
                     confidence: (payload?.confidence as number) ?? 1.0, 
                     timestamp: new Date().toISOString(),
                 });
              }
              break;
            }
            case "typing_status": {
              const isTyping = Boolean(payload?.is_typing);
              updateMentorTyping(isTyping);
              break;
            }
            case "plan_update": {
              const data = payload?.data as
                | (Record<string, unknown> & {
                    status?: string;
                    message?: string;
                    timestamp?: string;
                    agent?: string;
                    event_id?: string;
                    conversation_id?: string;
                    step_type?: string;
                    tool?: string;
                  })
                | undefined;

              const targetConversation =
                (data?.conversation_id as string | undefined) ?? conversationId;
              if (
                targetConversation &&
                conversationId &&
                targetConversation !== conversationId
              ) {
                break;
              }

              const eventId =
                data?.event_id ??
                (typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `plan-update-${Date.now()}`);

              pushPlanUpdate({
                type: "plan_update",
                data: {
                  id: eventId,
                  conversation_id: targetConversation ?? undefined,
                  status: (data?.status as any) ?? "in_progress",
                  message: (data?.message as string) ?? "Working on your plan...",
                  plan_id: data?.plan_id as string | undefined,
                  plan_title: data?.plan_title as string | undefined,
                  task_count: data?.task_count as number | undefined,
                  timestamp: data?.timestamp ? (data.timestamp as string) : new Date().toISOString(),
                }
              });

              // Update global plan build status in store
              if (data?.status) {
                // Cast to specific PlanBuildStatus to avoid type errors, defaulting to "in_progress" if unknown
                const status = (data.status as any) || "in_progress";
                setPlanBuildStatus(
                  status,
                  (data.message as string) ?? undefined,
                  (data.plan_id as string) ?? undefined,
                  (data.plan_title as string) ?? undefined,
                );
                updateLastPlanActivity();
              }

              if (data?.status === "failed" && data?.message) {
                telemetry.toastError(String(data.message));
              }
              break;
            }
            case "agent_runtime": {
              const step = payload?.data;
              if (step) {
                 pushRuntimeStep({
                     id: step.id ?? crypto.randomUUID(),
                     agent: step.agent ?? "System",
                     step: step.step ?? "Processing",
                     status: step.status ?? "running",
                     timestamp: step.timestamp ?? new Date().toISOString(),
                     details: step.details,
                     input: step.input,
                     output: step.output,
                     confidence: step.confidence
                 });
                 // Also set active agent/typing if running
                 if (step.status === "running") {
                    setActiveAgent({ name: step.agent });
                    updateMentorTyping(true);
                 } else if (step.status === "completed" || step.status === "failed") {
                    // Don't clear immediately, let UI linger
                    updateMentorTyping(false);
                 }
              }
              break;
            }
            case "insight_generated": {
               const insight = payload?.data;
               if (insight) {
                  pushInsight({
                      id: insight.id ?? crypto.randomUUID(),
                      type: insight.type ?? "recommendation",
                      title: insight.title ?? "New Insight",
                      message: insight.message ?? "",
                      data: insight.data,
                      timestamp: insight.timestamp ?? new Date().toISOString(),
                      is_read: false
                  });
                  telemetry.toastInfo(insight.title, insight.message);
               }
               break;
            }
            case "missing_information": {
               const info = payload?.data;
               if (info) {
                  pushMissingInfo({
                      id: info.id ?? crypto.randomUUID(),
                      field: info.field,
                      question: info.question,
                      context: info.context,
                      status: "pending",
                      timestamp: new Date().toISOString()
                  });
               }
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
  }, [
    conversationId,
    pushPlanUpdate,
    pushRoutingDecision,
    setActiveAgent,
    queryClient,
    resetSocket,
    scheduleReconnect,
    startHeartbeat,
    stopHeartbeat,
    updateMentorTyping,
  ]);

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

      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const isoTimestamp = new Date().toISOString();
      const optimisticMessage: ChatMessage = {
        id: tempId,
        conversation: conversationId!,
        message_type: "text",
        sender_type: "user",
        content: trimmed,
        sequence_number: Date.now(),
        ai_model_used: undefined,
        tokens_used: undefined,
        processing_time: undefined,
        is_edited: false,
        is_flagged: false,
        created_at: isoTimestamp,
        updated_at: isoTimestamp,
        metadata: null,
        attachments: [],
        flag_reason: undefined,
      };

      if (conversationId) {
        try {
          appendMessageToCache(queryClient, conversationId, optimisticMessage);
          updateConversationSnapshot(queryClient, conversationId, optimisticMessage);
        } catch (error) {
            telemetry.error("Failed to add optimistic message to cache", { error });
            telemetry.toastError("Could not send message. Please try again.");
            return;
        }
      }

      socket.send(
        JSON.stringify({
          type: "streaming_message",
          message: { content: trimmed, temp_id: tempId }, // send temp_id to backend
        }),
      );

      updateMentorTyping(false);
    },
    [queryClient, conversationId, updateMentorTyping],
  );

  useEffect(() => {
    reconnectAttemptsRef.current = 0;
    setStreamState({ content: null });
    updateMentorTyping(false);
    setActiveAgent(null);

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
    streamingMessageId: streamState.messageId,
    setTypingStatus: useCallback((isTyping: boolean) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        socket.send(
          JSON.stringify({
            type: "typing_status",
            is_typing: isTyping,
          }),
        );
      } catch (err) {
        telemetry.warn("Failed to send typing status", { err });
      }
    }, []),
  };
}
