"use client";

import { MentorAssistant } from "../MentorAssistant";
import type { ChatMessage } from "@/types";
import type { StepId } from "../surface-runtime-router";

interface MentorDockProps {
  messages: ChatMessage[];
  isTyping: boolean;
  streamingMessage: string | { id: string; content: string } | null;
  onSendMessage: (message: string, actionType?: string) => Promise<void>;
  socketStatus: string;
  currentStep?: StepId;
  compact?: boolean;
}

export function MentorDock(props: MentorDockProps) {
  return (
    <div className="flex min-h-[176px] max-h-[220px] flex-col overflow-hidden">
      <MentorAssistant {...props} hideComposer compact={props.compact} />
    </div>
  );
}
