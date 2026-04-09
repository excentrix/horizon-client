"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { Send } from "lucide-react";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { telemetry } from "@/lib/telemetry";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
          "min-h-[58px] max-h-48 resize-none border-0 bg-transparent px-4 py-3 pr-16 text-base leading-6 shadow-none",
          "focus-visible:border-0 focus-visible:ring-0",
        )}
      />
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
  );
}
