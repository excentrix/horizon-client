"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  PlanBuildStatus,
} from "@/types";
import { telemetry } from "@/lib/telemetry";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";

export type SocketStatus = "idle" | "connecting" | "open" | "closed" | "error";

const HEARTBEAT_INTERVAL = 20000;
const HEARTBEAT_TIMEOUT = 10000;
const MENTOR_TYPING_TIMEOUT = 4000;
const MAX_RECONNECT_DELAY = 30000;
const TOOL_THINKING_CLEAR_DELAY = 6000;
const SAFETY_ALERT_EVENT = "mentor_safety_alert";

interface StreamState {
  messageId?: string;
  content: string | null;
}

interface SafetyAlertEventDetail {
  type: "safety_alert";
  severity: "medium" | "high" | "critical";
  message: string;
  resources?: string[];
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
  >(["conversations", conversationId, "messages"], (previous) => {
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

    const newPages = [...previous.pages];
    const firstPage = { ...newPages[0] };

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
  });
};

const replaceMessageInCache = (
  queryClient: QueryClient,
  conversationId: string,
  tempId: string,
  message: ChatMessage,
) => {
  queryClient.setQueryData<
    InfiniteData<PaginatedResponse<ChatMessage>> | undefined
  >(["conversations", conversationId, "messages"], (previous) => {
    if (!previous) {
      return previous;
    }

    const newPages = previous.pages.map((page) => ({
      ...page,
      results: page.results.map((existing) =>
        existing.id === tempId ? message : existing,
      ),
    }));

    return { ...previous, pages: newPages };
  });
};

const removeMessageFromCache = (
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
) => {
  queryClient.setQueryData<
    InfiniteData<PaginatedResponse<ChatMessage>> | undefined
  >(["conversations", conversationId, "messages"], (previous) => {
    if (!previous) {
      return previous;
    }

    const newPages = previous.pages.map((page) => {
      const filtered = page.results.filter((message) => message.id !== messageId);
      return {
        ...page,
        results: filtered,
        count: filtered.length,
      };
    });

    return { ...previous, pages: newPages };
  });
};

const updateConversationSnapshot = (
  queryClient: QueryClient,
  conversationId: string,
  message: ChatMessage,
  options?: {
    incrementCount?: boolean;
  },
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

        const nextCount = options?.incrementCount === false
          ? conversation.message_count ?? 0
          : (conversation.message_count ?? 0) + 1;

        return {
          ...conversation,
          message_count: nextCount,
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

const rollbackConversationSnapshot = (
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
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
          message_count: Math.max(0, (conversation.message_count ?? 0) - 1),
          last_message:
            conversation.last_message?.id === messageId
              ? null
              : conversation.last_message,
        };
      });
    },
  );
};

const dispatchSafetyAlert = (detail: SafetyAlertEventDetail) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<SafetyAlertEventDetail>(SAFETY_ALERT_EVENT, {
      detail,
    }),
  );
};

const createClientId = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function useChatSocket(conversationId: string | null) {
  const queryClient = useQueryClient();
  const pushPlanUpdate = useMentorLoungeStore((state) => state.pushPlanUpdate);
  const setActiveAgent = useMentorLoungeStore((state) => state.setActiveAgent);
  const pushRoutingDecision = useMentorLoungeStore(
    (state) => state.pushRoutingDecision,
  );
  const setPlanBuildStatus = useMentorLoungeStore(
    (state) => state.setPlanBuildStatus,
  );
  const updateLastPlanActivity = useMentorLoungeStore(
    (state) => state.updateLastPlanActivity,
  );
  const pushRuntimeStep = useMentorLoungeStore((state) => state.pushRuntimeStep);
  const pushInsight = useMentorLoungeStore((state) => state.pushInsight);
  const pushMissingInfo = useMentorLoungeStore((state) => state.pushMissingInfo);
  const setMirrorAnalysisReady = useMentorLoungeStore(
    (state) => state.setMirrorAnalysisReady,
  );
  const setToolThinking = useMentorLoungeStore((state) => state.setToolThinking);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const heartbeatTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mentorTypingTimeoutRef = useRef<number | null>(null);
  const toolThinkingTimeoutRef = useRef<number | null>(null);
  const activeConversationRef = useRef<string | null>(null);
  const manualCloseRef = useRef(false);
  const lastPongRef = useRef<number>(Date.now());
  const lastTypingSentRef = useRef(false);
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

  const clearToolThinkingTimer = useCallback(() => {
    if (toolThinkingTimeoutRef.current) {
      window.clearTimeout(toolThinkingTimeoutRef.current);
      toolThinkingTimeoutRef.current = null;
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
    clearToolThinkingTimer();
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
  }, [clearReconnectTimer, clearToolThinkingTimer, stopHeartbeat]);

  const updateMentorTyping = useCallback((value: boolean) => {
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
  }, []);

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
      } catch (heartbeatError) {
        telemetry.warn("Failed to send heartbeat", { heartbeatError });
      }
    }, HEARTBEAT_INTERVAL);
  }, [stopHeartbeat]);

  const connect = useCallback(() => {
    if (!conversationId) {
      return;
    }

    if (
      socketRef.current &&
      activeConversationRef.current === conversationId &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const base = getWebSocketBase();
    if (!base) {
      setStatus("error");
      setError("WebSocket endpoint unavailable");
      telemetry.warn("WebSocket endpoint unavailable");
      return;
    }

    const token =
      Cookies.get("accessToken") ||
      (typeof window !== "undefined"
        ? window.localStorage.getItem("accessToken")
        : null) ||
      Cookies.get("token") ||
      null;

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
        reconnectAttemptsRef.current = 0;
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

        setStatus("connecting");
        setError("Reconnecting...");
        telemetry.warn("Chat socket closed", {
          code: event.code,
          reason: event.reason,
        });
        scheduleReconnect();
      };

      socket.onerror = (socketError) => {
        telemetry.warn("Chat socket error", { socketError });
        setStatus("connecting");
        setError("Reconnecting...");
        try {
          socket.close();
        } catch {
          // no-op
        }
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

              if (!message || !conversationId) {
                break;
              }

              message.conversation ??= conversationId;

              if (tempId) {
                replaceMessageInCache(queryClient, conversationId, tempId, message);
                updateConversationSnapshot(queryClient, conversationId, message, {
                  incrementCount: false,
                });
              } else {
                appendMessageToCache(queryClient, conversationId, message);
                updateConversationSnapshot(queryClient, conversationId, message);
              }

              updateMentorTyping(false);
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
              const toolRuntime =
                payload?.tool_runtime_invocations || payload?.tool_invocations;

              if (message && conversationId) {
                message.conversation ??= conversationId;
                if (toolRuntime && Array.isArray(toolRuntime)) {
                  message.metadata = {
                    ...message.metadata,
                    tool_runtime_invocations: toolRuntime,
                  };
                }
                appendMessageToCache(queryClient, conversationId, message);
                updateConversationSnapshot(queryClient, conversationId, message);
              }

              setStreamState({ messageId: undefined, content: null });
              updateMentorTyping(false);
              setActiveAgent(null);
              setToolThinking(null);
              clearToolThinkingTimer();
              break;
            }
            case "stream_error": {
              setStreamState({ messageId: undefined, content: null });
              updateMentorTyping(false);
              setActiveAgent(null);
              setToolThinking(null);
              clearToolThinkingTimer();
              if (payload?.error) {
                telemetry.toastError(payload.error);
              }
              break;
            }
            case "agent_start": {
              const agentName = (payload?.agent as string) || "General Mentor";
              const reason = (payload?.reason as string) || "Routing...";

              setActiveAgent({ name: agentName });
              updateMentorTyping(true);
              pushRoutingDecision({
                agent: agentName,
                reason,
                confidence: (payload?.confidence as number) ?? 1,
                timestamp: new Date().toISOString(),
              });
              break;
            }
            case "tool_thinking": {
              setToolThinking({
                tool: (payload?.tool as string) ?? "",
                label: (payload?.label as string) ?? "Thinking...",
                query: (payload?.query as string) ?? "",
              });
              clearToolThinkingTimer();
              toolThinkingTimeoutRef.current = window.setTimeout(() => {
                setToolThinking(null);
                toolThinkingTimeoutRef.current = null;
              }, TOOL_THINKING_CLEAR_DELAY);
              break;
            }
            case "typing_status": {
              updateMentorTyping(Boolean(payload?.is_typing));
              break;
            }
            case "safety_alert": {
              dispatchSafetyAlert({
                type: "safety_alert",
                severity:
                  payload?.risk_level === "critical"
                    ? "critical"
                    : payload?.risk_level === "high"
                      ? "high"
                      : "medium",
                message:
                  (payload?.message as string) ??
                  "We've detected a safety concern in this conversation.",
                resources: Array.isArray(payload?.resources)
                  ? (payload.resources as string[])
                  : undefined,
              });
              updateMentorTyping(false);
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
                    plan_id?: string;
                    plan_title?: string;
                    task_count?: number;
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
                  status: (data?.status as PlanBuildStatus) ?? "in_progress",
                  message:
                    (data?.message as string) ?? "Working on your plan...",
                  plan_id: data?.plan_id as string | undefined,
                  plan_title: data?.plan_title as string | undefined,
                  task_count: data?.task_count as number | undefined,
                  agent: data?.agent as string | undefined,
                  tool: data?.tool as string | undefined,
                  step_type: data?.step_type as string | undefined,
                  timestamp: data?.timestamp
                    ? (data.timestamp as string)
                    : new Date().toISOString(),
                },
              });

              if (data?.status) {
                setPlanBuildStatus(
                  (data.status as PlanBuildStatus) || "in_progress",
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
              if (!step) {
                break;
              }

              pushRuntimeStep({
                id: step.id ?? crypto.randomUUID(),
                agent: step.agent ?? "System",
                step: step.step ?? "Processing",
                status: step.status ?? "running",
                timestamp: step.timestamp ?? new Date().toISOString(),
                details: step.details,
                input: step.input,
                output: step.output,
                confidence: step.confidence,
              });

              if (step.status === "running") {
                setActiveAgent({ name: step.agent });
                updateMentorTyping(true);
              } else if (
                step.status === "completed" ||
                step.status === "failed"
              ) {
                updateMentorTyping(false);
              }
              break;
            }
            case "insight_generated": {
              const insight = payload?.data;
              if (!insight) {
                break;
              }
              pushInsight({
                id: insight.id ?? crypto.randomUUID(),
                type: insight.type ?? "recommendation",
                title: insight.title ?? "New Insight",
                message: insight.message ?? "",
                data: insight.data,
                timestamp: insight.timestamp ?? new Date().toISOString(),
                is_read: false,
              });
              telemetry.toastInfo(insight.title, insight.message);
              break;
            }
            case "missing_information": {
              const info = payload?.data;
              if (!info) {
                break;
              }

              const messageId = info.id ?? crypto.randomUUID();
              const context = info.context
                ? `\n\nWhy I'm asking: ${info.context}`
                : "";
              const unblocks = info.unblocks
                ? `\n\nHow this helps: ${info.unblocks}`
                : "";

              pushMissingInfo({
                id: messageId,
                field: info.field,
                question: info.question,
                context: info.context,
                unblocks: info.unblocks,
                status: "pending",
                timestamp: new Date().toISOString(),
              });

              if (conversationId) {
                const isoTimestamp = new Date().toISOString();
                const missingInfoMessage: ChatMessage = {
                  id: `missing-info-${messageId}`,
                  conversation: conversationId,
                  message_type: "text",
                  sender_type: "ai",
                  content:
                    (info.question ??
                      "I need a bit more information to continue.") +
                    context +
                    unblocks,
                  sequence_number: Date.now(),
                  ai_model_used: undefined,
                  tokens_used: undefined,
                  processing_time: undefined,
                  is_edited: false,
                  is_flagged: false,
                  created_at: isoTimestamp,
                  updated_at: isoTimestamp,
                  metadata: {
                    missing_info_id: messageId,
                    missing_info_field: info.field,
                    missing_info_context: info.context,
                    missing_info_unblocks: info.unblocks,
                  },
                };
                appendMessageToCache(queryClient, conversationId, missingInfoMessage);
                updateConversationSnapshot(
                  queryClient,
                  conversationId,
                  missingInfoMessage,
                );
              }

              pushPlanUpdate({
                type: "plan_update",
                data: {
                  id: `missing-info-${messageId}`,
                  status: "warning",
                  message:
                    info.question ?? "Additional info needed to continue.",
                  timestamp: new Date().toISOString(),
                },
              });
              break;
            }
            case "level_completed": {
              const levelTitle = (payload?.level_title as string) ?? "Level";
              const xpAwarded = (payload?.xp_awarded as number) ?? 100;
              import("canvas-confetti")
                .then(({ default: confetti }) => {
                  confetti({
                    particleCount: 120,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"],
                  });
                })
                .catch(() => {
                  // no-op
                });
              telemetry.toastSuccess(
                "Level completed",
                `${levelTitle} finished. +${xpAwarded} XP earned.`,
              );
              queryClient.invalidateQueries({ queryKey: ["roadmap"] });
              break;
            }
            case "artifact_verified": {
              window.dispatchEvent(
                new CustomEvent("artifact_verified", { detail: payload }),
              );
              break;
            }
            case "mirror_analysis_ready": {
              const snapshotId = payload?.mirror_snapshot_id as string | undefined;
              setMirrorAnalysisReady(snapshotId ?? null);
              queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
              telemetry.toastSuccess(
                "Profile analysis ready",
                "Your mentor now has full context about your background.",
              );
              break;
            }
            case "proactive_mentor_message": {
              window.dispatchEvent(
                new CustomEvent("proactive_mentor_message", {
                  detail: {
                    conversationId: payload?.conversation_id,
                    triggerType: payload?.trigger_type,
                  },
                }),
              );
              telemetry.toastInfo(
                "Your mentor sent you a message",
                "Open the chat to see what they said.",
              );
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
    clearToolThinkingTimer,
    conversationId,
    pushInsight,
    pushMissingInfo,
    pushPlanUpdate,
    pushRoutingDecision,
    pushRuntimeStep,
    queryClient,
    resetSocket,
    scheduleReconnect,
    setActiveAgent,
    setMirrorAnalysisReady,
    setPlanBuildStatus,
    setToolThinking,
    startHeartbeat,
    stopHeartbeat,
    updateLastPlanActivity,
    updateMentorTyping,
  ]);

  connectRef.current = connect;

  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        context?: string;
        metadata?: Record<string, unknown>;
      },
    ) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        telemetry.toastError("Chat connection is not ready yet.");
        throw new Error("Chat socket is not open");
      }

      const trimmed = content.trim();
      if (!trimmed || !conversationId) {
        return;
      }

      const tempId = `temp-${Date.now()}`;
      const requestId = createClientId();
      const traceId = requestId;
      const isoTimestamp = new Date().toISOString();
      const optimisticMessage: ChatMessage = {
        id: tempId,
        conversation: conversationId,
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

      try {
        appendMessageToCache(queryClient, conversationId, optimisticMessage);
        updateConversationSnapshot(queryClient, conversationId, optimisticMessage);
      } catch (cacheError) {
        telemetry.error("Failed to add optimistic message to cache", {
          cacheError,
        });
        telemetry.toastError("Could not send message. Please try again.");
        return;
      }

      try {
        socket.send(
          JSON.stringify({
            type: "streaming_message",
            message: {
              content: trimmed,
              temp_id: tempId,
              context: options?.context,
              metadata: {
                ...(options?.metadata ?? {}),
                request_id: requestId,
                trace_id: traceId,
              },
            },
          }),
        );
        updateMentorTyping(false);
      } catch (sendError) {
        removeMessageFromCache(queryClient, conversationId, tempId);
        rollbackConversationSnapshot(queryClient, conversationId, tempId);
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        telemetry.error("Failed to send message over chat socket", { sendError });
        telemetry.toastError("Could not send message. Please try again.");
        throw sendError;
      }
    },
    [conversationId, queryClient, updateMentorTyping],
  );

  const setTypingStatus = useCallback((isTyping: boolean) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    if (lastTypingSentRef.current === isTyping) {
      return;
    }

    try {
      socket.send(
        JSON.stringify({
          type: "typing_status",
          is_typing: isTyping,
        }),
      );
      lastTypingSentRef.current = isTyping;
    } catch (typingError) {
      telemetry.warn("Failed to send typing status", { typingError });
    }
  }, []);

  useEffect(() => {
    reconnectAttemptsRef.current = 0;
    lastTypingSentRef.current = false;
    setStreamState({ content: null });
    updateMentorTyping(false);
    setActiveAgent(null);
    setToolThinking(null);

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
      setError(null);
    };
  }, [
    connect,
    conversationId,
    resetSocket,
    setActiveAgent,
    setToolThinking,
    updateMentorTyping,
  ]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const ensureConnected = () => {
      if (document.visibilityState === "hidden" || navigator.onLine === false) {
        return;
      }
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        clearReconnectTimer();
        setStatus("connecting");
        setError("Reconnecting...");
        connectRef.current();
      }
    };

    const onVisible = () => ensureConnected();
    const onFocus = () => ensureConnected();
    const onOnline = () => ensureConnected();

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [conversationId, clearReconnectTimer]);

  useEffect(() => {
    return () => {
      if (mentorTypingTimeoutRef.current) {
        window.clearTimeout(mentorTypingTimeoutRef.current);
        mentorTypingTimeoutRef.current = null;
      }
      clearToolThinkingTimer();
    };
  }, [clearToolThinkingTimer]);

  return {
    status,
    error,
    sendMessage,
    mentorTyping,
    streamingMessage: streamState.content,
    streamingMessageId: streamState.messageId,
    setTypingStatus,
  };
}

export type { SafetyAlertEventDetail };
export { SAFETY_ALERT_EVENT };
