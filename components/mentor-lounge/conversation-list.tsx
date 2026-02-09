"use client";

import { useEffect } from "react";
import { Loader2, Pin } from "lucide-react";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import type { Conversation } from "@/types";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations?: Conversation[];
  isLoading?: boolean;
  selectedConversationId?: string | null;
  onSelectConversation?: (conversationId: string) => void;
  activeClass?: string;
}

export function ConversationList({
  conversations = [],
  isLoading,
  selectedConversationId,
  onSelectConversation,
  activeClass,
}: ConversationListProps) {
  const storeSelectedConversationId = useMentorLoungeStore(
    (state) => state.selectedConversationId,
  );
  const setSelectedConversationId = useMentorLoungeStore(
    (state) => state.setSelectedConversationId,
  );
  const activeConversationId = selectedConversationId ?? storeSelectedConversationId;
  const selectConversation = onSelectConversation ?? setSelectedConversationId;

  useEffect(() => {
    if (!storeSelectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, storeSelectedConversationId, setSelectedConversationId]);

  if (isLoading && conversations.length === 0) {
    return (
      <div className="grid min-h-[240px] place-items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Fetching mentor threads...
        </div>
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No conversations yet. Say hi to your mentor to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => {
        const isActive = activeConversationId === conversation.id;
        return (
          <button
            key={conversation.id}
            type="button"
            onClick={() => selectConversation(conversation.id)}
            className={cn(
              "w-full rounded-xl border px-3 py-2 text-left transition",
              isActive
                ? activeClass ?? "border-slate-300 bg-slate-50"
                : "border-transparent bg-muted/40 hover:border-border",
            )}
          >
            <div className="flex min-w-0 items-center justify-between gap-2 text-sm font-medium">
              <span className="truncate">{conversation.title}</span>
              {conversation.is_pinned ? <Pin className="h-4 w-4" /> : null}
            </div>
            {conversation.topic ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {conversation.topic}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
