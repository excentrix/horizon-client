import { useMemo } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { chatApi } from "@/lib/api";
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

const emptyPaginatedResponse = (): PaginatedResponse<ChatMessage> => ({
  count: 0,
  next: null,
  previous: null,
  results: [],
});

export function useConversations() {
  const { user, isLoading: authLoading } = useAuth();

  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => chatApi.listConversations(),
    enabled: Boolean(!authLoading && user),
    staleTime: 120_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 429) {
        return false;
      }
      return failureCount < 1;
    },
    placeholderData: () => [] as Conversation[],
  });
}

export function useConversationMessages(conversationId: string | null) {
  const { user, isLoading: authLoading } = useAuth();
  const result = useInfiniteQuery<PaginatedResponse<ChatMessage>, Error>({
    queryKey: ["conversations", conversationId, "messages"],
    enabled: Boolean(conversationId && !authLoading && user),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (!conversationId) {
        return emptyPaginatedResponse();
      }

      return chatApi.fetchMessagesPage(conversationId, {
        page: pageParam,
        ordering: "-sequence_number",
      });
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
