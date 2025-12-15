"use client";

import { FormEvent, useEffect, useState } from "react";
import { Send, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { telemetry } from "@/lib/telemetry";
import { intelligenceApi } from "@/lib/api";

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
  const pushRoutingDecision = useMentorLoungeStore((state) => state.pushRoutingDecision);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    setShowDebug(process.env.NEXT_PUBLIC_SHOW_CORTEX_DEBUG === "true");
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConversationId || disabled) {
      return;
    }

    const trimmed = composerDraft.trim();
    if (!trimmed) {
      return;
    }

        setIsSubmitting(true);
        try {
          await onSend(trimmed);
          setComposerDraft("");
          onTypingChange?.(false);
        } catch (error) {
          telemetry.warn("Failed to send chat message", { error });
          telemetry.toastError("Couldn't send that message. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviewRouting = async () => {
    if (!selectedConversationId || !composerDraft.trim()) return;

    setIsPreviewing(true);
    try {
      const result = await intelligenceApi.previewCortexRouting(
        selectedConversationId,
        composerDraft.trim()
      );
      
      pushRoutingDecision({
        agent: result.agent,
        confidence: result.confidence,
        reason: `[PREVIEW] ${result.reason}`,
        timestamp: new Date().toISOString(),
      });
      
      telemetry.toastInfo(`Preview: Routed to ${result.agent} (${(result.confidence * 100).toFixed(0)}%)`);
    } catch (error) {
      telemetry.warn("Failed to preview routing", { error });
      telemetry.toastError("Preview failed");
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 rounded-xl border bg-card/80 px-4 py-3 shadow"
    >
        {showDebug ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePreviewRouting}
            disabled={disabled || !selectedConversationId || isPreviewing || !composerDraft.trim()}
            title="Preview Cortex Routing"
          >
             <ScanSearch className="h-4 w-4 text-muted-foreground" />
          </Button>
      ) : null}
              <Input
                value={composerDraft}
                onChange={(event) => {
                  setComposerDraft(event.target.value);
                  onTypingChange?.(Boolean(event.target.value.trim()));
                }}
                onBlur={() => onTypingChange?.(false)}
                placeholder={
                  selectedConversationId
                    ? "Ask your mentor anything..."
                    : "Select a conversation to start"
        }
        disabled={disabled || !selectedConversationId || isSubmitting}
        className="flex-1"
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
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
}
