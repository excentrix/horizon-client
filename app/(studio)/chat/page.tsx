"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ConversationList } from "@/components/mentor-lounge/conversation-list";
import { MessageFeed } from "@/components/mentor-lounge/message-feed";
import { MessageComposer } from "@/components/mentor-lounge/message-composer";
import { useConversations, useConversationMessages } from "@/hooks/use-conversations";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { useChatSocket } from "@/hooks/use-chat-socket";

export default function ChatPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const selectedConversationId = useMentorLoungeStore(
    (state) => state.selectedConversationId,
  );
  const setComposerDraft = useMentorLoungeStore(
    (state) => state.setComposerDraft,
  );
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
  } = useConversations();

  const {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: messagesLoading,
  } = useConversationMessages(selectedConversationId);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  const {
    status: socketStatus,
    error: socketError,
    sendMessage,
    mentorTyping,
    streamingMessage,
  } = useChatSocket(selectedConversationId ?? null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    setComposerDraft("");
  }, [selectedConversationId, setComposerDraft]);

  return (
    <div className="grid h-auto min-h-0 gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="flex min-h-0 flex-col gap-4 overflow-hidden rounded-xl border bg-card/70 p-4 shadow-sm">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mentor threads
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ConversationList
            conversations={conversations}
            isLoading={conversationsLoading}
          />
        </div>
      </aside>

      <section className="flex h-full min-h-0 flex-col gap-4">
        <MessageFeed
          conversation={activeConversation}
          messages={messages}
          isLoading={messagesLoading}
          connectionStatus={socketStatus}
          connectionError={socketError}
          hasMore={hasNextPage}
          onLoadMore={async () => {
            if (hasNextPage && !isFetchingNextPage) {
              await fetchNextPage();
            }
          }}
          isLoadingMore={isFetchingNextPage}
          mentorTyping={mentorTyping}
          streamingMessage={streamingMessage}
        />
        <MessageComposer
          disabled={
            messagesLoading ||
            !activeConversation ||
            socketStatus !== "open"
          }
          onSend={sendMessage}
        />
      </section>
    </div>
  );
}
