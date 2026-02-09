'use client';

import { useState } from 'react';
import { Sparkles, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAcceptSuggestion, useDismissSuggestion } from '@/hooks/use-flow-suggestion';
import type { FlowSuggestion } from '@/hooks/use-flow-suggestion';
import { telemetry } from '@/lib/telemetry';
import { useRouter } from 'next/navigation';

interface FlowSuggestionChipProps {
  suggestion: FlowSuggestion;
  shownAt?: Date;
  onDismiss?: () => void;
}

const CHIP_COLORS = {
  continue: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20',
  quick_win: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20',
  celebrate: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20',
  stretch: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20',
  explore: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20',
  apply: 'border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/20',
  personalize: 'border-fuchsia-200 bg-fuchsia-50 dark:border-fuchsia-800 dark:bg-fuchsia-950/20',
  alternate: 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/20',
  nudge: 'border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-950/20',
  showcase: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20',
};

const TEXT_COLORS = {
  continue: 'text-blue-900 dark:text-blue-100',
  quick_win: 'text-orange-900 dark:text-orange-100',
  celebrate: 'text-yellow-900 dark:text-yellow-100',
  stretch: 'text-purple-900 dark:text-purple-100',
  explore: 'text-green-900 dark:text-green-100',
  apply: 'text-violet-900 dark:text-violet-100',
  personalize: 'text-fuchsia-900 dark:text-fuchsia-100',
  alternate: 'text-indigo-900 dark:text-indigo-100',
  nudge: 'text-pink-900 dark:text-pink-100',
  showcase: 'text-amber-900 dark:text-amber-100',
};

/**
 * FlowSuggestionChip - Compact suggestion shown after AI responses in chat.
 * More subtle than the FlowStarter dashboard hero card.
 */
export function FlowSuggestionChip({ 
  suggestion, 
  shownAt = new Date(),
  onDismiss 
}: FlowSuggestionChipProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const acceptMutation = useAcceptSuggestion();
  const dismissMutation = useDismissSuggestion();

  const chipColor = CHIP_COLORS[suggestion.type] || CHIP_COLORS.explore;
  const textColor = TEXT_COLORS[suggestion.type] || TEXT_COLORS.explore;

  const handleAccept = () => {
    if (suggestion.log_id) {
      acceptMutation.mutate({
        logId: suggestion.log_id,
        suggestionType: suggestion.type,
        shownAt,
      });
    }

    telemetry.track('flow_suggestion_accepted', {
      suggestion_type: suggestion.type,
      context: 'chat',
      time_to_accept_seconds: Math.round((Date.now() - shownAt.getTime()) / 1000),
    });

    // Navigate based on suggestion type
    if (suggestion.type === 'continue' && suggestion.metadata?.plan_id) {
      router.push(`/learning-plans/${suggestion.metadata.plan_id}`);
    } else if (suggestion.type === 'explore') {
      router.push('/learning-plans');
    } else if (suggestion.type === 'celebrate') {
      router.push('/profile');
    } else if (suggestion.type === 'apply' && suggestion.metadata?.task_id) {
      router.push(`/learning-plans?task=${suggestion.metadata.task_id}`);
    }
  };

  const handleDismiss = () => {
    if (suggestion.log_id) {
      dismissMutation.mutate({
        logId: suggestion.log_id,
        suggestionType: suggestion.type,
        shownAt,
      });
    }

    telemetry.track('flow_suggestion_dismissed', {
      suggestion_type: suggestion.type,
      context: 'chat',
    });

    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) {
    return null;
  }

  return (
    <div 
      className={cn(
        'mt-4 rounded-lg border p-4 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300',
        chipColor
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className={cn('h-5 w-5', textColor)} />
          <span className={cn('font-medium', textColor)}>
            {suggestion.title}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      
      <p className={cn('mt-1 text-sm', textColor.replace('900', '700').replace('100', '300'))}>
        {suggestion.message}
      </p>
      
      <Button
        onClick={handleAccept}
        variant="outline"
        size="sm"
        className="mt-3"
        disabled={acceptMutation.isPending}
      >
        {acceptMutation.isPending ? 'Loading...' : suggestion.action_label}
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
