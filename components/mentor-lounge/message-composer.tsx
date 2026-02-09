"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { Send, ScanSearch } from "lucide-react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputButton,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { telemetry } from "@/lib/telemetry";
import { intelligenceApi } from "@/lib/api";

interface MessageComposerProps {
  disabled?: boolean;
  onSend: (content: string) => Promise<void> | void;
  onTypingChange?: (isTyping: boolean) => void;
}

function PromptInputDraftSync({ draft }: { draft: string }) {
  const { textInput } = usePromptInputController();

  useEffect(() => {
    if (textInput.value !== draft) {
      textInput.setInput(draft);
    }
  }, [draft, textInput]);



  return null;
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
    <PromptInputProvider initialInput={composerDraft}>
      <PromptInput
        onSubmit={async (message) => {
          if (!selectedConversationId || disabled) {
            return;
          }

          const trimmed = message.text.trim();
          if (!trimmed) {
            return;
          }

          await sendMessage(trimmed);
        }}
        className="rounded-2xl border bg-card/90 shadow-sm"
      >
        <PromptInputDraftSync draft={composerDraft} />
        <PromptInputBody>
          <PromptInputTextarea
            placeholder={
              selectedConversationId
                ? "Ask your mentor anything..."
                : "Select a conversation to start"
            }
            disabled={disabled || !selectedConversationId || isSubmitting}
            onChange={(event) => {
              setComposerDraft(event.target.value);
              const nextTyping = Boolean(event.target.value.trim());
              onTypingChange?.(nextTyping);
            }}
            onBlur={() => {
              onTypingChange?.(false);
            }}
            className="border-none bg-transparent px-4 py-4 text-base leading-6"
          />
        </PromptInputBody>
        <PromptInputFooter className="border-t px-3 py-2">
          <PromptInputTools>
            {showDebug ? (
              <PromptInputButton
                onClick={handlePreviewRouting}
                disabled={
                  disabled ||
                  !selectedConversationId ||
                  isPreviewing ||
                  !composerDraft.trim()
                }
                title="Preview Cortex Routing"
              >
                <ScanSearch className="h-4 w-4 text-muted-foreground" />
              </PromptInputButton>
            ) : null}
          </PromptInputTools>
          <PromptInputSubmit
            disabled={
              disabled ||
              !selectedConversationId ||
              isSubmitting ||
              !composerDraft.trim()
            }
            status={isSubmitting ? "submitted" : undefined}
          >
            <Send className="h-4 w-4" />
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
    </PromptInputProvider>
  );
}
