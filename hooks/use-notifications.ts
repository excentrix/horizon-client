import { useCallback, useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import type { ToastNotification } from "@/types";
import { telemetry } from "@/lib/telemetry";
import {
  describeStageEvent,
  isStageEventType,
  type StageStreamEvent,
  type StageEventPayload,
} from "@/lib/analysis-stage";

export type NotificationSocketStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error";

type NotificationEvent =
  | {
      type: "connection_status" | "pong";
    }
  | {
      type: "toast_notification";
      notification?: ToastNotification;
    }
  | {
      type: "unread_count";
      count?: number;
    }
  | {
      type: "notification";
      data?: {
        message?: string;
      } & Record<string, unknown>;
    }
  | {
      type: string;
      [key: string]: unknown;
    };

const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 10000;

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

export function useNotificationsSocket() {
  const [status, setStatus] = useState<NotificationSocketStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [analysisEvents, setAnalysisEvents] = useState<StageStreamEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [latestEvent, setLatestEvent] = useState<Record<string, unknown> | null>(
    null,
  );

  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const heartbeatTimeoutRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const manualCloseRef = useRef(false);
  const stageEventSeqRef = useRef(0);

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

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const resetSocket = useCallback(() => {
    stopHeartbeat();
    clearReconnectTimeout();
    if (socketRef.current) {
      manualCloseRef.current = true;
      try {
        socketRef.current.close();
      } catch (closeError) {
        telemetry.warn("Error closing notification socket", { closeError });
      }
      socketRef.current = null;
    }
  }, [clearReconnectTimeout, stopHeartbeat]);

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
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            return;
          }
          socket.close();
        }, HEARTBEAT_TIMEOUT);
      } catch (err) {
        telemetry.warn("Failed to send notification heartbeat", { err });
      }
    }, HEARTBEAT_INTERVAL);
  }, [stopHeartbeat]);

  const connect = useCallback(() => {
    const base = getWebSocketBase();
    if (!base) {
      setStatus("error");
      setError("Notification endpoint unavailable");
      telemetry.warn("Notification WS endpoint unavailable");
      return;
    }

    // Try multiple places for the auth token: cookie first, then localStorage, then fallback cookie names
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
      telemetry.warn("Missing authentication token for notification socket");
      return;
    }

    resetSocket();

    const wsUrl = `${base}/ws/notifications/?token=${encodeURIComponent(token)}`;

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      setStatus("connecting");
      setError(null);
      manualCloseRef.current = false;

      socket.onopen = () => {
        setStatus("open");
        setError(null);
        startHeartbeat();
        socket.send(JSON.stringify({ type: "get_unread_count" }));
      };

      socket.onclose = () => {
        stopHeartbeat();
        if (manualCloseRef.current) {
          manualCloseRef.current = false;
          setStatus("closed");
          return;
        }
        setStatus("closed");
        clearReconnectTimeout();
        reconnectTimeoutRef.current = window.setTimeout(() => {
          setStatus("connecting");
          setError(null);
          connect();
        }, 5000);
      };

      socket.onerror = (socketError) => {
        telemetry.warn("Notification socket error", { socketError });
        setStatus("error");
        setError("Notification connection error");
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data ?? "{}") as NotificationEvent;
          const type = payload?.type;

          switch (type) {
            case "connection_status": {
              setStatus("open");
              break;
            }
            case "toast_notification": {
              if ("notification" in payload && payload.notification) {
                const newNotification = payload.notification as ToastNotification;
                setNotifications((prev) => [newNotification, ...prev]);
                setUnreadCount((prev) => prev + 1);
              }
              break;
            }
            case "unread_count": {
              if ("count" in payload && typeof payload.count === "number") {
                setUnreadCount(payload.count);
              }
              break;
            }
            case "pong": {
              if (heartbeatTimeoutRef.current) {
                window.clearTimeout(heartbeatTimeoutRef.current);
                heartbeatTimeoutRef.current = null;
              }
              break;
            }
            case "notification": {
              if ("data" in payload && payload.data) {
                const data = payload.data as StageEventPayload;
                const eventType =
                  typeof data.event === "string" ? data.event : undefined;
                const stageEvent = isStageEventType(eventType);
                let descriptor = stageEvent ? describeStageEvent(data) : null;

                if (stageEvent) {
                  const nextSeq = stageEventSeqRef.current + 1;
                  stageEventSeqRef.current = nextSeq;
                  const enrichedEvent: StageStreamEvent = {
                    __seq: nextSeq,
                    ...data,
                  };
                  descriptor = describeStageEvent(enrichedEvent);
                  setAnalysisEvents((previous) => {
                    const next = [enrichedEvent, ...previous];
                    return next.slice(0, 120);
                  });
                  setLatestEvent(enrichedEvent);
                } else {
                  setLatestEvent(data);
                }

                let toastMessage =
                  typeof data.message === "string" && data.message.length > 0
                    ? data.message
                    : undefined;

                if (descriptor && (!toastMessage || stageEvent)) {
                  toastMessage = descriptor.message;
                }

                if (toastMessage) {
                  const severity =
                    descriptor?.severity ??
                    (eventType === "analysis_error"
                      ? "error"
                      : eventType === "analysis_complete" ||
                          eventType === "analysis_completed"
                        ? "success"
                        : "info");

                  if (severity === "error") {
                    telemetry.toastError(toastMessage);
                  } else if (severity === "success") {
                    telemetry.toastSuccess(toastMessage);
                  } else {
                    telemetry.toastInfo(toastMessage);
                  }
                } else if (!stageEvent) {
                  telemetry.info("Unhandled notification event", { payload: data });
                }

                if (!stageEvent) {
                  const notificationCandidate = data as Partial<ToastNotification>;
                  if (
                    typeof notificationCandidate.id === "string" &&
                    typeof notificationCandidate.title === "string" &&
                    typeof notificationCandidate.message === "string"
                  ) {
                    setNotifications((prev) => [
                      notificationCandidate as ToastNotification,
                      ...prev,
                    ]);
                    setUnreadCount((prev) => prev + 1);
                  }
                }
              }
              break;
            }
            default:
              telemetry.info("Unhandled notification event", { payload });
              break;
          }
        } catch (parseError) {
          telemetry.warn("Failed to parse notification message", {
            parseError,
          });
        }
      };
    } catch (socketError) {
      telemetry.error("Unable to open notification socket", { socketError });
      setStatus("error");
      setError("Unable to open notification connection");
      clearReconnectTimeout();
      reconnectTimeoutRef.current = window.setTimeout(() => {
        setStatus("connecting");
        setError(null);
        connect();
      }, 5000);
    }
  }, [clearReconnectTimeout, resetSocket, startHeartbeat, stopHeartbeat]);

  useEffect(() => {
    connect();

    return () => {
      resetSocket();
    };
  }, [connect, resetSocket]);

  useEffect(() => {
    return () => {
      stopHeartbeat();
      clearReconnectTimeout();
    };
  }, [clearReconnectTimeout, stopHeartbeat]);

  const markNotificationRead = useCallback((notificationId: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "mark_notification_read",
        notification_id: notificationId,
      })
    );

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    setUnreadCount((prev) => Math.max(prev - 1, 0));
  }, []);

  return {
    status,
    error,
    notifications,
    analysisEvents,
    unreadCount,
    latestEvent,
    markNotificationRead,
  };
}
