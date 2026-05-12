"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { Eye, EyeOff, Send, X } from "lucide-react";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { telemetry } from "@/lib/telemetry";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { chatApi } from "@/lib/api";

interface MessageComposerProps {
  disabled?: boolean;
  onSend: (content: string) => Promise<void> | void;
  onTypingChange?: (isTyping: boolean) => void;
}

export function MessageComposer({ disabled, onSend, onTypingChange }: MessageComposerProps) {
  const selectedConversationId = useMentorLoungeStore(
    (state) => state.selectedConversationId,
  );
  const composerDraft = useMentorLoungeStore((state) => state.composerDraft);
  const setComposerDraft = useMentorLoungeStore((state) => state.setComposerDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const typingStartTimerRef = useRef<number | null>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const lastTypingStateRef = useRef(false);

  const [draftReviewEnabled, setDraftReviewEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("draft_review_enabled") === "true";
  });
  const [draftWarning, setDraftWarning] = useState<string | null>(null);
  const [dismissedDraft, setDismissedDraft] = useState<string>("");
  const draftReviewTimerRef = useRef<number | null>(null);

  const emitTypingState = useCallback(
    (isTyping: boolean) => {
      if (lastTypingStateRef.current === isTyping) {
        return;
      }
      lastTypingStateRef.current = isTyping;
      onTypingChange?.(isTyping);
    },
    [onTypingChange],
  );

  const clearTypingTimers = useCallback(() => {
    if (typingStartTimerRef.current) {
      window.clearTimeout(typingStartTimerRef.current);
      typingStartTimerRef.current = null;
    }
    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
  }, []);

  const scheduleTypingState = useCallback(
    (value: string) => {
      const hasText = Boolean(value.trim());
      clearTypingTimers();

      if (!hasText) {
        emitTypingState(false);
        return;
      }

      if (!lastTypingStateRef.current) {
        typingStartTimerRef.current = window.setTimeout(() => {
          emitTypingState(true);
          typingStartTimerRef.current = null;
        }, 250);
      }

      typingStopTimerRef.current = window.setTimeout(() => {
        emitTypingState(false);
        typingStopTimerRef.current = null;
      }, 1500);
    },
    [clearTypingTimers, emitTypingState],
  );

  const toggleDraftReview = () => {
    const next = !draftReviewEnabled;
    setDraftReviewEnabled(next);
    localStorage.setItem("draft_review_enabled", String(next));
    if (!next) setDraftWarning(null);
  };

  useEffect(() => {
    if (!draftReviewEnabled || composerDraft.trim().length < 30) {
      setDraftWarning(null);
      return;
    }
    if (composerDraft === dismissedDraft) return;
    if (draftReviewTimerRef.current) window.clearTimeout(draftReviewTimerRef.current);
    draftReviewTimerRef.current = window.setTimeout(async () => {
      try {
        const { warning } = await chatApi.reviewDraft(
          composerDraft,
          selectedConversationId || undefined
        );
        setDraftWarning(warning);
      } catch {
        // non-fatal — silently skip
      }
    }, 3000);
    return () => {
      if (draftReviewTimerRef.current) window.clearTimeout(draftReviewTimerRef.current);
    };
  }, [composerDraft, draftReviewEnabled, dismissedDraft, selectedConversationId]);

  useEffect(() => {
    return () => {
      clearTypingTimers();
      emitTypingState(false);
    };
  }, [clearTypingTimers, emitTypingState]);

  const sendMessage = async (content: string) => {
    if (!selectedConversationId || disabled) {
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSend(trimmed);

      // Capture message sent event
      posthog.capture('message_sent', {
        conversation_id: selectedConversationId,
        message_length: trimmed.length,
      });

      setComposerDraft("");
      clearTypingTimers();
      emitTypingState(false);
    } catch (error) {
      telemetry.warn("Failed to send chat message", { error });
      telemetry.toastError("Couldn't send that message. Try again.");
      // Restore draft so the user doesn't lose their message
      setComposerDraft(trimmed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedConversationId || disabled) {
      return;
    }
    await sendMessage(composerDraft);
  };

  return (
    <div className="flex flex-col gap-1">
      {draftWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="flex-1">{draftWarning}</span>
          <button
            type="button"
            onClick={() => { setDraftWarning(null); setDismissedDraft(composerDraft); }}
            className="shrink-0 rounded p-0.5 hover:bg-amber-200 dark:hover:bg-amber-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    <form
      className={cn(
        "relative rounded-2xl border bg-card/95 shadow-sm",
        "transition-colors focus-within:border-ring",
      )}
      onSubmit={async (event) => {
        event.preventDefault();
        await handleSubmit();
      }}
    >
      <Textarea
        placeholder={
          selectedConversationId
            ? "Ask your mentor anything..."
            : "Select a conversation to start"
        }
        disabled={disabled || !selectedConversationId || isSubmitting}
        value={composerDraft}
        onChange={(event) => {
          const nextValue = event.target.value;
          setComposerDraft(nextValue);
          scheduleTypingState(nextValue);
        }}
        onBlur={() => {
          clearTypingTimers();
          emitTypingState(false);
        }}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") {
            return;
          }
          if (event.shiftKey || isComposing || event.nativeEvent.isComposing) {
            return;
          }
          event.preventDefault();
          void handleSubmit();
        }}
        className={cn(
          "min-h-[58px] max-h-48 resize-none border-0 bg-transparent pl-10 pr-16 py-3 text-base leading-6 shadow-none",
          "focus-visible:border-0 focus-visible:ring-0",
        )}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        title={draftReviewEnabled ? "Disable draft review" : "Enable draft review (ARIA checks your message before you send)"}
        onClick={toggleDraftReview}
        className={cn(
          "absolute left-2 bottom-2 h-7 w-7 rounded-md",
          draftReviewEnabled ? "text-primary" : "text-muted-foreground opacity-50"
        )}
      >
        {draftReviewEnabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </Button>
      <Button
        type="submit"
        size="icon"
        disabled={
          disabled ||
          !selectedConversationId ||
          isSubmitting ||
          !composerDraft.trim()
        }
        className="absolute right-2 bottom-2 h-9 w-9 rounded-lg"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
    </div>
  );
}
