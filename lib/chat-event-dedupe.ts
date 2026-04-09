"use client";

const DEDUPE_TTL_MS = 30_000;
const DEDUPE_KEY = "__horizon_chat_event_dedupe__";

type DedupedEventStore = Map<string, number>;

const getEventStore = (): DedupedEventStore => {
  const globalScope = globalThis as typeof globalThis & {
    [DEDUPE_KEY]?: DedupedEventStore;
  };

  if (!globalScope[DEDUPE_KEY]) {
    globalScope[DEDUPE_KEY] = new Map<string, number>();
  }

  return globalScope[DEDUPE_KEY]!;
};

const pruneEventStore = (store: DedupedEventStore, now: number) => {
  for (const [key, seenAt] of store.entries()) {
    if (now - seenAt > DEDUPE_TTL_MS) {
      store.delete(key);
    }
  }
};

const firstString = (...values: Array<unknown>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const stableSnippet = (value: unknown): string => {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim().slice(0, 160);
  }

  if (Array.isArray(value)) {
    return value.map(stableSnippet).filter(Boolean).join("|").slice(0, 160);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return firstString(
      record.reason,
      record.summary,
      record.message,
      record.explanation,
      record.rationale,
      record.output,
      record.input,
      record.details,
      record.query,
      record.label,
      record.title,
      record.fallback_reason,
    );
  }

  return String(value).trim().slice(0, 160);
};

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return value;
    }
  }

  return value;
};

const buildEventFingerprint = (
  type: string,
  payload: Record<string, unknown> | undefined,
) => {
  const conversationId = firstString(
    payload?.conversation_id,
    payload?.conversationId,
    payload?.session_id,
    payload?.sessionId,
  );
  const explicitId = firstString(
    payload?.event_id,
    payload?.id,
    payload?.message_id,
    payload?.messageId,
    payload?.temp_id,
    payload?.tempId,
    payload?.plan_id,
    payload?.planId,
    payload?.mirror_snapshot_id,
    payload?.snapshot_id,
  );
  const status = firstString(payload?.status, payload?.event, payload?.stage);
  const summary = stableSnippet({
    reason: payload?.reason,
    message: payload?.message,
    label: payload?.label,
    tool: payload?.tool,
    agent: payload?.agent,
    data: payload?.data,
    progress_update: payload?.progress_update,
  });

  return [type, conversationId, explicitId, status, summary]
    .filter(Boolean)
    .join("::");
};

export const hasHandledChatEvent = (
  type: string,
  payload?: Record<string, unknown>,
) => {
  const store = getEventStore();
  const now = Date.now();
  pruneEventStore(store, now);

  return store.has(buildEventFingerprint(type, payload));
};

export const markHandledChatEvent = (
  type: string,
  payload?: Record<string, unknown>,
) => {
  const store = getEventStore();
  const now = Date.now();
  pruneEventStore(store, now);

  store.set(buildEventFingerprint(type, payload), now);
};

export const summarizeChatEventText = (value: unknown): string => {
  const parsed = parseMaybeJson(value);

  if (typeof parsed === "string") {
    return parsed.trim().replace(/\s+/g, " ").slice(0, 140);
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => summarizeChatEventText(item))
      .filter(Boolean)
      .join(", ")
      .slice(0, 140);
  }

  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    return firstString(
      record.reason,
      record.summary,
      record.message,
      record.explanation,
      record.rationale,
      record.output,
      record.input,
      record.details,
      record.query,
      record.label,
      record.title,
      record.fallback_reason,
    )
      .replace(/\s+/g, " ")
      .slice(0, 140);
  }

  return "";
};
