/**
 * Hook for fetching and managing flow suggestions.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http-client';
import { telemetry } from '@/lib/telemetry';

export interface InlineContent {
  content_type: 'quiz' | 'code' | 'reflection' | 'task_preview';
  data: Record<string, unknown>;
  interactions_enabled: boolean;
}

export interface FlowSuggestion {
  type: 'continue' | 'quick_win' | 'celebrate' | 'stretch' | 'explore' | 'personalize' | 'alternate' | 'nudge' | 'showcase' | 'apply';
  title: string;
  message: string;
  action_label: string;
  inline_content?: InlineContent;
  metadata?: Record<string, unknown>;
  priority: number;
  log_id?: string;
}

interface FlowSuggestionResponse {
  suggestion: FlowSuggestion | null;
  message?: string;
}

/**
 * Fetch a flow suggestion for the current user.
 */
export function useFlowSuggestion(context: 'dashboard' | 'chat' | 'task_complete' = 'dashboard') {
  return useQuery<FlowSuggestionResponse>({
    queryKey: ['flow', 'suggestion', context],
    queryFn: async () => {
      const response = await http.get<FlowSuggestionResponse>(
        `/chat/flow/suggestions/?context=${context}`
      );
      
      // Track suggestion shown
      if (response.data.suggestion) {
        telemetry.track('flow_suggestion_shown', {
          suggestion_type: response.data.suggestion.type,
          context,
          priority: response.data.suggestion.priority,
          has_inline_content: !!response.data.suggestion.inline_content,
        });
      }
      
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}

/**
 * Accept a flow suggestion.
 */
export function useAcceptSuggestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ logId, suggestionType, shownAt }: { logId: string; suggestionType: string; shownAt: Date }) => {
      const response = await http.post(`/chat/flow/suggestions/${logId}/accept/`);
      
      // Calculate time to accept
      const timeToAccept = (Date.now() - shownAt.getTime()) / 1000;
      
      // Track acceptance
      telemetry.track('flow_suggestion_accepted', {
        suggestion_type: suggestionType,
        time_to_accept_seconds: timeToAccept,
      });
      
      return response.data;
    },
    onSuccess: () => {
      // Invalidate flow suggestions to fetch a new one
      queryClient.invalidateQueries({ queryKey: ['flow', 'suggestion'] });
    },
  });
}

/**
 * Dismiss a flow suggestion.
 */
export function useDismissSuggestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ logId, suggestionType, shownAt }: { logId: string; suggestionType: string; shownAt: Date }) => {
      const response = await http.post(`/chat/flow/suggestions/${logId}/dismiss/`);
      
      // Calculate time to dismiss
      const timeToDismiss = (Date.now() - shownAt.getTime()) / 1000;
      
      // Track dismissal
      telemetry.track('flow_suggestion_dismissed', {
        suggestion_type: suggestionType,
        time_to_dismiss_seconds: timeToDismiss,
      });
      
      return response.data;
    },
    onSuccess: () => {
      // Invalidate flow suggestions
      queryClient.invalidateQueries({ queryKey: ['flow', 'suggestion'] });
    },
  });
}
