"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { telemetry } from "@/lib/telemetry";

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

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 rounded-xl border bg-card/80 px-4 py-3 shadow"
    >
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
