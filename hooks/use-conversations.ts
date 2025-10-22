import { useMemo } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { chatApi } from "@/lib/api";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from "@/lib/mocks/chat";
import { telemetry } from "@/lib/telemetry";
import type {
  ChatMessage,
  Conversation,
  PaginatedResponse,
} from "@/types";

const getPageFromUrl = (url?: string | null) => {
  if (!url) {
    return undefined;
  }
  const match = url.match(/[?&]page=(\d+)/);
  if (!match) {
    return undefined;
  }
  return Number(match[1]);
};

const emptyPaginatedResponse = (
  results: ChatMessage[],
): PaginatedResponse<ChatMessage> => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      try {
        return await chatApi.listConversations();
      } catch (error) {
        telemetry.warn("Falling back to mock conversations", { error });
        return MOCK_CONVERSATIONS;
      }
    },
    placeholderData: () => MOCK_CONVERSATIONS,
    retry: false,
  });
}

export function useConversationMessages(conversationId: string | null) {
  const result = useInfiniteQuery<PaginatedResponse<ChatMessage>, Error>({
    queryKey: ["conversations", conversationId, "messages"],
    enabled: Boolean(conversationId),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (!conversationId) {
        return emptyPaginatedResponse([]);
      }

      try {
        return await chatApi.fetchMessagesPage(conversationId, {
          page: pageParam,
        });
      } catch (error) {
        telemetry.warn("Falling back to mock messages", { error });
        const mock = MOCK_MESSAGES[conversationId];
        if (pageParam === 1 && mock) {
          return emptyPaginatedResponse(mock);
        }
        throw error;
      }
    },
    getNextPageParam: (lastPage) => getPageFromUrl(lastPage.next),
    retry: false,
  });

  const messages = useMemo(() => {
    if (!result.data) {
      return [] as ChatMessage[];
    }

    const combined = result.data.pages.flatMap((page) => page.results ?? []);
    return combined.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [result.data]);

  return {
    messages,
    fetchNextPage: result.fetchNextPage,
    hasNextPage: result.hasNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
    isLoading: result.isLoading,
    error: result.error,
    status: result.status,
    refetch: result.refetch,
  };
}
